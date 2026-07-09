import { execFile, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";

import {
  addWord,
  buildContainsWatchWord,
  buildIsWake,
  type AutoState,
  type ConsoleConfig,
  type ConsoleState,
  DEFAULT_CONFIG,
  type FeedState,
  intervalMs,
  mergeConfig,
  MODE_DESC,
  MODE_LABEL,
  newAutoState,
  newFeedState,
  normalizeWords,
  removeWord,
  type ScreenWatch,
  type WatchMode,
} from "./console-core.ts";

const execFileP = promisify(execFile);

// Pi's public extension types do not currently expose the full TUI/context shape
// used by commands and tools, so this local seam captures only what this extension
// reads. The TUI/theme callback values remain any because they are renderer-owned.
export interface SidekickCtx {
  hasUI?: boolean;
  ui?: {
    notify?: (message: string, level?: "info" | "warning" | "error" | string) => void;
    custom?: <T>(
      renderer: (tui: any, theme: any, kb: any, done: (value: T) => void) => any,
      options?: { overlay?: boolean },
    ) => Promise<T>;
    setWidget?: (id: string, factory: (tui: any, theme: any) => any, options?: { placement?: string }) => void;
    input?: (title: string, placeholder?: string) => Promise<string | null | undefined>;
    addAutocompleteProvider?: (provider: any) => void;
  };
  sessionManager?: {
    getEntries?: () => any[];
  };
}

export interface RuntimeState {
  config: ConsoleConfig;
  cli: string;
  state: ConsoleState;
  autoState: AutoState;
  feed: FeedState;
  isWake: (text: string) => boolean;
  isMention: (text: string) => boolean;
  stopped: boolean;
  feedAlertSent: boolean;
  statusTui: { requestRender: () => void } | null;
  statusTimer: ReturnType<typeof setInterval> | null;
  streamAbort: AbortController | null;
  streamChild: ChildProcess | null;
  streamRestartRequested: boolean;
  feedRetryDelayMs: number;
  feedRetryDelayAfterAlertMs: number;
  uiReady: boolean;
  lastSessionName: string;
  prevSharing: boolean;
  lastShotMs: number | null;
  capturing: boolean;
  notesExported: boolean;
  lockPath: string | null;
}

export type CaptureResult = { jpegB64: string; display: { image: string; mimeType: string } };

export function loadConsoleConfig(): ConsoleConfig {
  const cwd = process.cwd();
  const dirs = [
    process.env.SIDEKICK_PI_DIR,
    `${cwd}/.pi/extensions`,
    safeDir(),
    cwd,
  ];
  for (const dir of dirs) {
    if (!dir) continue;
    try {
      const raw = readFileSync(`${dir}/sidekick.config.json`, "utf8");
      return mergeConfig(JSON.parse(raw));
    } catch {
      // try the next candidate
    }
  }
  return mergeConfig(undefined);
}

function safeDir(): string | null {
  try {
    return (import.meta as unknown as { dirname?: string }).dirname ?? null;
  } catch {
    return null;
  }
}

export function createRuntime(config: ConsoleConfig): RuntimeState {
  const autoOn = config.defaultMode === "auto";
  const state: ConsoleState = {
    mode: autoOn ? "realtime" : config.defaultMode,
    watchWords: [...config.watchWords],
    autoEnabled: autoOn,
    ended: false,
    endedReason: null,
    endedAtMs: null,
    feedHealth: { status: "ok" },
    callStartMs: null,
    lastFlushMs: null,
    nextFlushMs: null,
    batchCount: 0,
    screenSharing: false,
    screenWatch: "periodic",
    lastSummaryMs: null,
    artifacts: [],
  };
  return {
    config,
    cli: (process.env.TUPLE_CLI || "").trim() || config.cli || DEFAULT_CONFIG.cli,
    state,
    autoState: newAutoState(autoOn),
    feed: newFeedState(),
    isWake: buildIsWake(state.watchWords),
    isMention: buildContainsWatchWord(state.watchWords),
    stopped: false,
    feedAlertSent: false,
    statusTui: null,
    statusTimer: null,
    streamAbort: null,
    streamChild: null,
    streamRestartRequested: false,
    feedRetryDelayMs: 2000,
    feedRetryDelayAfterAlertMs: 10_000,
    uiReady: false,
    lastSessionName: "",
    prevSharing: false,
    lastShotMs: null,
    capturing: false,
    notesExported: false,
    lockPath: null,
  };
}

export function refreshStatus(runtime: RuntimeState) {
  try {
    runtime.statusTui?.requestRender();
  } catch {
    // best-effort
  }
}

export function setAutoState(runtime: RuntimeState, autoState: AutoState) {
  runtime.autoState = autoState;
  runtime.state.autoEnabled = autoState.enabled;
}

export function setWatchWords(runtime: RuntimeState, words: string[]) {
  runtime.state.watchWords = normalizeWords(words);
  runtime.isWake = buildIsWake(runtime.state.watchWords);
  runtime.isMention = buildContainsWatchWord(runtime.state.watchWords);
  restartTranscriptFeed(runtime);
  refreshStatus(runtime);
}

export function addWatchWord(runtime: RuntimeState, word: string) {
  setWatchWords(runtime, addWord(runtime.state.watchWords, word));
}

export function removeWatchWord(runtime: RuntimeState, word: string) {
  setWatchWords(runtime, removeWord(runtime.state.watchWords, word));
}

export function setScreenWatch(runtime: RuntimeState, screenWatch: ScreenWatch) {
  runtime.state.screenWatch = screenWatch;
  runtime.lastShotMs = null;
  refreshStatus(runtime);
}

export function applyMode(runtime: RuntimeState, ctx: SidekickCtx | undefined, mode: WatchMode, note?: string) {
  runtime.state.mode = mode;
  recomputeNextFlush(runtime);
  restartTranscriptFeed(runtime);
  refreshStatus(runtime);
  try {
    if (ctx?.hasUI) ctx.ui?.notify?.(`Watch pace: ${MODE_LABEL[mode]} — ${note ?? MODE_DESC[mode]}`, "info");
  } catch {
    // notify is best-effort
  }
}

export function tupleStream(runtime: RuntimeState, args: string[], timeoutMs = 45_000): Promise<string> {
  runtime.streamAbort = new AbortController();
  runtime.streamRestartRequested = false;
  return new Promise((resolve, reject) => {
    const child = execFile(runtime.cli, args, {
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      signal: runtime.streamAbort?.signal,
    }, (err, stdout) => {
      runtime.streamChild = null;
      runtime.streamAbort = null;
      if (err) reject(err);
      else resolve(stdout);
    });
    runtime.streamChild = child;
  });
}

export function recomputeNextFlush(runtime: RuntimeState, nowMs = Date.now()) {
  const iv = intervalMs(runtime.state.mode);
  runtime.state.nextFlushMs = iv == null ? null : nowMs + iv;
}

// A tuple CLI child that ignores SIGTERM would otherwise wedge mode switches
// (the follow loop awaits the exec callback) and outlive shutdown — escalate
// to SIGKILL if the live child hasn't exited within 3 seconds of the
// abort/kill attempt above. Shared by restart and stop so both escalate the
// same way.
function escalateKill(runtime: RuntimeState) {
  const child = runtime.streamChild;
  if (child) {
    const killTimer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { /* escalation is best-effort */ }
    }, 3000);
    killTimer.unref?.();
    child.once("exit", () => clearTimeout(killTimer));
  }
}

export function restartTranscriptFeed(runtime: RuntimeState) {
  recomputeNextFlush(runtime);
  if (!runtime.streamAbort && !runtime.streamChild) return;
  runtime.streamRestartRequested = true;
  try {
    runtime.streamAbort?.abort();
  } catch {
    // fall back to killing the child directly
  }
  try {
    runtime.streamChild?.kill();
  } catch {
    // restart is best-effort
  }
  escalateKill(runtime);
}

export function stopTranscriptFeed(runtime: RuntimeState) {
  runtime.streamRestartRequested = true;
  try {
    runtime.streamAbort?.abort();
  } catch {
    // fall back to killing the child directly
  }
  try {
    runtime.streamChild?.kill();
  } catch {
    // stop is best-effort
  }
  escalateKill(runtime);
}

export async function captureScreen(runtime: RuntimeState): Promise<string | null> {
  try {
    const { stdout } = await execFileP(runtime.cli, ["screen", "capture", "-o", "-"], {
      timeout: 15_000,
      maxBuffer: 32 * 1024 * 1024,
      encoding: "buffer",
    });
    const buf = stdout as unknown as Buffer;
    return buf && buf.length ? buf.toString("base64") : null;
  } catch {
    return null;
  }
}

export async function toDisplayPng(jpegB64: string): Promise<{ image: string; mimeType: string }> {
  try {
    const { convertToPng } = await import("@earendil-works/pi-coding-agent");
    const png = await convertToPng(jpegB64, "image/jpeg");
    if (png) return { image: png.data, mimeType: "image/png" };
  } catch {
    // fall through to the JPEG fallback
  }
  return { image: jpegB64, mimeType: "image/jpeg" };
}

export async function captureSharedScreen(runtime: RuntimeState): Promise<CaptureResult | null> {
  const jpegB64 = await captureScreen(runtime);
  if (!jpegB64) return null;
  return { jpegB64, display: await toDisplayPng(jpegB64) };
}
