import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { claimLegacyJobById, claimNextLegacyJob } from "./legacy-job-claim.js";

function queueDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, input_file_id TEXT NOT NULL, direction TEXT NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT,
      broker_job_id TEXT, request_id TEXT, trace_id TEXT
    );
  `);
  return db;
}

test("legacy polling claim is atomic and stably ordered", () => {
  const db = queueDatabase();
  const insert = db.prepare("INSERT INTO jobs VALUES (?, 'user-1', 'file-1', 'staff_pdf_to_numbered', ?, ?, ?, NULL, NULL, NULL, NULL)");
  insert.run("second", "queued", "2026-07-16T00:00:01.000Z", "2026-07-16T00:00:01.000Z");
  insert.run("first", "queued", "2026-07-16T00:00:00.000Z", "2026-07-16T00:00:00.000Z");
  assert.equal(claimNextLegacyJob(db, "2026-07-16T00:00:02.000Z")?.id, "first");
  assert.equal(claimNextLegacyJob(db, "2026-07-16T00:00:03.000Z")?.id, "second");
  assert.equal(claimNextLegacyJob(db, "2026-07-16T00:00:04.000Z"), undefined);
  db.close();
});

test("legacy broker claim permits only an identical dispatch retry", () => {
  const db = queueDatabase();
  db.prepare("INSERT INTO jobs VALUES ('legacy-1', 'user-1', 'file-1', 'staff_pdf_to_numbered', 'queued', ?, ?, NULL, NULL, NULL, NULL)")
    .run("2026-07-16T00:00:00.000Z", "2026-07-16T00:00:00.000Z");
  assert.equal(claimLegacyJobById(db, { timestamp: "2026-07-16T00:00:01.000Z", jobId: "legacy-1", brokerJobId: "dispatch-1" })?.id, "legacy-1");
  assert.equal(claimLegacyJobById(db, { timestamp: "2026-07-16T00:00:02.000Z", jobId: "legacy-1", brokerJobId: "dispatch-2" }), undefined);
  assert.equal(claimLegacyJobById(db, { timestamp: "2026-07-16T00:00:03.000Z", jobId: "legacy-1", brokerJobId: "dispatch-1" })?.id, "legacy-1");
  db.close();
});

test("returns persisted trace fields for legacy work", () => {
  const db = queueDatabase();
  db.prepare(
    "INSERT INTO jobs VALUES ('legacy-traced', 'user-1', 'file-1', 'staff_pdf_to_numbered', 'queued', ?, ?, NULL, NULL, 'request-1', '0123456789abcdef0123456789abcdef')",
  ).run("2026-07-16T00:00:00.000Z", "2026-07-16T00:00:00.000Z");
  const claimed = claimNextLegacyJob(db, "2026-07-16T00:00:01.000Z");
  assert.equal(claimed?.request_id, "request-1");
  assert.equal(claimed?.trace_id, "0123456789abcdef0123456789abcdef");
  db.close();
});
