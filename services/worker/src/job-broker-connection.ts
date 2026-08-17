import type { RedisOptions } from "bullmq";

export function createBullMqWorkerRedisOptions(redisUrl: string): RedisOptions {
  // Secrets copied through shells or dashboards can acquire a BOM or line
  // ending. Strip only boundary control characters so credentials inside the
  // URL remain untouched.
  const sanitizedRedisUrl = redisUrl.replace(
    /^[\u0000-\u0020\u007f-\u009f\uFEFF]+|[\u0000-\u0020\u007f-\u009f\uFEFF]+$/g,
    "",
  );
  const parsed = new URL(sanitizedRedisUrl);
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error(`Unsupported Redis URL protocol: ${parsed.protocol}`);
  }

  const databasePath = parsed.pathname.replace(/^\//, "");
  const database = databasePath ? Number.parseInt(databasePath, 10) : 0;
  if (!Number.isInteger(database) || database < 0) {
    throw new Error(`Invalid Redis database number: ${parsed.pathname}`);
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: database,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
    // BullMQ owns both the command and blocking clients. Managed Redis services
    // may recycle either connection while a container is starting.
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 15_000,
    keepAlive: 10_000,
    retryStrategy(attempt) {
      return Math.min(500 * (2 ** Math.min(attempt - 1, 5)), 10_000);
    },
  };
}

export function bullMqStartupRetryDelayMs(attempt: number) {
  const normalizedAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(1_000 * (2 ** Math.min(normalizedAttempt - 1, 4)), 10_000);
}
