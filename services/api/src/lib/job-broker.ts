import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { SCORE_PROCESSING_QUEUE, type JobBrokerPayload } from "@score/shared";
import { config } from "../config.js";
import { db } from "../db.js";
import { dispatchJobOutboxBatch } from "./job-broker-dispatch.js";

type BrokerState = {
  state: "database" | "connecting" | "ready" | "error" | "closed";
  message: string;
  checkedAt: string;
};

let brokerState: BrokerState = {
  state: config.jobBrokerBackend === "bullmq" ? "connecting" : "database",
  message: config.jobBrokerBackend === "bullmq" ? "BullMQ dispatcher is starting." : "Database polling is enabled for local development.",
  checkedAt: new Date().toISOString(),
};

export function getJobBrokerStatus() {
  return brokerState;
}

export async function startJobBrokerDispatcher(log: {
  info: (value: unknown) => void;
  error: (value: unknown) => void;
}) {
  if (config.jobBrokerBackend === "database") {
    log.info({ event: "job_broker.started", backend: "database", queue: SCORE_PROCESSING_QUEUE });
    return {
      async close() {
        brokerState = { state: "closed", message: "Local job polling is closed.", checkedAt: new Date().toISOString() };
      },
    };
  }

  let redis: Redis | null = null;
  let queue: Queue<JobBrokerPayload> | null = null;
  redis = new Redis(config.jobBrokerRedisUrl, {
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    connectTimeout: config.redisConnectTimeoutMs,
    lazyConnect: true,
  });
  redis.on("error", (error) => {
    brokerState = { state: "error", message: error.message, checkedAt: new Date().toISOString() };
  });
  await redis.connect();
  queue = new Queue<JobBrokerPayload>(SCORE_PROCESSING_QUEUE, {
    connection: redis,
    prefix: config.jobBrokerPrefix,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: { age: 604_800, count: 10_000 },
    },
  });
  await queue.waitUntilReady();
  brokerState = { state: "ready", message: "BullMQ dispatcher is connected.", checkedAt: new Date().toISOString() };

  let busy = false;
  let closed = false;
  const dispatch = async () => {
    if (busy || closed) return;
    busy = true;
    try {
      await dispatchJobOutboxBatch({
        db,
        queue,
        now: () => new Date(),
        staleMs: config.jobDispatchStaleMs,
        retryBaseMs: config.jobDispatchRetryBaseMs,
        onPublished: () => {
          brokerState = { state: "ready", message: "BullMQ dispatcher is connected.", checkedAt: new Date().toISOString() };
        },
        onError: ({ dispatchId, message }) => {
          brokerState = { state: "error", message, checkedAt: new Date().toISOString() };
          log.error({ event: "job_broker.dispatch_failed", dispatchId, error: message });
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job dispatch tick failed.";
      brokerState = { state: "error", message, checkedAt: new Date().toISOString() };
      log.error({ event: "job_broker.tick_failed", error: message });
    } finally {
      busy = false;
    }
  };

  await dispatch();
  const timer = setInterval(() => void dispatch(), config.jobDispatchIntervalMs);
  timer.unref();
  log.info({ event: "job_broker.started", backend: config.jobBrokerBackend, queue: SCORE_PROCESSING_QUEUE });
  return {
    async close() {
      closed = true;
      clearInterval(timer);
      while (busy) await new Promise((resolve) => setTimeout(resolve, 10));
      if (queue) await queue.close();
      if (redis) await redis.quit();
      brokerState = { state: "closed", message: "Job broker dispatcher is closed.", checkedAt: new Date().toISOString() };
    },
  };
}
