# Call Canvas Curator

When staging transcription starts, this trigger ensures the local Tuple Call Canvas is running, opens the recording's tldraw room, and opens one Codex Desktop curator scoped to the exact call and recording.

The canvas room is the call ID, so transcription restarts reconnect to the same spatial view. Each recording still gets its own curator and transcript cursor. Duplicate firings for one recording are ignored with a `mkdir` claim.

Runtime session files live under `~/Documents/Tuple Call Canvases/<call-id>/`; no call content is written into this public trigger directory. Canvas state is persisted by the app in `~/Repos/@tuple/tuple-call-canvas/.rooms/` and images in `.assets/`. Tuple remains authoritative for transcripts.

Codex deep links open existing tasks but do not create them. The trigger therefore starts a persistent task through Codex's app-server protocol, rooted in the local `Tuple Calls` project at `~/Documents/Tuple Calls 2`. The task is named `Tuple staging call <call-id-prefix>` and remains visible in the Desktop sidebar. Its thread ID and `codex://threads/<thread-id>` URL are saved beside the recording as `curator-<recording-id>.desktop.json`.

The project root, durable call directory, and canvas app repository are the task's writable workspace roots. The app-server runner keeps the requested model, reasoning effort, and service tier while avoiding UI automation and keyboard focus changes. Curator tasks start with plugins disabled and only the `tuple-staging` and `tuple-call-canvas` MCP servers enabled, avoiding unrelated server startup and authentication delays. The recording metadata includes app-server, task, and turn startup timings in milliseconds for regression checks.

If the model finishes its first turn before recording completion, the runner holds the same Desktop task open. The completion trigger emits a recording-scoped signal, and the runner then starts one final verification turn before unregistering its launchd job. This keeps one task per recording without trusting prompt compliance for process lifetime.

Requirements:

- `tuple-staging`
- Codex Desktop and the `Tuple Calls` local project at `~/Documents/Tuple Calls 2`
- `jq`, `curl`, Node, and npm
- `~/Repos/@tuple/tuple-call-canvas` with dependencies installed
- `~/.codex/skills/tuple-call-canvas`
- the local `tuple-call-canvas` MCP configured in Codex

The trigger reuses an already-running port-5757 ngrok HTTPS tunnel. To keep the local canvas and curator off the tunnel startup path, it starts a cold tunnel only when `CALL_CANVAS_START_TUNNEL=1`; otherwise it opens localhost for screen sharing. The completion trigger stops a tunnel it owns after the final active canvas recording ends. `CALL_CANVAS_PUBLIC_URL` overrides discovery; `CALL_CANVAS_APP_ROOT` overrides the repository location; `CALL_CANVAS_CODEX_PROJECT_ROOT` overrides the Codex project path.

Set `CALL_CANVAS_DRY_RUN=1` to validate IDs, start the local runtime, and inspect prompt construction without opening the browser or Codex Desktop. Tests may set `CALL_CANVAS_ROOT` to an isolated temporary directory.
