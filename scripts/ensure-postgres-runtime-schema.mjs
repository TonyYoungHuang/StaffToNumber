import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";

const connectionString = process.env.POSTGRES_OWNER_URL?.trim() || process.env.POSTGRES_URL?.trim();
const targetSchema = process.env.POSTGRES_SCHEMA?.trim() || "scoretransposer";
if (!connectionString) throw new Error("POSTGRES_OWNER_URL or POSTGRES_URL is required.");
if (!/^[a-z_][a-z0-9_]*$/u.test(targetSchema)) throw new Error("POSTGRES_SCHEMA is invalid.");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "scoretransposer-schema-"));
const sqliteFile = path.join(tempRoot, "latest.sqlite");
const storageDir = path.join(tempRoot, "storage");

process.env.RUNTIME_DATABASE_PRIMARY = "sqlite";
process.env.DB_FILE = sqliteFile;
process.env.STORAGE_DIR = storageDir;
process.env.NODE_ENV = "development";

const { db, initDb } = await import("../services/api/src/db.ts");
initDb();

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function postgresType(sqliteType) {
  const normalized = String(sqliteType || "TEXT").trim().toUpperCase();
  if (normalized.includes("INT")) return "INTEGER";
  if (normalized.includes("REAL") || normalized.includes("FLOA") || normalized.includes("DOUB")) return "DOUBLE PRECISION";
  if (normalized.includes("BLOB")) return "BYTEA";
  return "TEXT";
}

function defaultClause(value) {
  if (value === null || value === undefined) return "";
  const source = String(value).trim();
  if (/^(NULL|[-+]?\d+(?:\.\d+)?|'(?:[^']|'')*')$/iu.test(source)) return ` DEFAULT ${source}`;
  throw new Error(`Unsupported SQLite default expression in runtime schema: ${source}`);
}

const expectedTables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all().map((row) => String(row.name));
const expectedColumns = new Map(expectedTables.map((table) => [
  table,
  db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all(),
]));
db.close();

const client = new pg.Client({ connectionString, statement_timeout: 60_000 });
await client.connect();
let addedColumns = [];
try {
  const catalog = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = $1
    ORDER BY table_name, ordinal_position
  `, [targetSchema]);
  const actualColumns = new Map();
  for (const row of catalog.rows) {
    const columns = actualColumns.get(row.table_name) ?? new Set();
    columns.add(row.column_name);
    actualColumns.set(row.table_name, columns);
  }

  const missingTables = expectedTables.filter((table) => !actualColumns.has(table));
  if (missingTables.length > 0) {
    throw new Error(`PostgreSQL runtime schema is missing tables: ${missingTables.join(", ")}. Run the full schema migration first.`);
  }

  await client.query("BEGIN");
  await client.query(`SET LOCAL search_path TO ${quoteIdentifier(targetSchema)}, public`);
  for (const table of expectedTables) {
    const actual = actualColumns.get(table);
    for (const column of expectedColumns.get(table)) {
      if (actual.has(column.name)) continue;
      if (column.pk) throw new Error(`Refusing to add missing primary-key column ${table}.${column.name} incrementally.`);
      if (column.notnull && column.dflt_value == null) {
        const count = await client.query(`SELECT COUNT(*)::integer AS count FROM ${quoteIdentifier(targetSchema)}.${quoteIdentifier(table)}`);
        if (count.rows[0].count > 0) {
          throw new Error(`Cannot add required column ${table}.${column.name} without a default because the table contains data.`);
        }
      }
      const definition = `${postgresType(column.type)}${defaultClause(column.dflt_value)}${column.notnull ? " NOT NULL" : ""}`;
      await client.query(
        `ALTER TABLE ${quoteIdentifier(targetSchema)}.${quoteIdentifier(table)} ADD COLUMN IF NOT EXISTS ${quoteIdentifier(column.name)} ${definition}`,
      );
      addedColumns.push(`${table}.${column.name}`);
    }
  }

  await client.query(`
    UPDATE ${quoteIdentifier(targetSchema)}.score_classroom_resources
    SET version_group_id = id
    WHERE version_group_id IS NULL
  `);
  await client.query(`
    UPDATE ${quoteIdentifier(targetSchema)}.score_classroom_resources
    SET updated_at = created_at
    WHERE updated_at IS NULL
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_trace_id ON ${quoteIdentifier(targetSchema)}.jobs(trace_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_score_jobs_trace_id ON ${quoteIdentifier(targetSchema)}.score_jobs(trace_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_score_collaboration_updates_trace_id ON ${quoteIdentifier(targetSchema)}.score_collaboration_updates(trace_id)`);
  await client.query("COMMIT");

  const verification = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = $1
  `, [targetSchema]);
  const verified = new Set(verification.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const stillMissing = [...expectedColumns.entries()].flatMap(([table, columns]) =>
    columns.filter((column) => !verified.has(`${table}.${column.name}`)).map((column) => `${table}.${column.name}`),
  );
  if (stillMissing.length > 0) throw new Error(`PostgreSQL runtime schema remains incomplete: ${stillMissing.join(", ")}.`);

  console.log(JSON.stringify({
    schema: targetSchema,
    expectedTables: expectedTables.length,
    expectedColumns: [...expectedColumns.values()].reduce((total, columns) => total + columns.length, 0),
    addedColumns,
    verified: true,
  }));
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the migration failure.
  }
  throw error;
} finally {
  await client.end();
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
