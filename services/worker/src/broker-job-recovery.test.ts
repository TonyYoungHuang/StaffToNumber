import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { markInterruptedBrokerJobFailed, recoverTerminalBrokerJobs } from "./broker-job-recovery.js";

function recoveryDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE score_jobs (
      id TEXT PRIMARY KEY, job_type TEXT NOT NULL, document_id TEXT, status TEXT NOT NULL,
      broker_job_id TEXT, error_message TEXT, progress_percent INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL, completed_at TEXT
    );
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY, status TEXT NOT NULL, broker_job_id TEXT, error_message TEXT,
      updated_at TEXT NOT NULL, completed_at TEXT
    );
  `);
  return db;
}

test("a terminal broker failure marks only the matching processing dispatch retryable", () => {
  const db = recoveryDatabase();
  db.prepare("INSERT INTO score_jobs (id, job_type, document_id, status, broker_job_id, updated_at) VALUES (?, 'omr_import', ?, 'processing', ?, ?)")
    .run("score-1", "document-1", "dispatch-new", "2026-08-27T00:00:00.000Z");

  const stale = markInterruptedBrokerJobFailed({
    db,
    payload: { dispatchId: "dispatch-old", family: "score", jobId: "score-1" },
    brokerJobId: "dispatch-old",
    timestamp: "2026-08-27T00:01:00.000Z",
    message: "interrupted",
  });
  const current = markInterruptedBrokerJobFailed({
    db,
    payload: { dispatchId: "dispatch-new", family: "score", jobId: "score-1" },
    brokerJobId: "dispatch-new",
    timestamp: "2026-08-27T00:02:00.000Z",
    message: "interrupted",
  });
  const row = db.prepare("SELECT status, error_message, progress_percent FROM score_jobs WHERE id = 'score-1'").get() as Record<string, unknown>;

  assert.equal(stale, null);
  assert.equal(current?.jobType, "omr_import");
  assert.deepEqual({ ...row }, { status: "failed", error_message: "interrupted", progress_percent: 0 });
  db.close();
});

test("startup reconciliation recovers terminal and missing broker jobs but leaves active work alone", async () => {
  const db = recoveryDatabase();
  const insertScore = db.prepare("INSERT INTO score_jobs (id, job_type, document_id, status, broker_job_id, updated_at) VALUES (?, 'omr_import', ?, 'processing', ?, ?)");
  insertScore.run("failed-score", "document-1", "dispatch-failed", "2026-08-27T00:00:00.000Z");
  insertScore.run("active-score", "document-2", "dispatch-active", "2026-08-27T00:00:00.000Z");
  db.prepare("INSERT INTO jobs (id, status, broker_job_id, updated_at) VALUES (?, 'processing', ?, ?)")
    .run("missing-legacy", "dispatch-missing", "2026-08-27T00:00:00.000Z");

  const states = new Map<string, string | null>([
    ["dispatch-failed", "failed"],
    ["dispatch-active", "active"],
    ["dispatch-missing", null],
  ]);
  const recovered = await recoverTerminalBrokerJobs({
    db,
    getBrokerState: async (id) => states.get(id) ?? null,
    timestamp: "2026-08-27T00:03:00.000Z",
    message: "worker interrupted",
  });

  assert.deepEqual(recovered.map((job) => job.jobId).sort(), ["failed-score", "missing-legacy"]);
  assert.equal((db.prepare("SELECT status FROM score_jobs WHERE id = 'active-score'").get() as { status: string }).status, "processing");
  assert.equal((db.prepare("SELECT status FROM score_jobs WHERE id = 'failed-score'").get() as { status: string }).status, "failed");
  assert.equal((db.prepare("SELECT status FROM jobs WHERE id = 'missing-legacy'").get() as { status: string }).status, "failed");
  db.close();
});
