import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { claimNextScoreJob, claimScoreJobById } from "./score-job-claim.js";

function queueDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE score_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT,
      input_file_id TEXT,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      params_json TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      progress_percent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
      ,broker_job_id TEXT,
      request_id TEXT,
      trace_id TEXT
    )
  `);
  return db;
}

test("claims one queued score job exactly once", () => {
  const db = queueDatabase();
  const createdAt = "2026-07-15T00:00:00.000Z";
  db.prepare("INSERT INTO score_jobs (id, user_id, job_type, status, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?)")
    .run("omr-1", "user-1", "omr_import", createdAt, createdAt);

  const claimed = claimNextScoreJob(db, "2026-07-15T00:00:01.000Z");
  const duplicate = claimNextScoreJob(db, "2026-07-15T00:00:02.000Z");
  const row = db.prepare("SELECT status, attempt_count FROM score_jobs WHERE id = ?").get("omr-1") as {
    status: string;
    attempt_count: number;
  };

  assert.equal(claimed?.id, "omr-1");
  assert.equal(duplicate, undefined);
  assert.equal(row.status, "processing");
  assert.equal(row.attempt_count, 1);
  assert.equal(claimed?.trace_id, null);
  db.close();
});

test("broker retries can reclaim only the same processing dispatch", () => {
  const db = queueDatabase();
  const createdAt = "2026-07-15T00:00:00.000Z";
  db.prepare("INSERT INTO score_jobs (id, user_id, job_type, status, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?)")
    .run("omr-broker", "user-1", "omr_import", createdAt, createdAt);
  const first = claimScoreJobById(db, { timestamp: "2026-07-15T00:00:01.000Z", jobId: "omr-broker", brokerJobId: "dispatch-1" });
  const wrongRetry = claimScoreJobById(db, { timestamp: "2026-07-15T00:00:02.000Z", jobId: "omr-broker", brokerJobId: "dispatch-2" });
  const sameRetry = claimScoreJobById(db, { timestamp: "2026-07-15T00:00:03.000Z", jobId: "omr-broker", brokerJobId: "dispatch-1" });
  const state = db.prepare("SELECT status, attempt_count, broker_job_id FROM score_jobs WHERE id = ?").get("omr-broker") as Record<string, unknown>;
  assert.equal(first?.id, "omr-broker");
  assert.equal(wrongRetry, undefined);
  assert.equal(sameRetry?.id, "omr-broker");
  assert.deepEqual({ ...state }, { status: "processing", attempt_count: 1, broker_job_id: "dispatch-1" });
  db.close();
});

test("returns persisted request tracing fields to the worker", () => {
  const db = queueDatabase();
  const createdAt = "2026-07-15T00:00:00.000Z";
  db.prepare(
    "INSERT INTO score_jobs (id, user_id, job_type, status, request_id, trace_id, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)",
  ).run("traced", "user-1", "render_export", "request-1", "0123456789abcdef0123456789abcdef", createdAt, createdAt);
  const claimed = claimNextScoreJob(db, "2026-07-15T00:00:01.000Z");
  assert.equal(claimed?.request_id, "request-1");
  assert.equal(claimed?.trace_id, "0123456789abcdef0123456789abcdef");
  db.close();
});

test("claims queued jobs in stable creation order and skips cancelled work", () => {
  const db = queueDatabase();
  const insert = db.prepare("INSERT INTO score_jobs (id, user_id, job_type, status, created_at, updated_at) VALUES (?, 'user-1', 'omr_import', ?, ?, ?)");
  insert.run("cancelled", "cancelled", "2026-07-15T00:00:00.000Z", "2026-07-15T00:00:00.000Z");
  insert.run("second", "queued", "2026-07-15T00:00:02.000Z", "2026-07-15T00:00:02.000Z");
  insert.run("first", "queued", "2026-07-15T00:00:01.000Z", "2026-07-15T00:00:01.000Z");

  assert.equal(claimNextScoreJob(db, "2026-07-15T00:00:03.000Z")?.id, "first");
  assert.equal(claimNextScoreJob(db, "2026-07-15T00:00:04.000Z")?.id, "second");
  assert.equal(claimNextScoreJob(db, "2026-07-15T00:00:05.000Z"), undefined);
  db.close();
});
