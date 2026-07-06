# Sidekick - Pi

Launches [Pi](https://pi.dev/) as an active live-call sidekick — the **Call Console** — when Tuple transcription starts.

When `call-transcription-started` fires, this trigger ships a small Pi extension into a working directory and opens a terminal that hands off to `tuple connect --harness pi`. Connect resolves call state and gives Pi a context prompt; the bundled extension turns Pi into a purpose-built call companion.

> **Requires a Tuple build whose `tuple` CLI exposes** `connect --harness` and `transcription show`. If your `tuple` CLI doesn't have them yet, this trigger won't work.

## The Call Console

Pi's TUI is a single scrolling transcript with an input editor — it has no split panes. So the Call Console works within Pi's own surfaces:

```
  transcript ──────────────── your chat with Pi (direct Q&A) ── AGENT-CHAT
    ▏ call summary (muted)   ── topic summaries, kept out of your way
    ▛ Finding: … ▟            ── recorded artifacts as distinct cards
  ┌─────────────────────────────────────────────────────────┐
  │ › your message                                           │ ── editor
  ├─────────────────────────────────────────────────────────┤
  │ auto · summary 2m · next 14s · on call 12:31             │ ── STATUS
  │ Wake: pi, pie · 3 notes · / for commands                 │   (below editor)
  └─────────────────────────────────────────────────────────┘
```

- **Status (below the editor).** One compact, plain-text block — the single source of on-screen call state: feed health, mode, next-batch countdown, elapsed time, screen watch, wake words, and notes count. The first line is priority ordered so narrow terminals keep the warning and mode before lower-priority details; the second line points to `/` for command autocomplete instead of listing every command. It updates every second. When the feed ends, it freezes into a terminal line such as `call ended · 42:10` or `recording stopped · 42:10` and keeps `/notes` and `/recap` visible. No floating HUD, no footer copy, no icons.
- **Agent chat (the transcript), de-noised.** The de-noise is structural, not a plea to the model: in the quieter watch modes, routine call speech is appended straight to Pi's context (`sendMessage` with no delivery options) — it's there for the next turn but never starts one itself. So **your** typed messages are the only thing that drives the transcript, and your question (and Pi's answer) can't get buried under a summary stream. `real-time` mode is the engaged opposite: Pi comments as the call goes. Dial between them (below). Topic summaries render in a separate, muted "call" style; ask for one any time with `/recap`.
- **Two independent axes — transcript watch and screen watch.** How fast the sidekick samples the *talk* and how closely it watches the *shared screen* are separate dials. You can follow a live demo frame-by-frame while barely sampling the conversation, or vice versa. Pi controls both (`set_watch_mode`, `set_screen_watch`).
- **Adaptive cadence (`auto`, the default).** Instead of guessing up front, the sidekick opens in **real-time** for a short capture window (~30s) to hear how the call starts, then re-evaluates on the events that actually matter: **someone joins or leaves**, a **screen share starts or stops**, and a periodic check only after new speech (~5 min, which also catches topic drift like "let's try this in real time"). Each time, Pi judges what's happening and sets *both* axes — e.g. a teammate starts demoing → `set_screen_watch active` to follow it frame-by-frame while the transcript stays quiet. A new joiner gets a short settle so the conversation develops before the re-decision. Nudge the pace by hand (`/cadence` or the shortcuts) to take over; pick `auto` again to hand control back. Cadence and watch-word changes restart the in-flight transcript wait, so the new settings apply immediately instead of waiting for the old interval to return.
- **Quiet, cheap reasoning.** The sidekick runs Pi at **low** reasoning effort with the **reasoning panel hidden**, so the transcript stays about the call rather than the model's deliberation. These are set per-session at launch (a project-scoped `.pi/settings.json`), so your global Pi config is untouched.
- **Artifacts.** When Pi verifies a claim, catches an error, or notes something worth keeping, it records an artifact. Artifacts render as distinct cards, the status block tracks the note count once at least one exists, and `/notes` opens a browser to read them. Artifacts persist in the session, so resuming a past call (`pi -c`) reopens with its notes intact. When the feed ends, they are exported to `sidekick-notes.md` in Tuple's artifacts directory, the latest dated `~/Documents/Tuple Calls` folder, or the Pi working directory.
- **Inline screen captures.** When someone shares their screen, the sidekick captures it **on its own** — the moment a share starts, then on a cadence set by the screen-watch level — and shows it inline as a JPEG, *without needing an agent turn*. The level (`set_screen_watch`): **periodic** (a frame every few minutes — a light timeline for you) or **active** (a frame every ~15s, *also fed to Pi's vision* so it can follow a live demo), or **off**. Pi bumps to `active` on its own when it sees a demo. It can also grab a one-off with `capture_screen`, which sends the frame into Pi's context, and `/screenshot` captures it yourself. A share that was already up before transcription started is detected too: the record stream only replays events from recording start, so at startup the sidekick probes once with `screen capture` (bytes back = someone is sharing) and seeds the share state from the result. Requires a graphics-capable terminal (Ghostty, iTerm2, Kitty, WezTerm).

It reads the call through `tuple transcription show --wait`, looping with a fresh per-process `--cursor` for a gap-free, repeat-free catch-up and then live batches — without Pi ever running its own transcript loop. Cadence and watch-word edits abort the current wait and restart it with the same cursor, so no transcript position is lost. If the feed errors repeatedly, the status line says the transcript feed is retrying; after the sixth consecutive error Pi gets one urgent warning, and when any successful poll returns the user gets a restored notice. (The extension overrides connect's "follow the transcript yourself" instruction on every LLM call, via pi's `context` event, so the call is never read twice — that event fires for both your typed messages and the sidekick's own extension-triggered turns, and its injected text never gets persisted into the session.) Nothing is hard-coded about the model: Pi uses whichever provider and model you have configured as your default.

## Controls

| Control | What it does |
| --- | --- |
| `/cadence` | Pick the watch pace: **auto** (adaptive — see below), or a fixed mode: **realtime** (engaged — comments as the call goes), **balanced** / **low_noise** / **periodic** (progressively quieter — accumulate silently, speak when addressed). Picking a fixed mode takes manual control; `auto` hands it back. The current transcript wait restarts immediately with the new interval. |
| `ctrl+shift+.` / `ctrl+shift+,` | Dial the pace louder (more real-time) / quieter (more summary). |
| `/watchwords` | See, add, and remove the words Pi listens for — live, mid-call. The current transcript wait restarts immediately with the new watch-word list. |
| `/notes` | Browse the findings, fact-checks, and notes recorded on this call. |
| `/recap` | Ask for a quick recap of the call so far, on demand. |
| `/screenshot` | Capture the shared screen and show it inline. |
| `/tasks` | See background subagent work you can spin up and what's running (`/tasks <id>` statuses one). Requires the `pi-subagents` extension. |
| `@name` / `#note` | Editor autocomplete — `@` references a call participant, `#` references a recorded note. |

Pi also has tools it can invoke itself as the call unfolds: `set_watch_mode` (transcript pace), `set_screen_watch` (how closely to follow the shared screen — off/periodic/active), `post_summary` (muted topic summary), `record_artifact` (finding/fact-check/note), and `capture_screen` (one-off grab of the shared screen, sent into Pi's vision context and rendered inline for the user). Before every LLM call, the extension injects live call state (participants, elapsed, mode) via pi's `context` event, and names the session after the call so `pi -c` / `pi -r` can find it later. For heavier asks (deep research, thorny fact-checks), Pi can spin up a background subagent on request so it doesn't block the call.

## Configuring

Defaults live in **`sidekick.config.json`** next to the extension — edit it to tune the sidekick without touching code:

| Key | Default | Meaning |
| --- | --- | --- |
| `consoleEnabled` | `true` | Set `false` to run as a plain background feed with no status/console UI. |
| `cli` | `"tuple"` | Which Tuple CLI to drive: `"tuple"` for prod, `"tuple-staging"` for the staging client. |
| `watchWords` | `["pi", "pie"]` | Names Pi answers to, plus likely Whisper mis-hearings. You can also manage these live with `/watchwords`. |
| `defaultMode` | `"auto"` | The pace a call opens in: `auto` (adaptive) or a fixed mode — `realtime` \| `balanced` (~30s) \| `low_noise` (~2m) \| `periodic` (~5m). |
| `autoCaptureSec` | `30` | Auto mode: seconds of real-time capture at the start before the first evaluation. |
| `autoSettleSec` | `45` | Auto mode: seconds to let a new joiner settle into the conversation before re-evaluating. |
| `autoShareSettleSec` | `5` | Auto mode: seconds after a screen share starts/stops before re-evaluating (short, to react to a demo). |
| `autoPulseMin` | `5` | Auto mode: minutes between periodic re-evaluations after new speech. Roster and screen-share events still schedule their own settled checks. |
| `autoScreenshots` | `true` | Capture the shared screen on its own (no agent turn) so you see what's presented while quiet. Set `false` to disable. |
| `screenshotIntervalMin` | `5` | "periodic" screen-watch: minutes between captures while a share stays up (a fresh share is always captured right away). |
| `screenshotActiveSec` | `15` | "active" screen-watch: seconds between captures while following a demo (these frames are fed to Pi's vision). |
| `catchupMaxLines` | `300` | Cap on the "call so far" backlog so a late join doesn't flood context. |
| `streamTimeout` | `"30s"` | How long each `--wait` blocks (on silence) before the loop re-checks. |
| `exportNotes` | `true` | Write recorded artifacts to `sidekick-notes.md` when the feed ends. Uses Tuple's artifacts directory when available, then the latest dated `~/Documents/Tuple Calls` folder, then the Pi working directory. |

Watch words are the one you'll most likely change: add your own name and its likely mistranscriptions so Pi reliably notices when it's addressed. Wake detection covers direct address (`hey pi`, `pi, can you…`), third-person asks (`ask pi`, `have pi check`, `get pi to…`), and trailing vocatives (`…, pi?`). A bare mention that is not clearly directed at Pi stays non-urgent but carries a hint to respond only if it was actually addressed.

**Staging vs prod.** This copy targets the **staging** Tuple client, so its `sidekick.config.json` sets `"cli": "tuple-staging"` and the launcher defaults `TUPLE_CLI=tuple-staging`. Both `tuple connect` and the extension's transcript/screen calls then hit the staging daemon. For a prod deployment, set `"cli": "tuple"` (the default) — or set the `TUPLE_CLI` env var, which overrides the config. The launcher exports `SIDEKICK_PI_DIR` so the extension reliably finds its config regardless of Pi's module resolution.

**Pi session settings.** The launcher writes a project-scoped `<workdir>/.pi/settings.json` (which Pi deep-merges *over* your global settings, for this working dir only) with `defaultThinkingLevel: "low"` and `hideThinkingBlock: true` — quiet, cheap reasoning without touching your global Pi config. Override per-launch with the `SIDEKICK_THINKING_LEVEL` (`off`\|`minimal`\|`low`\|`medium`\|`high`\|`xhigh`) and `SIDEKICK_HIDE_THINKING` (`true`\|`false`) env vars.

**Package trimming.** The session also gets a filtered `packages` list: your global Pi packages minus packages a meeting assistant doesn't need (by default anything matching `compound-engineering|pi-mcp-adapter`). The sidekick drives the Tuple CLI directly, so the MCP adapter footer is just noise here. The list is read from your global settings at trigger time, so it stays current with what you install; `pi-subagents` and the rest ride along untouched. Tune the exclusion regex with `SIDEKICK_EXCLUDE_PACKAGES` (set it empty to keep everything). Requires `jq`; without it the session keeps all global packages.

**Staying fresh.** Before connecting, the launcher runs `pi update --all` so pi and its extensions are current on every call. It is best-effort — offline or failed updates never keep the sidekick off the call. Skip it for a faster join with `SIDEKICK_SKIP_UPDATE=1`.

## Prerequisites

- macOS
- [Pi](https://pi.dev/) installed so `pi` works in a new terminal, with a provider authenticated (`pi`, then `/login`)
- The `tuple` CLI on your interactive shell PATH, with the subcommands listed above
  - Install it from the Tuple app: its Transcription settings have an **Install** button that links `tuple` onto your PATH.
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/sidekick-pi/`

The trigger fires the next time call transcription starts.

## How it works

`call-transcription-started` fires with no call-specific arguments. This trigger:

1. Creates a short working directory per start, `/tmp/tuple-pi/<MMDD-HHMMSS>-<pid>`.
2. Copies `tuple-call-sidekick.ts`, its `lib/` helpers, and `sidekick.config.json` into `.pi/extensions/` there. Pi auto-discovers `.pi/extensions/*.ts` from its working directory, so the extension is active the moment Pi starts. (The `lib/` helpers sit in a subdirectory without an `index.ts`, so Pi imports them but does not load them as separate extensions; `sidekick.config.json` is JSON, so it is never mistaken for one.)
3. Writes an executable `launch-pi-sidekick.command` wrapper into that directory.
4. Opens it in your preferred terminal via `open` (LaunchServices). With `PREFERRED_TERM` empty it opens in your default handler for `.command` files; set it to one of `ghostty | iterm | alacritty | terminal` to force one. No AppleScript, so it triggers no macOS accessibility prompt.
5. The wrapper starts a login-interactive zsh, `cd`s to the working directory, and runs `tuple connect --harness pi`.

Each transcription-start gets its own directory, so stopping and restarting transcription in one call can spawn another sidekick while older ones keep running and stay queryable. The extension writes a best-effort pid lock and warns when another live Call Console appears to already be following the same call, but it does not block a second console.

Inside Pi, the extension keeps one abortable `tuple transcription show --wait` child alive at a time. It restarts that child when cadence or watch words change, when the session shuts down, and when the feed ends, so no stale long-interval process lingers. The same loop freezes the status line and exports artifacts when it sees `call_ended` or `recording_ended`.

For local script testing without opening a terminal, set `SIDEKICK_PI_DRY_RUN=1`. It still installs the extension and writes the launcher, then exits without launching it.

## Developing

The decidable logic (config merge, watch-word matching, cadence, stream-arg building, status lines, artifact store, transcript parsing) lives in `lib/console-core.ts`, which imports nothing from Pi and is unit-tested:

```bash
node --test lib/console-core.test.ts
```

`tuple-call-sidekick.ts` is the thin Pi-facing shell that wraps that logic in Pi's TUI surfaces (widgets, overlays, tools, commands, shortcuts).
