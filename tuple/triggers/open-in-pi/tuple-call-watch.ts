// Tuple call watcher — shipped with the "Open in Pi" trigger.
//
// Loaded automatically from `.pi/extensions/` in the transcription directory, so
// it is active the moment Pi starts — no /reload, no self-authoring required.
//
// Unlike a passive transcript viewer, this makes Pi an active listener. It tails
// the live transcript and, whenever the talkers pause, feeds the new lines to Pi
// as a message that *triggers a turn* (`pi.sendMessage(..., { triggerTurn: true })`).
// Pi consumes each batch and — per its prompt — leaves a one-line summary of
// what they just covered, escalating to a real interjection only when it matters.
// Turns are only triggered while Pi is idle and no earlier triggered turn is
// still pending, so the user's own messages always take priority: Pi answers
// you, then resumes consuming the call.
//
// The trigger writes `tuple-call-watch.config.json` next to this file with the
// artifacts directory and call id. Absent that, the extension watches the current
// working directory.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";

type SpeakerMap = Record<string, string>;
type ScanResult = { added: boolean; urgent: boolean; stopOrEnd: boolean };
type FormattedRecord = { line: string; urgent: boolean; stopOrEnd: boolean; sortMs: number };
type WatchMode = "realtime" | "balanced" | "low_noise";
type WatchTiming = { pollMs: number; quietMs: number; maxWaitMs: number; description: string };

const STOP_OR_END_GRACE_MS = 1500; // let final transcript lines land before the stop/end summary
const STUCK_MS = 10000; // clear a stuck pending-turn guard if no turn ever ran
const SKIP_EVENT_CATEGORIES = new Set(["user_audio_started", "user_audio_stopped"]);
const STOP_OR_END_EVENT_CATEGORIES = new Set(["recording_stopped", "recording_ended", "call_ended"]);
const DEFAULT_WATCH_MODE: WatchMode = "balanced";
const WATCH_TIMINGS: Record<WatchMode, WatchTiming> = {
  realtime: { pollMs: 250, quietMs: 900, maxWaitMs: 5000, description: "fastest, for pair programming or troubleshooting" },
  balanced: { pollMs: 1000, quietMs: 2000, maxWaitMs: 12000, description: "default, for normal meetings and onboarding calls" },
  low_noise: { pollMs: 1500, quietMs: 3500, maxWaitMs: 20000, description: "least chatty, for presentations or long monologues" },
};
const WATCH_MODE_PARAMS = Type.Object({
  mode: StringEnum(["realtime", "balanced", "low_noise"] as const, {
    description: "How quickly the Tuple call watcher should send future transcript batches",
  }),
  reason: Type.Optional(Type.String({ description: "Why this monitoring pace fits the current call" })),
});

function readConfig(cwd: string): { artifactsDir: string; callId: string } {
  const candidates = [
    path.join(cwd, ".pi", "extensions", "tuple-call-watch.config.json"),
    path.join(cwd, ".tuple-call-watch.json"),
  ];
  for (const file of candidates) {
    try {
      const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
      if (cfg && typeof cfg.artifactsDir === "string") {
        return { artifactsDir: cfg.artifactsDir, callId: String(cfg.callId ?? "") };
      }
    } catch {
      // try the next candidate
    }
  }
  return { artifactsDir: cwd, callId: "" };
}

// The artifacts directory plus any sibling directories whose names end with the
// call id (Tuple sometimes splits one call across per-participant directories).
function watchDirs(artifactsDir: string, callId: string): string[] {
  const dirs = new Set<string>([artifactsDir]);
  if (callId) {
    try {
      const parent = path.dirname(artifactsDir);
      for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name.endsWith(callId)) {
          dirs.add(path.join(parent, entry.name));
        }
      }
    } catch {
      // parent unreadable — just watch the primary directory
    }
  }
  return [...dirs];
}

function timestampMs(value: unknown): number {
  // events carry ISO `time`; transcripts may carry ISO `start` or numeric seconds.
  if (typeof value === "number" && Number.isFinite(value)) return value * 1000;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return Number.POSITIVE_INFINITY;
}

function hms(value: unknown): string {
  const ts = timestampMs(value);
  return Number.isFinite(ts) ? new Date(ts).toISOString().slice(11, 19) : "--:--:--";
}

function isWake(text: string): boolean {
  if (/\b(value of pi|slice of pie|pi day|pie chart)\b/i.test(text)) return false;
  return /(^|\b)(hey\s+pi\b|pi\s*[,:]|pi\s+(can|could|would|are|did|do|please|what|why|how))/i.test(text);
}

function userIdKey(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return "";
}

function displayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const u = user as { full_name?: unknown; short_name?: unknown; email?: unknown };
  for (const field of [u.full_name, u.short_name, u.email]) {
    if (typeof field === "string" && field.trim()) return field.trim();
  }
  return "";
}

function parseUserNameFromMessage(message: unknown): string {
  if (typeof message !== "string") return "";
  const fullName = message.match(/full_name=([^,)]+)/)?.[1]?.trim();
  if (fullName) return fullName;
  if (/\buser\(id=/.test(message)) return "";
  const joinedName = message.replace(/\s+(joined|connected).*$/i, "").trim();
  return joinedName && joinedName !== message.trim() ? joinedName : "";
}

function isWatchMode(value: string): value is WatchMode {
  return Object.prototype.hasOwnProperty.call(WATCH_TIMINGS, value);
}

function watchModeDescription(mode: WatchMode): string {
  const timing = WATCH_TIMINGS[mode];
  return `${mode} (${timing.pollMs}ms poll, ${timing.quietMs}ms quiet, ${timing.maxWaitMs}ms max; ${timing.description})`;
}

export default function (pi: ExtensionAPI) {
  const cwd = process.cwd();
  const { artifactsDir, callId } = readConfig(cwd);
  const speakers: SpeakerMap = {};
  const offsets: Record<string, number> = {};
  let callStartMs = 0;
  let watchMode = DEFAULT_WATCH_MODE;
  let watchTiming = WATCH_TIMINGS[watchMode];

  const backlog: string[] = []; // lines from before Pi started — context only
  let backlogDelivered = false;

  const buffer: string[] = []; // new lines since startup, awaiting a flush to Pi
  let firstBufferedAt = 0;
  let lastArrivalAt = 0;
  let bufferUrgent = false; // batch contains a wake word or stop/end event
  let bufferStopOrEndAt = 0; // first stop/end event in the buffered batch

  let turnPending = false; // a turn we triggered is queued or running
  let turnPendingSince = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let timerCtx: any;

  function resolveSpeaker(userId: unknown): string {
    const id = userIdKey(userId);
    return speakers[id] || id || "unknown";
  }

  function recordSortMs(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value) && callStartMs) {
      return callStartMs + value * 1000;
    }
    return timestampMs(value);
  }

  // Returns the formatted dot-line and whether it demands Pi's attention.
  // Learning speaker names from user-bearing events is a side effect; `scan`
  // processes every directory's events before transcripts so names resolve correctly.
  function format(file: string, rec: any): FormattedRecord | null {
    if (file.endsWith("events.jsonl")) {
      const category = String(rec.category ?? "");
      const eventSortMs = timestampMs(rec.time);
      if (category === "recording_started" && Number.isFinite(eventSortMs)) callStartMs = eventSortMs;
      if (rec.user) {
        const id = userIdKey(rec.user);
        const name = displayName(rec.user) || parseUserNameFromMessage(rec.message);
        if (id && name) speakers[id] = name;
      }
      if (SKIP_EVENT_CATEGORIES.has(category)) return null;
      const stopOrEnd = STOP_OR_END_EVENT_CATEGORIES.has(category);
      return {
        line: `- ${hms(rec.time)} event: ${category}${rec.message ? ` (${rec.message})` : ""}`,
        urgent: stopOrEnd,
        stopOrEnd,
        sortMs: eventSortMs,
      };
    }
    const text = String(rec.text ?? "");
    return {
      line: `- ${hms(rec.start)} ${resolveSpeaker(rec.user_id)}: ${text}`,
      urgent: isWake(text),
      stopOrEnd: false,
      sortMs: recordSortMs(rec.start),
    };
  }

  function scanFile(file: string, sink: FormattedRecord[]): ScanResult {
    const result: ScanResult = { added: false, urgent: false, stopOrEnd: false };
    let stat: fs.Stats;
    try {
      stat = fs.statSync(file);
    } catch {
      return result; // not created yet
    }
    const from = offsets[file] ?? 0;
    if (stat.size <= from) {
      offsets[file] = stat.size; // truncation/rotation: snap forward, drop the gap
      return result;
    }
    let chunk = "";
    try {
      const fd = fs.openSync(file, "r");
      const buf = Buffer.alloc(stat.size - from);
      fs.readSync(fd, buf, 0, buf.length, from);
      fs.closeSync(fd);
      chunk = buf.toString("utf8");
    } catch {
      return result;
    }
    // `from` always sits just after a newline, so the only partial record is a
    // half-written final line with no `\n` yet. Consume whole lines only; the
    // remainder (and any multi-byte char split at `stat.size`) is re-read next
    // pass. A complete JSONL record always ends in `\n`.
    const lastNl = chunk.lastIndexOf("\n");
    if (lastNl === -1) return result;
    const consumed = chunk.slice(0, lastNl + 1);
    offsets[file] = from + Buffer.byteLength(consumed, "utf8");
    for (const line of consumed.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const formatted = format(file, JSON.parse(trimmed));
        if (formatted) {
          sink.push(formatted);
          result.added = true;
          if (formatted.urgent) result.urgent = true;
          if (formatted.stopOrEnd) result.stopOrEnd = true;
        }
      } catch {
        // skip an unparseable line
      }
    }
    return result;
  }

  function scan(sink: string[]): ScanResult {
    const result: ScanResult = { added: false, urgent: false, stopOrEnd: false };
    const formatted: FormattedRecord[] = [];
    const dirs = watchDirs(artifactsDir, callId);
    // All events first (across every directory) so a speaker's join is mapped
    // before any transcript line that names them, even across sibling dirs. Sort
    // the formatted records afterward so the batch still reads chronologically.
    for (const dir of dirs) {
      const r = scanFile(path.join(dir, "events.jsonl"), formatted);
      result.added ||= r.added;
      result.urgent ||= r.urgent;
      result.stopOrEnd ||= r.stopOrEnd;
    }
    for (const dir of dirs) {
      const r = scanFile(path.join(dir, "transcriptions.jsonl"), formatted);
      result.added ||= r.added;
      result.urgent ||= r.urgent;
      result.stopOrEnd ||= r.stopOrEnd;
    }
    formatted.sort((a, b) => {
      const aMs = Number.isFinite(a.sortMs) ? a.sortMs : Number.MAX_SAFE_INTEGER;
      const bMs = Number.isFinite(b.sortMs) ? b.sortMs : Number.MAX_SAFE_INTEGER;
      return aMs - bMs;
    });
    sink.push(...formatted.map((rec) => rec.line));
    return result;
  }

  function maybeFlush(ctx: any) {
    if (!buffer.length) return;
    const now = Date.now();
    if (turnPending) {
      // Normally cleared on agent_end; guard against a triggered send that never
      // produced a turn so the watcher can't get stuck silent for the session.
      if (ctx.isIdle() && now - turnPendingSince > STUCK_MS) turnPending = false;
      else return;
    }
    // Only ever trigger a turn while Pi is free, so the user's own messages and
    // any in-progress reply always take priority over consuming the call. If
    // these methods are absent on an older Pi, the call throws and the tick's
    // catch skips the flush — failing closed (no surprise turns) by design.
    if (!ctx.isIdle() || ctx.hasPendingMessages()) return;
    const paused = now - lastArrivalAt >= watchTiming.quietMs;
    const stopOrEndReady = bufferStopOrEndAt > 0 && now - bufferStopOrEndAt >= STOP_OR_END_GRACE_MS;
    const overdue = now - firstBufferedAt >= watchTiming.maxWaitMs;
    if (!stopOrEndReady && !paused && !overdue) return; // still mid-thought — keep buffering

    const batch = buffer.splice(0, buffer.length).join("\n");
    const urgent = bufferUrgent;
    firstBufferedAt = 0;
    bufferUrgent = false;
    bufferStopOrEndAt = 0;
    turnPending = true;
    turnPendingSince = now;
    pi.sendMessage(
      {
        customType: "tuple-call-watch",
        content:
          `New on the call:\n\n${batch}\n\nWatcher metadata (not call content): current mode is ${watchModeDescription(watchMode)}.\n\n` +
          (urgent
            ? "This includes a line addressed to you or a recording_stopped/recording_ended/call_ended event — respond per your instructions."
            : "Leave a one-line `·` summary of what they just covered; escalate to `👋` only if something matters."),
        display: false,
      },
      { triggerTurn: true },
    );
  }

  function startTimer(ctx: any) {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      try {
        const r = scan(buffer);
        if (r.added) {
          const now = Date.now();
          if (!firstBufferedAt) firstBufferedAt = now;
          lastArrivalAt = now;
          if (r.urgent) bufferUrgent = true;
          if (r.stopOrEnd && !bufferStopOrEndAt) bufferStopOrEndAt = now;
        }
        maybeFlush(ctx);
      } catch {
        // a single bad tick (or a missing ctx method) must not kill the watcher
      }
    }, watchTiming.pollMs);
    timer.unref?.();
  }

  function setWatchMode(mode: WatchMode, ctx?: any) {
    const pollChanged = watchTiming.pollMs !== WATCH_TIMINGS[mode].pollMs;
    watchMode = mode;
    watchTiming = WATCH_TIMINGS[mode];
    if (pollChanged && timer) startTimer(timerCtx ?? ctx);
    try {
      if (ctx?.hasUI) ctx.ui.setStatus("tuple-call-watch", `watch: ${mode}`);
    } catch {
      // status is best-effort
    }
  }

  pi.registerTool({
    name: "tuple_call_watch_set_mode",
    label: "Tuple Watch Mode",
    description: "Adjust how aggressively the Tuple call watcher batches live transcript lines before sending them to Pi.",
    promptSnippet: "Set the Tuple live-call watch mode to realtime, balanced, or low_noise.",
    promptGuidelines: [
      "Use tuple_call_watch_set_mode when the call's shape changes enough that the live-call watcher should be faster or less chatty; do not call it on every batch.",
    ],
    parameters: WATCH_MODE_PARAMS,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const requested = String(params.mode ?? "").trim().toLowerCase().replace(/-/g, "_");
      if (!isWatchMode(requested)) {
        throw new Error("mode must be one of: realtime, balanced, low_noise");
      }
      setWatchMode(requested, ctx);
      const reason = typeof params.reason === "string" && params.reason.trim() ? ` Reason: ${params.reason.trim()}` : "";
      return {
        content: [{ type: "text", text: `Tuple call watcher mode set to ${watchModeDescription(requested)}.${reason}` }],
        details: { mode: requested, ...watchTiming, reason: params.reason ?? "" },
      };
    },
  });

  pi.on("session_start", async (_event: any, ctx: any) => {
    timerCtx = ctx;
    try {
      scan(backlog); // capture the call so far as context; offsets advance to end
    } catch {
      // no pre-call context, but keep going and start the live watcher below
    }
    try {
      if (ctx?.hasUI) {
        ctx.ui.setStatus("tuple-call-watch", `watch: ${watchMode}`);
        ctx.ui.notify(
          `Listening to the call${callId ? ` (${callId})` : ""} — I'll chime in when it matters.`,
          "info",
        );
      }
    } catch {
      // notify is best-effort
    }
    // Install the watcher independently, so a backlog-scan failure above never
    // leaves the session without a live watcher.
    startTimer(timerCtx);
  });

  // A turn we triggered has finished — let the next batch flush.
  pi.on("agent_end", async () => {
    turnPending = false;
  });

  // Deliver the pre-start backlog once, as grounding context for Pi's first turn.
  pi.on("before_agent_start", async () => {
    if (backlogDelivered || !backlog.length) return undefined;
    backlogDelivered = true;
    const history = backlog.splice(0, backlog.length).join("\n");
    return {
      message: {
        customType: "tuple-call-watch",
        content: `The call so far, for context — do not comment on it retroactively:\n\n${history}`,
        display: false,
      },
    };
  });

  pi.on("session_shutdown", async () => {
    if (timer) clearInterval(timer);
  });
}
