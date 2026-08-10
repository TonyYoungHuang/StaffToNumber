import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { rollbackPostgresMigration } from "../src/lib/postgres-migration.js";

function argumentValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const connectionString = process.env.POSTGRES_URL?.trim();
if (!connectionString) throw new Error("POSTGRES_URL is required.");
const targetSchema = argumentValue("schema") ?? process.env.POSTGRES_TARGET_SCHEMA?.trim();
if (!targetSchema) throw new Error("A target schema is required through --schema or POSTGRES_TARGET_SCHEMA.");
const confirmation = argumentValue("confirm") ?? process.env.POSTGRES_ROLLBACK_CONFIRM?.trim() ?? "";
const reportPath = path.resolve(argumentValue("report") ?? process.env.POSTGRES_ROLLBACK_REPORT?.trim() ?? path.join(
  process.cwd(),
  "artifacts",
  `postgres-rollback-${targetSchema}.json`,
));

const pool = new Pool({ connectionString, max: 1 });
const target = await pool.connect();
try {
  const report = await rollbackPostgresMigration({ target, targetSchema, confirmation });
  await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.promises.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ reportPath, ...report }));
} catch (error) {
  await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.promises.writeFile(reportPath, `${JSON.stringify({
    completedAt: new Date().toISOString(),
    targetSchema,
    rolledBack: false,
    error: error instanceof Error ? error.message : "PostgreSQL migration rollback failed.",
  }, null, 2)}\n`, "utf8");
  throw error;
} finally {
  target.release();
  await pool.end();
}
