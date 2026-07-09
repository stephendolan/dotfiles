import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { exportArtifacts } from "./artifacts.ts";
import { releaseSidekickLock } from "./locks.ts";
import {
  autoDue,
  autoMarkPulsed,
  autoOnRoster,
  autoOnSharing,
  autoOnSharedContent,
  ARTIFACT_LABEL,
  buildAutoEvalPrompt,
  buildCallMetaBlock,
  buildStreamArgs,
  consoleStatusLines,
  deliveryFor,
  intervalMs,
  matchTrigger,
  MODE_LABEL,
  newAutoState,
  nextMode,
  parseBatch,
  participantNames,
  screenshotDecision,
  sessionNameFor,
  sharedContentEntries,
  truncate,
  type WatchMode,
} from "./console-core.ts";
import type { RuntimeState, SidekickCtx } from "./runtime.ts";
import { applyMode, refreshStatus, setAutoState, stopTranscriptFeed, tupleStream } from "./runtime.ts";
import { runScreenshotPipeline } from "./screenshots.ts";

export const FEED_OVERRIDE = `

## Live transcript delivery (overrides "Following the live transcript")

A sidecar extension is following this call and delivering new speech to you automatically as messages that begin "New on the call:". Do **not** run \`tuple transcription show\`, \`--wait\`, or any other transcript loop yourself — you would read the call twice. Your catch-up arrives once as a "The call so far" message.

The person is on a live call and your transcript is their *direct* channel to you — keep it clean. In the quieter watch modes the extension delivers routine speech to you silently (it will not start a turn), so most of the time you simply accumulate context and say nothing until the person engages. Behave accordingly:

- Reply in the transcript **normally** only when a batch is addressed to you (it will say so), when the person types to you directly, or when you are asked for a recap. That reply is the "chat with the agent" — treat it as a real request.
- When the topic meaningfully shifts, call **post_summary** with a one- or two-line topic summary. These render in a separate, muted "call" style so they never bury the person's conversation with you.
- When you verify a claim, catch an error, or learn something worth keeping, call **record_artifact** (kind: finding | fact_check | note). Artifacts render as distinct cards and collect in the /notes browser.
- The shared screen is a **separate axis** from the transcript pace. Focused shared content changes arrive as cheap text context with title, app, and URL when available; use that signal first. Use **set_screen_watch** (off / periodic / active) only to control visible frame receipts for the user — set it to **active** when the user needs a visual timeline every few seconds, independent of how fast you're sampling the talk. Auto-captured frames are not fed to your vision. Call **capture_screen** only when visual details matter and title/app/URL context is not enough.
- For a heavier, self-contained task the person asks for — deep research, fact-checking a thorny claim, drafting something — you may use the **subagent** tool to run it in the background so it doesn't block the call; report the result as a note when it lands. Do this only on request or when clearly warranted, not routinely.
- You still write an outline when recording stops or the call ends.

You have **set_watch_mode** (realtime / balanced / low_noise / periodic) to trade responsiveness for quiet as the call's shape changes.

Both dials are already set when you connect. Do **not** configure set_watch_mode or set_screen_watch on your first turn or before you have evidence (speech, a share, a request) — the auto-cadence manager will ask you to evaluate once there is something to judge.

The extension runs an **auto-cadence** manager: it opens in real-time to hear the call's start, then sends you a short "[auto-cadence]" message whenever the call changes — someone joins or leaves, a screen share starts or stops, focused shared content changes, and every few minutes — asking you to judge what's happening and set **both** the transcript watch mode (\`set_watch_mode\`) and the screen watch level (\`set_screen_watch\`) to fit. They're independent: e.g. a teammate demoing → keep transcript quiet, rely on title/app/URL changes for semantic context, and use \`set_screen_watch active\` only if the user needs visible frame receipts. When you get one: act with tool calls and stay quiet — don't narrate the check. If a setting already fits, leave it.`;

// The live-state injection appended to every LLM call via pi's `context` event.
// That event is the only hook that fires for BOTH user prompts and
// extension-triggered turns (deliver/autoTick use sendMessage triggerTurn,
// which never emits before_agent_start), and its messages are an ephemeral
// per-call copy — so the override and call state are always current and never
// bloat the session.
export function buildContextInjection(runtime: RuntimeState, nowMs: number) {
  const meta = buildCallMetaBlock(runtime.state, participantNames(runtime.feed), nowMs, sharedContentEntries(runtime.feed));
  return {
    role: "custom" as const,
    customType: "tuple-call-state",
    content: `${FEED_OVERRIDE}\n\n${meta}`,
    display: false,
    timestamp: nowMs,
  };
}

export function mountStatus(runtime: RuntimeState, ctx: SidekickCtx) {
  if (!runtime.uiReady) return;
  try {
    ctx.ui?.setWidget?.("tuple-status", (tui: any, theme: any) => {
      runtime.statusTui = tui;
      return {
        render: (w: number) => {
          try {
            const [l1, l2] = consoleStatusLines(runtime.state, Date.now(), w);
            return [truncate(theme.fg("muted", l1 ?? ""), w), truncate(theme.fg("dim", l2 ?? ""), w)];
          } catch {
            return [truncate(MODE_LABEL[runtime.state.mode], w)];
          }
        },
        invalidate: () => {},
        dispose: () => {
          runtime.statusTui = null;
        },
      };
    }, { placement: "belowEditor" });
  } catch {
    // status is best-effort; the sidekick still works without it
  }
}

export function maybeNameSession(pi: ExtensionAPI, runtime: RuntimeState) {
  try {
    const name = sessionNameFor(participantNames(runtime.feed), runtime.state.callStartMs ?? Date.now());
    if (name !== runtime.lastSessionName) {
      runtime.lastSessionName = name;
      pi.setSessionName?.(name);
    }
  } catch {
    // naming is best-effort
  }
}

export function deliver(pi: ExtensionAPI, runtime: RuntimeState, content: string, opts: { urgent?: boolean; contextOnly?: boolean } = {}) {
  const delivery = deliveryFor(runtime.state.mode, opts);
  if (delivery === "trigger") {
    pi.sendMessage({ customType: "tuple-call-sidekick", content, display: false }, { triggerTurn: true });
  } else {
    pi.sendMessage({ customType: "tuple-call-sidekick", content, display: false }, {});
  }
}

export function markFlush(runtime: RuntimeState) {
  const now = Date.now();
  runtime.state.batchCount += 1;
  runtime.state.lastFlushMs = now;
  const iv = intervalMs(runtime.state.mode);
  runtime.state.nextFlushMs = iv == null ? null : now + iv;
}

export async function followLoop(pi: ExtensionAPI, runtime: RuntimeState, ctx: SidekickCtx | undefined) {
  const cursor = `sidecar-${Date.now()}`;
  let first = true;
  let consecutiveErrors = 0;
  while (!runtime.stopped && !runtime.feed.ended) {
    let out = "";
    try {
      // The child returns on `--timeout` seconds of silence, but gathers for up
      // to the mode's `--interval` when speech is continuous. Give the exec a
      // ceiling above that interval so a long, gap-free stretch can flush.
      const streamExecMs = Math.max(45_000, (intervalMs(runtime.state.mode) ?? 0) + 15_000);
      out = await tupleStream(runtime, buildStreamArgs(runtime.state.watchWords, runtime.state.mode, cursor, runtime.config.streamTimeout), streamExecMs);
      consecutiveErrors = 0;
    } catch (err: any) {
      if (runtime.streamRestartRequested) {
        runtime.streamRestartRequested = false;
        continue;
      }
      if (runtime.stopped || runtime.feed.ended) break;
      const now = Date.now();
      if (runtime.state.feedHealth.status !== "erroring") runtime.state.feedHealth = { status: "erroring", sinceMs: now };
      refreshStatus(runtime);
      if (++consecutiveErrors === 6) {
        runtime.feedAlertSent = true;
        const detail = String(err?.stderr || err?.message || err).trim().slice(0, 300);
        deliver(pi, runtime, `⚠️ The live transcript feed errored — I can't read the call right now, but I'll keep retrying. Last error:\n\n${detail}\n\nYou can still talk to me directly.`, { urgent: true });
      }
      await new Promise((r) => setTimeout(r, consecutiveErrors >= 6 ? runtime.feedRetryDelayAfterAlertMs : runtime.feedRetryDelayMs));
      continue;
    }
    // Any successful poll — even an empty silence window — means the feed is
    // healthy again; clear the warning before the empty-batch re-check so a
    // quiet call doesn't wear a stale "retrying" banner.
    if (runtime.state.feedHealth.status === "erroring") {
      runtime.state.feedHealth = { status: "recovered" };
      refreshStatus(runtime);
      if (runtime.feedAlertSent) {
        pi.sendMessage({ customType: "tuple-call-sidekick", content: "The live transcript feed is back.", display: false }, {});
        try {
          ctx?.ui?.notify?.("Tuple transcript feed restored.", "info");
        } catch {
          // notify is best-effort
        }
      }
      runtime.feedAlertSent = false;
    }
    if (!out.trim()) continue; // silence window elapsed; re-check

    try {
      const { lines, urgent, mentioned } = parseBatch(out, runtime.feed, runtime.isWake, runtime.isMention);
      runtime.state.screenSharing = runtime.feed.screenSharing;
      if (lines.length) {
        markFlush(runtime);
        refreshStatus(runtime);
        if (first) {
          first = false;
          const recent = lines.length > runtime.config.catchupMaxLines ? lines.slice(-runtime.config.catchupMaxLines) : lines;
          const omitted = lines.length - recent.length;
          const preface = omitted > 0 ? `(${omitted} earlier lines omitted — this is the recent tail)\n\n` : "";
          deliver(pi, runtime, `The call so far, for context — do not comment on it retroactively:\n\n${preface}${recent.join("\n")}`, { contextOnly: true });
        } else {
          const tail = urgent
            ? "This includes a line addressed to you or a recording stop / call-end — respond in the transcript per your instructions."
            : mentioned
              ? "A watch word was mentioned — respond only if it was actually directed at you."
            : "Routine call speech. If the topic shifted, call post_summary; if you learned something worth keeping, call record_artifact. Otherwise stay silent.";
          deliver(pi, runtime, `New on the call:\n\n${lines.join("\n")}\n\n${tail}`, { urgent });
        }
        maybeNameSession(pi, runtime);
      }
    } catch {
      // A bad batch must never kill the follow loop: the loop's own stream
      // pacing (each poll blocks up to --timeout) keeps this from becoming a
      // tight spin, and transcript following has to survive one malformed or
      // throwing batch. Swallow and keep looping; runtime.feed.ended is still
      // checked below so a terminal batch still ends the loop even if
      // delivery threw.
    }
    if (runtime.feed.ended) break;
  }
  if (runtime.feed.ended) await finalizeFeedEnd(pi, runtime, ctx);
}

export function autoTick(pi: ExtensionAPI, runtime: RuntimeState) {
  if (!runtime.autoState.enabled || runtime.stopped || runtime.state.ended) return;
  try {
    const now = Date.now();
    const roster = participantNames(runtime.feed);
    setAutoState(runtime, autoOnRoster(runtime.autoState, roster, now, runtime.config.autoSettleSec * 1000).auto);
    setAutoState(runtime, autoOnSharing(runtime.autoState, runtime.feed.screenSharing, now, runtime.config.autoShareSettleSec * 1000).auto);
    setAutoState(runtime, autoOnSharedContent(runtime.autoState, runtime.feed.sharedContentVersion, now, runtime.config.autoShareSettleSec * 1000).auto);
    const due = autoDue(
      runtime.autoState,
      now,
      runtime.state.callStartMs,
      runtime.config.autoCaptureSec * 1000,
      runtime.config.autoPulseMin * 60_000,
      runtime.state.batchCount,
    );
    if (!due) return;
    setAutoState(runtime, autoMarkPulsed(runtime.autoState, now, runtime.state.batchCount));
    const prompt = buildAutoEvalPrompt(runtime.state.mode, runtime.state.screenWatch, roster.join(", "), runtime.feed.screenSharing, due, sharedContentEntries(runtime.feed));
    pi.sendMessage({ customType: "tuple-auto-eval", content: prompt, display: false }, { triggerTurn: true });
  } catch {
    // auto is best-effort; a hiccup must never break the call
  }
}

export function screenshotTick(pi: ExtensionAPI, runtime: RuntimeState) {
  if (!runtime.config.autoScreenshots || runtime.stopped || runtime.state.ended || !runtime.uiReady) return;
  const decision = screenshotDecision({
    sharing: runtime.feed.screenSharing,
    prevSharing: runtime.prevSharing,
    lastShotMs: runtime.lastShotMs,
    screenWatch: runtime.state.screenWatch,
    screenshotIntervalMin: runtime.config.screenshotIntervalMin,
    screenshotActiveSec: runtime.config.screenshotActiveSec,
    nowMs: Date.now(),
  });
  runtime.prevSharing = decision.prevSharing;
  runtime.lastShotMs = decision.lastShotMs;
  if (decision.action.kind === "capture") {
    void runScreenshotPipeline(pi, runtime, undefined, { reason: decision.action.reason, feedModel: decision.action.feedModel, guard: true });
  }
}

export async function finalizeFeedEnd(pi: ExtensionAPI, runtime: RuntimeState, ctx: SidekickCtx | undefined, nowMs = Date.now()) {
  if (runtime.state.ended && runtime.state.endedAtMs != null) return;
  runtime.feed.ended = true;
  runtime.state.ended = true;
  runtime.state.endedReason = runtime.feed.endedReason;
  runtime.state.endedAtMs = nowMs;
  runtime.state.screenSharing = false;
  stopTranscriptFeed(runtime);
  refreshStatus(runtime);
  await exportArtifacts(pi, runtime, ctx, nowMs);
  await releaseSidekickLock(runtime);
}

export function cycle(runtime: RuntimeState, ctx: SidekickCtx, direction: "louder" | "quieter") {
  const target = nextMode(runtime.state.mode, direction);
  if (target === runtime.state.mode) {
    try {
      if (ctx?.hasUI) ctx.ui?.notify?.(direction === "louder" ? "Already at the most responsive pace." : "Already at the quietest pace.", "info");
    } catch {
      // best-effort
    }
    return;
  }
  if (runtime.autoState.enabled) setAutoState(runtime, newAutoState(false));
  applyMode(runtime, ctx, target as WatchMode);
}

export function registerAutocomplete(runtime: RuntimeState, ctx: SidekickCtx) {
  try {
    ctx.ui?.addAutocompleteProvider?.((current: any) => ({
      triggerCharacters: ["@", "#"],
      async getSuggestions(lines: string[], line: number, col: number, options: any) {
        const before = (lines[line] ?? "").slice(0, col);
        const at = matchTrigger(before, "@");
        if (at != null) {
          const q = at.toLowerCase();
          const items = participantNames(runtime.feed)
            .filter((n) => n.toLowerCase().startsWith(q))
            .map((n) => ({ value: `@${n}`, label: n, description: "participant" }));
          return { prefix: `@${at}`, items };
        }
        const hash = matchTrigger(before, "#");
        if (hash != null) {
          const q = hash.toLowerCase();
          const items = runtime.state.artifacts
            .filter((a) => a.title.toLowerCase().includes(q))
            .map((a) => ({ value: `#${a.title.replace(/\s+/g, "-")}`, label: a.title, description: ARTIFACT_LABEL[a.kind] }));
          return { prefix: `#${hash}`, items };
        }
        return current.getSuggestions(lines, line, col, options);
      },
      applyCompletion(lines: string[], line: number, col: number, item: any, prefix: string) {
        return current.applyCompletion(lines, line, col, item, prefix);
      },
      shouldTriggerFileCompletion(lines: string[], line: number, col: number) {
        return current.shouldTriggerFileCompletion?.(lines, line, col) ?? true;
      },
    }));
  } catch {
    // autocomplete is best-effort
  }
}
