import os from "node:os";
import { createRuntimeDatabase, runtimeDatabasePrimary } from "@score/runtime-database";
import { createCollaborationServer } from "./server.js";
import { collaborationRedisConfiguration } from "./redis-config.js";

const nodeEnv = process.env.NODE_ENV ?? "development";
const databasePrimary = runtimeDatabasePrimary(process.env.RUNTIME_DATABASE_PRIMARY, nodeEnv);
if ((nodeEnv === "production" || nodeEnv === "staging") && databasePrimary !== "postgres") {
  throw new Error(`${nodeEnv} collaboration service requires RUNTIME_DATABASE_PRIMARY=postgres; SQLite fallback is disabled.`);
}
const db = createRuntimeDatabase({
  primary: databasePrimary,
  sqliteFile: process.env.DB_FILE ?? "../api/data/app.sqlite",
  postgresUrl: process.env.POSTGRES_URL,
  postgresSchema: process.env.POSTGRES_SCHEMA?.trim() || "public",
});
const port = Number(process.env.COLLABORATION_PORT ?? 4001);
const address = process.env.HOST ?? "0.0.0.0";
const maxOperations = Number(process.env.COLLABORATION_MAX_OPERATIONS ?? 500);
const maxConflicts = Number(process.env.COLLABORATION_MAX_CONFLICTS ?? 500);
const redisUrl = process.env.REDIS_URL?.trim() ?? "";
if ((nodeEnv === "production" || nodeEnv === "staging") && !redisUrl) throw new Error("REDIS_URL is required for deployed collaboration coordination.");
const redis = redisUrl
  ? collaborationRedisConfiguration({
      url: redisUrl,
      identifier: process.env.COLLABORATION_INSTANCE_ID?.trim() || `${os.hostname()}-${process.pid}`,
      prefix: process.env.COLLABORATION_REDIS_PREFIX,
    })
  : undefined;
const server = createCollaborationServer(db, {
  port,
  address,
  maxOperations,
  maxConflicts,
  redis,
  databaseSchema: process.env.POSTGRES_SCHEMA?.trim() || "public",
});

await server.listen();
console.log(`[collaboration] listening on ${address}:${port} with ${db.primary}`);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[collaboration] received ${signal}; closing server and database`);
  try {
    await server.destroy();
  } finally {
    db.close();
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
