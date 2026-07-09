// console-core — the pure, dependency-free logic behind the Sidekick-Pi Call Console.
//
// Nothing here imports Pi or touches I/O, so every function is deterministic and
// unit-testable with `node --test lib/console-core.test.ts`. The extension
// (`tuple-call-sidekick.ts`) imports these and wraps them in Pi's TUI surfaces;
// keeping the decidable logic here is what lets us prove the sidekick isn't hot
// garbage without a live call.

// ---------------------------------------------------------------------------
// Watch modes: the real-time ↔ summary spectrum.
// ---------------------------------------------------------------------------

export type WatchMode = "realtime" | "balanced" | "low_noise" | "periodic";

// Ordered loud → quiet, so "louder"/"quieter" is just an index step.
export const MODE_ORDER: WatchMode[] = ["realtime", "balanced", "low_noise", "periodic"];

// Each mode maps to a `transcription show --interval` value (null = flush on
// every pause). --watch-words still flushes early when a name is spoken.
export const MODE_INTERVAL: Record<WatchMode, string | null> = {
  realtime: null,
  balanced: "30s",
  low_noise: "2m",
  periodic: "5m",
};

export const MODE_DESC: Record<WatchMode, string> = {
  realtime: "flush on every pause — most responsive, for active pairing or troubleshooting",
  balanced: "batch up to ~30s — for normal back-and-forth meetings",
  low_noise: "batch up to ~2m — quieter, for presentations or long stretches of one voice",
  periodic: "batch up to ~5m — quietest, for solo sessions and long monologues",
};

// Short, human label for the status line's mode phrase.
export const MODE_LABEL: Record<WatchMode, string> = {
  realtime: "real-time",
  balanced: "summary · 30s",
  low_noise: "summary · 2m",
  periodic: "summary · 5m",
};

// Parse the compact duration strings accepted by Tuple CLI flags and config
// ("500ms", "30s", "2m"). Returns null for invalid input; callers decide
// whether that means "disabled" or "fall back to default".
export function parseDurationMs(s: string): number | null {
  const m = /^(\d+)(ms|s|m)$/.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "ms" ? n : m[2] === "s" ? n * 1000 : n * 60_000;
}

// Milliseconds between transcript batches for a mode, or null for realtime.
export function intervalMs(mode: WatchMode): number | null {
  const s = MODE_INTERVAL[mode];
  return s ? parseDurationMs(s) : null;
}

// Step toward realtime ("louder") or low_noise ("quieter"), clamping at the ends.
export function nextMode(current: WatchMode, direction: "louder" | "quieter"): WatchMode {
  const i = MODE_ORDER.indexOf(current);
  const base = i < 0 ? 0 : i;
  const next = direction === "louder" ? base - 1 : base + 1;
  const clamped = Math.max(0, Math.min(MODE_ORDER.length - 1, next));
  return MODE_ORDER[clamped]!;
}

export function isWatchMode(value: unknown): value is WatchMode {
  return typeof value === "string" && (MODE_ORDER as string[]).includes(value);
}

// What a call can open in: a fixed watch mode, or "auto" — the adaptive manager
// that opens in real-time to hear the start, then picks the mode from the call's
// shape (solo vs pairing) and re-evaluates as people join/leave and time passes.
export type CadenceSetting = WatchMode | "auto";

export function isCadenceSetting(value: unknown): value is CadenceSetting {
  return value === "auto" || isWatchMode(value);
}

// ---------------------------------------------------------------------------
// Screen watch: how closely to capture the shared screen. A SEPARATE axis from
// the transcript watch mode — you can follow a demo frame-by-frame while barely
// sampling the talk, or vice versa.
//   • off      — don't auto-capture.
//   • periodic — a frame when a share starts, then one every few minutes (a
//                light timeline for you; not fed to the agent).
//   • active   — a visible frame every few seconds for the user; not fed to the
//                agent unless it explicitly requests a one-off capture.
// ---------------------------------------------------------------------------

export type ScreenWatch = "off" | "periodic" | "active";

export const SCREEN_WATCH_ORDER: ScreenWatch[] = ["off", "periodic", "active"];

export function isScreenWatch(value: unknown): value is ScreenWatch {
  return typeof value === "string" && (SCREEN_WATCH_ORDER as string[]).includes(value);
}

export const SCREEN_WATCH_DESC: Record<ScreenWatch, string> = {
  off: "don't auto-capture the shared screen",
  periodic: "a frame when a share starts, then every few minutes",
  active: "a visible frame every few seconds for following a live demo",
};

// Milliseconds between captures for a screen-watch level, or null for "off".
export function screenWatchIntervalMs(watch: ScreenWatch, periodicMin: number, activeSec: number): number | null {
  if (watch === "off") return null;
  return watch === "active" ? activeSec * 1000 : periodicMin * 60_000;
}

// ---------------------------------------------------------------------------
// Config: user-tunable defaults, merged tolerantly over the built-ins.
// ---------------------------------------------------------------------------

export interface ConsoleConfig {
  /** Turn the whole Call Console UX off and behave like a plain feed. */
  consoleEnabled: boolean;
  /** Names Pi answers to, plus common Whisper mis-hearings. */
  watchWords: string[];
  /** Pace the call opens in: a fixed watch mode, or "auto" (adaptive). */
  defaultMode: CadenceSetting;
  /** Cap on the "call so far" backlog so a late join doesn't flood context. */
  catchupMaxLines: number;
  /** Each --wait returns empty after this much silence so the loop re-checks. */
  streamTimeout: string;
  /** The Tuple CLI binary to drive. "tuple" for prod, "tuple-staging" for the
   *  staging client. An env var TUPLE_CLI overrides this at launch. */
  cli: string;
  /** Auto mode: seconds of real-time capture at call start before the first
   *  evaluation, so the sidekick hears how the call opens. */
  autoCaptureSec: number;
  /** Auto mode: seconds to let a new joiner settle into the conversation before
   *  re-evaluating the mode, so the decision sees real back-and-forth. */
  autoSettleSec: number;
  /** Auto mode: seconds after a screen share starts/stops before re-evaluating —
   *  short, so the sidekick reacts quickly to a demo. */
  autoShareSettleSec: number;
  /** Auto mode: minutes between periodic re-evaluations ("is this still the
   *  right mode?") and quiet-mode check-ins. */
  autoPulseMin: number;
  /** Capture the shared screen on its own, without needing an agent turn, so you
   *  see what's presented even while the sidekick is quiet. */
  autoScreenshots: boolean;
  /** "periodic" screen-watch: minutes between captures while a share stays up (a
   *  fresh share is always captured immediately). */
  screenshotIntervalMin: number;
  /** "active" screen-watch: seconds between display-only captures while following a live demo. */
  screenshotActiveSec: number;
  /** Write recorded artifacts to a markdown file when the call ends. */
  exportNotes: boolean;
}

export const DEFAULT_CONFIG: ConsoleConfig = {
  consoleEnabled: true,
  watchWords: ["pi", "pie"],
  defaultMode: "auto",
  catchupMaxLines: 300,
  streamTimeout: "30s",
  cli: "tuple",
  autoCaptureSec: 30,
  autoSettleSec: 45,
  autoShareSettleSec: 5,
  autoPulseMin: 5,
  autoScreenshots: true,
  screenshotIntervalMin: 5,
  screenshotActiveSec: 15,
  exportNotes: true,
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

// Shallow-merge a raw parsed config over the defaults. Unknown keys are ignored,
// wrong-typed values fall back to the default for that key, and watch words are
// trimmed and de-duplicated. Never throws — a broken config degrades to defaults.
export function mergeConfig(raw: unknown): ConsoleConfig {
  const out: ConsoleConfig = { ...DEFAULT_CONFIG, watchWords: [...DEFAULT_CONFIG.watchWords] };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;

  if (typeof r.consoleEnabled === "boolean") out.consoleEnabled = r.consoleEnabled;
  if (isStringArray(r.watchWords)) out.watchWords = normalizeWords(r.watchWords);
  if (isCadenceSetting(r.defaultMode)) out.defaultMode = r.defaultMode;
  if (typeof r.catchupMaxLines === "number" && Number.isFinite(r.catchupMaxLines) && r.catchupMaxLines > 0) {
    out.catchupMaxLines = Math.floor(r.catchupMaxLines);
  }
  if (typeof r.streamTimeout === "string" && parseDurationMs(r.streamTimeout) != null) {
    out.streamTimeout = r.streamTimeout.trim();
  }
  if (typeof r.cli === "string" && r.cli.trim()) out.cli = r.cli.trim();
  for (const k of ["autoCaptureSec", "autoSettleSec", "autoShareSettleSec", "autoPulseMin", "screenshotIntervalMin", "screenshotActiveSec"] as const) {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = v;
  }
  if (typeof r.autoScreenshots === "boolean") out.autoScreenshots = r.autoScreenshots;
  if (typeof r.exportNotes === "boolean") out.exportNotes = r.exportNotes;
  return out;
}

// Trim, drop empties, lowercase, and de-duplicate a watch-word list, preserving
// first-seen order.
export function normalizeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    const t = w.trim().toLowerCase();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export function addWord(words: string[], word: string): string[] {
  return normalizeWords([...words, word]);
}

export function removeWord(words: string[], word: string): string[] {
  const target = word.trim().toLowerCase();
  return words.filter((w) => w.toLowerCase() !== target);
}

// ---------------------------------------------------------------------------
// Transcription stream args + wake-word detection.
// ---------------------------------------------------------------------------

// Build the `transcription show --wait` args for a mode. The non-obvious rule:
// the CLI rejects --watch-words without --interval, and realtime (no interval)
// flushes on every pause anyway — so watch words ride along only when an
// interval is set.
export function buildStreamArgs(
  watchWords: string[],
  mode: WatchMode,
  cursor: string,
  streamTimeout: string = DEFAULT_CONFIG.streamTimeout,
): string[] {
  const args = [
    "transcription", "show", "--wait",
    "--cursor", cursor,
    "--timeout", streamTimeout,
    "--with-events",
    "--format", "json",
  ];
  const interval = MODE_INTERVAL[mode];
  if (interval) {
    args.push("--interval", interval);
    const words = normalizeWords(watchWords);
    if (words.length) args.push("--watch-words", words.join(","));
  }
  return args;
}

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Watch-word presence is weaker than wake detection: it means the CLI likely
// flushed early because a configured word appeared, but not necessarily as an
// address to the agent.
export function buildContainsWatchWord(words: string[]): (text: string) => boolean {
  const normalized = normalizeWords(words);
  if (!normalized.length) return () => false;
  const alt = normalized.map(escapeRe).join("|");
  const re = new RegExp(`\\b(?:${alt})\\b`, "i");
  return (text: string): boolean => re.test(text);
}

// Whisper mishears the short name "Pi" ("pie", "py", …), so wake detection runs
// over a configurable set of homophones. A homophone counts when it looks like
// an address — direct vocative, third-person ask patterns, or common request
// cues. Deliberately permissive: a spurious wake costs one agent turn, and the
// agent's instructions already tell it to respond only when actually addressed,
// so there is no curated list of phrases to suppress.
export function buildIsWake(words: string[]): (text: string) => boolean {
  const normalized = normalizeWords(words);
  if (!normalized.length) return () => false;
  const alt = normalized.map(escapeRe).join("|");
  const cues =
    "can|could|would|will|should|please|are|is|do|does|did|have|what|why|how|when|where|who|tell|give|show|help|explain|check|look|see|here|you";
  const actionCues = "look|check|see|help|explain|review|debug|verify|summarize|find|answer|tell|show";
  const hey = new RegExp(`\\bhey\\s+(?:${alt})\\b`, "i");
  const cue = new RegExp(`\\b(?:${alt})\\s*[,:]?\\s+(?:${cues})\\b`, "i");
  const ask = new RegExp(`\\b(?:let'?s\\s+)?ask\\s+(?:${alt})\\b`, "i");
  const have = new RegExp(`\\bhave\\s+(?:${alt})\\s+(?:${actionCues})\\b`, "i");
  const getTo = new RegExp(`\\bget\\s+(?:${alt})\\s+to\\b`, "i");
  const trailing = new RegExp(`[,;:]\\s*(?:${alt})\\s*[?.!]?$`, "i");
  const bareVocative = normalized.includes("pi") ? /\bpi\s*[,:]/i : null;
  return (text: string): boolean => {
    if (bareVocative && bareVocative.test(text)) return true;
    return hey.test(text) || cue.test(text) || ask.test(text) || have.test(text) || getTo.test(text) || trailing.test(text);
  };
}

// ---------------------------------------------------------------------------
// Time formatting.
// ---------------------------------------------------------------------------

export function timestampMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value * 1000;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return Number.POSITIVE_INFINITY;
}

export function hms(value: unknown): string {
  const ts = timestampMs(value);
  return Number.isFinite(ts) ? new Date(ts).toISOString().slice(11, 19) : "--:--:--";
}

// mm:ss for a duration in ms (clamped at zero). Rolls into h:mm:ss past an hour.
export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Whole seconds until the next batch flush (clamped at zero, never negative).
export function countdownSec(nextFlushMs: number | null, nowMs: number): number | null {
  if (nextFlushMs == null || !Number.isFinite(nextFlushMs)) return null;
  return Math.max(0, Math.ceil((nextFlushMs - nowMs) / 1000));
}

// ---------------------------------------------------------------------------
// HUD model — structured data the widget renders. Pure so it can be asserted.
// ---------------------------------------------------------------------------

export interface ConsoleState {
  mode: WatchMode;
  watchWords: string[];
  autoEnabled: boolean;
  ended: boolean;
  endedReason: FeedTerminalReason | null;
  endedAtMs: number | null;
  feedHealth: FeedHealth;
  callStartMs: number | null;
  lastFlushMs: number | null;
  nextFlushMs: number | null;
  batchCount: number;
  screenSharing: boolean;
  screenWatch: ScreenWatch;
  lastSummaryMs: number | null;
  artifacts: Artifact[];
}

export type FeedHealth =
  | { status: "ok" }
  | { status: "erroring"; sinceMs: number }
  | { status: "recovered" };

export type FeedTerminalReason = "call_ended" | "recording_ended";

// ---------------------------------------------------------------------------
// Auto cadence: pick and re-pick the watch mode from the call's shape.
//
// The manager opens in real-time to hear how the call starts, then evaluates on
// three triggers: the opening window elapsing, the roster changing (someone
// joins/leaves), and a periodic timer. Every due evaluation goes to the agent —
// it judges solo-vs-pairing (and everything else about the call's shape) from
// the roster line in the prompt; there's no cheap pre-filter here. All the
// *timing* logic is here and pure, so the extension just wires triggers to
// actions.
// ---------------------------------------------------------------------------

export interface AutoState {
  enabled: boolean;
  captured: boolean; // the opening real-time capture window has elapsed + been evaluated
  lastPulseMs: number | null; // last evaluation / check-in
  lastPulseBatchCount: number; // batch count at the last evaluation, for quiet-call gating
  pendingPulseMs: number | null; // an event scheduled a settle-then-evaluate
  prevParticipants: string[]; // last-seen roster, to detect joins/leaves
  prevSharing: boolean; // last-seen screen-share state, to detect start/stop
  prevSharedContentVersion: number; // last-seen focused window / URL event version
}

export function newAutoState(enabled: boolean): AutoState {
  return {
    enabled,
    captured: false,
    lastPulseMs: null,
    lastPulseBatchCount: 0,
    pendingPulseMs: null,
    prevParticipants: [],
    prevSharing: false,
    prevSharedContentVersion: 0,
  };
}

export interface ParticipantDelta {
  joined: string[];
  left: string[];
}

export function diffParticipants(prev: string[], curr: string[]): ParticipantDelta {
  const p = new Set(prev);
  const c = new Set(curr);
  return { joined: curr.filter((n) => !p.has(n)), left: prev.filter((n) => !c.has(n)) };
}

// Schedule an evaluation at `atMs`, keeping the earliest already-pending time so
// two near-simultaneous events (a join and a share) collapse into one pulse.
function schedulePulse(auto: AutoState, atMs: number): number {
  return auto.pendingPulseMs == null ? atMs : Math.min(auto.pendingPulseMs, atMs);
}

// Fold a roster change into the auto state: when the set of participants changes,
// schedule an evaluation a settle-delay later, so a new joiner has time to talk
// before we re-decide. Returns the updated state and whether anything changed.
export function autoOnRoster(
  auto: AutoState,
  curr: string[],
  nowMs: number,
  settleMs: number,
): { auto: AutoState; changed: boolean } {
  if (!auto.enabled) return { auto: { ...auto, prevParticipants: curr }, changed: false };
  const { joined, left } = diffParticipants(auto.prevParticipants, curr);
  if (joined.length === 0 && left.length === 0) return { auto, changed: false };
  return { auto: { ...auto, prevParticipants: curr, pendingPulseMs: schedulePulse(auto, nowMs + settleMs) }, changed: true };
}

// Fold a screen-share start/stop into the auto state: a share going up or down is
// a strong signal to re-evaluate both axes (is this a demo to watch closely?), so
// schedule a quick evaluation.
export function autoOnSharing(
  auto: AutoState,
  sharing: boolean,
  nowMs: number,
  settleMs: number,
): { auto: AutoState; changed: boolean } {
  if (!auto.enabled) return { auto: { ...auto, prevSharing: sharing }, changed: false };
  if (sharing === auto.prevSharing) return { auto, changed: false };
  return { auto: { ...auto, prevSharing: sharing, pendingPulseMs: schedulePulse(auto, nowMs + settleMs) }, changed: true };
}

// Focused content changes (window title/app/URL) are cheaper than screenshots and
// often enough to understand what is being shared, so they also trigger a quick
// re-evaluation of the two dials.
export function autoOnSharedContent(
  auto: AutoState,
  version: number,
  nowMs: number,
  settleMs: number,
): { auto: AutoState; changed: boolean } {
  if (!auto.enabled) return { auto: { ...auto, prevSharedContentVersion: version }, changed: false };
  if (version === auto.prevSharedContentVersion) return { auto, changed: false };
  return {
    auto: { ...auto, prevSharedContentVersion: version, pendingPulseMs: schedulePulse(auto, nowMs + settleMs) },
    changed: true,
  };
}

export type AutoDue = "capture" | "pulse" | null;

// Whether the auto manager owes an action right now:
//   • "capture" — the opening real-time window elapsed; make the first decision.
//   • "pulse"   — a scheduled settle fired, or the periodic interval came due.
// Before the first capture, only "capture" can fire (roster settles wait for it).
export function autoDue(
  auto: AutoState,
  nowMs: number,
  callStartMs: number | null,
  captureMs: number,
  pulseMs: number,
  batchCount = 0,
): AutoDue {
  if (!auto.enabled) return null;
  if (!auto.captured) {
    return callStartMs != null && nowMs >= callStartMs + captureMs ? "capture" : null;
  }
  if (auto.pendingPulseMs != null && nowMs >= auto.pendingPulseMs) return "pulse";
  if (auto.lastPulseMs != null && nowMs >= auto.lastPulseMs + pulseMs && batchCount > auto.lastPulseBatchCount) return "pulse";
  return null;
}

// Record that an evaluation just happened: latch `captured`, reset the periodic
// timer, and clear any pending settle.
export function autoMarkPulsed(auto: AutoState, nowMs: number, batchCount = auto.lastPulseBatchCount): AutoState {
  return { ...auto, captured: true, lastPulseMs: nowMs, lastPulseBatchCount: batchCount, pendingPulseMs: null };
}

// The terse instruction handed to the agent for an evaluation. Kept here (pure)
// so the prompt is centralized and testable. Never contains call content — only
// the roster, whether a screen is shared, and the two current settings.
export function buildAutoEvalPrompt(
  mode: WatchMode,
  screenWatch: ScreenWatch,
  participants: string,
  sharing: boolean,
  due: AutoDue,
  sharedContent: SharedContent[] = [],
): string {
  const opener = due === "capture" ? "The opening of the call has been captured." : "Something changed — re-evaluate.";
  const shareLine = sharing
    ? `Someone is sharing their screen right now.`
    : `No one is sharing a screen right now.`;
  // The screen axis is only a live decision while a share is up: auto-capture
  // does nothing without one, and a fresh share always captures immediately and
  // triggers a re-evaluation. So when no one is sharing, say so and forbid a
  // speculative set_screen_watch instead of inviting one.
  const screenPara = sharing
    ? `Screen watch (set_screen_watch): "active" for visible frames every few seconds when someone is demoing or the screen is the point; "periodic" for a light timeline; "off" when the screen doesn't matter. Auto-captured frames are display-only receipts and are not fed to your vision; call capture_screen once when you need to inspect or summarize the current screen. This is separate from the transcript pace — you can keep a demo visible while barely sampling the talk.`
    : `The screen-watch axis is idle while no one shares — do not call set_screen_watch now; you'll be re-evaluated the moment a share starts (which is always captured immediately regardless of the level).`;
  const sharedContentLine = sharedContent.length
    ? `Shared content signal: ${formatSharedContentList(sharedContent)}. Prefer the shared-content title/app/URL signal before asking for screenshots; call capture_screen only when visual details matter.`
    : sharing
      ? `No shared-content title/app/URL signal is available yet; use screenshots only when the visual details matter.`
      : null;
  return [
    `[auto-cadence] ${opener} On the call: ${participants}. ${shareLine}`,
    `Current settings — transcript watch: ${mode}; screen watch: ${screenWatch}. These are independent; set each to fit what's happening.`,
    `Transcript watch (set_watch_mode): real-time for active back-and-forth pairing; a summary mode (balanced, low_noise, periodic) when it's quieter — a presentation, monologue, or long focused stretch. The topic may have shifted since last time (e.g. "let's try this in real time") — react to that.`,
    sharedContentLine,
    screenPara,
    `Change only what should change; if a setting already fits, leave it. If something notable happened, add one short post_summary. Keep this minimal — don't narrate the check itself.`,
  ].filter(Boolean).join("\n");
}

// The one status block, shown below the editor: compact, priority-ordered, and
// icon-free except for the feed warning. Line 1 puts the most important item
// first so terminal truncation eats lower-priority state; line 2 keeps wake words
// and notes glanceable without spelling out every slash command.
export function consoleStatusLines(state: ConsoleState, nowMs: number, width = Number.POSITIVE_INFINITY): string[] {
  if (state.ended) {
    const endedAt = state.endedAtMs ?? nowMs;
    const elapsed = state.callStartMs != null ? formatElapsed(endedAt - state.callStartMs) : "unknown duration";
    const notes = notesLabel(state.artifacts.length);
    const words = wakeLabel(state.watchWords);
    const label = state.endedReason === "recording_ended" ? "recording stopped" : "call ended";
    return [
      `${label} · ${elapsed} · ${notes} — /notes to browse`,
      `${words} · /notes /recap`,
    ];
  }
  const warning = state.feedHealth.status === "erroring" ? `⚠ feed retrying (${formatFeedRetryAge(nowMs - state.feedHealth.sinceMs)})` : null;
  const modeParts: string[] = [];
  if (state.autoEnabled) modeParts.push("auto");
  if (state.mode === "realtime") {
    modeParts.push("real-time");
  } else {
    const every = MODE_INTERVAL[state.mode] ?? ""; // "30s" / "2m" / "5m"
    const cd = countdownSec(state.nextFlushMs, nowMs);
    modeParts.push(`summary ${every}`);
    if (cd != null) modeParts.push(nextLabel(cd));
  }
  const elapsed = state.callStartMs != null ? formatElapsed(nowMs - state.callStartMs) : null;
  const screen = state.screenSharing ? (state.screenWatch === "off" ? "screen: off (sharing)" : `screen: ${state.screenWatch}`) : null;
  const line1 = compactStatusLine({ warning, modeParts, elapsed, screen, width });

  const line2Parts = [wakeLabel(state.watchWords)];
  if (state.artifacts.length >= 1) line2Parts.push(notesLabel(state.artifacts.length));
  line2Parts.push("/ for commands");
  return [line1, line2Parts.join(" · ")];
}

function wakeLabel(words: string[]): string {
  return `Wake: ${words.length ? words.join(", ") : "none"}`;
}

function notesLabel(count: number): string {
  return `${count} ${count === 1 ? "note" : "notes"}`;
}

function nextLabel(cd: number): string {
  if (cd >= 90) return `next ~${Math.round(cd / 60)}m`;
  return `next ${cd}s`;
}

function compactStatusLine(input: { warning: string | null; modeParts: string[]; elapsed: string | null; screen: string | null; width: number }): string {
  const build = (opts: { labelElapsed: boolean; shortNext: boolean; includeScreen: boolean; includeElapsed: boolean }) => {
    const parts: string[] = [];
    if (input.warning) parts.push(input.warning);
    for (const p of input.modeParts) {
      if (opts.shortNext && p.startsWith("next ")) {
        parts.push(p.replace(/^next /, ""));
      } else {
        parts.push(p);
      }
    }
    if (opts.includeElapsed && input.elapsed) parts.push(opts.labelElapsed ? `on call ${input.elapsed}` : input.elapsed);
    if (opts.includeScreen && input.screen) parts.push(input.screen);
    return parts.join(" · ");
  };
  const attempts = [
    { labelElapsed: true, shortNext: false, includeScreen: true, includeElapsed: true },
    { labelElapsed: false, shortNext: false, includeScreen: true, includeElapsed: true },
    { labelElapsed: false, shortNext: true, includeScreen: true, includeElapsed: true },
    { labelElapsed: false, shortNext: true, includeScreen: false, includeElapsed: true },
    { labelElapsed: false, shortNext: true, includeScreen: false, includeElapsed: false },
  ];
  for (const opts of attempts) {
    const line = build(opts);
    if (line.length <= input.width) return line;
  }
  return build(attempts[attempts.length - 1]!);
}

export function formatFeedRetryAge(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 90) return `${sec}s`;
  return `${Math.floor(sec / 60)}m`;
}

// ---------------------------------------------------------------------------
// Agent delivery + proactive screenshot decisions.
//
// Quiet deliveries must be appended to context immediately — pi's
// `sendMessage(msg, {})` with no options — not queued with `deliverAs:
// "nextTurn"`. pi only drains that nextTurn queue when a real user prompt is
// submitted; turns triggered by an extension (the auto-cadence heartbeat,
// urgent batches) never see it, which left the sidekick blind the moment it
// left realtime mode.
// ---------------------------------------------------------------------------

export type Delivery = "trigger" | "append";

export function deliveryFor(mode: WatchMode, opts: { urgent?: boolean; contextOnly?: boolean } = {}): Delivery {
  if (opts.contextOnly) return "append";
  if (opts.urgent) return "trigger";
  return mode === "realtime" ? "trigger" : "append";
}

export interface ScreenshotDecisionInput {
  sharing: boolean;
  prevSharing: boolean;
  lastShotMs: number | null;
  screenWatch: ScreenWatch;
  screenshotIntervalMin: number;
  screenshotActiveSec: number;
  nowMs: number;
}

export type ScreenshotAction =
  | { kind: "capture"; reason: "just started sharing" | "live"; feedModel: boolean }
  | { kind: "none" };

export interface ScreenshotDecision {
  action: ScreenshotAction;
  prevSharing: boolean;
  lastShotMs: number | null;
}

// Decide whether a screen frame is due. Throttling is by attempt: when a capture
// is due, lastShotMs advances even if the capture later fails, matching the
// shell's behavior and avoiding a retry every heartbeat.
export function screenshotDecision(input: ScreenshotDecisionInput): ScreenshotDecision {
  const started = input.sharing && !input.prevSharing;
  if (!input.sharing) {
    return { action: { kind: "none" }, prevSharing: false, lastShotMs: null };
  }
  const shotIntervalMs = screenWatchIntervalMs(input.screenWatch, input.screenshotIntervalMin, input.screenshotActiveSec);
  if (shotIntervalMs == null) {
    return { action: { kind: "none" }, prevSharing: true, lastShotMs: input.lastShotMs };
  }
  const due = started || input.lastShotMs == null || input.nowMs >= input.lastShotMs + shotIntervalMs;
  if (!due) return { action: { kind: "none" }, prevSharing: true, lastShotMs: input.lastShotMs };
  return {
    action: { kind: "capture", reason: started ? "just started sharing" : "live", feedModel: false },
    prevSharing: true,
    lastShotMs: input.nowMs,
  };
}

// ---------------------------------------------------------------------------
// Artifacts — findings, fact-checks, notes the agent records during the call.
// ---------------------------------------------------------------------------

export type ArtifactKind = "finding" | "fact_check" | "note";

export interface Artifact {
  id: number;
  kind: ArtifactKind;
  title: string;
  body: string;
  atMs: number;
}

export const ARTIFACT_ICON: Record<ArtifactKind, string> = {
  finding: "🔍",
  fact_check: "✔",
  note: "📝",
};

export const ARTIFACT_LABEL: Record<ArtifactKind, string> = {
  finding: "Finding",
  fact_check: "Fact-check",
  note: "Note",
};

export function coerceArtifactKind(value: unknown): ArtifactKind {
  const v = String(value ?? "").trim().toLowerCase().replace(/[\s-]/g, "_");
  if (v === "finding" || v === "fact_check" || v === "note") return v;
  if (v === "factcheck" || v === "fact") return "fact_check";
  return "note";
}

// Append an artifact, assigning the next id. Identical (kind,title,body) triples
// are treated as duplicates and skipped, so an agent re-recording the same note
// doesn't stack. Returns the (possibly unchanged) list plus the stored artifact.
export function addArtifact(
  list: Artifact[],
  input: { kind: ArtifactKind; title: string; body: string; atMs: number },
): { list: Artifact[]; artifact: Artifact | null; added: boolean } {
  const title = input.title.trim();
  const body = input.body.trim();
  const dup = list.find((a) => a.kind === input.kind && a.title === title && a.body === body);
  if (dup) return { list, artifact: dup, added: false };
  const id = list.reduce((max, a) => Math.max(max, a.id), 0) + 1;
  const artifact: Artifact = { id, kind: input.kind, title, body, atMs: input.atMs };
  return { list: [...list, artifact], artifact, added: true };
}

// One-line summary of an artifact for the /notes list.
export function artifactListLabel(a: Artifact): string {
  return `${ARTIFACT_ICON[a.kind]} ${a.title}`;
}

export interface ArtifactMarkdownInput {
  artifacts: Artifact[];
  callStartMs: number | null;
  participants: string[];
  sessionName: string;
  generatedAtMs: number;
}

export function buildArtifactsMarkdown(input: ArtifactMarkdownInput): string {
  const callDate = new Date(input.callStartMs ?? input.generatedAtMs).toISOString();
  const generated = new Date(input.generatedAtMs).toISOString();
  const participants = input.participants.length ? input.participants.join(", ") : "unknown";
  const lines = [
    "---",
    `call_date: ${JSON.stringify(callDate)}`,
    `generated_at: ${JSON.stringify(generated)}`,
    `session_name: ${JSON.stringify(input.sessionName)}`,
    `participants: ${JSON.stringify(participants)}`,
    "---",
    "",
    `# ${input.sessionName || "Tuple call notes"}`,
    "",
    `Participants: ${participants}`,
    "",
  ];
  for (const a of input.artifacts) {
    lines.push(`## ${ARTIFACT_LABEL[a.kind]}: ${a.title}`, "", `Time: ${hms(a.atMs / 1000)}`, "", a.body, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// Unified-record-stream parsing.
//
// Each record is `{ type, time, data }` — `type` is either a call-event category
// (user_joined, recording_ended, …) or a transcription marker
// (transcription_started/finished/dropped); only transcription_finished carries
// text. The terminal call-end line keeps the legacy `{ kind: "status", status:
// "call_ended" }` shape. Parsing is deterministic given the mutable FeedState it
// threads (learned speaker names, screen-share flag, call-ended flag), so it can
// be unit-tested without a live daemon.
// ---------------------------------------------------------------------------

export type Speaker = { name: string; email: string };
export type ParsedLine = { line: string; urgent: boolean; mentioned: boolean; sortMs: number };

export interface FeedState {
  speakers: Record<string, Speaker>;
  screenSharing: boolean;
  sharedContent: Record<string, SharedContent>;
  sharedContentVersion: number;
  ended: boolean;
  endedReason: FeedTerminalReason | null;
}

export interface SharedContent {
  userId: string;
  userName: string;
  title: string;
  appName: string;
  appId: string;
  url: string;
  windowId: string;
  atMs: number;
}

export function newFeedState(): FeedState {
  return { speakers: {}, screenSharing: false, sharedContent: {}, sharedContentVersion: 0, ended: false, endedReason: null };
}

const SKIP_EVENT_CATEGORIES = new Set(["user_audio_started", "user_audio_stopped"]);
const STOP_OR_END_EVENT_CATEGORIES = new Set(["recording_ended"]);
const SCREEN_START = "user_screen_sharing_started";
const SCREEN_STOP = "user_screen_sharing_stopped";
const SHARED_CONTENT_CHANGED = "shared_content_changed";

function userIdKey(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return "";
}

function pickString(...values: unknown[]): string {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

function pickValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "value" in value) return pickString((value as { value?: unknown }).value);
  return "";
}

function compactText(value: string, max = 120): string {
  const t = value.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, Math.max(0, max - 1))}…` : t;
}

function compactUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (u.protocol === "file:") return "file://";
    if (u.protocol === "http:" || u.protocol === "https:") {
      const path = u.pathname === "/" ? "" : u.pathname;
      return compactText(`${u.origin}${path}`, 160);
    }
    return compactText(`${u.protocol}//${u.host}${u.pathname}`, 160);
  } catch {
    return compactText(raw.split(/[?#]/)[0] || raw, 160);
  }
}

function displayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const u = user as { full_name?: unknown; short_name?: unknown; email?: unknown };
  return pickString(u.full_name, u.short_name, u.email);
}

function resolveSpeaker(state: FeedState, userId: unknown): string {
  const id = userIdKey(userId);
  return state.speakers[id]?.name || id || "unknown";
}

function readSharedContent(data: any, recTime: unknown, state: FeedState): SharedContent | null {
  const userId = userIdKey(data.user_id ?? data.user);
  const key = userId || "unknown";
  const title = compactText(pickValue(data.title));
  const appName = compactText(pickValue(data.app?.name));
  const appId = compactText(pickValue(data.app?.id));
  const url = compactUrl(pickValue(data.url));
  const windowId = pickString(String(data.window_id ?? ""));
  if (!title && !appName && !appId && !url) return null;
  const at = timestampMs(recTime);
  return {
    userId: key,
    userName: resolveSpeaker(state, userId),
    title,
    appName,
    appId,
    url,
    windowId,
    atMs: Number.isFinite(at) ? at : 0,
  };
}

export function sharedContentEntries(state: FeedState): SharedContent[] {
  return Object.values(state.sharedContent).sort((a, b) => a.atMs - b.atMs || a.userId.localeCompare(b.userId));
}

export function sharedContentLabel(content: SharedContent): string {
  const who = content.userName || content.userId || "unknown";
  const app = content.appName || content.appId || "unknown app";
  const title = content.title || "untitled window";
  return [who, app, title, content.url].filter(Boolean).join(" · ");
}

function formatSharedContentList(entries: SharedContent[]): string {
  return entries.map(sharedContentLabel).join("; ");
}

export function readEnvelope(
  raw: string,
  state: FeedState,
  isWake: (t: string) => boolean,
  isMention: (t: string) => boolean = () => false,
): ParsedLine | null {
  let rec: any;
  try {
    rec = JSON.parse(raw);
  } catch {
    return null;
  }
  if (String(rec?.kind ?? "") === "status") {
    if (String(rec.status ?? "") === "call_ended") {
      state.ended = true;
      state.endedReason = "call_ended";
      return { line: "- event: call_ended", urgent: true, mentioned: false, sortMs: Number.MAX_SAFE_INTEGER };
    }
    return null;
  }
  const type = String(rec?.type ?? "");
  if (!type) return null;
  const data = rec.data ?? {};

  if (type === "transcription_finished") {
    const text = String(data.text ?? "");
    if (!text.trim()) return null;
    const when = data.start || rec.time;
    const urgent = isWake(text);
    return { line: `- ${hms(when)} ${resolveSpeaker(state, data.user_id)}: ${text}`, urgent, mentioned: !urgent && isMention(text), sortMs: timestampMs(when) };
  }
  if (type === "transcription_started" || type === "transcription_dropped") return null;

  if (type === SCREEN_START) state.screenSharing = true;
  if (type === SCREEN_STOP) {
    state.screenSharing = false;
    const stoppedUserId = userIdKey(data.user_id ?? data.user);
    if (stoppedUserId && state.sharedContent[stoppedUserId]) {
      delete state.sharedContent[stoppedUserId];
      state.sharedContentVersion += 1;
    } else if (!stoppedUserId && Object.keys(state.sharedContent).length) {
      state.sharedContent = {};
      state.sharedContentVersion += 1;
    }
  }
  if (data.user) {
    const id = userIdKey(data.user);
    const name = displayName(data.user);
    const email = pickString((data.user as any).email);
    if (id && (name || email)) {
      state.speakers[id] = {
        name: name || state.speakers[id]?.name || "",
        email: email || state.speakers[id]?.email || "",
      };
    }
  }
  if (type === SHARED_CONTENT_CHANGED) {
    const content = readSharedContent(data, rec.time, state);
    if (!content) return null;
    state.sharedContent[content.userId] = content;
    state.sharedContentVersion += 1;
    const app = content.appName || content.appId || "unknown app";
    const title = content.title || "untitled window";
    const url = content.url ? ` · ${content.url}` : "";
    return {
      line: `- ${hms(rec.time)} shared content: ${content.userName || content.userId} focused ${app}: ${title}${url}`,
      urgent: false,
      mentioned: false,
      sortMs: timestampMs(rec.time),
    };
  }
  if (SKIP_EVENT_CATEGORIES.has(type)) return null;
  if (STOP_OR_END_EVENT_CATEGORIES.has(type)) {
    state.ended = true;
    state.endedReason = "recording_ended";
  }
  return {
    line: `- ${hms(rec.time)} event: ${type}${data.message ? ` (${data.message})` : ""}`,
    urgent: STOP_OR_END_EVENT_CATEGORIES.has(type),
    mentioned: false,
    sortMs: timestampMs(rec.time),
  };
}

// Unique speaker names the feed has learned so far, first-seen order.
export function participantNames(state: FeedState): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of Object.values(state.speakers)) {
    const name = s.name?.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Live call-state block appended to every LLM call via pi's `context` event
// (see buildContextInjection in feed.ts), so the agent always knows the room
// without re-deriving it.
// ---------------------------------------------------------------------------

export function buildCallMetaBlock(state: ConsoleState, participants: string[], nowMs: number, sharedContent: SharedContent[] = []): string {
  const elapsed = state.callStartMs != null ? formatElapsed(nowMs - state.callStartMs) : "unknown";
  const parts = participants.length ? participants.join(", ") : "unknown so far";
  const words = state.watchWords.length ? state.watchWords.join(", ") : "none";
  const lines = [
    "## Current call state (live — refreshed each turn)",
    `- Participants: ${parts}`,
    `- Elapsed: ${elapsed}`,
    `- Watch mode: ${MODE_LABEL[state.mode]}`,
    `- Watch words: ${words}`,
    `- Notes recorded so far: ${state.artifacts.length}`,
  ];
  for (const content of sharedContent) {
    lines.push(`- Shared content: ${sharedContentLabel(content)}`);
  }
  return lines.join("\n");
}

// A memorable, searchable session name so `pi -c` / `pi -r` can find this call
// later. Date is UTC yyyy-mm-dd for determinism.
export function sessionNameFor(participants: string[], startMs: number): string {
  const date = new Date(startMs).toISOString().slice(0, 10);
  const names = participants.slice(0, 3).join(", ");
  return names ? `Tuple call · ${names} · ${date}` : `Tuple call · ${date}`;
}

// ---------------------------------------------------------------------------
// Editor autocomplete: @participant and #note triggers.
// ---------------------------------------------------------------------------

// Given the text before the cursor and a trigger char ("@" or "#"), return the
// query typed after the trigger (possibly empty string ""), or null if the
// trigger isn't the active token. Empty-string vs null distinguishes "just typed
// @" (offer everything) from "not triggering".
export function matchTrigger(before: string, char: string): string | null {
  const re = new RegExp(`(?:^|\\s)${escapeRe(char)}([\\w.\\-]*)$`);
  const m = re.exec(before);
  return m ? (m[1] ?? "") : null;
}

export function parseBatch(
  out: string,
  state: FeedState,
  isWake: (t: string) => boolean,
  isMention: (t: string) => boolean = () => false,
): { lines: string[]; urgent: boolean; mentioned: boolean } {
  const records: ParsedLine[] = [];
  for (const raw of out.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const rec = readEnvelope(trimmed, state, isWake, isMention);
    if (rec) records.push(rec);
  }
  // Records without a parseable timestamp (sortMs === Infinity) sort to the end
  // deterministically — never produce NaN in the comparator.
  const key = (r: ParsedLine) => (Number.isFinite(r.sortMs) ? r.sortMs : Number.MAX_SAFE_INTEGER);
  records.sort((a, b) => key(a) - key(b));
  return { lines: records.map((r) => r.line), urgent: records.some((r) => r.urgent), mentioned: records.some((r) => r.mentioned) };
}

// ANSI-safe truncation to a column width. This intentionally strips styling only
// when truncation is needed; preserving nested ANSI spans correctly would need a
// terminal-aware slicer, and this helper stays dependency-free.
export function truncate(s: string, width: number): string {
  if (width <= 0) return "";
  // eslint-disable-next-line no-control-regex
  const visible = s.replace(/\x1b\[[0-9;]*m/g, "");
  if (visible.length <= width) return s;
  return visible.slice(0, Math.max(0, width - 1)) + "…";
}
