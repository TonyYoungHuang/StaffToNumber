import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import { createCollaborationServer } from "./server.js";
import { collaborationRedisConfiguration } from "./redis-config.js";

const db = new DatabaseSync(process.env.DB_FILE ?? "../api/data/app.sqlite");
const port = Number(process.env.COLLABORATION_PORT ?? 4001);
const address = process.env.HOST ?? "0.0.0.0";
const maxOperations = Number(process.env.COLLABORATION_MAX_OPERATIONS ?? 500);
const maxConflicts = Number(process.env.COLLABORATION_MAX_CONFLICTS ?? 500);
const redisUrl = process.env.REDIS_URL?.trim() ?? "";
if (process.env.NODE_ENV === "production" && !redisUrl) throw new Error("REDIS_URL is required for production collaboration coordination.");
const redis = redisUrl
  ? collaborationRedisConfiguration({
      url: redisUrl,
      identifier: process.env.COLLABORATION_INSTANCE_ID?.trim() || `${os.hostname()}-${process.pid}`,
      prefix: process.env.COLLABORATION_REDIS_PREFIX,
    })
  : undefined;
const server = createCollaborationServer(db, { port, address, maxOperations, maxConflicts, redis });

await server.listen();
console.log(`[collaboration] listening on ${address}:${port}`);
