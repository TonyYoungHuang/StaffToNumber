import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { config } from "../src/config.js";
import { migrateSqliteToPostgres } from "../src/lib/postgres-migration.js";
import { DATABASE_SCHEMA_VERSION } from "../src/schema-version.js";

function argumentValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const connectionString = process.env.POSTGRES_URL?.trim();
if (!connectionString) throw new Error("POSTGRES_URL is required.");
const targetSchema = argumentValue("schema")
  ?? process.env.POSTGRES_TARGET_SCHEMA?.trim()
  ?? `score_migration_${new Date().toISOString().replace(/[-:.TZ]/gu, "").slice(0, 14)}`;
const replaceSchema = process.argv.includes("--replace-schema") || process.env.POSTGRES_REPLACE_SCHEMA === "true";
const replaceConfirmation = argumentValue("confirm-replace") ?? process.env.POSTGRES_CONFIRM_REPLACE?.trim();
if (replaceSchema && replaceConfirmation !== targetSchema) {
  throw new Error(`Replacing a schema requires --confirm-replace=${targetSchema} or POSTGRES_CONFIRM_REPLACE=${targetSchema}.`);
}
const reportPath = path.resolve(argumentValue("report") ?? process.env.POSTGRES_MIGRATION_REPORT?.trim() ?? path.join(
  process.cwd(),
  "artifacts",
  `postgres-migration-${targetSchema}.json`,
));
const source = new DatabaseSync(config.dbFile, { readOnly: true });
const busyTimeoutMs = Math.max(0, Math.min(300_000, Math.trunc(Number(
  argumentValue("sqlite-busy-timeout-ms") ?? process.env.POSTGRES_SQLITE_BUSY_TIMEOUT_MS ?? 30_000,
))));
source.exec(`PRAGMA busy_timeout = ${Number.isFinite(busyTimeoutMs) ? busyTimeoutMs : 30_000}`);
const pool = new Pool({ connectionString, max: 1 });
const target = await pool.connect();
try {
  const report = await migrateSqliteToPostgres({
    source,
    target,
    targetSchema,
    replaceSchema,
    batchRows: Number(argumentValue("batch-rows") ?? process.env.POSTGRES_MIGRATION_BATCH_ROWS ?? 250),
  });
  await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.promises.writeFile(reportPath, `${JSON.stringify({
    ...report,
    sourceDatabase: path.resolve(config.dbFile),
    databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
    sqliteBusyTimeoutMs: busyTimeoutMs,
  }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ reportPath, targetSchema, tables: report.tables.length, rows: report.totalRows, verified: true }));
} catch (error) {
  await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.promises.writeFile(reportPath, `${JSON.stringify({
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    sourceDatabase: path.resolve(config.dbFile),
    targetSchema,
    verified: false,
    error: error instanceof Error ? error.message : "PostgreSQL migration failed.",
  }, null, 2)}\n`, "utf8");
  throw error;
} finally {
  target.release();
  await pool.end();
  source.close();
}
