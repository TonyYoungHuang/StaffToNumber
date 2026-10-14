import assert from "node:assert/strict";
import test from "node:test";
import { ScorePreflightError, ScorePreflightQueue } from "./score-structure-preflight.js";

test("three same-user checks share capacity and queued requests remain FIFO with idempotent releases", async () => {
  const queue = new ScorePreflightQueue(() => ({ maxConcurrency: 3, queueWaitMs: 1000, requestsPerMinute: 0 }));
  const first = await queue.acquire("first");
  const second = await queue.acquire("first");
  const third = await queue.acquire("first");
  const admitted: string[] = [];
  const fourth = queue.acquire("first").then(release => { admitted.push("fourth"); return release; });
  const fifth = queue.acquire("second").then(release => { admitted.push("fifth"); return release; });
  await Promise.resolve(); assert.deepEqual(admitted, []);
  first(); const releaseFourth = await fourth; assert.deepEqual(admitted, ["fourth"]);
  first(); // An idempotent release cannot release another running request's slot.
  await Promise.resolve(); assert.deepEqual(admitted, ["fourth"]);
  second(); const releaseFifth = await fifth; assert.deepEqual(admitted, ["fourth", "fifth"]);
  third(); releaseFourth(); releaseFifth();
});

test("a zero request budget disables the per-user minute cap while an explicit budget still applies", async () => {
  const options = { maxConcurrency: 3, queueWaitMs: 1000, requestsPerMinute: 0 };
  const queue = new ScorePreflightQueue(() => options);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const release = await queue.acquire("first"); release();
  }
  options.requestsPerMinute = 1;
  const release = await queue.acquire("first"); release();
  await assert.rejects(queue.acquire("first"), (error: unknown) => error instanceof ScorePreflightError && error.code === "SCORE_PREFLIGHT_RATE_LIMIT");
});

test("an expired queue waiter does not consume the next released capacity", async () => {
  const queue = new ScorePreflightQueue(() => ({ maxConcurrency: 1, queueWaitMs: 20, requestsPerMinute: 0 }));
  const first = await queue.acquire("first");
  await assert.rejects(queue.acquire("expired"), (error: unknown) => error instanceof ScorePreflightError && error.code === "SCORE_PREFLIGHT_BUSY");
  first(); const next = await queue.acquire("next"); next();
});

test("aborting a queued preflight removes it without occupying a later slot", async () => {
  const queue = new ScorePreflightQueue(() => ({ maxConcurrency: 1, queueWaitMs: 1000, requestsPerMinute: 6 }));
  const first = await queue.acquire("first");
  const abort = new AbortController();
  const queued = queue.acquire("aborted", abort.signal);
  const rejected = assert.rejects(queued, (error: unknown) => error instanceof ScorePreflightError && error.code === "SCORE_PREFLIGHT_FAILED");
  abort.abort(); await rejected; first();
  const next = await queue.acquire("next"); next();
});
