import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { SCORE_PROCESSING_QUEUE, type JobBrokerPayload } from "@score/shared";
import { consumeBrokerJob } from "./job-broker-consumer.js";
import { workerConfig } from "./config.js";
import { recoverTerminalBrokerJobs } from "./broker-job-recovery.js";

const redisUrl = process.env.JOB_BROKER_TEST_URL?.trim();

test("real BullMQ redelivery never reruns a crashed processing score", { skip: !redisUrl }, async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE score_jobs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, document_id TEXT, input_file_id TEXT,
      job_type TEXT NOT NULL, status TEXT NOT NULL, params_json TEXT, attempt_count INTEGER NOT NULL DEFAULT 0,
      progress_percent INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      started_at TEXT, completed_at TEXT, broker_job_id TEXT, request_id TEXT, trace_id TEXT, error_message TEXT
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
    assert.equal(handlerCalls, 1);
    assert.deepEqual({ ...score }, { status: "processing", attempt_count: 1, broker_job_id: dispatchId });
    assert.equal(outbox.status, "acknowledged");
    assert.equal(outbox.acknowledged_at, now);
    assert.equal(outbox.broker_job_id, dispatchId);
    const recovered = await recoverTerminalBrokerJobs({ db, timestamp: now, message: "Interrupted recognition; credits released.",
      getBrokerState: async id => (await queue.getJob(id))?.getState() ?? null });
    assert.equal(recovered.length, 1);
    assert.equal((db.prepare("SELECT status FROM score_jobs WHERE id='score-1'").get() as { status: string }).status, "failed");
  } finally {
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
    await producerConnection.quit();
    await consumerConnection.quit();
    db.close();
  }
});

test("real BullMQ processes three independent dispatches concurrently through the production consumer", { skip: !redisUrl }, async () => {
  assert.equal(workerConfig.jobBrokerConcurrency, 3, "the production worker configuration must admit three jobs");
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
  const now = "2026-10-14T00:00:00.000Z";
  const dispatches = Array.from({ length: 3 }, (_, index) => ({ jobId: `parallel-score-${index + 1}`, dispatchId: randomUUID().replace(/-/gu, "") }));
  for (const [index, dispatch] of dispatches.entries()) {
    db.prepare("INSERT INTO score_jobs (id, user_id, job_type, status, created_at, updated_at) VALUES (?, ?, 'omr_import', 'queued', ?, ?)").run(dispatch.jobId, `parallel-user-${index + 1}`, now, now);
    db.prepare("INSERT INTO job_dispatch_outbox VALUES (?, 'processing', NULL, NULL, NULL, NULL, ?)").run(dispatch.dispatchId, now);
  }
  const prefix = `score-parallel-test-${randomUUID().replace(/-/gu, "")}`;
  const producerConnection = new Redis(redisUrl!, { maxRetriesPerRequest: 1 });
  const consumerConnection = new Redis(redisUrl!, { maxRetriesPerRequest: null });
  const queue = new Queue<JobBrokerPayload>(SCORE_PROCESSING_QUEUE, { connection: producerConnection, prefix });
  let active = 0;
  let peak = 0;
  const handlerCalls = new Map<string, number>();
  let releaseBarrier!: () => void;
  const barrier = new Promise<void>(resolve => { releaseBarrier = resolve; });
  let resolveCompleted!: () => void;
  let rejectCompleted!: (error: Error) => void;
  const completed = new Promise<void>((resolve, reject) => { resolveCompleted = resolve; rejectCompleted = reject; });
  const completedDispatches = new Set<string>();
  const worker = new Worker<JobBrokerPayload>(SCORE_PROCESSING_QUEUE, brokerJob => consumeBrokerJob({
    db,
    brokerJob,
    now: () => now,
    processScoreJob: async score => {
      handlerCalls.set(score.id, (handlerCalls.get(score.id) ?? 0) + 1);
      active += 1;
      peak = Math.max(peak, active);
      // No handler can finish until all three have really entered the processor.
      if (active === 3 && handlerCalls.size === 3) releaseBarrier();
      try {
        await barrier;
        db.prepare("UPDATE score_jobs SET status = 'completed', completed_at = ? WHERE id = ?").run(now, score.id);
      } finally {
        active -= 1;
      }
    },
    processLegacyJob: async () => { throw new Error("a score dispatch must not enter the legacy processor"); },
  }), { connection: consumerConnection, prefix, concurrency: workerConfig.jobBrokerConcurrency });
  worker.on("completed", job => {
    completedDispatches.add(String(job.id));
    if (completedDispatches.size === 3) resolveCompleted();
  });
  worker.on("failed", (_job, error) => rejectCompleted(error));
  worker.on("error", rejectCompleted);
  let timeout: NodeJS.Timeout | undefined;
  try {
    const entries = dispatches.map(dispatch => ({ name: "dispatch", data: { ...dispatch, family: "score" as const }, opts: { jobId: dispatch.dispatchId, attempts: 2 } }));
    await queue.addBulk(entries);
    // Replaying the same durable dispatch IDs must not create duplicate work.
    await queue.addBulk(entries);
    await Promise.race([
      completed,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`BullMQ three-job barrier timed out (peak ${peak}).`)), 10_000);
        timeout.unref();
      }),
    ]);
    assert.equal(peak, 3);
    assert.equal(active, 0);
    assert.equal(completedDispatches.size, 3);
    for (const dispatch of dispatches) {
      assert.equal(handlerCalls.get(dispatch.jobId), 1);
      const score = db.prepare("SELECT status, attempt_count, broker_job_id FROM score_jobs WHERE id = ?").get(dispatch.jobId) as Record<string, unknown>;
      assert.deepEqual({ ...score }, { status: "completed", attempt_count: 1, broker_job_id: dispatch.dispatchId });
      const outbox = db.prepare("SELECT status, acknowledged_at, broker_job_id FROM job_dispatch_outbox WHERE id = ?").get(dispatch.dispatchId) as Record<string, unknown>;
      assert.deepEqual({ ...outbox }, { status: "acknowledged", acknowledged_at: now, broker_job_id: dispatch.dispatchId });
    }
    assert.equal(await queue.getCompletedCount(), 3);
  } finally {
    if (timeout) clearTimeout(timeout);
    releaseBarrier();
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
    await producerConnection.quit();
    await consumerConnection.quit();
    db.close();
  }
});
