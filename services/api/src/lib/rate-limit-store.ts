import { Redis } from "ioredis";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../config.js";

type RateLimitStoreStatus = {
  kind: "memory" | "redis";
  state: "single-instance" | "connecting" | "ready" | "error" | "closed";
  message: string;
};

let storeStatus: RateLimitStoreStatus = {
  kind: "memory",
  state: "single-instance",
  message: "In-memory limiter is active; API must remain a single replica.",
};

export function getRateLimitStoreStatus() {
  return { ...storeStatus };
}

export function validateRedisUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use redis:// or rediss://.");
  }
  return parsed;
}

export async function connectRateLimitRedis(logger: FastifyBaseLogger) {
  if (!config.redisUrl) {
    storeStatus = {
      kind: "memory",
      state: "single-instance",
      message: "In-memory limiter is active; API must remain a single replica.",
    };
    return null;
  }

  validateRedisUrl(config.redisUrl);
  storeStatus = { kind: "redis", state: "connecting", message: "Connecting to the shared rate-limit store." };
  const redis = new Redis(config.redisUrl, {
    lazyConnect: true,
    connectTimeout: config.redisConnectTimeoutMs,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectionName: "score-api-rate-limit",
    retryStrategy: () => null,
  });

  redis.on("error", (error: Error) => {
    storeStatus = { kind: "redis", state: "error", message: "The shared rate-limit store reported an error." };
    logger.error({ error, event: "security.rate_limit_store_error" });
  });
  redis.on("ready", () => {
    storeStatus = { kind: "redis", state: "ready", message: "Redis shared rate limiting is ready." };
  });
  redis.on("close", () => {
    if (storeStatus.state !== "error") {
      storeStatus = { kind: "redis", state: "closed", message: "The shared rate-limit store connection is closed." };
    }
  });

  try {
    await redis.connect();
    await redis.ping();
    storeStatus = { kind: "redis", state: "ready", message: "Redis shared rate limiting is ready." };
    return redis;
  } catch (error) {
    storeStatus = { kind: "redis", state: "error", message: "Redis shared rate limiting failed to initialize." };
    redis.disconnect(false);
    throw new Error("Redis shared rate limiting is configured but unavailable.", { cause: error });
  }
}
