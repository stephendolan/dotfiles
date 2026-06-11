# Sidekick - Codex

Launches [Codex](https://developers.openai.com/codex/cli/) as a live Topic Balloons game-master on your Tuple call when transcription starts.

When `call-transcription-started` fires, this trigger opens your preferred terminal running Codex inside the call's transcription directory. Codex catches up on everything said so far, opens a polished canvas game, then follows the live transcript and turns important topics into recall balloons.

## What it does

- **Runs Topic Balloons.** Key points, decisions, risks, terms, action items, and open questions inflate as playful balloons.
- **Prompts recall.** The balloon text is the thing to remember; popping it reveals the supporting context as a floating note.
- **Logs the call live.** On every batch of new transcript, Codex leaves a one-line `·` play-by-play so you can follow along at a glance.
- **Answers when addressed.** Say "Codex, ..." (or type into the terminal) and it responds to that turn, then keeps following the call.
- **Summarizes.** It writes a checkpoint summary when recording stops and a final summary (decisions, action items, open threads) when the call ends.

Codex follows the call with **Tuple's bundled watcher** (`tuple-call-watcher.py`), shipped with this trigger and run verbatim: a fixed, deterministic script rather than a watch loop the model re-authors each session. Since Codex has no event-driven wake, it runs the watcher once with `--catchup`, then repeatedly in `--exit-on-batch` mode (each run blocks until the next batch, prints it, and exits). It launches with `codex --yolo` so the live demo loop can keep moving without approval prompts.

## Choosing your terminal

By default the trigger opens the first installed of **Ghostty → iTerm → Alacritty → Terminal**. To force one, set `PREFERRED_TERM` at the top of `call-transcription-started` (or in the environment):

```bash
PREFERRED_TERM="iterm"   # ghostty | iterm | alacritty | terminal
```

The terminal runs `launch-sidekick-codex.command`, whose `#!/bin/zsh -li` shebang sources your `~/.zprofile` and `~/.zshrc`, so `codex` resolves from the same PATH and environment you get in a normal terminal.

## Prerequisites

- macOS
- [Codex](https://developers.openai.com/codex/cli/) installed so `codex` works in a new terminal
- `python3` (the bundled watcher needs it; install with `xcode-select --install`)
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/sidekick-codex/`

The trigger fires the next time call transcription starts.

## How it works

When `call-transcription-started` fires, Tuple provides `TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY`, the directory holding the current call's transcription artifacts. This trigger:

1. Copies the fixed `tuple-call-watcher.py`, copies the pre-baked `topic-balloons/` reference bundle, and writes `sidekick-codex-prompt.md` into that directory.
2. Writes an executable `launch-sidekick-codex.command` wrapper into that directory.
3. Opens it in your preferred terminal via `open` (LaunchServices). No AppleScript and no direct binary launch, so it triggers no macOS accessibility prompt and no stray windows.
4. The wrapper starts a login-interactive zsh, changes to the transcripts root, and runs `codex --yolo` with the prompt. Codex runs the bundled watcher to catch up and follow the call.

A PID file (`sidekick-codex.pid`) keeps a second transcription start from launching a duplicate sidekick for the same call.

For local testing without opening a terminal, set `SIDEKICK_CODEX_DRY_RUN=1`; it writes the prompt and launcher and exits.
