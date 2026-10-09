import test from "node:test";
import assert from "node:assert/strict";
import { createOmrProgressReporter, type OmrProgress } from "./omr-job-progress.js";

test("a long engine step emits liveness without inventing progress or losing its page", async () => {
  const updates: OmrProgress[] = [];
  const reporter = createOmrProgressReporter(update => updates.push(update), 10);
  reporter.report({ stage: "recognize", page: 2, totalPages: 5 });
  await new Promise(resolve => setTimeout(resolve, 35));
  reporter.stop();
  assert.ok(updates.length > 1);
  assert.equal(updates.at(-1)?.page, 2);
  assert.equal(updates[0].reportedAt, updates.at(-1)?.reportedAt);
  assert.notEqual(updates[0].heartbeatAt, updates.at(-1)?.heartbeatAt);
  assert.ok(updates.every(update => !("percent" in update)));
  const size = updates.length;
  reporter.report({ stage: "save" });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(updates.length, size, "completed/failed job reporting must stop");
});

test("temporary status-write failure does not fail the recognized score", () => {
  const reporter = createOmrProgressReporter(() => { throw Error("temporary status store failure"); });
  try { assert.doesNotThrow(() => reporter.report({ stage: "restore-image" })); } finally { reporter.stop(); }
});
