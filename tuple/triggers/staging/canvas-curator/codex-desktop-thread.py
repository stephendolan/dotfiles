#!/usr/bin/env python3
"""Run one Codex turn as a persistent Desktop-visible task."""

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import time


CURATOR_MCP_SERVERS = {"tuple-staging", "tuple-call-canvas"}
OTHER_MCP_SERVERS = {
    "1password",
    "XcodeBuildMCP",
    "ahrefs",
    "betterstack",
    "chartmogul",
    "computer-use",
    "excalidraw",
    "fortress-codex",
    "helpscout",
    "node_repl",
    "omnifocus",
    "openaiDeveloperDocs",
    "posthog-fortress",
    "ramp",
    "storyblok",
    "tuple",
    "ynab",
}


def send(stream, message):
    stream.write(json.dumps(message, separators=(",", ":")) + "\n")
    stream.flush()


def write_json(path, payload):
    try:
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    except PermissionError:
        print(
            f"canvas-curator: metadata unavailable under launchd TCC: {path}",
            file=sys.stderr,
            flush=True,
        )


def write_result(path, text):
    try:
        path.write_text(text, encoding="utf-8")
    except PermissionError:
        print(
            f"canvas-curator: result file unavailable under launchd TCC: {path}",
            file=sys.stderr,
            flush=True,
        )


def remove_own_launchd_job():
    label = os.environ.get("XPC_SERVICE_NAME", "")
    if not label.startswith("com.stephen.tuple-canvas."):
        return
    subprocess.run(
        ["/bin/launchctl", "remove", label],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def main():
    runner_started = time.monotonic()
    parser = argparse.ArgumentParser()
    parser.add_argument("--codex", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--workspace-root", action="append", default=[])
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--metadata-file", required=True, type=Path)
    parser.add_argument("--result-file", required=True, type=Path)
    parser.add_argument("--completion-signal", type=Path)
    parser.add_argument("--title", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--effort", required=True)
    parser.add_argument("--service-tier", required=True)
    args = parser.parse_args()

    prompt = args.prompt
    roots = list(dict.fromkeys([args.project, *args.workspace_root]))
    metadata = {
        "status": "starting",
        "project": args.project,
        "title": args.title,
        "runner_started_at": utc_now(),
    }
    write_json(args.metadata_file, metadata)

    with subprocess.Popen(
        [args.codex, "app-server", "--stdio", "--disable", "plugins"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
        bufsize=1,
    ) as server:
        assert server.stdin is not None
        assert server.stdout is not None
        send(
            server.stdin,
            {
                "id": 1,
                "method": "initialize",
                "params": {
                    "clientInfo": {
                        "name": "tuple-call-canvas-trigger",
                        "title": "Tuple call canvas trigger",
                        "version": "1",
                    },
                    "capabilities": {"experimentalApi": True},
                },
            },
        )

        thread_id = None
        turn_id = None
        final_message = ""
        finalization_started = False
        title_requested = False
        for line in server.stdout:
            message = json.loads(line)
            if "error" in message:
                if message.get("id") == 3:
                    print(
                        "canvas-curator: Desktop title update failed; task continues: "
                        + json.dumps(message["error"]),
                        file=sys.stderr,
                        flush=True,
                    )
                    continue
                raise RuntimeError(json.dumps(message["error"]))

            if message.get("id") == 1:
                metadata.update(
                    {
                        "server_initialized_ms": round(
                            (time.monotonic() - runner_started) * 1000
                        )
                    }
                )
                write_json(args.metadata_file, metadata)
                send(server.stdin, {"method": "initialized", "params": {}})
                send(
                    server.stdin,
                    {
                        "id": 2,
                        "method": "thread/start",
                        "params": {
                            "cwd": args.project,
                            "runtimeWorkspaceRoots": roots,
                            "config": {
                                "mcp_servers": {
                                    **{
                                        name: {"enabled": False}
                                        for name in OTHER_MCP_SERVERS
                                    },
                                    **{
                                        name: {"enabled": True}
                                        for name in CURATOR_MCP_SERVERS
                                    },
                                }
                            },
                            "model": args.model,
                            "approvalPolicy": "never",
                            "sandbox": "workspace-write",
                            "serviceTier": args.service_tier,
                            "ephemeral": False,
                            "threadSource": "tuple-call-canvas-trigger",
                        },
                    },
                )
            elif message.get("id") == 2:
                thread_id = message["result"]["thread"]["id"]
                metadata.update(
                    {
                        "status": "started",
                        "thread_id": thread_id,
                        "desktop_url": f"codex://threads/{thread_id}",
                        "thread_started_ms": round(
                            (time.monotonic() - runner_started) * 1000
                        ),
                    }
                )
                write_json(args.metadata_file, metadata)
                print(f"canvas-curator: Desktop task {thread_id}", flush=True)
                print(f"canvas-curator: codex://threads/{thread_id}", flush=True)
                send(
                    server.stdin,
                    {
                        "id": 4,
                        "method": "turn/start",
                        "params": {
                            "threadId": thread_id,
                            "input": [{"type": "text", "text": prompt}],
                            "effort": args.effort,
                            "serviceTier": args.service_tier,
                        },
                    },
                )
            elif message.get("id") == 4:
                turn_id = message["result"]["turn"]["id"]
                metadata.update(
                    {
                        "status": "running",
                        "turn_id": turn_id,
                        "turn_started_ms": round(
                            (time.monotonic() - runner_started) * 1000
                        ),
                    }
                )
                write_json(args.metadata_file, metadata)
            elif (
                not title_requested
                and thread_id is not None
                and message.get("method") in {"item/started", "item/completed"}
            ):
                # Wait until the first persisted item before naming. Sending
                # this immediately after turn/start can race the initial
                # rollout write, while waiting here keeps it off the startup
                # path and still names the task near-instantly.
                title_requested = True
                send(
                    server.stdin,
                    {
                        "id": 3,
                        "method": "thread/name/set",
                        "params": {"threadId": thread_id, "name": args.title},
                    },
                )
            elif message.get("id") == 5:
                turn_id = message["result"]["turn"]["id"]
                metadata.update({"status": "finalizing", "turn_id": turn_id})
                write_json(args.metadata_file, metadata)
            elif (
                message.get("method") == "item/completed"
                and message.get("params", {}).get("item", {}).get("type")
                == "agentMessage"
            ):
                final_message = message["params"]["item"].get("text", "")
            elif (
                message.get("method") == "turn/completed"
                and message.get("params", {}).get("turn", {}).get("id") == turn_id
            ):
                turn = message["params"]["turn"]
                status = turn.get("status", "unknown")
                if (
                    status == "completed"
                    and args.completion_signal is not None
                    and not finalization_started
                ):
                    metadata.update({"status": "awaiting_completion"})
                    write_json(args.metadata_file, metadata)
                    print("canvas-curator: awaiting recording completion", flush=True)
                    while not args.completion_signal.exists():
                        time.sleep(2)
                    finalization_started = True
                    final_message = ""
                    send(
                        server.stdin,
                        {
                            "id": 5,
                            "method": "turn/start",
                            "params": {
                                "threadId": thread_id,
                                "input": [
                                    {
                                        "type": "text",
                                        "text": (
                                            "The trigger has now observed recording completion. "
                                            "Perform the final compaction and canvas_read required by "
                                            "$tuple-call-canvas, reconcile any unfinished agent-created "
                                            "objects, and finish with the verified canvas result. Do not "
                                            "add proxy request/status cards or mutate the Tuple call."
                                        ),
                                    }
                                ],
                                "effort": args.effort,
                                "serviceTier": args.service_tier,
                            },
                        },
                    )
                    continue
                write_result(args.result_file, final_message)
                metadata.update({"status": status})
                if turn.get("error") is not None:
                    metadata["error"] = turn["error"]
                write_json(args.metadata_file, metadata)
                print(f"canvas-curator: Desktop task finished ({status})", flush=True)
                remove_own_launchd_job()
                return 0 if status == "completed" else 1

    raise RuntimeError("Codex app server exited before the curator turn completed")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"canvas-curator: Desktop task failed: {error}", file=sys.stderr)
        remove_own_launchd_job()
        sys.exit(1)
