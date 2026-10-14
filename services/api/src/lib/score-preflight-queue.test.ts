import assert from "node:assert/strict";
import test from "node:test";
import { ScorePreflightError, ScorePreflightQueue } from "./score-structure-preflight.js";

test("queue preserves capacity and lets other users pass a running user's follow-up", async () => {
  const queue = new ScorePreflightQueue(() => ({ maxConcurrency: 2, queueWaitMs: 1000, requestsPerMinute: 6 }));
  const first = await queue.acquire("first");
  let admitted = false;
  const followUp = queue.acquire("first").then(release => { admitted = true; return release; });
  const second = await queue.acquire("second");
  assert.equal(admitted, false);
  first(); const release = await followUp; assert.equal(admitted, true);
  first(); // An idempotent release cannot release another user's running request.
  release(); second();
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
