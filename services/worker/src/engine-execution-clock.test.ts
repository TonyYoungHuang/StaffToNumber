import assert from "node:assert/strict";
import test from "node:test";
import { createEngineExecutionClock } from "./engine-execution-clock.js";

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

test("bare engine execution still has a timeout", async () => {
  let timedOut = false;
  const clock = createEngineExecutionClock({ command: process.execPath, timeoutMs: 20, onTimeout: () => { timedOut = true; } });
  await delay(40);
  assert.equal(timedOut, true);
  clock.finish();
});

test("wrapped engine budget starts after admission and handles a split readiness marker", { skip: process.platform === "win32" }, async () => {
  let timedOut = false;
  let waited = 0;
  const clock = createEngineExecutionClock({ command: "/usr/local/bin/score-audiveris", timeoutMs: 20,
    onTimeout: () => { timedOut = true; }, onQueueWait: ms => { waited = ms; } });
  assert.deepEqual(clock.environment, { SCORE_ENGINE_START_NOTIFY: "1" });
  await delay(40);
  assert.equal(timedOut, false);
  let diagnostics = clock.stderr("waiting diagnostic\nSCORE_ENGINE_");
  diagnostics += clock.stderr("STARTED\nJVM diagnostic\n");
  assert.equal(diagnostics, "waiting diagnostic\nJVM diagnostic\n");
  assert.ok(waited >= 35);
  await delay(40);
  assert.equal(timedOut, true);
  clock.finish();
});

test("cancelled queued wrapper never starts an execution timer", { skip: process.platform === "win32" }, async () => {
  let timedOut = false;
  const clock = createEngineExecutionClock({ command: "/usr/local/bin/score-homr", timeoutMs: 20, onTimeout: () => { timedOut = true; } });
  clock.stop();
  clock.stderr("SCORE_ENGINE_STARTED\n");
  await delay(40);
  assert.equal(timedOut, false);
  clock.finish();
});
