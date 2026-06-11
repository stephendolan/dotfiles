# Open in Pi

Launches [Pi](https://pi.dev/) in the current Tuple transcription directory when transcription starts.

The trigger writes a `launch-pi-sidekick.command` wrapper next to the live transcript files and opens it in your preferred terminal. The wrapper runs as `#!/bin/zsh -li`, so `pi` resolves from the same interactive shell environment you get in a new terminal. Nothing is hard-coded: Pi uses whichever provider and model you have configured as your default.

## What makes this one different

Most editor sidekicks can only check the transcript when you speak to them. This one makes Pi an **active listener**: it consumes the call as it happens, drops a one-line summary of what was just covered so you can follow along at a glance, and interjects with substance only when something is worth saying.

The trigger ships a Pi extension, `tuple-call-watch.ts`, and installs it into the call's `.pi/extensions/` directory, where Pi loads it automatically at startup (no `/reload`, nothing to configure). The extension tails the live transcript and, whenever the talkers pause, feeds the new lines to Pi with `pi.sendMessage(..., { triggerTurn: true })`. That actually starts a turn, so Pi *reads and reasons over* each batch rather than waiting to be asked. Guided by its prompt, Pi leaves a one-line `·` summary of what they just covered on every batch (so you can follow the call live) and escalates to a `👋` interjection only when something matters: a risk or bug, a decision worth capturing, an action item, a correction, or a line addressed to it directly.

The watcher only triggers a turn while Pi is idle, so **your own messages always take priority**. When you talk to Pi it answers you first, and the instant it finishes the next batch of call activity arrives and it keeps listening. The watch lives for the whole session: a question from you never pauses or ends it, and batches keep coming until the call ends. The transcript files remain the source of truth, so if the watcher ever stalls, Pi just reads `transcriptions.jsonl` and `events.jsonl` directly.

Pi opens with a one-line "listening and caught up" confirmation, leaves a quick `·` summary on each batch thereafter, writes a call-so-far checkpoint summary when recording stops or ends, and writes a final summary on `call_ended`.

## Prerequisites

- macOS
- [Pi](https://pi.dev/) installed so `pi` works in a new terminal, with a provider authenticated (`pi`, then `/login`)
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/open-in-pi/`

The trigger fires the next time call transcription starts.

## How it works

When `call-transcription-started` fires, Tuple provides `TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY`, the directory containing the current call transcription artifacts. This trigger:

1. Copies the shipped `tuple-call-watch.ts` into `.pi/extensions/` inside that directory and writes a `tuple-call-watch.config.json` next to it (the artifacts directory and call id).
2. Writes `pi-sidekick-prompt.md` into that directory.
3. Writes an executable `launch-pi-sidekick.command` wrapper into that directory.
4. Opens it in your preferred terminal via `open` (LaunchServices). With `PREFERRED_TERM` empty it opens in your default handler for `.command` files; set it to one of `ghostty | iterm | alacritty | terminal` to force one. No AppleScript, so it triggers no macOS accessibility prompt.
5. The wrapper starts a login-interactive zsh, changes into the transcription directory, and runs `pi "$(cat pi-sidekick-prompt.md)"`. Pi auto-discovers `.pi/extensions/*.ts` from that directory, so the watcher is active immediately.

The watcher (`tuple-call-watch.ts`) tails `transcriptions.jsonl` and `events.jsonl` (plus sibling directories for the same call) from saved byte offsets, resolves `user_id` to speaker names, and batches new lines on natural pauses. It starts in `balanced` mode (polling about once a second, then flushing after a ~2s lull or every ~12s during continuous talking), and exposes a `tuple_call_watch_set_mode` tool so Pi can switch future batches to `realtime` for pair programming/debugging (faster polling and shorter pauses) or `low_noise` for presentations/long monologues as the call evolves. Recording stop/end events use a short grace period before flushing, so the final transcript lines can land before Pi writes the checkpoint. It feeds a batch, and triggers a turn, only while Pi is idle and has no pending messages, so consumption never collides with your messages or with itself. It degrades safely: if its config is missing it watches the working directory, and any error is swallowed rather than taking down the session.

For local script testing without opening a terminal, set `OPEN_IN_PI_DRY_RUN=1`. It still installs the extension so you can inspect it.
