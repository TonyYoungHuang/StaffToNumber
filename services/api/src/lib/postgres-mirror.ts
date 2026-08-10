import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { PoolClient } from "pg";

type Column = { name: string; type: string; pk: number };
type MirrorEvent = {
  id: string;
  table_name: string;
  operation: "upsert" | "delete";
  key_json: string;
  row_json: string | null;
  attempts: number;
};

const INTERNAL_TABLES = new Set(["postgres_mirror_outbox", "sqlite_sequence"]);

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/gu, '""')}"`;
}

function tableColumns(db: DatabaseSync, table: string) {
  return db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as Column[];
}

function jsonValue(alias: "NEW" | "OLD", column: Column) {
  const value = `${alias}.${quoteIdentifier(column.name)}`;
  return column.type.toUpperCase().includes("BLOB") ? `json_object('__hex', hex(${value}))` : value;
}

function jsonObject(alias: "NEW" | "OLD", columns: Column[]) {
  return `json_object(${columns.flatMap((column) => [`'${column.name.replace(/'/gu, "''")}'`, jsonValue(alias, column)]).join(", ")})`;
}

export function installPostgresMirrorOutbox(input: { db: DatabaseSync; tables?: string[] }) {
  input.db.exec(`
    CREATE TABLE IF NOT EXISTS postgres_mirror_outbox (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      key_json TEXT NOT NULL,
      row_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      lock_token TEXT,
      locked_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_postgres_mirror_pending
      ON postgres_mirror_outbox(status, created_at, id);
  `);
  const available = input.db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all().map((row) => (row as { name: string }).name);
  const requested = input.tables ?? available;
  const installed: string[] = [];
  const skipped: Array<{ table: string; reason: string }> = [];
  for (const table of requested) {
    if (INTERNAL_TABLES.has(table) || !available.includes(table)) continue;
    const columns = tableColumns(input.db, table);
    const primary = columns.filter((column) => column.pk > 0).sort((left, right) => left.pk - right.pk);
    if (columns.length === 0 || primary.length === 0) {
      skipped.push({ table, reason: "A primary key is required for idempotent mirroring." });
      continue;
    }
    const safeTrigger = table.replace(/[^a-zA-Z0-9_]/gu, "_");
    input.db.exec(`
      DROP TRIGGER IF EXISTS ${quoteIdentifier(`pg_mirror_${safeTrigger}_insert`)};
      DROP TRIGGER IF EXISTS ${quoteIdentifier(`pg_mirror_${safeTrigger}_update`)};
      DROP TRIGGER IF EXISTS ${quoteIdentifier(`pg_mirror_${safeTrigger}_delete`)};
      CREATE TRIGGER ${quoteIdentifier(`pg_mirror_${safeTrigger}_insert`)} AFTER INSERT ON ${quoteIdentifier(table)} BEGIN
        INSERT INTO postgres_mirror_outbox (id, table_name, operation, key_json, row_json, created_at)
        VALUES (lower(hex(randomblob(16))), '${table.replace(/'/gu, "''")}', 'upsert', ${jsonObject("NEW", primary)}, ${jsonObject("NEW", columns)}, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER ${quoteIdentifier(`pg_mirror_${safeTrigger}_update`)} AFTER UPDATE ON ${quoteIdentifier(table)} BEGIN
        INSERT INTO postgres_mirror_outbox (id, table_name, operation, key_json, row_json, created_at)
        VALUES (lower(hex(randomblob(16))), '${table.replace(/'/gu, "''")}', 'upsert', ${jsonObject("NEW", primary)}, ${jsonObject("NEW", columns)}, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER ${quoteIdentifier(`pg_mirror_${safeTrigger}_delete`)} AFTER DELETE ON ${quoteIdentifier(table)} BEGIN
        INSERT INTO postgres_mirror_outbox (id, table_name, operation, key_json, row_json, created_at)
        VALUES (lower(hex(randomblob(16))), '${table.replace(/'/gu, "''")}', 'delete', ${jsonObject("OLD", primary)}, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
    `);
    installed.push(table);
  }
  return { installed, skipped };
}

function decodeValue(value: unknown, column: Column) {
  if (value && typeof value === "object" && !Array.isArray(value) && "__hex" in value && column.type.toUpperCase().includes("BLOB")) {
    return Buffer.from(String((value as { __hex: unknown }).__hex), "hex");
  }
  return value;
}

async function applyMirrorEvent(input: { source: DatabaseSync; target: PoolClient; targetSchema: string; event: MirrorEvent }) {
  const columns = tableColumns(input.source, input.event.table_name);
  const primary = columns.filter((column) => column.pk > 0).sort((left, right) => left.pk - right.pk);
  if (primary.length === 0) throw new Error(`Mirror table ${input.event.table_name} no longer has a primary key.`);
  const key = JSON.parse(input.event.key_json) as Record<string, unknown>;
  const table = `${quoteIdentifier(input.targetSchema)}.${quoteIdentifier(input.event.table_name)}`;
  if (input.event.operation === "delete") {
    const values = primary.map((column) => decodeValue(key[column.name], column));
    await input.target.query(`DELETE FROM ${table} WHERE ${primary.map((column, index) => `${quoteIdentifier(column.name)} = $${index + 1}`).join(" AND ")}`, values);
    return;
  }
  const row = JSON.parse(input.event.row_json ?? "{}") as Record<string, unknown>;
  const values = columns.map((column) => decodeValue(row[column.name], column));
  const updateColumns = columns.filter((column) => column.pk === 0);
  const conflict = primary.map((column) => quoteIdentifier(column.name)).join(", ");
  const action = updateColumns.length > 0
    ? `DO UPDATE SET ${updateColumns.map((column) => `${quoteIdentifier(column.name)} = EXCLUDED.${quoteIdentifier(column.name)}`).join(", ")}`
    : "DO NOTHING";
  await input.target.query(
    `INSERT INTO ${table} (${columns.map((column) => quoteIdentifier(column.name)).join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")}) ON CONFLICT (${conflict}) ${action}`,
    values,
  );
}

export async function flushPostgresMirrorOutbox(input: {
  source: DatabaseSync;
  target: PoolClient;
  targetSchema: string;
  limit?: number;
  maxAttempts?: number;
}) {
  if (!/^[a-z][a-z0-9_]{0,62}$/u.test(input.targetSchema)) throw new Error("PostgreSQL mirror schema is invalid.");
  const limit = Math.max(1, Math.min(1_000, Math.trunc(input.limit ?? 100)));
  const maxAttempts = Math.max(1, Math.min(100, Math.trunc(input.maxAttempts ?? 10)));
  const lockToken = randomUUID();
  input.source.exec("BEGIN IMMEDIATE");
  let events: MirrorEvent[];
  try {
    events = input.source.prepare(`
      SELECT id, table_name, operation, key_json, row_json, attempts
      FROM postgres_mirror_outbox
      WHERE (status = 'pending' OR (status = 'processing' AND locked_at < ?)) AND attempts < ?
      ORDER BY created_at, id LIMIT ?
    `).all(new Date(Date.now() - 5 * 60_000).toISOString(), maxAttempts, limit) as MirrorEvent[];
    const lock = input.source.prepare(`
      UPDATE postgres_mirror_outbox SET status = 'processing', lock_token = ?, locked_at = ?, attempts = attempts + 1
      WHERE id = ?
    `);
    const lockedAt = new Date().toISOString();
    for (const event of events) lock.run(lockToken, lockedAt, event.id);
    input.source.exec("COMMIT");
  } catch (error) {
    input.source.exec("ROLLBACK");
    throw error;
  }
  if (events.length === 0) return { selected: 0, mirrored: 0, failed: 0 };

  try {
    await input.target.query("BEGIN");
    for (const event of events) await applyMirrorEvent({ source: input.source, target: input.target, targetSchema: input.targetSchema, event });
    await input.target.query("COMMIT");
    const complete = input.source.prepare(`
      UPDATE postgres_mirror_outbox SET status = 'completed', completed_at = ?, lock_token = NULL, locked_at = NULL, last_error = NULL
      WHERE id = ? AND lock_token = ?
    `);
    const completedAt = new Date().toISOString();
    input.source.exec("BEGIN IMMEDIATE");
    for (const event of events) complete.run(completedAt, event.id, lockToken);
    input.source.exec("COMMIT");
    return { selected: events.length, mirrored: events.length, failed: 0 };
  } catch (error) {
    await input.target.query("ROLLBACK").catch(() => undefined);
    const message = (error instanceof Error ? error.message : "PostgreSQL mirror failed.").slice(0, 2000);
    const fail = input.source.prepare(`
      UPDATE postgres_mirror_outbox SET status = CASE WHEN attempts >= ? THEN 'dead' ELSE 'pending' END,
        lock_token = NULL, locked_at = NULL, last_error = ? WHERE id = ? AND lock_token = ?
    `);
    input.source.exec("BEGIN IMMEDIATE");
    for (const event of events) fail.run(maxAttempts, message, event.id, lockToken);
    input.source.exec("COMMIT");
    throw error;
  }
}
