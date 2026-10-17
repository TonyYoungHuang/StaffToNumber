import assert from "node:assert/strict";
import test from "node:test";
import { canReserveEngineMemory } from "./engine-memory.js";
import { EngineResourceError, engineResourceError, workerFailureMessage } from "./engine-resource-error.js";
import { withOmrEngineSlot } from "./omr-engine-gate.js";

const MIB = 1024 * 1024;
const snapshot = (availableMb: number, currentMb: number, limitMb = 2560) => ({
  availableBytes: availableMb * MIB, currentBytes: currentMb * MIB, limitBytes: limitMb * MIB,
});
const reserve = (availableMb: number, currentMb: number, reservedMb: number, requestedMb = 1024) => canReserveEngineMemory({
  snapshot: snapshot(availableMb, currentMb), baseline: snapshot(2483, 100),
  reservedBytes: reservedMb * MIB, requestedBytes: requestedMb * MIB, marginBytes: 256 * MIB,
});

test("rsl1 measured headroom admits two conservative engines and queues a third", () => {
  assert.equal(reserve(2483, 100, 0), true);
  assert.equal(reserve(2483, 100, 1024), true);
  assert.equal(reserve(2483, 100, 2048), false);
});

test("observed RSS growth is counted once and host pressure still stops launch", () => {
  assert.equal(reserve(1683, 900, 1024), true);
  assert.equal(reserve(1100, 900, 1024), false);
  assert.equal(reserve(1483, 100, 1024), false); // another site's host pressure
  assert.equal(reserve(2483, 1500, 0), false); // own cgroup headroom
});

test("three slots remain usable when host and container memory can support them", () => {
  const large = snapshot(6000, 100, 6144);
  assert.equal(canReserveEngineMemory({ snapshot: large, baseline: large,
    reservedBytes: 2048 * MIB, requestedBytes: 1024 * MIB }), true);
});

test("unlimited cgroup growth cannot erase another site's host pressure", () => {
  const baseline = { availableBytes: 2483 * MIB, currentBytes: 100 * MIB };
  const current = { availableBytes: 1483 * MIB, currentBytes: 1100 * MIB };
  assert.equal(canReserveEngineMemory({ snapshot: current, baseline,
    reservedBytes: 1024 * MIB, requestedBytes: 1024 * MIB, marginBytes: 256 * MIB }), false);
});

test("memory-blocked work ends without launch and later retries can succeed", async () => {
  const options = { timeoutMs: 100, queueWaitMs: 25,
    cancelledError: () => new Error("cancelled"), timeoutError: () => new Error("budget") };
  await assert.rejects(withOmrEngineSlot({ ...options, memorySnapshot: () => snapshot(900, 100) }, async () => assert.fail("Unsafe launch")),
    (error: unknown) => error instanceof EngineResourceError && error.code === "ENGINE_MEMORY_PRESSURE" && error.retryable);
  assert.equal(await withOmrEngineSlot({ ...options, memorySnapshot: () => snapshot(6000, 100, 6144) }, async () => "retried"), "retried");
});

test("a slot-blocked waiter ends and does not leave the queue locked", async () => {
  const options = { timeoutMs: 100, queueWaitMs: 25, memorySnapshot: () => snapshot(6000, 100, 6144),
    cancelledError: () => new Error("cancelled"), timeoutError: () => new Error("budget") };
  let release!: () => void;
  const active = withOmrEngineSlot({ ...options, slots: 3 }, () => new Promise<void>(resolve => { release = resolve; }));
  await assert.rejects(withOmrEngineSlot(options, async () => assert.fail("Unexpected overlap")),
    (error: unknown) => error instanceof EngineResourceError && error.code === "ENGINE_RESOURCE_BUSY");
  release();
  await active;
  assert.equal(await withOmrEngineSlot(options, async () => "available"), "available");
});

test("unreadable resource sensors end safely before launching an engine", async () => {
  await assert.rejects(withOmrEngineSlot({ timeoutMs: 100, queueWaitMs: 25,
    memorySnapshot: () => { throw new Error("memory.current is unavailable"); },
    cancelledError: () => new Error("cancelled"), timeoutError: () => new Error("budget"),
  }, async () => assert.fail("An unverifiable engine must not launch")),
  (error: unknown) => error instanceof EngineResourceError && error.code === "ENGINE_RESOURCE_UNAVAILABLE");
});

test("spawn, JVM, Python and export allocation errors retain the source and release credits without retry instructions", () => {
  for (const value of ["spawn ENOMEM", "java.lang.OutOfMemoryError: Java heap space", "MemoryError", "std::bad_alloc", "Cannot allocate memory"]) {
    const error = engineResourceError(new Error(value));
    assert.equal(error?.code, "ENGINE_MEMORY_PRESSURE");
    assert.match(workerFailureMessage(value), /original is retained.*credits are released/iu);
    assert.doesNotMatch(workerFailureMessage(value), /spawn ENOMEM/u);
  }
  assert.equal(engineResourceError("Audiveris exited with code 7: invalid score image"), undefined);
  assert.equal(engineResourceError("Picked up JAVA_TOOL_OPTIONS: -XX:+ExitOnOutOfMemoryError -Xmx768m\nInvalid score image"), undefined);
  assert.equal(engineResourceError("Export job was cancelled."), undefined);
  assert.equal(workerFailureMessage("[ENGINE_RESOURCE_BUSY] queue deadline"), new EngineResourceError("ENGINE_RESOURCE_BUSY").message);
});
