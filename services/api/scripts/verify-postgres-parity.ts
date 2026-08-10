import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { config } from "../src/config.js";
import { verifySqlitePostgresParity } from "../src/lib/postgres-migration.js";
import { DATABASE_SCHEMA_VERSION } from "../src/schema-version.js";

function argumentValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const connectionString = process.env.POSTGRES_URL?.trim();
if (!connectionString) throw new Error("POSTGRES_URL is required.");
const targetSchema = argumentValue("schema") ?? process.env.POSTGRES_TARGET_SCHEMA?.trim();
if (!targetSchema) throw new Error("POSTGRES_TARGET_SCHEMA or --schema is required.");
const reportPath = path.resolve(argumentValue("report") ?? process.env.POSTGRES_PARITY_REPORT?.trim() ?? path.join(
  process.cwd(),
  "artifacts",
  `postgres-parity-${targetSchema}.json`,
));
const busyTimeoutMs = Math.max(0, Math.min(300_000, Math.trunc(Number(
  argumentValue("sqlite-busy-timeout-ms") ?? process.env.POSTGRES_SQLITE_BUSY_TIMEOUT_MS ?? 30_000,
))));
const source = new DatabaseSync(config.dbFile, { readOnly: true });
source.exec(`PRAGMA busy_timeout = ${Number.isFinite(busyTimeoutMs) ? busyTimeoutMs : 30_000}`);
const pool = new Pool({ connectionString, max: 1 });
const target = await pool.connect();
try {
  const report = await verifySqlitePostgresParity({ source, target, targetSchema });
  await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.promises.writeFile(reportPath, `${JSON.stringify({
    ...report,
    sourceDatabase: path.resolve(config.dbFile),
    databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
    sqliteBusyTimeoutMs: busyTimeoutMs,
  }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    reportPath,
    targetSchema,
    tables: report.tables.length,
    sourceRows: report.sourceRows,
    targetRows: report.targetRows,
    verified: report.verified,
  }));
  if (!report.verified) process.exitCode = 1;
} finally {
  target.release();
  await pool.end();
  source.close();
}
