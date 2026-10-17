import assert from "node:assert/strict";
import test from "node:test";
import { getJobMemoryLeaseEnvironment, hasJobMemoryLease, jobMemoryLeaseReady, withJobMemoryLease } from "./job-memory-lease.js";
import { recognitionLaneResourcePolicy } from "./recognition-lane.js";

test("invalid large-lane settings cannot launch an uncapped JVM or exceed its reservation",()=>{
  const previousCap=process.env.RECOGNITION_BIG_MAX_MB,previousHeap=process.env.RECOGNITION_BIG_HEAP_MB;
  try {
    process.env.RECOGNITION_BIG_MAX_MB="bad";process.env.RECOGNITION_BIG_HEAP_MB="bad";
    assert.deepEqual(recognitionLaneResourcePolicy({lane:"big",estimatedMemoryMb:1536,normalHeapMb:768}),{heapMb:768,reservationMb:1536});
    process.env.RECOGNITION_BIG_MAX_MB="2048";process.env.RECOGNITION_BIG_HEAP_MB="999999";
    assert.deepEqual(recognitionLaneResourcePolicy({lane:"big",estimatedMemoryMb:1536,normalHeapMb:768}),{heapMb:1536,reservationMb:2048});
    process.env.RECOGNITION_BIG_MAX_MB="1";assert.throws(()=>recognitionLaneResourcePolicy({lane:"big",normalHeapMb:768}),/not configured safely/);
  } finally {
    if(previousCap===undefined)delete process.env.RECOGNITION_BIG_MAX_MB;else process.env.RECOGNITION_BIG_MAX_MB=previousCap;
    if(previousHeap===undefined)delete process.env.RECOGNITION_BIG_HEAP_MB;else process.env.RECOGNITION_BIG_HEAP_MB=previousHeap;
  }
});

test("lease readiness accepts complete authenticated JSON across split stdout chunks", () => {
  assert.equal(jobMemoryLeaseReady('{"ready": tr', "token-1"), false);
  assert.equal(jobMemoryLeaseReady('{"ready": true,"token":"token-1"}\n', "token-1"), true);
  assert.equal(jobMemoryLeaseReady('{"ready": true,"token":"token-2"}\n', "token-1"), false);
  assert.equal(jobMemoryLeaseReady('diagnostic\n{"ready":true,"token":"token-1"}\n', "token-1"), true);
});

test("disabled lanes preserve the existing engine admission path and expose no token", async () => {
  const previous = process.env.RECOGNITION_LANES_ENABLED;
  process.env.RECOGNITION_LANES_ENABLED = "false";
  try {
    assert.equal(await withJobMemoryLease({ lane: "normal", memoryMb: 1024, isCancelled: () => false, pythonCommand: "unused", scriptPath: "unused" }, async () => {
      assert.equal(hasJobMemoryLease(), false);
      assert.deepEqual(getJobMemoryLeaseEnvironment(), {});
      return "done";
    }), "done");
    await assert.rejects(withJobMemoryLease({ lane: "big", memoryMb: 2048, isCancelled: () => false, pythonCommand: "unused", scriptPath: "unused" }, async () => assert.fail("A disabled big lane must not launch")), /ENGINE_RESOURCE_UNAVAILABLE/u);
  } finally { if (previous === undefined) delete process.env.RECOGNITION_LANES_ENABLED; else process.env.RECOGNITION_LANES_ENABLED = previous; }
});
