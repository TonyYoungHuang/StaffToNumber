import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { consumeBrokerJob } from "./job-broker-consumer.js";

function brokerDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE score_jobs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, document_id TEXT, input_file_id TEXT,
      job_type TEXT NOT NULL, status TEXT NOT NULL, params_json TEXT, attempt_count INTEGER NOT NULL DEFAULT 0,
      progress_percent INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      started_at TEXT, completed_at TEXT, broker_job_id TEXT, request_id TEXT, trace_id TEXT
    );
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, input_file_id TEXT NOT NULL, direction TEXT NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT, broker_job_id TEXT, request_id TEXT, trace_id TEXT
    );
    CREATE TABLE job_dispatch_outbox (
      id TEXT PRIMARY KEY, status TEXT NOT NULL, acknowledged_at TEXT, locked_at TEXT,
      broker_job_id TEXT, last_error TEXT, updated_at TEXT NOT NULL
    );
  `);
  return db;
}

test("consumer atomically claims and acknowledges an early score dispatch", async () => {
  const db = brokerDatabase();
  const now = "2026-07-17T00:00:00.000Z";
  db.prepare("INSERT INTO score_jobs (id, user_id, job_type, status, created_at, updated_at) VALUES ('score-1', 'user-1', 'render_export', 'queued', ?, ?)").run(now, now);
  db.prepare("INSERT INTO job_dispatch_outbox VALUES ('dispatch1', 'processing', NULL, ?, NULL, NULL, ?)").run(now, now);
  let processed = "";
  const result = await consumeBrokerJob({
    db,
    brokerJob: { id: "dispatch1", data: { dispatchId: "dispatch1", family: "score", jobId: "score-1" } },
    now: () => now,
    processScoreJob: async (job) => {
      processed = job.id;
    },
    processLegacyJob: async () => undefined,
  });
  const outbox = db.prepare("SELECT status, broker_job_id FROM job_dispatch_outbox WHERE id = 'dispatch1'").get() as Record<string, unknown>;
  assert.deepEqual(result, { claimed: true, family: "score" });
  assert.equal(processed, "score-1");
  assert.deepEqual({ ...outbox }, { status: "acknowledged", broker_job_id: "dispatch1" });
  db.close();
});

test("consumer rejects a broker identity that does not match the payload", async () => {
  const db = brokerDatabase();
  await assert.rejects(consumeBrokerJob({
    db,
    brokerJob: { id: "dispatch1", data: { dispatchId: "dispatch2", family: "legacy", jobId: "legacy-1" } },
    now: () => "2026-07-17T00:00:00.000Z",
    processScoreJob: async () => undefined,
    processLegacyJob: async () => undefined,
  }), /payload is invalid/u);
  db.close();
});
