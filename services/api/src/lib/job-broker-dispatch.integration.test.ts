import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { SCORE_PROCESSING_QUEUE, type JobBrokerPayload } from "@score/shared";
import { dispatchJobOutboxBatch } from "./job-broker-dispatch.js";

const redisUrl = process.env.JOB_BROKER_TEST_URL?.trim();

test("real BullMQ receives a transaction-outbox dispatch with a stable job identity", { skip: !redisUrl }, async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL, request_id TEXT, trace_id TEXT);
    CREATE TABLE score_jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL, request_id TEXT, trace_id TEXT);
    CREATE TABLE job_dispatch_outbox (
      id TEXT PRIMARY KEY, queue_name TEXT NOT NULL, job_family TEXT NOT NULL, job_id TEXT NOT NULL,
      status TEXT NOT NULL, attempts INTEGER NOT NULL, next_attempt_at TEXT NOT NULL, locked_at TEXT,
      dispatched_at TEXT, acknowledged_at TEXT, broker_job_id TEXT, last_error TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `);
  const now = new Date("2026-07-17T00:00:00.000Z");
  const dispatchId = randomUUID().replace(/-/gu, "");
  db.prepare("INSERT INTO score_jobs VALUES ('score-1', 'queued', 'request-1', '0123456789abcdef0123456789abcdef')").run();
  db.prepare("INSERT INTO job_dispatch_outbox VALUES (?, ?, 'score', 'score-1', 'queued', 0, ?, NULL, NULL, NULL, NULL, NULL, ?, ?)")
    .run(dispatchId, SCORE_PROCESSING_QUEUE, now.toISOString(), now.toISOString(), now.toISOString());

  const prefix = `score-test-${randomUUID().replace(/-/gu, "")}`;
  const producerConnection = new Redis(redisUrl!, { maxRetriesPerRequest: 1 });
  const consumerConnection = new Redis(redisUrl!, { maxRetriesPerRequest: null });
  const queue = new Queue<JobBrokerPayload>(SCORE_PROCESSING_QUEUE, { connection: producerConnection, prefix });
  let received: JobBrokerPayload | null = null;
  let resolveCompleted!: () => void;
  const completed = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  const worker = new Worker<JobBrokerPayload>(SCORE_PROCESSING_QUEUE, async (job) => {
    received = job.data;
  }, { connection: consumerConnection, prefix });
  worker.on("completed", () => resolveCompleted());

  try {
    const report = await dispatchJobOutboxBatch({
      db,
      queue,
      now: () => now,
      staleMs: 300_000,
      retryBaseMs: 1_000,
    });
    await Promise.race([
      completed,
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error("BullMQ dispatch integration timed out.")), 10_000);
        timer.unref();
      }),
    ]);
    const outbox = db.prepare("SELECT status, attempts, broker_job_id FROM job_dispatch_outbox WHERE id = ?").get(dispatchId) as Record<string, unknown>;
    assert.deepEqual(report, { published: 1, acknowledged: 0, failed: 0 });
    assert.deepEqual(received, {
      dispatchId,
      family: "score",
      jobId: "score-1",
      requestId: "request-1",
      traceId: "0123456789abcdef0123456789abcdef",
    });
    assert.deepEqual({ ...outbox }, { status: "dispatched", attempts: 1, broker_job_id: dispatchId });
  } finally {
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
    await producerConnection.quit();
    await consumerConnection.quit();
    db.close();
  }
});
