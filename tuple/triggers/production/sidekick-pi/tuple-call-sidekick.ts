// Tuple Pi sidekick — the Call Console: a purpose-built live-call companion for
// Sidekick-Pi that gives a Tuple call three clear regions inside Pi's single TUI.
//
// Loaded automatically from `.pi/extensions/` in the call's working directory, so
// it is active the moment Pi starts — no /reload, no self-authoring.
//
// Pi's TUI is one scrolling transcript with an editor; it has no split panes. So
// the Call Console maps the three regions you want onto Pi's native surfaces:
//
//   • STATUS       → one plain block below the editor showing mode, feed health,
//                    cadence, watch words, elapsed time, and end-of-call state.
//   • AGENT-CHAT   → the transcript itself, de-noised so Pi reserves it for direct
//                    interaction instead of chattering a summary after every batch.
//   • ARTIFACTS    → findings/fact-checks/notes recorded via a tool, rendered as
//                    distinct cards and browsable on demand via /notes.
//
// The decidable logic lives in ./lib/console-core.ts. This top-level file stays
// Pi-loadable and wires the runtime modules together.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  addArtifact,
  coerceArtifactKind,
} from "./lib/console-core.ts";
import { exportArtifacts } from "./lib/artifacts.ts";
import {
  autoTick,
  buildContextInjection,
  cycle,
  followLoop,
  maybeNameSession,
  mountStatus,
  registerAutocomplete,
  screenshotTick,
  finalizeFeedEnd,
} from "./lib/feed.ts";
import { claimSidekickLock, releaseSidekickLock } from "./lib/locks.ts";
import { openCadence, openNotes, openWatchWords } from "./lib/overlays.ts";
import { registerScreenshotRenderer } from "./lib/screenshot-renderer.ts";
import { runScreenshotPipeline } from "./lib/screenshots.ts";
import { registerTools } from "./lib/tools.ts";
import {
  captureScreen,
  createRuntime,
  loadConsoleConfig,
  refreshStatus,
  stopTranscriptFeed,
  type SidekickCtx,
} from "./lib/runtime.ts";

export default function (pi: ExtensionAPI) {
  const runtime = createRuntime(loadConsoleConfig());

  registerTools(pi, runtime);
  registerCommands(pi, runtime);
  registerShortcuts(pi, runtime);
  registerScreenshotRenderer(pi);

  // ---- lifecycle -----------------------------------------------------------

  pi.on("session_start", async (_event: unknown, ctx: SidekickCtx) => {
    runtime.state.callStartMs = Date.now();
    restoreArtifacts(pi, runtime, ctx);
    maybeNameSession(pi, runtime);
    await claimSidekickLock(runtime, ctx);
    runtime.uiReady = Boolean(ctx?.hasUI) && runtime.config.consoleEnabled;
    if (runtime.uiReady) {
      try {
        ctx.ui?.notify?.(`Tuple Call Console loaded (${runtime.cli}) — following the call in the background.`, "info");
      } catch {
        // notify is best-effort
      }
      mountStatus(runtime, ctx);
      registerAutocomplete(runtime, ctx);
    }
    // One 1s heartbeat drives both the live status countdown (when the widget is
    // mounted) and the auto-cadence manager (roster diffs + capture/pulse timing),
    // so auto works even when the console UI is disabled.
    runtime.statusTimer = setInterval(() => {
      refreshStatus(runtime);
      if (runtime.state.ended) return;
      autoTick(pi, runtime);
      screenshotTick(pi, runtime);
    }, 1000);
    followLoop(pi, runtime, ctx).catch(() => {});
    seedScreenShareState(runtime);
  });

  // Inject the transcript-feed override and live call state on every LLM call.
  // See buildContextInjection for why this must be the `context` event and not
  // before_agent_start.
  pi.on("context", async (event: any) => {
    return { messages: [...event.messages, buildContextInjection(runtime, Date.now())] };
  });

  pi.on("session_shutdown", async () => {
    runtime.stopped = true;
    stopTranscriptFeed(runtime);
    if (runtime.statusTimer) {
      clearInterval(runtime.statusTimer);
      runtime.statusTimer = null;
    }
    if (runtime.feed.ended && !runtime.state.ended) {
      await finalizeFeedEnd(pi, runtime, undefined);
    } else if (!runtime.state.ended) {
      // Pi shut down mid-call (quit, crash, …) rather than at call end — export
      // whatever notes exist now so they aren't lost. Best-effort: exportArtifacts
      // already no-ops when there are no artifacts or exportNotes is false.
      await exportArtifacts(pi, runtime, undefined, Date.now());
    }
    await releaseSidekickLock(runtime);
  });
}

// ---- commands + shortcuts --------------------------------------------------

function registerCommands(pi: ExtensionAPI, runtime: ReturnType<typeof createRuntime>) {
  pi.registerCommand("watchwords", {
    description: "See and manage the words Pi listens for on the call",
    handler: async (_args: unknown, ctx: SidekickCtx) => {
      await openWatchWords(runtime, ctx);
    },
  });

  pi.registerCommand("cadence", {
    description: "Set how often the sidekick consumes the call (real-time ↔ summary)",
    handler: async (_args: unknown, ctx: SidekickCtx) => {
      await openCadence(runtime, ctx);
    },
  });

  pi.registerCommand("notes", {
    description: "Browse the findings, fact-checks, and notes recorded on this call",
    handler: async (_args: unknown, ctx: SidekickCtx) => {
      await openNotes(runtime, ctx);
    },
  });

  pi.registerCommand("recap", {
    description: "Ask the sidekick for a quick recap of the call so far",
    handler: async () => {
      pi.sendUserMessage?.("Give me a quick recap of the call so far — the key points and any decisions.", { deliverAs: "steer" });
    },
  });

  pi.registerCommand("tasks", {
    description: "See background subagent tasks and what you can spin up (needs the subagents extension)",
    handler: async (args: unknown) => {
      // Route through the public `subagent` tool (action list/status) rather than
      // pi-subagents' private state, so this stays correct if its internals change.
      // pi-subagents also renders its own live widget while async jobs run.
      const id = String(args ?? "").trim();
      const prompt = id
        ? `Check the status of background subagent run "${id}" via subagent({action:"status", id:"${id}"}) and summarize it briefly.`
        : `List my background work: call subagent({action:"list"}) to show the agents I can spin up, and report any running or recent async subagent runs with their status. Keep it short. If the subagent tool isn't available, say so.`;
      pi.sendUserMessage?.(prompt, { deliverAs: "steer" });
    },
  });

  pi.registerCommand("screenshot", {
    description: "Capture the shared screen and show it inline",
    handler: async (_args: unknown, ctx: SidekickCtx) => {
      await runScreenshotPipeline(pi, runtime, ctx, { notify: true });
    },
  });
}

function registerShortcuts(pi: ExtensionAPI, runtime: ReturnType<typeof createRuntime>) {
  try {
    pi.registerShortcut?.("ctrl+shift+.", {
      description: "Sidekick: louder (more real-time)",
      handler: async (ctx: SidekickCtx) => cycle(runtime, ctx, "louder"),
    });
    pi.registerShortcut?.("ctrl+shift+,", {
      description: "Sidekick: quieter (more summary)",
      handler: async (ctx: SidekickCtx) => cycle(runtime, ctx, "quieter"),
    });
  } catch {
    // shortcuts are a bonus; /cadence is always available
  }
}

// Seed the screen-share flag at startup. The record stream only replays events
// from recording start, so a share that was already up before transcription
// began never emits user_screen_sharing_started. One cheap probe closes that
// blind spot — `screen capture` returns bytes only while someone is sharing —
// and the regular screenshot tick + auto-cadence then treat it as a fresh share
// (immediate inline frame, settle, re-evaluate both axes).
function seedScreenShareState(runtime: ReturnType<typeof createRuntime>) {
  void captureScreen(runtime).then((b64) => {
    if (!b64 || runtime.stopped || runtime.state.ended) return;
    runtime.feed.screenSharing = true;
    runtime.state.screenSharing = true;
    refreshStatus(runtime);
  }).catch(() => {
    // probing is best-effort; the event stream still covers mid-call shares
  });
}

// Rebuild recorded artifacts from prior session entries, so `pi -c` on a past
// call reopens with its /notes intact.
function restoreArtifacts(_pi: ExtensionAPI, runtime: ReturnType<typeof createRuntime>, ctx: SidekickCtx) {
  try {
    const entries = ctx?.sessionManager?.getEntries?.() ?? [];
    for (const e of entries) {
      if (e?.type === "custom" && e?.customType === "tuple-artifact" && e?.data && typeof e.data.title === "string") {
        const res = addArtifact(runtime.state.artifacts, {
          kind: coerceArtifactKind(e.data.kind),
          title: e.data.title,
          body: String(e.data.body ?? ""),
          atMs: Number(e.data.atMs) || Date.now(),
        });
        runtime.state.artifacts = res.list;
      }
    }
  } catch {
    // restore is best-effort
  }
}
