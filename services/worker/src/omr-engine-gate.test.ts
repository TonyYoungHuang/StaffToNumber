import assert from "node:assert/strict";
import test from "node:test";
import { homrEngineSlotWeight, omrEngineCapacity, withOmrEngineSlot } from "./omr-engine-gate.js";

const options = () => ({ timeoutMs: 2_000, cancelledError: () => new Error("cancelled"), timeoutError: () => new Error("budget") });
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test("separate broker jobs use all available light OMR slots without exceeding capacity", async () => {
  let active = 0;
  let maximum = 0;
  await Promise.all(Array.from({ length: omrEngineCapacity() + 2 }, () => withOmrEngineSlot(options(), async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await delay(15);
    active -= 1;
  })));
  assert.equal(maximum, omrEngineCapacity());
});

test("a cancelled waiter rejects promptly without letting the next job overtake the active engine", async () => {
  let release!: () => void;
  let firstFinished = false;
  const first = withOmrEngineSlot({ ...options(), slots: omrEngineCapacity() }, async () => { await new Promise<void>((resolve) => { release = resolve; }); firstFinished = true; });
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

test("engine wait does not consume execution budget and reports the wait to outer job deadlines", async () => {
  let release!: () => void;
  const first = withOmrEngineSlot({ ...options(), slots: omrEngineCapacity() }, async () => new Promise<void>(resolve => { release = resolve; }));
  await delay(1);
  let wait = 0;
  const waiter = withOmrEngineSlot({ ...options(), timeoutMs: 20, onQueueWait: elapsed => { wait = elapsed; } }, async timeout => {
    assert.equal(timeout, 20);
  });
  await delay(45);
  release();
  await Promise.all([first, waiter]);
  assert.ok(wait >= 40, `Expected the engine queue wait, got ${wait} ms`);
});

test("HOMR defaults to the whole pool and cannot overlap a light engine", async () => {
  assert.equal(homrEngineSlotWeight(), omrEngineCapacity());
  let release!: () => void;
  let lightFinished = false;
  const light = withOmrEngineSlot(options(), async () => { await new Promise<void>(resolve => { release = resolve; }); lightFinished = true; });
  await delay(1);
  const homr = withOmrEngineSlot({ ...options(), slots: homrEngineSlotWeight() }, async () => assert.equal(lightFinished, true));
  release();
  await Promise.all([light, homr]);
});
