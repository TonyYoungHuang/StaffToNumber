import type { RedisOptions } from "ioredis";

export function createJobBrokerRedisOptions(redisUrl: string, connectTimeout: number): RedisOptions {
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
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    connectTimeout,
    lazyConnect: true,
    keepAlive: 10_000,
  };
}

export function safeJobBrokerErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b(?:redis|connect|socket|tls|certificate|econn|enotfound|enoent|timeout|closed)\b/iu.test(message)) {
    return "BullMQ dispatcher could not connect to Redis.";
  }
  return "BullMQ dispatcher operation failed.";
}
