import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL?.trim();
if (!redisUrl) throw new Error("REDIS_URL is required.");

const keyPrefix = `scoretransposer:runtime-verification:${randomUUID()}`;
const redis = new Redis(redisUrl, {
  connectTimeout: 10_000,
  commandTimeout: 10_000,
  enableOfflineQueue: false,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

try {
  await redis.connect();
  const pong = await redis.ping();
  if (pong !== "PONG") throw new Error("Redis PING verification failed.");

  const stringKey = `${keyPrefix}:string`;
  const counterKey = `${keyPrefix}:counter`;
  await redis.set(stringKey, "ready", "EX", 60);
  const stored = await redis.get(stringKey);
  if (stored !== "ready") throw new Error("Redis SET/GET verification failed.");

  const ttl = await redis.ttl(stringKey);
  if (ttl < 1 || ttl > 60) throw new Error("Redis TTL verification failed.");

  const counter = await redis.incr(counterKey);
  if (counter !== 1) throw new Error("Redis INCR verification failed.");
  await redis.expire(counterKey, 60);

  const deleted = await redis.del(stringKey, counterKey);
  if (deleted !== 2) throw new Error("Redis DEL verification failed.");
  const remaining = await redis.exists(stringKey, counterKey);
  if (remaining !== 0) throw new Error("Redis cleanup verification failed.");

  console.log(JSON.stringify({
    phase: "redis",
    ping: true,
    setGet: true,
    increment: true,
    expiration: true,
    cleanup: true,
  }));
} finally {
  try {
    await redis.del(`${keyPrefix}:string`, `${keyPrefix}:counter`);
  } catch {
    // Best-effort cleanup must not hide the original verification failure.
  }
  redis.disconnect();
}
