# Sidekick - Claude

Launches [Claude Code](https://claude.com/claude-code) as a live companion on your Tuple call when transcription starts.

When `call-transcription-started` fires, this trigger opens your preferred terminal running Claude inside the call's transcription directory. Claude catches up on everything said so far, then watches the live transcript and acts as a sharp third pair on the call.

## What it does

- **Logs the call live.** On every batch of new transcript, Claude leaves a one-line `·` play-by-play so you can follow along at a glance.
- **Chimes in when it matters.** It escalates from a log line to a real interjection for a bug it can see, an ambiguous decision or action item, a correction, or a direct question.
- **Answers when addressed.** Say "Claude, ..." (or type into the terminal) and it responds to that turn, then keeps listening.
- **Summarizes.** It writes a checkpoint summary when recording stops and a final summary (decisions, action items, open threads) when the call ends.

Claude follows the call with **Tuple's bundled watcher** (`tuple-call-watcher.py`), shipped with this trigger and run verbatim: a fixed, deterministic script rather than a poll loop the model re-authors each session. Claude runs it once via `Bash --catchup` to read the backlog, then follows live. When the `Monitor` tool is available (the preferred path), it `Monitor`s a continuous run so it wakes on each emit. When `Monitor` is unavailable — e.g. on Bedrock, where it's disabled — Claude falls back to looping the watcher in `--exit-on-batch` mode over `Bash`, the same poll-by-re-execution the Codex sidekick uses. It launches with `claude --allowed-tools Read Bash Monitor --name "Tuple Sidekick - Claude"`.

## Choosing your terminal

By default the trigger opens the first installed of **Ghostty → iTerm → Alacritty → Terminal**. To force one, set `PREFERRED_TERM` at the top of `call-transcription-started` (or in the environment):

```bash
PREFERRED_TERM="iterm"   # ghostty | iterm | alacritty | terminal
```

The terminal runs `launch-sidekick-claude.command`, whose `#!/bin/zsh -li` shebang sources your `~/.zprofile` and `~/.zshrc`, so `claude` resolves from the same PATH and environment you get in a normal terminal.

## Prerequisites

- macOS
- [Claude Code](https://claude.com/claude-code) installed so `claude` works in a new terminal
- `python3` (the bundled watcher needs it; install with `xcode-select --install`)
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/sidekick-claude/`

The trigger fires the next time call transcription starts.

## How it works

When `call-transcription-started` fires, Tuple provides `TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY`, the directory holding the current call's transcription artifacts. This trigger:

1. Copies the fixed `tuple-call-watcher.py` and writes `sidekick-claude-prompt.md` into that directory.
2. Writes an executable `launch-sidekick-claude.command` wrapper into that directory.
3. Opens it in your preferred terminal via `open` (LaunchServices). No AppleScript and no direct binary launch, so it triggers no macOS accessibility prompt and no stray windows.
4. The wrapper starts a login-interactive zsh, changes to the transcripts root, and runs `claude --dangerously-skip-permissions` with the prompt. Claude runs the bundled watcher to catch up and follow the call.

A PID file (`sidekick-claude.pid`) keeps a second transcription start from launching a duplicate sidekick for the same call.

For local testing without opening a terminal, set `SIDEKICK_CLAUDE_DRY_RUN=1`; it writes the prompt and launcher and exits.
