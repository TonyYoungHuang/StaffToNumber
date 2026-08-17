import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { db } from "../db.js";
import { isTransactionalEmailEnabled } from "../lib/email.js";
import { findServiceRuntime } from "../repositories/runtime-repository.js";
import { getRateLimitStoreStatus } from "../lib/rate-limit-store.js";
import { objectStorage } from "../lib/object-storage.js";
import { getJobBrokerStatus } from "../lib/job-broker.js";
import { jobDispatchOutboxStatus } from "../repositories/job-dispatch-outbox.js";

function readDatabaseStatus() {
  try {
    db.prepare("SELECT 1 AS ok").get();
    return {
      key: "database",
      label: "Database",
      status: "ok",
      message: config.runtimeDatabasePrimary,
    } as const;
  } catch (error) {
    return {
      key: "database",
      label: "Database",
      status: "error",
      message: error instanceof Error ? error.message : "Database check failed.",
    } as const;
  }
}

async function readStorageStatus() {
  try {
    const health = await objectStorage.checkHealth();
    return {
      key: "storage",
      label: health.backend === "s3" ? "Object storage" : "Local storage",
      status: "ok",
      message: `${health.backend}:${health.target}`,
    } as const;
  } catch (error) {
    return {
      key: "storage",
      label: "Storage",
      status: "error",
      message: error instanceof Error ? error.message : "Storage path is not ready.",
    } as const;
  }
}

function readWorkerStatus() {
  const worker = findServiceRuntime("worker");

  if (!worker) {
    return {
      key: "worker",
      label: "Worker",
      status: "warning",
      message: "No worker heartbeat yet.",
      checkedAt: null,
    } as const;
  }

  const stale = Date.now() - new Date(worker.last_heartbeat_at).getTime() > config.workerHeartbeatStaleMs;

  return {
    key: "worker",
    label: "Worker",
    status: stale ? "warning" : worker.status === "error" ? "error" : "ok",
    message: worker.message ?? "Worker heartbeat received.",
    checkedAt: worker.last_heartbeat_at,
  } as const;
}

function readStorageDeletionStatus() {
  const state = db.prepare(`
    SELECT COUNT(*) AS pending,
           SUM(CASE WHEN last_error IS NOT NULL THEN 1 ELSE 0 END) AS retrying,
           MIN(created_at) AS oldest_created_at
    FROM storage_deletion_queue
  `).get() as { pending: number; retrying: number | null; oldest_created_at: string | null };
  return {
    key: "storage-deletion-outbox",
    label: "Storage deletion outbox",
    status: state.retrying ? "warning" : "ok",
    message: state.pending > 0
      ? `${state.pending} object deletions are pending; ${state.retrying ?? 0} are retrying.`
      : "No object deletions are pending.",
    checkedAt: state.oldest_created_at,
  } as const;
}

function readJobBrokerStatus() {
  const broker = getJobBrokerStatus();
  const outbox = jobDispatchOutboxStatus(db);
  const pending = outbox.pending ?? 0;
  const retrying = outbox.retrying ?? 0;
  return {
    key: "job-broker",
    label: config.jobBrokerBackend === "bullmq" ? "BullMQ job broker" : "Local job polling",
    status: broker.state === "error" ? "error" : retrying > 0 || config.jobBrokerBackend !== "bullmq" ? "warning" : "ok",
    message: `${broker.message} ${pending} dispatches pending; ${retrying} retrying.`,
    checkedAt: outbox.oldest_created_at ?? broker.checkedAt,
  } as const;
}

function readPaymentStatuses() {
  const providers = [
    {
      key: "stripe",
      label: "Stripe",
      enabled: config.paymentProviders.includes("stripe"),
      configured: Boolean(config.stripeSecretKey && config.stripePriceId && config.stripeWebhookSecret),
    },
    {
      key: "paddle",
      label: "Paddle",
      enabled: config.paymentProviders.includes("paddle"),
      configured: Boolean(config.paddleApiKey && config.paddlePriceId && config.paddleWebhookSecret && config.paddleDefaultPaymentLink),
    },
  ];

  return providers.map((provider) => ({
    key: provider.key,
    label: provider.label,
    status: provider.enabled && provider.configured ? "ok" : provider.enabled ? "warning" : "disabled",
    message: provider.enabled
      ? provider.configured
        ? `${provider.label} checkout is configured.`
        : `${provider.label} is enabled but missing required configuration.`
      : `${provider.label} is disabled.`,
  }));
}

function readEmailStatus() {
  return {
    key: "email",
    label: "Transactional email",
    status: isTransactionalEmailEnabled() ? "ok" : "warning",
    message: isTransactionalEmailEnabled()
      ? `Password reset email is enabled via ${config.emailFromAddress}.`
      : "Transactional email is not configured. Password reset links will be previewed in API logs.",
  } as const;
}

export async function systemRoutes(app: FastifyInstance) {
  app.get(
    "/system/status",
    {
      preHandler: app.requireAuth,
    },
    async () => {
      const services = [
        {
          key: "api",
          label: "API",
          status: "ok",
          message: "API is responding normally.",
        },
        readDatabaseStatus(),
        await readStorageStatus(),
        readStorageDeletionStatus(),
        readJobBrokerStatus(),
        readWorkerStatus(),
        readEmailStatus(),
        {
          key: "rate-limit-store",
          label: "Rate-limit store",
          status: getRateLimitStoreStatus().state === "error" ? "error" : getRateLimitStoreStatus().state === "single-instance" ? "warning" : "ok",
          message: getRateLimitStoreStatus().message,
        },
        ...readPaymentStatuses(),
      ];

      const overallStatus = services.some((service) => service.status === "error")
        ? "error"
        : services.some((service) => service.status === "warning")
          ? "warning"
          : "ok";

      return {
        overallStatus,
        checkedAt: new Date().toISOString(),
        supportEmail: config.supportEmail,
        services,
      };
    },
  );
}
