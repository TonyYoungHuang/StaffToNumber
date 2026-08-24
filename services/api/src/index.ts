import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import fastifyRawBody from "fastify-raw-body";
import formbody from "@fastify/formbody";
import { PRODUCT_NAME } from "@score/shared";
import { config } from "./config.js";
import { validateRuntimeConfig } from "./config.js";
import { db, initDb } from "./db.js";
import { registerApiObservability } from "./lib/observability.js";
import { registerApiRateLimiting } from "./lib/rate-limit.js";
import { startJobBrokerDispatcher } from "./lib/job-broker.js";
import { safeJobBrokerErrorMessage } from "./lib/job-broker-connection.js";
import { authPlugin } from "./plugins/auth.js";
import { ensureActivationCode } from "./repositories/auth-repository.js";
import { adminActivationRoutes } from "./routes/admin-activation.js";
import { accountRoutes } from "./routes/account.js";
import { copyrightRoutes } from "./routes/copyright.js";
import { adminSeoRoutes } from "./routes/admin-seo.js";
import { adminSecurityRoutes } from "./routes/admin-security.js";
import { activationRoutes } from "./routes/activation.js";
import { authRoutes } from "./routes/auth.js";
import { fileRoutes } from "./routes/files.js";
import { jobRoutes } from "./routes/jobs.js";
import { paymentWebhookRoutes } from "./routes/payment-webhooks.js";
import { paymentRoutes } from "./routes/payments.js";
import { scoreRoutes } from "./routes/scores.js";
import { supportRoutes } from "./routes/support.js";
import { systemRoutes } from "./routes/system.js";
import { educationRoutes } from "./routes/education.js";
import { ltiRoutes } from "./routes/lti.js";
import { pruneSecurityAuditEvents } from "./repositories/security-audit-repository.js";
import { pruneEnabledClassroomResourceRetentionPolicies } from "./repositories/classroom-resource-retention-repository.js";
import { processStorageDeletionQueue } from "./repositories/storage-deletion-repository.js";
import {
  pruneExpiredOrphanFiles,
  pruneExpiredQuarantineFiles,
  purgeDueAccountDeletions,
} from "./repositories/account-lifecycle-repository.js";

validateRuntimeConfig();
const app = Fastify({ logger: true, trustProxy: config.trustProxy });

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    const isLocalDevelopmentOrigin = config.nodeEnv === "development" && /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/u.test(origin);
    callback(null, isLocalDevelopmentOrigin);
  },
  credentials: true,
});

await app.register(multipart, {
  limits: {
    files: 1,
    fileSize: config.uploadMaxBytes,
  },
});

await app.register(formbody);

await app.register(fastifyRawBody, {
  field: "rawBody",
  global: false,
  encoding: false,
  runFirst: true,
});

await registerApiObservability(app);
await registerApiRateLimiting(app);
await app.register(authPlugin);
await app.register(authRoutes, { prefix: "/api" });
await app.register(accountRoutes, { prefix: "/api" });
await app.register(copyrightRoutes, { prefix: "/api" });
await app.register(adminActivationRoutes, { prefix: "/api" });
await app.register(adminSeoRoutes, { prefix: "/api" });
await app.register(adminSecurityRoutes, { prefix: "/api" });
await app.register(activationRoutes, { prefix: "/api" });
await app.register(fileRoutes, { prefix: "/api" });
await app.register(jobRoutes, { prefix: "/api" });
await app.register(paymentRoutes, { prefix: "/api" });
await app.register(paymentWebhookRoutes, { prefix: "/api" });
await app.register(scoreRoutes, { prefix: "/api" });
await app.register(supportRoutes, { prefix: "/api" });
await app.register(systemRoutes, { prefix: "/api" });
await app.register(educationRoutes, { prefix: "/api" });
await app.register(ltiRoutes, { prefix: "/api" });

initDb();
const auditPruneResult = pruneSecurityAuditEvents();
if (auditPruneResult.deleted > 0) {
  app.log.info({ event: "security.audit_retention_pruned", ...auditPruneResult });
}

async function runLifecycleCleanup() {
  try {
    const resourceVersions = pruneEnabledClassroomResourceRetentionPolicies(db);
    const [accounts, files, quarantine] = await Promise.all([
      purgeDueAccountDeletions(),
      pruneExpiredOrphanFiles(),
      pruneExpiredQuarantineFiles(),
    ]);
    const storageDeletions = await processStorageDeletionQueue(db);
    if (accounts.accountsDeleted > 0 || files.deleted > 0 || quarantine.deleted > 0 || resourceVersions.purged > 0 || storageDeletions.attempted > 0) {
      app.log.info({ event: "privacy.lifecycle_cleanup", accounts, files, quarantine, resourceVersions, storageDeletions });
    }
  } catch (error) {
    app.log.error({ event: "privacy.lifecycle_cleanup_failed", error });
  }
}

type JobBrokerDispatcher = Awaited<ReturnType<typeof startJobBrokerDispatcher>>;

let lifecycleCleanupTimer: NodeJS.Timeout | null = null;
let jobBrokerRetryTimer: NodeJS.Timeout | null = null;
let jobBrokerDispatcher: JobBrokerDispatcher | null = null;
let shuttingDown = false;

async function initializeJobBroker() {
  try {
    jobBrokerDispatcher = await startJobBrokerDispatcher(app.log);
  } catch (error) {
    app.log.error({ event: "job_broker.start_failed", error: safeJobBrokerErrorMessage(error) });
    if (shuttingDown) return;
    jobBrokerRetryTimer = setTimeout(() => void initializeJobBroker(), 5_000);
    jobBrokerRetryTimer.unref();
  }
}

app.addHook("onClose", async () => {
  shuttingDown = true;
  if (lifecycleCleanupTimer) clearInterval(lifecycleCleanupTimer);
  if (jobBrokerRetryTimer) clearTimeout(jobBrokerRetryTimer);
  await jobBrokerDispatcher?.close();
  db.close();
});
for (const code of config.seedActivationCodes) {
  ensureActivationCode(code, config.entitlementDays);
}

app.get("/health", async () => {
  return {
    status: "ok",
    service: "api",
    product: PRODUCT_NAME,
  };
});

app.get("/ready", async (_request, reply) => {
  try {
    const probe = db.prepare("SELECT 1 AS ok").get() as { ok?: number | string } | undefined;
    if (Number(probe?.ok) !== 1) throw new Error("PostgreSQL readiness probe returned an unexpected result.");
    return {
      status: "ready",
      service: "api",
      databasePrimary: db.primary,
      databaseSchema: config.postgresSchema,
      dependencies: { database: "ready" },
    };
  } catch (error) {
    app.log.error({ event: "api.readiness_failed", error });
    return reply.code(503).send({
      status: "not_ready",
      service: "api",
      databasePrimary: db.primary,
      databaseSchema: config.postgresSchema,
      dependencies: { database: "not_ready" },
    });
  }
});

app.get("/", async () => {
  return {
    message: "Online PDF Score Converter API is running.",
  };
});

async function start() {
  try {
    await app.listen({ port: config.port, host: config.host });
    void initializeJobBroker();
    if (config.lifecycleCleanupEnabled) {
      void runLifecycleCleanup();
      lifecycleCleanupTimer = setInterval(() => void runLifecycleCleanup(), config.lifecycleCleanupIntervalMs);
      lifecycleCleanupTimer.unref();
    }
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
