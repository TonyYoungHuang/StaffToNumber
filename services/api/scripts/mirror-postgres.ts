import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { config } from "../src/config.js";
import { flushPostgresMirrorOutbox, installPostgresMirrorOutbox } from "../src/lib/postgres-mirror.js";

const connectionString = process.env.POSTGRES_URL?.trim();
const targetSchema = process.env.POSTGRES_TARGET_SCHEMA?.trim();
if (!connectionString || !targetSchema) throw new Error("POSTGRES_URL and POSTGRES_TARGET_SCHEMA are required.");
const watch = process.argv.includes("--watch");
const intervalMs = Math.max(250, Number(process.env.POSTGRES_MIRROR_INTERVAL_MS ?? 1000));
const source = new DatabaseSync(config.dbFile);
source.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 30000;");
const installed = installPostgresMirrorOutbox({ db: source });
console.log(JSON.stringify({ event: "postgres-mirror-installed", ...installed }));
const pool = new Pool({ connectionString, max: 1 });

try {
  do {
    const target = await pool.connect();
    try {
      const result = await flushPostgresMirrorOutbox({ source, target, targetSchema });
      if (result.selected > 0) console.log(JSON.stringify({ event: "postgres-mirror-flush", ...result }));
    } finally {
      target.release();
    }
    if (watch) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  } while (watch);
} finally {
  await pool.end();
  source.close();
}
