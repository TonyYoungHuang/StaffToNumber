import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { claimNextScoreJob, claimScoreJobById } from "./score-job-claim.js";
import { claimNextLegacyJob, claimLegacyJobById } from "./legacy-job-claim.js";
import { LIFETIME_SCHEMA_SQL, releaseLifetimeRecognitionSlot, LifetimeRecognitionDeferredError } from "@score/runtime-database";

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

test("worker polling and broker claims serialize lifetime recognition across job families without blocking exports or other accounts", () => {
  const db = queueDatabase(), timestamp = "2026-10-21T00:00:00.000Z";
  db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, updated_at TEXT);
    INSERT INTO users VALUES ('lifetime', '${timestamp}'), ('monthly', '${timestamp}');
    CREATE TABLE jobs (id TEXT PRIMARY KEY, user_id TEXT, status TEXT, created_at TEXT, updated_at TEXT, started_at TEXT,
      input_file_id TEXT, direction TEXT, request_id TEXT, trace_id TEXT, broker_job_id TEXT);`);
  db.exec(LIFETIME_SCHEMA_SQL);
  db.prepare(`INSERT INTO lifetime_entitlements (id,user_id,product_code,source_order_id,checkout_session_id,payment_intent_id,status,granted_at,reason)
    VALUES ('ent','lifetime','converter-pro-lifetime','order','session','intent','active',?,'paid_checkout')`).run(timestamp);
  const insert = db.prepare("INSERT INTO score_jobs (id,user_id,job_type,status,created_at,updated_at) VALUES (?,?,?,'queued',?,?)");
  insert.run("omr-1", "lifetime", "omr_import", timestamp, timestamp);
  insert.run("omr-2", "lifetime", "omr_import", timestamp, timestamp);
  db.prepare("INSERT INTO jobs (id,user_id,status,created_at,updated_at) VALUES ('legacy','lifetime','queued',?,?)").run(timestamp, timestamp);
  assert.equal(claimScoreJobById(db, { timestamp, jobId: "omr-1", brokerJobId: "dispatch-1" })?.id, "omr-1");
  assert.throws(() => claimLegacyJobById(db, { timestamp, jobId: "legacy", brokerJobId: "dispatch-2" }), LifetimeRecognitionDeferredError);
  assert.throws(() => claimScoreJobById(db, { timestamp, jobId: "omr-2", brokerJobId: "dispatch-3" }), LifetimeRecognitionDeferredError);
  assert.equal(claimNextScoreJob(db, timestamp), undefined);
  assert.equal(claimNextLegacyJob(db, timestamp), undefined);
  insert.run("export", "lifetime", "render_export", timestamp, timestamp);
  insert.run("monthly", "monthly", "omr_import", timestamp, timestamp);
  assert.equal(claimNextScoreJob(db, timestamp)?.id, "export");
  assert.equal(claimNextScoreJob(db, timestamp)?.id, "monthly");
  assert.equal((db.prepare("SELECT attempt_count FROM score_jobs WHERE id = 'omr-2'").get() as { attempt_count: number }).attempt_count, 0);
  db.exec("UPDATE score_jobs SET status = 'cancelled' WHERE id = 'omr-1'");
  assert.equal(claimNextLegacyJob(db, timestamp), undefined, "Cancellation must not free a slot while the engine is stopping");
  releaseLifetimeRecognitionSlot(db, "score", "omr-1");
  assert.equal(claimNextLegacyJob(db, timestamp)?.id, "legacy");
  assert.equal(claimNextScoreJob(db, timestamp), undefined);
  db.exec("UPDATE jobs SET status = 'failed' WHERE id = 'legacy'");
  releaseLifetimeRecognitionSlot(db, "legacy", "legacy");
  assert.equal(claimNextScoreJob(db, timestamp)?.id, "omr-2");
  db.close();
});

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

test("duplicate broker deliveries never reclaim a processing recognition job", () => {
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
  assert.equal(sameRetry, undefined);
  assert.deepEqual({ ...state }, { status: "processing", attempt_count: 1, broker_job_id: "dispatch-1" });
  db.close();
});

test("enabled claim lanes validate the server snapshot and reject mismatched broker claims", () => {
  const db = queueDatabase(), timestamp = "2026-10-17T00:00:00.000Z";
  db.prepare("INSERT INTO score_jobs (id,user_id,job_type,status,params_json,created_at,updated_at) VALUES ('big-score','user-1','omr_import','queued',?,?,?)")
    .run(JSON.stringify({ recognitionLane: "big", memoryAssessment: { estimatedMemoryMb: 2048 } }), timestamp, timestamp);
  assert.throws(() => claimScoreJobById(db, { timestamp, jobId: "big-score", brokerJobId: "normal-dispatch", lane: "normal", lanesEnabled: true }), /lane does not match/u);
  assert.equal(claimScoreJobById(db, { timestamp, jobId: "big-score", brokerJobId: "big-dispatch", lane: "big", lanesEnabled: true })?.id, "big-score");
  assert.equal(claimScoreJobById(db, { timestamp, jobId: "big-score", brokerJobId: "big-dispatch", lane: "big", lanesEnabled: true }), undefined);
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
