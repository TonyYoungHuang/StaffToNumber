import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  acknowledgeJobDispatch,
  claimNextJobDispatch,
  jobDispatchOutboxStatus,
  markJobDispatchFailed,
  markJobDispatchPublished,
} from "./job-dispatch-outbox.js";

function queueDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE score_jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE job_dispatch_outbox (
      id TEXT PRIMARY KEY, queue_name TEXT NOT NULL, job_family TEXT NOT NULL, job_id TEXT NOT NULL,
      status TEXT NOT NULL, attempts INTEGER NOT NULL, next_attempt_at TEXT NOT NULL, locked_at TEXT,
      dispatched_at TEXT, acknowledged_at TEXT, broker_job_id TEXT, last_error TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `);
  return db;
}

test("dispatch outbox retries publication and acknowledges a stable broker identity", () => {
  const db = queueDatabase();
  const now = "2026-07-16T00:00:00.000Z";
  db.prepare("INSERT INTO score_jobs VALUES ('score-1', 'queued')").run();
  db.prepare("INSERT INTO job_dispatch_outbox VALUES (?, 'score-processing', 'score', 'score-1', 'queued', 0, ?, NULL, NULL, NULL, NULL, NULL, ?, ?)")
    .run("dispatch-1", now, now, now);

  const first = claimNextJobDispatch(db, { now, staleBefore: "2026-07-15T23:55:00.000Z" });
  assert.equal(first?.attempts, 1);
  const failure = markJobDispatchFailed(db, { id: first!.id, error: "redis unavailable", now, retryBaseMs: 1_000, attempts: first!.attempts });
  assert.equal(failure.nextAttemptAt, "2026-07-16T00:00:01.000Z");
  assert.equal(claimNextJobDispatch(db, { now, staleBefore: "2026-07-15T23:55:00.000Z" }), undefined);

  const retry = claimNextJobDispatch(db, { now: failure.nextAttemptAt, staleBefore: "2026-07-15T23:55:00.000Z" });
  assert.equal(retry?.attempts, 2);
  assert.equal(markJobDispatchPublished(db, { id: retry!.id, brokerJobId: retry!.id, now: failure.nextAttemptAt }), true);
  assert.equal(acknowledgeJobDispatch(db, { id: retry!.id, now: "2026-07-16T00:00:02.000Z" }), true);
  const status = jobDispatchOutboxStatus(db);
  assert.equal(status.pending, 0);
  assert.equal(status.retrying, 0);
  assert.equal(status.oldest_created_at, null);
  db.close();
});

test("stale dispatched work is reclaimed only while its database job is still queued", () => {
  const db = queueDatabase();
  db.prepare("INSERT INTO jobs VALUES ('legacy-1', 'queued')").run();
  db.prepare("INSERT INTO job_dispatch_outbox VALUES (?, 'score-processing', 'legacy', 'legacy-1', 'dispatched', 1, ?, NULL, ?, NULL, ?, NULL, ?, ?)")
    .run("dispatch-2", "2026-07-16T00:00:00.000Z", "2026-07-16T00:00:00.000Z", "dispatch-2", "2026-07-16T00:00:00.000Z", "2026-07-16T00:00:00.000Z");
  const reclaimed = claimNextJobDispatch(db, { now: "2026-07-16T00:10:00.000Z", staleBefore: "2026-07-16T00:05:00.000Z" });
  assert.equal(reclaimed?.id, "dispatch-2");
  assert.equal(markJobDispatchPublished(db, { id: reclaimed!.id, brokerJobId: reclaimed!.id, now: "2026-07-16T00:10:00.000Z" }), true);
  db.prepare("UPDATE jobs SET status = 'completed' WHERE id = 'legacy-1'").run();
  assert.equal(claimNextJobDispatch(db, { now: "2026-07-16T00:20:00.000Z", staleBefore: "2026-07-16T00:15:00.000Z" }), undefined);
  db.close();
});
