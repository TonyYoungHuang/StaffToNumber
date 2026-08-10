import type { Configuration as RedisConfiguration } from "@hocuspocus/extension-redis";

export function collaborationRedisConfiguration(input: { url: string; identifier: string; prefix?: string }): Partial<RedisConfiguration> {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new Error("REDIS_URL must be a valid redis:// or rediss:// URL.");
  }
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") throw new Error("REDIS_URL must use redis:// or rediss://.");
  if (!parsed.hostname) throw new Error("REDIS_URL must include a hostname.");
  const port = parsed.port ? Number(parsed.port) : 6379;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("REDIS_URL contains an invalid port.");
  const databaseText = parsed.pathname.replace(/^\//u, "");
  const database = databaseText ? Number(databaseText) : 0;
  if (!Number.isInteger(database) || database < 0) throw new Error("REDIS_URL contains an invalid database number.");
  return {
    host: parsed.hostname,
    port,
    identifier: input.identifier,
    prefix: input.prefix?.trim() || "score-collaboration",
    options: {
      ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
      ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
      ...(database ? { db: database } : {}),
      ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
      // The extension duplicates this client and switches one connection into
      // subscriber mode, where Redis rejects the INFO command used by ready-check.
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    },
  };
}
