import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { db } from "../db.js";
import { isTransactionalEmailEnabled } from "../lib/email.js";
import { findServiceRuntime } from "../repositories/runtime-repository.js";

function readDatabaseStatus() {
  try {
    db.prepare("SELECT 1 AS ok").get();
    return {
      key: "database",
      label: "Database",
      status: "ok",
      message: config.dbFile,
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

function readStorageStatus() {
  try {
    fs.accessSync(config.storageDir, fs.constants.R_OK | fs.constants.W_OK);
    return {
      key: "storage",
      label: "Storage",
      status: "ok",
      message: config.storageDir,
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
        readStorageStatus(),
        readWorkerStatus(),
        readEmailStatus(),
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
