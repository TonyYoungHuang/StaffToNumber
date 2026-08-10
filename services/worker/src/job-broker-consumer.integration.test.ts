import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { SCORE_PROCESSING_QUEUE, type JobBrokerPayload } from "@score/shared";
import { consumeBrokerJob } from "./job-broker-consumer.js";

const redisUrl = process.env.JOB_BROKER_TEST_URL?.trim();

test("real BullMQ retries the same database dispatch without double-counting an attempt", { skip: !redisUrl }, async () => {
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
      id TEXT PRIMARY KEY, status TEXT NOT NULL, acknowledged_at TEXT, locked_at TEXT, broker_job_id TEXT,
      last_error TEXT, updated_at TEXT NOT NULL
    );
  `);
  const now = "2026-07-17T00:00:00.000Z";
  const dispatchId = randomUUID().replace(/-/gu, "");
  db.prepare("INSERT INTO score_jobs (id, user_id, job_type, status, created_at, updated_at) VALUES ('score-1', 'user-1', 'render_export', 'queued', ?, ?)").run(now, now);
  db.prepare("INSERT INTO job_dispatch_outbox VALUES (?, 'processing', NULL, NULL, NULL, NULL, ?)").run(dispatchId, now);

  const prefix = `score-test-${randomUUID().replace(/-/gu, "")}`;
  const producerConnection = new Redis(redisUrl!, { maxRetriesPerRequest: 1 });
  const consumerConnection = new Redis(redisUrl!, { maxRetriesPerRequest: null });
  const queue = new Queue<JobBrokerPayload>(SCORE_PROCESSING_QUEUE, { connection: producerConnection, prefix });
  let handlerCalls = 0;
  let resolveCompleted!: () => void;
  let rejectCompleted!: (error: Error) => void;
  const completed = new Promise<void>((resolve, reject) => {
    resolveCompleted = resolve;
    rejectCompleted = reject;
  });
  const worker = new Worker<JobBrokerPayload>(SCORE_PROCESSING_QUEUE, async (brokerJob) => consumeBrokerJob({
    db,
    brokerJob,
    now: () => now,
    processScoreJob: async () => {
      handlerCalls += 1;
      if (handlerCalls === 1) throw new Error("simulated process crash");
      db.prepare("UPDATE score_jobs SET status = 'completed', completed_at = ? WHERE id = 'score-1'").run(now);
    },
    processLegacyJob: async () => undefined,
  }), { connection: consumerConnection, prefix, concurrency: 1 });
  worker.on("completed", () => resolveCompleted());
  worker.on("failed", (_job, error) => {
    if (handlerCalls >= 2) rejectCompleted(error);
  });

  try {
    await queue.add("dispatch", { dispatchId, family: "score", jobId: "score-1" }, {
      jobId: dispatchId,
      attempts: 2,
      backoff: { type: "fixed", delay: 10 },
    });
    await Promise.race([
      completed,
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error("BullMQ integration timed out.")), 10_000);
        timer.unref();
      }),
    ]);
    const score = db.prepare("SELECT status, attempt_count, broker_job_id FROM score_jobs WHERE id = 'score-1'").get() as Record<string, unknown>;
    const outbox = db.prepare("SELECT status, acknowledged_at, broker_job_id FROM job_dispatch_outbox WHERE id = ?").get(dispatchId) as Record<string, unknown>;
    assert.equal(handlerCalls, 2);
    assert.deepEqual({ ...score }, { status: "completed", attempt_count: 1, broker_job_id: dispatchId });
    assert.equal(outbox.status, "acknowledged");
    assert.equal(outbox.acknowledged_at, now);
    assert.equal(outbox.broker_job_id, dispatchId);
  } finally {
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
    await producerConnection.quit();
    await consumerConnection.quit();
    db.close();
  }
});
