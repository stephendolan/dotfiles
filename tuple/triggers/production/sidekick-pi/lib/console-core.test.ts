// Unit tests for console-core. Run with: node --test lib/console-core.test.ts
// (Node ≥ 22.6 strips the TypeScript types automatically; no build step.)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_CONFIG,
  mergeConfig,
  parseDurationMs,
  intervalMs,
  normalizeWords,
  addWord,
  removeWord,
  nextMode,
  MODE_ORDER,
  MODE_INTERVAL,
  buildStreamArgs,
  buildContainsWatchWord,
  buildIsWake,
  formatElapsed,
  countdownSec,
  consoleStatusLines,
  deliveryFor,
  screenshotDecision,
  truncate,
  newAutoState,
  diffParticipants,
  autoOnRoster,
  autoOnSharing,
  autoOnSharedContent,
  autoDue,
  autoMarkPulsed,
  buildAutoEvalPrompt,
  screenWatchIntervalMs,
  isScreenWatch,
  addArtifact,
  buildArtifactsMarkdown,
  coerceArtifactKind,
  readEnvelope,
  parseBatch,
  newFeedState,
  participantNames,
  sharedContentEntries,
  buildCallMetaBlock,
  sessionNameFor,
  matchTrigger,
  type ConsoleState,
  type Artifact,
} from "./console-core.ts";

// --- config -----------------------------------------------------------------

test("mergeConfig with no input returns defaults", () => {
  assert.deepEqual(mergeConfig(undefined), DEFAULT_CONFIG);
  assert.deepEqual(mergeConfig(null), DEFAULT_CONFIG);
  assert.deepEqual(mergeConfig("garbage"), DEFAULT_CONFIG);
});

test("mergeConfig overrides only provided keys", () => {
  const merged = mergeConfig({ defaultMode: "low_noise" });
  assert.equal(merged.defaultMode, "low_noise");
  assert.deepEqual(merged.watchWords, DEFAULT_CONFIG.watchWords);
  assert.equal(merged.catchupMaxLines, DEFAULT_CONFIG.catchupMaxLines);
});

test("mergeConfig ignores unknown keys and wrong types", () => {
  const merged = mergeConfig({ nope: 1, catchupMaxLines: "lots", defaultMode: "turbo", watchWords: [1, 2] });
  assert.equal(merged.catchupMaxLines, DEFAULT_CONFIG.catchupMaxLines);
  assert.equal(merged.defaultMode, DEFAULT_CONFIG.defaultMode);
  assert.deepEqual(merged.watchWords, DEFAULT_CONFIG.watchWords);
});

test("mergeConfig normalizes watch words and honors consoleEnabled:false", () => {
  const merged = mergeConfig({ watchWords: [" Pi ", "PIE", "pie", ""], consoleEnabled: false });
  assert.deepEqual(merged.watchWords, ["pi", "pie"]);
  assert.equal(merged.consoleEnabled, false);
});

test("mergeConfig validates streamTimeout format", () => {
  assert.equal(mergeConfig({ streamTimeout: "45s" }).streamTimeout, "45s");
  assert.equal(mergeConfig({ streamTimeout: "500ms" }).streamTimeout, "500ms");
  assert.equal(mergeConfig({ streamTimeout: "2m" }).streamTimeout, "2m");
  assert.equal(mergeConfig({ streamTimeout: "forever" }).streamTimeout, DEFAULT_CONFIG.streamTimeout);
});

test("mergeConfig accepts exportNotes", () => {
  assert.equal(DEFAULT_CONFIG.exportNotes, true);
  assert.equal(mergeConfig({ exportNotes: false }).exportNotes, false);
  assert.equal(mergeConfig({ exportNotes: "no" }).exportNotes, true);
});

test("README config table lists every DEFAULT_CONFIG key", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    assert.match(readme, new RegExp(`\\| \\\`${key}\\\` \\|`), `README config table is missing ${key}`);
  }
});

test("parseDurationMs handles the shared duration syntax", () => {
  assert.equal(parseDurationMs("500ms"), 500);
  assert.equal(parseDurationMs("30s"), 30_000);
  assert.equal(parseDurationMs("2m"), 120_000);
  assert.equal(parseDurationMs(" 2m "), 120_000);
  assert.equal(parseDurationMs("1h"), null);
});

// --- watch words ------------------------------------------------------------

test("normalizeWords trims, lowercases, dedupes, preserves order", () => {
  assert.deepEqual(normalizeWords([" Foo", "BAR", "foo", " "]), ["foo", "bar"]);
});

test("addWord / removeWord are case-insensitive and non-mutating", () => {
  const base = ["pi", "pie"];
  assert.deepEqual(addWord(base, "Copilot"), ["pi", "pie", "copilot"]);
  assert.deepEqual(addWord(base, "PI"), ["pi", "pie"]); // dup ignored
  assert.deepEqual(removeWord(base, "PIE"), ["pi"]);
  assert.deepEqual(base, ["pi", "pie"]); // original untouched
});

// --- modes ------------------------------------------------------------------

test("nextMode steps and clamps", () => {
  assert.equal(nextMode("realtime", "quieter"), "balanced");
  assert.equal(nextMode("balanced", "quieter"), "low_noise");
  assert.equal(nextMode("periodic", "quieter"), "periodic"); // clamp at quietest
  assert.equal(nextMode("low_noise", "louder"), "balanced");
  assert.equal(nextMode("realtime", "louder"), "realtime"); // clamp
});

test("intervalMs maps modes through the shared duration parser", () => {
  assert.equal(intervalMs("realtime"), null);
  assert.equal(intervalMs("balanced"), 30_000);
  assert.equal(intervalMs("low_noise"), 120_000);
  assert.equal(intervalMs("periodic"), 300_000);
});

// --- stream args ------------------------------------------------------------

test("buildStreamArgs omits interval and watch-words in realtime", () => {
  const args = buildStreamArgs(["pi"], "realtime", "cur-1");
  assert.ok(!args.includes("--interval"));
  assert.ok(!args.includes("--watch-words"));
  assert.deepEqual(args.slice(0, 3), ["transcription", "show", "--wait"]);
  assert.ok(args.includes("--cursor") && args.includes("cur-1"));
});

test("buildStreamArgs includes interval + watch-words when batched", () => {
  const args = buildStreamArgs([" Pi ", "pie"], "balanced", "cur-2", "45s");
  assert.ok(args.includes("--interval"));
  assert.equal(args[args.indexOf("--interval") + 1], "30s");
  assert.equal(args[args.indexOf("--watch-words") + 1], "pi,pie");
  assert.equal(args[args.indexOf("--timeout") + 1], "45s");
});

test("buildStreamArgs omits watch-words when list empty", () => {
  const args = buildStreamArgs([], "low_noise", "c");
  assert.ok(args.includes("--interval"));
  assert.ok(!args.includes("--watch-words"));
});

// --- wake detection ---------------------------------------------------------

test("buildIsWake matches address shapes and skips non-address speech", () => {
  const isWake = buildIsWake(["pi", "pie"]);
  assert.equal(isWake("pi, can you check this?"), true);
  assert.equal(isWake("hey pie look at this"), true);
  assert.equal(isWake("pie why is this failing"), true);
  assert.equal(isWake("let's ask pi about the failing test"), true);
  assert.equal(isWake("ask pie to check this"), true);
  assert.equal(isWake("have pi look at this"), true);
  assert.equal(isWake("get pie to verify the output"), true);
  assert.equal(isWake("this seems wrong, pi?"), true);
  assert.equal(isWake("that was surprising, pie."), true);
  // Permissive by design: an address-shaped false friend may wake the agent
  // ("the value of pi is …" matches the cue pattern) — the agent's instructions
  // handle it. Non-address speech still stays quiet:
  assert.equal(isWake("let's get an apple pie later"), false);
  assert.equal(isWake("the pie was great"), false);
  assert.equal(isWake("we shipped the feature yesterday"), false);
});

test("buildIsWake rebuilds for a custom word and drops old bare vocative", () => {
  const isWake = buildIsWake(["copilot"]);
  assert.equal(isWake("copilot, look at this"), true);
  assert.equal(isWake("pi, hello"), false); // "pi" no longer a watch word
});

test("buildIsWake with empty list never matches", () => {
  const isWake = buildIsWake([]);
  assert.equal(isWake("pi, help"), false);
});

test("buildContainsWatchWord is weaker than wake detection", () => {
  const contains = buildContainsWatchWord(["pi", "pie"]);
  const isWake = buildIsWake(["pi", "pie"]);
  assert.equal(contains("we mentioned pi in passing"), true);
  assert.equal(isWake("we mentioned pi in passing"), false);
  assert.equal(contains("nothing relevant"), false);
});

// --- time formatting --------------------------------------------------------

test("formatElapsed formats mm:ss and h:mm:ss", () => {
  assert.equal(formatElapsed(91_000), "01:31");
  assert.equal(formatElapsed(0), "00:00");
  assert.equal(formatElapsed(-5000), "00:00"); // clamp
  assert.equal(formatElapsed(3_661_000), "1:01:01");
});

test("countdownSec ceilings and clamps, null in realtime", () => {
  assert.equal(countdownSec(10_000, 2_700), 8);
  assert.equal(countdownSec(1_000, 5_000), 0); // past due, clamped
  assert.equal(countdownSec(null, 0), null);
});

// --- HUD model --------------------------------------------------------------

function stateFixture(over: Partial<ConsoleState> = {}): ConsoleState {
  return {
    mode: "realtime",
    watchWords: ["pi", "pie"],
    autoEnabled: false,
    ended: false,
    endedReason: null,
    endedAtMs: null,
    feedHealth: { status: "ok" },
    callStartMs: 1000,
    lastFlushMs: null,
    nextFlushMs: null,
    batchCount: 0,
    screenSharing: false,
    screenWatch: "periodic",
    lastSummaryMs: null,
    artifacts: [],
    ...over,
  };
}

test("consoleStatusLines: realtime is compact and icon-free", () => {
  const [line1, line2] = consoleStatusLines(stateFixture({ mode: "realtime" }), 92_000);
  assert.equal(line1, "real-time · on call 01:31");
  assert.doesNotMatch(line1, /[⏺⌚👀📌]/); // no cutesy icons
  assert.equal(line2, "Wake: pi, pie · / for commands");
});

test("consoleStatusLines: summary mode shows interval + countdown", () => {
  const [line1] = consoleStatusLines(
    stateFixture({ mode: "balanced", nextFlushMs: 100_000, screenSharing: true, screenWatch: "active" }),
    93_000,
  );
  assert.equal(line1, "summary 30s · next 7s · on call 01:32 · screen: active");
});

test("consoleStatusLines: reflects notes count and empty watch list", () => {
  const list = addArtifact([], { kind: "note", title: "X", body: "y", atMs: 1 }).list;
  const [, line2] = consoleStatusLines(stateFixture({ watchWords: [], artifacts: list }), 5000);
  assert.equal(line2, "Wake: none · 1 note · / for commands");
});

test("consoleStatusLines: terminal state freezes call-end summary", () => {
  const list = addArtifact([], { kind: "note", title: "X", body: "y", atMs: 1 }).list;
  const [line1, line2] = consoleStatusLines(stateFixture({ ended: true, endedReason: "call_ended", endedAtMs: 92_000, artifacts: list }), 150_000);
  assert.equal(line1, "call ended · 01:31 · 1 note — /notes to browse");
  assert.equal(line2, "Wake: pi, pie · /notes /recap");
});

test("consoleStatusLines: terminal state distinguishes recording stop", () => {
  const [line1] = consoleStatusLines(stateFixture({ ended: true, endedReason: "recording_ended", endedAtMs: 92_000 }), 150_000);
  assert.equal(line1, "recording stopped · 01:31 · 0 notes — /notes to browse");
});

test("consoleStatusLines: feed retry warning includes elapsed retry age", () => {
  const [line1] = consoleStatusLines(stateFixture({ feedHealth: { status: "erroring", sinceMs: 10_000 } }), 135_000);
  assert.match(line1, /^⚠ feed retrying \(2m\)/);
});

test("consoleStatusLines: compact ordering puts warning before mode, elapsed, screen", () => {
  const [line1] = consoleStatusLines(
    stateFixture({
      mode: "low_noise",
      autoEnabled: true,
      nextFlushMs: 106_000,
      screenSharing: true,
      screenWatch: "off",
      feedHealth: { status: "erroring", sinceMs: 79_000 },
    }),
    92_000,
  );
  assert.equal(line1, "⚠ feed retrying (13s) · auto · summary 2m · next 14s · on call 01:31 · screen: off (sharing)");
});

test("consoleStatusLines: width compaction degrades lower-priority fields first", () => {
  const state = stateFixture({ mode: "low_noise", autoEnabled: true, nextFlushMs: 106_000, screenSharing: true, screenWatch: "active" });
  assert.equal(consoleStatusLines(state, 92_000, 60)[0], "auto · summary 2m · next 14s · 01:31 · screen: active");
  assert.equal(consoleStatusLines(state, 92_000, 52)[0], "auto · summary 2m · 14s · 01:31 · screen: active");
  assert.equal(consoleStatusLines(state, 92_000, 35)[0], "auto · summary 2m · 14s · 01:31");
  assert.equal(consoleStatusLines(state, 92_000, 24)[0], "auto · summary 2m · 14s");
});

test("consoleStatusLines: warning survives tiny widths", () => {
  const [line1] = consoleStatusLines(
    stateFixture({ mode: "low_noise", autoEnabled: true, nextFlushMs: 106_000, feedHealth: { status: "erroring", sinceMs: 78_000 } }),
    92_000,
    10,
  );
  assert.match(line1, /^⚠ feed retrying \(14s\)/);
});

test("mergeConfig accepts cli override", () => {
  assert.equal(mergeConfig({ cli: "tuple-staging" }).cli, "tuple-staging");
  assert.equal(mergeConfig({}).cli, "tuple"); // prod-safe default
  assert.equal(mergeConfig({ cli: "  " }).cli, "tuple"); // blank ignored
});

// --- artifacts --------------------------------------------------------------

test("addArtifact assigns ids and dedupes identical entries", () => {
  let list: Artifact[] = [];
  const r1 = addArtifact(list, { kind: "finding", title: "A", body: "b", atMs: 1 });
  assert.equal(r1.added, true);
  assert.equal(r1.artifact!.id, 1);
  list = r1.list;

  const r2 = addArtifact(list, { kind: "note", title: "B", body: "c", atMs: 2 });
  assert.equal(r2.artifact!.id, 2);
  list = r2.list;

  const dup = addArtifact(list, { kind: "finding", title: "A", body: "b", atMs: 9 });
  assert.equal(dup.added, false);
  assert.equal(dup.list.length, 2); // unchanged
});

test("addArtifact trims title/body before comparing", () => {
  const first = addArtifact([], { kind: "note", title: " X ", body: " y ", atMs: 1 });
  const dup = addArtifact(first.list, { kind: "note", title: "X", body: "y", atMs: 2 });
  assert.equal(dup.added, false);
});

test("coerceArtifactKind normalizes variants", () => {
  assert.equal(coerceArtifactKind("fact-check"), "fact_check");
  assert.equal(coerceArtifactKind("FactCheck"), "fact_check");
  assert.equal(coerceArtifactKind("finding"), "finding");
  assert.equal(coerceArtifactKind("whatever"), "note");
});

test("buildArtifactsMarkdown writes frontmatter and artifact sections", () => {
  const list: Artifact[] = [
    { id: 1, kind: "finding", title: "Build fixed", body: "The build now passes.", atMs: Date.parse("2026-06-30T18:02:03Z") },
    { id: 2, kind: "note", title: "Follow-up", body: "Check the release notes.", atMs: Date.parse("2026-06-30T18:05:00Z") },
  ];
  const md = buildArtifactsMarkdown({
    artifacts: list,
    callStartMs: Date.parse("2026-06-30T18:00:00Z"),
    participants: ["Ada", "Ben"],
    sessionName: "Tuple call · Ada, Ben · 2026-06-30",
    generatedAtMs: Date.parse("2026-06-30T19:00:00Z"),
  });
  assert.match(md, /call_date: "2026-06-30T18:00:00.000Z"/);
  assert.match(md, /participants: "Ada, Ben"/);
  assert.match(md, /## Finding: Build fixed/);
  assert.match(md, /Time: 18:02:03/);
  assert.match(md, /The build now passes\./);
});

// --- envelope parsing -------------------------------------------------------

const isWakeFix = buildIsWake(["pi", "pie"]);
const isMentionFix = buildContainsWatchWord(["pi", "pie"]);

test("readEnvelope parses transcription text with speaker and wake flag", () => {
  const state = newFeedState();
  state.speakers["u1"] = { name: "Ada", email: "" };
  const rec = readEnvelope(
    JSON.stringify({ type: "transcription_finished", time: 1700000000, data: { text: "pi, can you help", user_id: "u1", start: 1700000000 } }),
    state,
    isWakeFix,
    isMentionFix,
  );
  assert.ok(rec);
  assert.match(rec!.line, /Ada: pi, can you help/);
  assert.equal(rec!.urgent, true);
  assert.equal(rec!.mentioned, false);
});

test("readEnvelope marks watch-word mention without wake as mentioned", () => {
  const state = newFeedState();
  const rec = readEnvelope(
    JSON.stringify({ type: "transcription_finished", time: 1700000000, data: { text: "we mentioned pi in passing", user_id: "u1", start: 1700000000 } }),
    state,
    isWakeFix,
    isMentionFix,
  );
  assert.equal(rec!.urgent, false);
  assert.equal(rec!.mentioned, true);
});

test("readEnvelope learns speaker names from user events", () => {
  const state = newFeedState();
  readEnvelope(
    JSON.stringify({ type: "user_joined", time: 1, data: { user: { id: "u2", full_name: "Grace Hopper", email: "g@x.co" } } }),
    state,
    isWakeFix,
  );
  assert.equal(state.speakers["u2"]?.name, "Grace Hopper");
});

test("readEnvelope tracks screen sharing and call end", () => {
  const state = newFeedState();
  readEnvelope(JSON.stringify({ type: "user_screen_sharing_started", time: 1, data: {} }), state, isWakeFix);
  assert.equal(state.screenSharing, true);
  readEnvelope(JSON.stringify({ type: "user_screen_sharing_stopped", time: 2, data: {} }), state, isWakeFix);
  assert.equal(state.screenSharing, false);

  const end = readEnvelope(JSON.stringify({ kind: "status", status: "call_ended" }), state, isWakeFix);
  assert.equal(state.ended, true);
  assert.equal(state.endedReason, "call_ended");
  assert.equal(end!.urgent, true);
});

test("readEnvelope tracks shared content title, app, and compact URL", () => {
  const state = newFeedState();
  state.speakers["u1"] = { name: "Mikey", email: "" };
  const rec = readEnvelope(
    JSON.stringify({
      type: "shared_content_changed",
      time: "2026-07-08T15:07:53.258Z",
      data: {
        user_id: "u1",
        title: { value: "PostHog Wizard - Add PostHog to your codebase automatically" },
        app: { id: "com.apple.Safari", name: "Safari" },
        url: { value: "https://posthog.com/docs/wizard?utm_source=call#install" },
        window_id: 42,
      },
    }),
    state,
    isWakeFix,
  );
  assert.ok(rec);
  assert.match(rec!.line, /shared content: Mikey focused Safari/);
  assert.match(rec!.line, /PostHog Wizard/);
  assert.match(rec!.line, /https:\/\/posthog.com\/docs\/wizard/);
  assert.doesNotMatch(rec!.line, /utm_source/);
  assert.equal(rec!.urgent, false);
  assert.equal(state.sharedContentVersion, 1);
  assert.deepEqual(sharedContentEntries(state), [{
    userId: "u1",
    userName: "Mikey",
    title: "PostHog Wizard - Add PostHog to your codebase automatically",
    appName: "Safari",
    appId: "com.apple.Safari",
    url: "https://posthog.com/docs/wizard",
    windowId: "42",
    atMs: Date.parse("2026-07-08T15:07:53.258Z"),
  }]);

  readEnvelope(JSON.stringify({ type: "user_screen_sharing_stopped", time: 2, data: { user: { id: "u1", full_name: "Mikey" } } }), state, isWakeFix);
  assert.deepEqual(sharedContentEntries(state), []);
});

test("readEnvelope treats recording_ended as terminal", () => {
  const state = newFeedState();
  const rec = readEnvelope(JSON.stringify({ type: "recording_ended", time: 1, data: {} }), state, isWakeFix);
  assert.equal(state.ended, true);
  assert.equal(state.endedReason, "recording_ended");
  assert.equal(rec!.urgent, true);
});

test("readEnvelope skips noise and malformed records", () => {
  const state = newFeedState();
  assert.equal(readEnvelope("not json", state, isWakeFix), null);
  assert.equal(readEnvelope(JSON.stringify({ type: "user_audio_started", data: {} }), state, isWakeFix), null);
  assert.equal(readEnvelope(JSON.stringify({ type: "transcription_started", data: {} }), state, isWakeFix), null);
  assert.equal(readEnvelope(JSON.stringify({ type: "transcription_finished", data: { text: "   " } }), state, isWakeFix), null);
});

// --- participants, metadata, session name ----------------------------------

test("participantNames dedupes learned speakers in order", () => {
  const state = newFeedState();
  state.speakers["u1"] = { name: "Ada", email: "" };
  state.speakers["u2"] = { name: "Ben", email: "" };
  state.speakers["u3"] = { name: "Ada", email: "" }; // dup name
  state.speakers["u4"] = { name: "", email: "x" }; // no name
  assert.deepEqual(participantNames(state), ["Ada", "Ben"]);
});

test("buildCallMetaBlock summarizes live state", () => {
  const block = buildCallMetaBlock(
    stateFixture({ mode: "balanced", callStartMs: 1000, watchWords: ["pi"] }),
    ["Ada", "Ben"],
    92_000,
    [{
      userId: "u1",
      userName: "Ada",
      title: "Example docs",
      appName: "Safari",
      appId: "com.apple.Safari",
      url: "https://example.com/docs",
      windowId: "7",
      atMs: 90_000,
    }],
  );
  assert.match(block, /Participants: Ada, Ben/);
  assert.match(block, /Elapsed: 01:31/);
  assert.match(block, /Watch mode: summary · 30s/);
  assert.match(block, /Watch words: pi/);
  assert.match(block, /Shared content: Ada · Safari · Example docs · https:\/\/example.com\/docs/);
});

test("buildCallMetaBlock handles unknown participants and no watch words", () => {
  const block = buildCallMetaBlock(stateFixture({ callStartMs: null, watchWords: [] }), [], 5000);
  assert.match(block, /Participants: unknown so far/);
  assert.match(block, /Elapsed: unknown/);
  assert.match(block, /Watch words: none/);
});

test("sessionNameFor builds a searchable name (UTC date)", () => {
  const ms = Date.parse("2026-06-30T18:00:00Z");
  assert.equal(sessionNameFor(["Ada", "Ben"], ms), "Tuple call · Ada, Ben · 2026-06-30");
  assert.equal(sessionNameFor([], ms), "Tuple call · 2026-06-30");
});

test("matchTrigger detects @/# tokens and empty queries", () => {
  assert.equal(matchTrigger("hey @ad", "@"), "ad");
  assert.equal(matchTrigger("@", "@"), ""); // just typed the trigger
  assert.equal(matchTrigger("ask pi about #churn", "#"), "churn");
  assert.equal(matchTrigger("email@example.com", "@"), null); // not a token boundary
  assert.equal(matchTrigger("plain text", "@"), null);
  assert.equal(matchTrigger("done #", "#"), "");
});

test("parseBatch sorts by time and flags urgency across the batch", () => {
  const state = newFeedState();
  const out = [
    JSON.stringify({ type: "transcription_finished", time: 200, data: { text: "second", user_id: "u1", start: 200 } }),
    JSON.stringify({ type: "transcription_finished", time: 100, data: { text: "first", user_id: "u1", start: 100 } }),
    JSON.stringify({ type: "transcription_finished", time: 150, data: { text: "pi, help", user_id: "u1", start: 150 } }),
  ].join("\n");
  const { lines, urgent } = parseBatch(out, state, isWakeFix);
  assert.equal(lines.length, 3);
  assert.match(lines[0]!, /first/);
  assert.match(lines[1]!, /pi, help/);
  assert.match(lines[2]!, /second/);
  assert.equal(urgent, true);
});

test("parseBatch returns mentioned when a non-wake watch word appears", () => {
  const state = newFeedState();
  const out = JSON.stringify({ type: "transcription_finished", time: 100, data: { text: "pi came up as a topic", user_id: "u1", start: 100 } });
  const { lines, urgent, mentioned } = parseBatch(out, state, isWakeFix, isMentionFix);
  assert.equal(lines.length, 1);
  assert.equal(urgent, false);
  assert.equal(mentioned, true);
});

// --- modes ------------------------------------------------------------------

test("mode ladder includes periodic and orders loud→quiet", () => {
  assert.deepEqual(MODE_ORDER, ["realtime", "balanced", "low_noise", "periodic"]);
  assert.equal(MODE_INTERVAL.realtime, null);
  assert.equal(MODE_INTERVAL.periodic, "5m");
  // stepping quieter past the end clamps at periodic; louder past the start at realtime
  assert.equal(nextMode("low_noise", "quieter"), "periodic");
  assert.equal(nextMode("periodic", "quieter"), "periodic");
  assert.equal(nextMode("realtime", "louder"), "realtime");
});

// --- auto cadence -----------------------------------------------------------

test("mergeConfig accepts defaultMode:auto and auto tunables", () => {
  assert.equal(DEFAULT_CONFIG.defaultMode, "auto");
  assert.equal(mergeConfig({ defaultMode: "auto" }).defaultMode, "auto");
  assert.equal(mergeConfig({ defaultMode: "nope" }).defaultMode, "auto"); // invalid → default
  const m = mergeConfig({ autoCaptureSec: 10, autoSettleSec: 20, autoPulseMin: 3 });
  assert.equal(m.autoCaptureSec, 10);
  assert.equal(m.autoSettleSec, 20);
  assert.equal(m.autoPulseMin, 3);
  assert.equal(mergeConfig({ autoPulseMin: -1 }).autoPulseMin, DEFAULT_CONFIG.autoPulseMin); // >0 only
});

test("mergeConfig accepts proactive screenshot settings", () => {
  assert.equal(DEFAULT_CONFIG.autoScreenshots, true);
  assert.equal(DEFAULT_CONFIG.screenshotIntervalMin, 5);
  assert.equal(mergeConfig({ autoScreenshots: false }).autoScreenshots, false);
  assert.equal(mergeConfig({ screenshotIntervalMin: 2 }).screenshotIntervalMin, 2);
  assert.equal(mergeConfig({ screenshotIntervalMin: 0 }).screenshotIntervalMin, 5); // >0 only
  assert.equal(mergeConfig({ autoScreenshots: "yes" }).autoScreenshots, true); // wrong type ignored
  assert.equal(DEFAULT_CONFIG.screenshotActiveSec, 15);
  assert.equal(DEFAULT_CONFIG.autoShareSettleSec, 5);
  assert.equal(mergeConfig({ screenshotActiveSec: 8, autoShareSettleSec: 3 }).screenshotActiveSec, 8);
  assert.equal(mergeConfig({ autoShareSettleSec: 3 }).autoShareSettleSec, 3);
});

test("diffParticipants finds joins and leaves", () => {
  const d = diffParticipants(["me", "mikey"], ["me", "jordan"]);
  assert.deepEqual(d.joined, ["jordan"]);
  assert.deepEqual(d.left, ["mikey"]);
});

test("autoOnRoster schedules a settle pulse only on change", () => {
  const a0 = newAutoState(true);
  const r1 = autoOnRoster(a0, ["me"], 1000, 45_000);
  assert.equal(r1.changed, true); // [] → [me]
  assert.equal(r1.auto.pendingPulseMs, 46_000);
  const r2 = autoOnRoster(r1.auto, ["me"], 60_000, 45_000); // unchanged
  assert.equal(r2.changed, false);
  assert.equal(r2.auto.pendingPulseMs, 46_000); // untouched
  // disabled auto never schedules, just tracks the roster
  const off = autoOnRoster(newAutoState(false), ["me", "mikey"], 5, 45_000);
  assert.equal(off.changed, false);
  assert.deepEqual(off.auto.prevParticipants, ["me", "mikey"]);
});

test("autoDue: capture gates on the opening window, then periodic + settle fire", () => {
  const cap = 30_000, pulse = 300_000;
  let a = newAutoState(true);
  assert.equal(autoDue(a, 10_000, 0, cap, pulse), null); // within capture window
  assert.equal(autoDue(a, 30_000, 0, cap, pulse), "capture"); // window elapsed
  assert.equal(autoDue(a, 30_000, null, cap, pulse), null); // no call start yet
  a = autoMarkPulsed(a, 30_000, 0);
  assert.equal(a.captured, true);
  assert.equal(autoDue(a, 100_000, 0, cap, pulse), null); // before periodic due
  assert.equal(autoDue(a, 330_000, 0, cap, pulse, 0), null); // quiet call skips periodic
  assert.equal(autoDue(a, 330_000, 0, cap, pulse, 1), "pulse"); // speech since last pulse
  // a scheduled settle fires as a pulse even before the periodic timer
  const withSettle = { ...a, pendingPulseMs: 90_000 };
  assert.equal(autoDue(withSettle, 90_000, 0, cap, pulse, 0), "pulse");
  // disabled → never due
  assert.equal(autoDue(newAutoState(false), 999_999, 0, cap, pulse), null);
});

test("autoOnSharing schedules a quick pulse on a share start/stop only", () => {
  const a0 = newAutoState(true); // prevSharing = false
  const r1 = autoOnSharing(a0, true, 1000, 5000);
  assert.equal(r1.changed, true);
  assert.equal(r1.auto.pendingPulseMs, 6000);
  assert.equal(r1.auto.prevSharing, true);
  const r2 = autoOnSharing(r1.auto, true, 9000, 5000); // still sharing → no change
  assert.equal(r2.changed, false);
  const r3 = autoOnSharing(r1.auto, false, 20_000, 5000); // stopped → new pulse
  assert.equal(r3.changed, true);
  // disabled auto just tracks the flag
  assert.equal(autoOnSharing(newAutoState(false), true, 1, 5000).changed, false);
});

test("autoOnSharedContent schedules a quick pulse on focused content changes", () => {
  const a0 = { ...newAutoState(true), captured: true };
  const r1 = autoOnSharedContent(a0, 1, 1000, 5000);
  assert.equal(r1.changed, true);
  assert.equal(r1.auto.pendingPulseMs, 6000);
  assert.equal(r1.auto.prevSharedContentVersion, 1);
  const r2 = autoOnSharedContent(r1.auto, 1, 9000, 5000);
  assert.equal(r2.changed, false);
  const off = autoOnSharedContent(newAutoState(false), 2, 1, 5000);
  assert.equal(off.changed, false);
  assert.equal(off.auto.prevSharedContentVersion, 2);
});

test("schedulePulse keeps the earliest pending across two events", () => {
  // a roster settle (45s) then a share settle (5s) should collapse to the sooner
  let a = newAutoState(true);
  a = autoOnRoster(a, ["me", "mikey"], 1000, 45_000).auto; // pending 46000
  a = autoOnSharing(a, true, 1000, 5000).auto; // pending min(46000, 6000) = 6000
  assert.equal(a.pendingPulseMs, 6000);
});

test("screenWatchIntervalMs maps levels to ms", () => {
  assert.equal(screenWatchIntervalMs("off", 5, 15), null);
  assert.equal(screenWatchIntervalMs("periodic", 5, 15), 300_000);
  assert.equal(screenWatchIntervalMs("active", 5, 15), 15_000);
});

test("isScreenWatch validates the level", () => {
  assert.equal(isScreenWatch("active"), true);
  assert.equal(isScreenWatch("off"), true);
  assert.equal(isScreenWatch("fast"), false);
});

test("buildAutoEvalPrompt covers both axes without call content", () => {
  const p = buildAutoEvalPrompt("low_noise", "off", "me, mikey", true, "pulse", [{
    userId: "u1",
    userName: "Mikey",
    title: "PostHog Wizard",
    appName: "Safari",
    appId: "com.apple.Safari",
    url: "https://posthog.com/wizard",
    windowId: "9",
    atMs: 90_000,
  }]);
  assert.match(p, /auto-cadence/);
  assert.match(p, /me, mikey/);
  assert.match(p, /sharing their screen/);
  assert.match(p, /Shared content signal: Mikey · Safari · PostHog Wizard · https:\/\/posthog.com\/wizard/);
  assert.match(p, /Prefer the shared-content title\/app\/URL signal before asking for screenshots/);
  assert.match(p, /set_watch_mode/);
  assert.match(p, /set_screen_watch\): "active"/);
  assert.match(p, /independent/);
});

test("buildAutoEvalPrompt forbids speculative screen-watch when no one shares", () => {
  const p = buildAutoEvalPrompt("balanced", "periodic", "me", false, "capture");
  assert.match(p, /No one is sharing/);
  assert.match(p, /do not call set_screen_watch now/);
  assert.doesNotMatch(p, /"active" \(frames every few seconds/);
  assert.match(p, /set_watch_mode/); // the transcript axis is still a live decision
});

test("consoleStatusLines shows the auto-cadence marker when enabled", () => {
  const base = stateFixture({ mode: "periodic", nextFlushMs: 100_000, autoEnabled: true });
  assert.match(consoleStatusLines(base, 5_000)[0]!, /^auto · summary 5m/);
  assert.doesNotMatch(consoleStatusLines({ ...base, autoEnabled: false }, 5_000)[0]!, /^auto ·/);
});

// --- delivery + screenshots -------------------------------------------------

test("deliveryFor pins trigger vs append rules", () => {
  assert.equal(deliveryFor("realtime", { contextOnly: true, urgent: true }), "append");
  assert.equal(deliveryFor("periodic", { urgent: true }), "trigger");
  assert.equal(deliveryFor("realtime", {}), "trigger");
  assert.equal(deliveryFor("balanced", {}), "append");
});

test("screenshotDecision captures immediately when sharing starts", () => {
  const d = screenshotDecision({
    sharing: true,
    prevSharing: false,
    lastShotMs: 900,
    screenWatch: "periodic",
    screenshotIntervalMin: 5,
    screenshotActiveSec: 15,
    nowMs: 1000,
  });
  assert.deepEqual(d.action, { kind: "capture", reason: "just started sharing", feedModel: false });
  assert.equal(d.prevSharing, true);
  assert.equal(d.lastShotMs, 1000);
});

test("screenshotDecision preserves periodic throttle by attempt", () => {
  const early = screenshotDecision({
    sharing: true,
    prevSharing: true,
    lastShotMs: 1000,
    screenWatch: "periodic",
    screenshotIntervalMin: 5,
    screenshotActiveSec: 15,
    nowMs: 1000 + 299_999,
  });
  assert.equal(early.action.kind, "none");
  assert.equal(early.lastShotMs, 1000);
  const due = screenshotDecision({ ...early, sharing: true, prevSharing: true, screenWatch: "periodic", screenshotIntervalMin: 5, screenshotActiveSec: 15, nowMs: 301_000 });
  assert.deepEqual(due.action, { kind: "capture", reason: "live", feedModel: false });
  assert.equal(due.lastShotMs, 301_000);
});

test("screenshotDecision uses active cadence without feeding the model", () => {
  const d = screenshotDecision({
    sharing: true,
    prevSharing: true,
    lastShotMs: 1000,
    screenWatch: "active",
    screenshotIntervalMin: 5,
    screenshotActiveSec: 15,
    nowMs: 16_000,
  });
  assert.deepEqual(d.action, { kind: "capture", reason: "live", feedModel: false });
});

test("screenshotDecision resets on unshare and honors off", () => {
  const stopped = screenshotDecision({
    sharing: false,
    prevSharing: true,
    lastShotMs: 1000,
    screenWatch: "active",
    screenshotIntervalMin: 5,
    screenshotActiveSec: 15,
    nowMs: 2000,
  });
  assert.equal(stopped.action.kind, "none");
  assert.equal(stopped.prevSharing, false);
  assert.equal(stopped.lastShotMs, null);
  const off = screenshotDecision({
    sharing: true,
    prevSharing: false,
    lastShotMs: null,
    screenWatch: "off",
    screenshotIntervalMin: 5,
    screenshotActiveSec: 15,
    nowMs: 3000,
  });
  assert.equal(off.action.kind, "none");
  assert.equal(off.prevSharing, true);
  assert.equal(off.lastShotMs, null);
});

test("truncate strips ANSI only when needed", () => {
  assert.equal(truncate("abcdef", 4), "abc…");
  assert.equal(truncate("abcdef", 0), "");
  assert.equal(truncate("\x1b[31mabc\x1b[0m", 5), "\x1b[31mabc\x1b[0m");
  assert.equal(truncate("\x1b[31mabcdef\x1b[0m", 4), "abc…");
});
