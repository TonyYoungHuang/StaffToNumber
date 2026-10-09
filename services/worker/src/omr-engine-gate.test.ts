import assert from "node:assert/strict";
import test from "node:test";
import { withOmrEngineSlot } from "./omr-engine-gate.js";

const options = () => ({ timeoutMs: 2_000, cancelledError: () => new Error("cancelled"), timeoutError: () => new Error("budget") });
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test("separate broker jobs cannot run heavy OMR models at the same time", async () => {
  let active = 0;
  let maximum = 0;
  await Promise.all(Array.from({ length: 3 }, () => withOmrEngineSlot(options(), async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await delay(15);
    active -= 1;
  })));
  assert.equal(maximum, 1);
});

test("a cancelled waiter rejects promptly without letting the next job overtake the active engine", async () => {
  let release!: () => void;
  let firstFinished = false;
  const first = withOmrEngineSlot(options(), async () => { await new Promise<void>((resolve) => { release = resolve; }); firstFinished = true; });
  await delay(1);
  let cancelled = false;
  const waiter = withOmrEngineSlot({ ...options(), isCancelled: () => cancelled }, async () => assert.fail("Cancelled job must not start"));
  const next = withOmrEngineSlot(options(), async () => assert.equal(firstFinished, true));
  cancelled = true;
  await assert.rejects(waiter, /cancelled/u);
  assert.equal(firstFinished, false);
  release();
  await Promise.all([first, next]);
});

test("the time waiting for an engine is deducted from the execution budget", async () => {
  const first = withOmrEngineSlot(options(), async () => delay(45));
  const waiter = withOmrEngineSlot({ ...options(), timeoutMs: 20 }, async () => assert.fail("Expired job must not start"));
  await assert.rejects(waiter, /budget/u);
  await first;
});
