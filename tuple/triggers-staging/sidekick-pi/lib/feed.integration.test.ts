// Integration smoke tests for the Pi-facing feed loop. These use a fake Tuple
// CLI written into a temp dir at runtime, so no committed binary or live daemon
// is needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { addArtifact, mergeConfig } from "./console-core.ts";
import { autoTick, buildContextInjection, finalizeFeedEnd, followLoop, screenshotTick } from "./feed.ts";
import { applyMode, createRuntime, type RuntimeState, type SidekickCtx } from "./runtime.ts";

interface SentMessage {
  message: any;
  options: any;
}

function fakePi() {
  const sent: SentMessage[] = [];
  return {
    sent,
    pi: {
      sendMessage(message: any, options: any = {}) {
        sent.push({ message, options });
      },
      setSessionName(_name: string) {},
    },
  };
}

function ctxFixture(): SidekickCtx {
  return { hasUI: true, ui: { notify() {} } };
}

async function makeFakeTuple(responses: string[]): Promise<{ dir: string; cli: string }> {
  const dir = await mkdtemp(join(tmpdir(), "sidekick-feed-"));
  const cli = join(dir, "fake-tuple.js");
  await writeFile(join(dir, "counter"), "0", "utf8");
  for (let i = 0; i < responses.length; i++) {
    await writeFile(join(dir, `response-${i + 1}.txt`), responses[i]!, "utf8");
  }
  await writeFile(cli, `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const dir = process.env.FAKE_TUPLE_DIR;
const counterPath = path.join(dir, "counter");
const n = Number(fs.readFileSync(counterPath, "utf8")) + 1;
fs.writeFileSync(counterPath, String(n));
fs.writeFileSync(path.join(dir, "argv-" + n + ".json"), JSON.stringify(process.argv.slice(2)));
const responsePath = path.join(dir, "response-" + n + ".txt");
const response = fs.existsSync(responsePath) ? fs.readFileSync(responsePath, "utf8") : "";
if (response.trim() === "__FAIL__") {
  console.error("fake tuple failure " + n);
  process.exit(2);
}
if (response.trim() === "__BLOCK__") {
  setInterval(() => {}, 1000);
} else {
  process.stdout.write(response);
}
`, "utf8");
  await chmod(cli, 0o755);
  return { dir, cli };
}

function transcript(text: string, time: number, userId = "u1"): string {
  return JSON.stringify({ type: "transcription_finished", time, data: { text, user_id: userId, start: time } });
}

function callEnded(): string {
  return JSON.stringify({ kind: "status", status: "call_ended" });
}

function runtimeFor(cli: string, over: object = {}): RuntimeState {
  const runtime = createRuntime(mergeConfig({
    defaultMode: "periodic",
    catchupMaxLines: 2,
    watchWords: ["pi", "pie"],
    streamTimeout: "500ms",
    ...over,
  }));
  runtime.cli = cli;
  runtime.state.callStartMs = 1000;
  runtime.feedRetryDelayMs = 1;
  runtime.feedRetryDelayAfterAlertMs = 1;
  return runtime;
}

async function cleanup(dir: string) {
  await rm(dir, { recursive: true, force: true });
}

async function waitFor(fn: () => boolean, message: string) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.fail(message);
}

test("followLoop appends capped catch-up immediately, then urgent wake batches as trigger", async () => {
  const first = [
    transcript("first", 1),
    transcript("second", 2),
    transcript("third", 3),
    transcript("fourth", 4),
  ].join("\n");
  const second = transcript("pi, can you check this?", 5);
  const fake = await makeFakeTuple([first, second, callEnded()]);
  const prev = process.env.FAKE_TUPLE_DIR;
  process.env.FAKE_TUPLE_DIR = fake.dir;
  try {
    const runtime = runtimeFor(fake.cli);
    const { pi, sent } = fakePi();
    await followLoop(pi as any, runtime, ctxFixture());

    const catchup = sent.find((m) => String(m.message.content).startsWith("The call so far"));
    assert.ok(catchup);
    assert.equal(catchup!.options.deliverAs, undefined);
    assert.ok(!catchup!.options.triggerTurn);
    assert.match(catchup!.message.content, /2 earlier lines omitted/);
    assert.doesNotMatch(catchup!.message.content, /first/);
    assert.match(catchup!.message.content, /third/);

    const urgent = sent.find((m) => String(m.message.content).includes("pi, can you check this"));
    assert.ok(urgent);
    assert.equal(urgent!.options.triggerTurn, true);
  } finally {
    if (prev == null) delete process.env.FAKE_TUPLE_DIR;
    else process.env.FAKE_TUPLE_DIR = prev;
    await cleanup(fake.dir);
  }
});

test("followLoop reports feed error after six failures and recovery on the next successful poll", async () => {
  const fake = await makeFakeTuple(["__FAIL__", "__FAIL__", "__FAIL__", "__FAIL__", "__FAIL__", "__FAIL__", "", callEnded()]);
  const prev = process.env.FAKE_TUPLE_DIR;
  process.env.FAKE_TUPLE_DIR = fake.dir;
  try {
    const runtime = runtimeFor(fake.cli);
    const { pi, sent } = fakePi();
    await followLoop(pi as any, runtime, ctxFixture());

    assert.equal(runtime.state.feedHealth.status, "recovered");
    assert.ok(sent.some((m) => String(m.message.content).includes("live transcript feed errored")));
    const restored = sent.find((m) => String(m.message.content).includes("live transcript feed is back"));
    assert.ok(restored);
    assert.equal(restored!.options.deliverAs, undefined);
    assert.ok(!restored!.options.triggerTurn);
  } finally {
    if (prev == null) delete process.env.FAKE_TUPLE_DIR;
    else process.env.FAKE_TUPLE_DIR = prev;
    await cleanup(fake.dir);
  }
});

test("quiet-mode transcript batches are appended to context immediately, never queued as nextTurn", async () => {
  const first = [transcript("first", 1), transcript("second", 2), transcript("third", 3)].join("\n");
  const second = transcript("routine update about the plan", 5);
  const fake = await makeFakeTuple([first, second, callEnded()]);
  const prev = process.env.FAKE_TUPLE_DIR;
  process.env.FAKE_TUPLE_DIR = fake.dir;
  try {
    const runtime = runtimeFor(fake.cli, { defaultMode: "balanced" });
    const { pi, sent } = fakePi();
    await followLoop(pi as any, runtime, ctxFixture());

    const routine = sent.find((m) => String(m.message.content).includes("routine update about the plan") && !String(m.message.content).includes("call_ended"));
    assert.ok(routine);
    assert.equal(routine!.options.deliverAs, undefined);
    assert.ok(!routine!.options.triggerTurn);

    assert.ok(!sent.some((m) => m.options.deliverAs === "nextTurn"));
  } finally {
    if (prev == null) delete process.env.FAKE_TUPLE_DIR;
    else process.env.FAKE_TUPLE_DIR = prev;
    await cleanup(fake.dir);
  }
});

test("followLoop finalizes call end and exports artifacts markdown", async () => {
  const fake = await makeFakeTuple([callEnded()]);
  const prevFake = process.env.FAKE_TUPLE_DIR;
  const prevArtifacts = process.env.TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY;
  process.env.FAKE_TUPLE_DIR = fake.dir;
  process.env.TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY = fake.dir;
  try {
    const runtime = runtimeFor(fake.cli);
    const res = addArtifact(runtime.state.artifacts, { kind: "note", title: "Decision", body: "Ship the fix.", atMs: Date.parse("2026-06-30T18:00:00Z") });
    runtime.state.artifacts = res.list;
    runtime.lastSessionName = "Tuple call · Test";
    const { pi } = fakePi();
    await followLoop(pi as any, runtime, ctxFixture());

    assert.equal(runtime.state.ended, true);
    assert.equal(runtime.state.endedReason, "call_ended");
    const markdown = await readFile(join(fake.dir, "sidekick-notes.md"), "utf8");
    assert.match(markdown, /## Note: Decision/);
    assert.match(markdown, /Ship the fix\./);
  } finally {
    if (prevFake == null) delete process.env.FAKE_TUPLE_DIR;
    else process.env.FAKE_TUPLE_DIR = prevFake;
    if (prevArtifacts == null) delete process.env.TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY;
    else process.env.TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY = prevArtifacts;
    await cleanup(fake.dir);
  }
});

test("applyMode restarts a blocking stream without counting an error and next argv uses new interval", async () => {
  const fake = await makeFakeTuple(["__BLOCK__", callEnded()]);
  const prev = process.env.FAKE_TUPLE_DIR;
  process.env.FAKE_TUPLE_DIR = fake.dir;
  try {
    const runtime = runtimeFor(fake.cli);
    const { pi, sent } = fakePi();
    const loop = followLoop(pi as any, runtime, ctxFixture());
    await waitFor(() => existsSync(join(fake.dir, "argv-1.json")), "first fake tuple invocation did not start");
    applyMode(runtime, undefined, "balanced");
    await loop;

    assert.equal(runtime.state.feedHealth.status, "ok");
    assert.ok(!sent.some((m) => String(m.message.content).includes("live transcript feed errored")));
    const argv2 = JSON.parse(await readFile(join(fake.dir, "argv-2.json"), "utf8"));
    assert.equal(argv2[argv2.indexOf("--interval") + 1], "30s");
  } finally {
    if (prev == null) delete process.env.FAKE_TUPLE_DIR;
    else process.env.FAKE_TUPLE_DIR = prev;
    await cleanup(fake.dir);
  }
});

test("buildContextInjection carries the feed override, live call state, and learned participants", () => {
  const runtime = runtimeFor("unused-cli-not-invoked");
  runtime.feed.speakers["u1"] = { name: "Grace Hopper", email: "g@x.co" };
  const injected = buildContextInjection(runtime, Date.now());
  assert.equal(injected.role, "custom");
  assert.equal(injected.customType, "tuple-call-state");
  assert.match(injected.content, /Live transcript delivery/);
  assert.match(injected.content, /## Current call state/);
  assert.match(injected.content, /Grace Hopper/);
});

test("autoTick sends the auto-eval prompt via triggerTurn once the capture window elapses", () => {
  const runtime = createRuntime(mergeConfig({ defaultMode: "auto", autoCaptureSec: 1 }));
  runtime.state.callStartMs = Date.now() - 2000;
  const { pi, sent } = fakePi();
  autoTick(pi as any, runtime);

  const evalMsg = sent.find((m) => m.message.customType === "tuple-auto-eval");
  assert.ok(evalMsg);
  assert.equal(evalMsg!.options.triggerTurn, true);
  assert.equal(runtime.autoState.captured, true);
});

test("autoTick withholds the periodic pulse when the call has stayed silent", () => {
  const runtime = createRuntime(mergeConfig({ defaultMode: "auto", autoCaptureSec: 1 }));
  runtime.state.callStartMs = Date.now() - 2000;
  const { pi, sent } = fakePi();
  autoTick(pi as any, runtime); // capture window elapses; first evaluation fires
  assert.equal(runtime.autoState.captured, true);

  sent.length = 0;
  runtime.autoState.lastPulseMs = Date.now() - 10 * 60_000; // batchCount unchanged
  autoTick(pi as any, runtime);
  assert.equal(sent.length, 0);
});

test("screenshotTick captures a frame and feeds the model when screen watch is active", async () => {
  const fake = await makeFakeTuple(["fake-jpeg-bytes"]);
  const prev = process.env.FAKE_TUPLE_DIR;
  process.env.FAKE_TUPLE_DIR = fake.dir;
  try {
    const runtime = createRuntime(mergeConfig({}));
    runtime.cli = fake.cli;
    runtime.uiReady = true;
    runtime.feed.screenSharing = true;
    runtime.state.screenWatch = "active";
    const { pi, sent } = fakePi();

    screenshotTick(pi as any, runtime);
    await waitFor(() => sent.some((m) => m.message.customType === "tuple-screenshot"), "screenshot message was not sent");

    const shot = sent.find((m) => m.message.customType === "tuple-screenshot")!;
    assert.deepEqual(shot.options, {}); // frames must never be queued
  } finally {
    if (prev == null) delete process.env.FAKE_TUPLE_DIR;
    else process.env.FAKE_TUPLE_DIR = prev;
    await cleanup(fake.dir);
  }
});

test("followLoop triggers a turn for routine speech in realtime mode", async () => {
  const first = [transcript("first", 1), transcript("second", 2)].join("\n");
  const second = transcript("just chatting about the plan", 5);
  const fake = await makeFakeTuple([first, second, callEnded()]);
  const prev = process.env.FAKE_TUPLE_DIR;
  process.env.FAKE_TUPLE_DIR = fake.dir;
  try {
    const runtime = runtimeFor(fake.cli, { defaultMode: "realtime" });
    const { pi, sent } = fakePi();
    await followLoop(pi as any, runtime, ctxFixture());

    const routine = sent.find((m) => String(m.message.content).includes("just chatting about the plan"));
    assert.ok(routine);
    assert.equal(routine!.options.triggerTurn, true);
  } finally {
    if (prev == null) delete process.env.FAKE_TUPLE_DIR;
    else process.env.FAKE_TUPLE_DIR = prev;
    await cleanup(fake.dir);
  }
});

test("finalizeFeedEnd is idempotent across a double call", async () => {
  const runtime = runtimeFor("unused-cli-not-invoked");
  assert.equal(runtime.state.artifacts.length, 0); // no artifacts: exportArtifacts early-returns
  const { pi } = fakePi();

  await finalizeFeedEnd(pi as any, runtime, ctxFixture(), 1000);
  const firstEndedAt = runtime.state.endedAtMs;
  assert.equal(firstEndedAt, 1000);

  await finalizeFeedEnd(pi as any, runtime, ctxFixture(), 2000);
  assert.equal(runtime.state.endedAtMs, firstEndedAt);
});
