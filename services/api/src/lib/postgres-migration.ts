import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { PoolClient } from "pg";

type SqliteColumn = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

type SqliteIndex = {
  name: string;
  unique: number;
  origin: "c" | "u" | "pk";
  partial: number;
};

type SqliteIndexColumn = {
  seqno: number;
  cid: number;
  name: string | null;
  desc: number;
  key: number;
};

type SqliteForeignKey = {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
};

export type PostgresMigrationTableReport = {
  table: string;
  rows: number;
  sourceChecksum: string;
  targetChecksum: string;
  indexes: number;
  foreignKeys: number;
};

export type PostgresMigrationReport = {
  startedAt: string;
  completedAt: string;
  targetSchema: string;
  tables: PostgresMigrationTableReport[];
  totalRows: number;
  runtimeTriggers: number;
  verified: boolean;
};

export type PostgresMigrationRollbackReport = {
  completedAt: string;
  targetSchema: string;
  removedTables: number;
  removedRows: number;
  rolledBack: true;
};

export type PostgresParityTableReport = {
  table: string;
  sourceRows: number;
  targetRows: number | null;
  sourceChecksum: string;
  targetChecksum: string | null;
  matched: boolean;
  error?: string;
};

export type PostgresParityReport = {
  startedAt: string;
  completedAt: string;
  targetSchema: string;
  tables: PostgresParityTableReport[];
  missingTables: string[];
  extraTables: string[];
  sourceRows: number;
  targetRows: number;
  verified: boolean;
};

const CHECKSUM_MODULUS = 1n << 256n;

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/gu, '""')}"`;
}

function assertSchemaName(value: string) {
  if (!/^[a-z][a-z0-9_]{0,62}$/u.test(value)) {
    throw new Error("PostgreSQL target schema must use 1-63 lowercase letters, numbers, and underscores.");
  }
}

function sqliteTypeToPostgres(type: string) {
  const normalized = type.trim().toUpperCase();
  if (normalized.includes("BLOB")) return "BYTEA";
  if (normalized.includes("REAL") || normalized.includes("FLOA") || normalized.includes("DOUB")) return "DOUBLE PRECISION";
  if (normalized.includes("INT")) return "BIGINT";
  if (normalized.includes("NUM") || normalized.includes("DEC")) return "NUMERIC";
  return "TEXT";
}

function portableDefault(value: string | null) {
  if (value === null) return null;
  const normalized = value.trim();
  if (/^(?:NULL|TRUE|FALSE|CURRENT_TIMESTAMP)$/iu.test(normalized)) return normalized;
  if (/^-?\d+(?:\.\d+)?$/u.test(normalized)) return normalized;
  if (/^'(?:[^']|'')*'$/u.test(normalized)) return normalized;
  throw new Error(`Unsupported SQLite default expression: ${normalized}`);
}

function canonicalValue(value: unknown, columnType: string) {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return { bytes: value.toString("base64") };
  if (ArrayBuffer.isView(value)) {
    return { bytes: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("base64") };
  }
  if (columnType.trim().toUpperCase().includes("INT")) return String(value);
  if (typeof value === "bigint") return value.toString();
  return value;
}

function createChecksumAccumulator() {
  let sum = 0n;
  let rows = 0;
  return {
    add(row: Record<string, unknown>, columns: SqliteColumn[]) {
      const canonical = columns.map((column) => canonicalValue(row[column.name], column.type));
      const hash = createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
      sum = (sum + BigInt(`0x${hash}`)) % CHECKSUM_MODULUS;
      rows += 1;
    },
    result() {
      return { rows, checksum: sum.toString(16).padStart(64, "0") };
    },
  };
}

function sqliteTables(db: DatabaseSync) {
  return db.prepare(`
    SELECT name, sql FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as Array<{ name: string; sql: string }>;
}

function tableColumns(db: DatabaseSync, table: string) {
  return db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as SqliteColumn[];
}

function tableIndexes(db: DatabaseSync, table: string) {
  const indexes = db.prepare(`PRAGMA index_list(${quoteIdentifier(table)})`).all() as SqliteIndex[];
  return indexes.filter((index) => index.origin !== "pk");
}

function indexColumns(db: DatabaseSync, index: string) {
  return (db.prepare(`PRAGMA index_xinfo(${quoteIdentifier(index)})`).all() as SqliteIndexColumn[])
    .filter((column) => column.key === 1)
    .sort((left, right) => left.seqno - right.seqno);
}

function tableForeignKeys(db: DatabaseSync, table: string) {
  return db.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(table)})`).all() as SqliteForeignKey[];
}

function createTableSql(table: string, columns: SqliteColumn[]) {
  const primary = columns.filter((column) => column.pk > 0).sort((left, right) => left.pk - right.pk);
  const definitions = columns.map((column) => {
    const parts = [quoteIdentifier(column.name), sqliteTypeToPostgres(column.type)];
    if (column.notnull) parts.push("NOT NULL");
    const defaultValue = portableDefault(column.dflt_value);
    if (defaultValue !== null) parts.push(`DEFAULT ${defaultValue}`);
    return parts.join(" ");
  });
  if (primary.length > 0) definitions.push(`PRIMARY KEY (${primary.map((column) => quoteIdentifier(column.name)).join(", ")})`);
  return `CREATE TABLE ${quoteIdentifier(table)} (${definitions.join(", ")})`;
}

function safeGeneratedName(prefix: string, parts: string[]) {
  const base = `${prefix}_${parts.join("_")}`.toLowerCase().replace(/[^a-z0-9_]/gu, "_");
  if (base.length <= 55) return base;
  const suffix = createHash("sha256").update(base).digest("hex").slice(0, 7);
  return `${base.slice(0, 55)}_${suffix}`;
}

function partialIndexPredicate(db: DatabaseSync, indexName: string, partial: boolean) {
  if (!partial) return "";
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?").get(indexName) as { sql: string | null } | undefined;
  const match = row?.sql?.match(/\sWHERE\s+([\s\S]+)$/iu);
  if (!match) throw new Error(`Could not recover partial-index predicate for ${indexName}.`);
  if (/\b(datetime|julianday|strftime|unixepoch)\s*\(/iu.test(match[1])) {
    throw new Error(`Partial index ${indexName} uses a SQLite-only date function.`);
  }
  return ` WHERE ${match[1]}`;
}

function translatedIndexExpression(db: DatabaseSync, indexName: string) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?").get(indexName) as { sql: string | null } | undefined;
  const sql = row?.sql?.trim();
  if (!sql || /;|--|\/\*/u.test(sql)) throw new Error(`Index ${indexName} has no safe SQL definition.`);
  const match = sql.match(/\bON\s+[^()\s]+\s*\(([\s\S]+)\)\s*(?:WHERE\s+[\s\S]+)?$/iu);
  if (!match) throw new Error(`Could not parse expression index ${indexName}.`);
  const translated = match[1].replace(/\bifnull\s*\(/giu, "COALESCE(");
  if (/\b(datetime|julianday|strftime|unixepoch|printf|json_extract)\s*\(/iu.test(translated)) {
    throw new Error(`Expression index ${indexName} uses an unsupported SQLite function.`);
  }
  return translated;
}

async function createIndexes(client: PoolClient, db: DatabaseSync, table: string) {
  let created = 0;
  for (const index of tableIndexes(db, table)) {
    const columns = indexColumns(db, index.name);
    if (columns.length === 0) throw new Error(`Empty index ${index.name} requires a manual PostgreSQL migration.`);
    const hasExpression = columns.some((column) => column.cid < 0 || !column.name);
    const indexName = index.origin === "u"
      ? safeGeneratedName("uq", [table, ...columns.map((column) => column.name ?? "expression")])
      : index.name;
    const directionColumns = hasExpression
      ? translatedIndexExpression(db, index.name)
      : columns.map((column) => `${quoteIdentifier(column.name!)}${column.desc ? " DESC" : ""}`).join(", ");
    const predicate = partialIndexPredicate(db, index.name, index.partial === 1);
    await client.query(
      `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${quoteIdentifier(indexName)} ON ${quoteIdentifier(table)} (${directionColumns})${predicate}`,
    );
    created += 1;
  }
  return created;
}

async function createForeignKeys(client: PoolClient, db: DatabaseSync, table: string) {
  const grouped = new Map<number, SqliteForeignKey[]>();
  for (const foreignKey of tableForeignKeys(db, table)) {
    const group = grouped.get(foreignKey.id) ?? [];
    group.push(foreignKey);
    grouped.set(foreignKey.id, group);
  }
  for (const [id, group] of grouped) {
    group.sort((left, right) => left.seq - right.seq);
    const first = group[0];
    const name = safeGeneratedName("fk", [table, String(id), first.table]);
    const from = group.map((entry) => quoteIdentifier(entry.from)).join(", ");
    const to = group.map((entry) => quoteIdentifier(entry.to)).join(", ");
    await client.query(
      `ALTER TABLE ${quoteIdentifier(table)} ADD CONSTRAINT ${quoteIdentifier(name)} FOREIGN KEY (${from}) REFERENCES ${quoteIdentifier(first.table)} (${to}) ON UPDATE ${first.on_update} ON DELETE ${first.on_delete} NOT VALID`,
    );
    await client.query(`ALTER TABLE ${quoteIdentifier(table)} VALIDATE CONSTRAINT ${quoteIdentifier(name)}`);
  }
  return grouped.size;
}

async function createRuntimeTriggers(client: PoolClient, targetSchema: string, tables: Set<string>) {
  const required = ["job_dispatch_outbox", "jobs", "score_jobs"];
  const present = required.filter((table) => tables.has(table));
  if (present.length === 0) return 0;
  if (present.length !== required.length) {
    throw new Error(`PostgreSQL runtime triggers require all tables: ${required.join(", ")}.`);
  }

  const schema = quoteIdentifier(targetSchema);
  const outbox = `${schema}.${quoteIdentifier("job_dispatch_outbox")}`;
  const enqueueFunction = `${schema}.${quoteIdentifier("scoretransposer_enqueue_job_dispatch")}`;
  const acknowledgeFunction = `${schema}.${quoteIdentifier("scoretransposer_acknowledge_job_dispatch")}`;

  await client.query(`
    CREATE OR REPLACE FUNCTION ${enqueueFunction}()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog
    AS $function$
    BEGIN
      INSERT INTO ${outbox} (
        id, queue_name, job_family, job_id, status, attempts, next_attempt_at,
        locked_at, dispatched_at, acknowledged_at, broker_job_id, last_error, created_at, updated_at
      ) VALUES (
        md5(random()::text || clock_timestamp()::text || NEW.id || TG_ARGV[0]),
        'score-processing', TG_ARGV[0], NEW.id, 'queued', 0, NEW.updated_at,
        NULL, NULL, NULL, NULL, NULL, NEW.updated_at, NEW.updated_at
      );
      RETURN NEW;
    END;
    $function$
  `);
  await client.query(`
    CREATE OR REPLACE FUNCTION ${acknowledgeFunction}()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog
    AS $function$
    BEGIN
      UPDATE ${outbox}
      SET status = 'acknowledged', acknowledged_at = NEW.updated_at, locked_at = NULL,
          last_error = NULL, updated_at = NEW.updated_at
      WHERE job_family = TG_ARGV[0] AND job_id = NEW.id
        AND status IN ('queued', 'processing', 'dispatched');
      RETURN NEW;
    END;
    $function$
  `);

  const definitions = [
    ["trg_jobs_dispatch_insert", "jobs", "AFTER INSERT", "NEW.status = 'queued'", enqueueFunction, "legacy"],
    ["trg_jobs_dispatch_retry", "jobs", "AFTER UPDATE OF status", "NEW.status = 'queued' AND OLD.status <> 'queued'", enqueueFunction, "legacy"],
    ["trg_jobs_dispatch_ack", "jobs", "AFTER UPDATE OF status", "NEW.status = 'processing' AND OLD.status = 'queued'", acknowledgeFunction, "legacy"],
    ["trg_score_jobs_dispatch_insert", "score_jobs", "AFTER INSERT", "NEW.status = 'queued'", enqueueFunction, "score"],
    ["trg_score_jobs_dispatch_retry", "score_jobs", "AFTER UPDATE OF status", "NEW.status = 'queued' AND OLD.status <> 'queued'", enqueueFunction, "score"],
    ["trg_score_jobs_dispatch_ack", "score_jobs", "AFTER UPDATE OF status", "NEW.status = 'processing' AND OLD.status = 'queued'", acknowledgeFunction, "score"],
  ] as const;

  for (const [name, table, timing, condition, triggerFunction, family] of definitions) {
    await client.query(
      `DROP TRIGGER IF EXISTS ${quoteIdentifier(name)} ON ${schema}.${quoteIdentifier(table)}`,
    );
    await client.query(`
      CREATE TRIGGER ${quoteIdentifier(name)}
      ${timing} ON ${schema}.${quoteIdentifier(table)}
      FOR EACH ROW WHEN (${condition})
      EXECUTE FUNCTION ${triggerFunction}('${family}')
    `);
  }
  return definitions.length;
}

export async function ensurePostgresRuntimeTriggers(input: {
  target: PoolClient;
  targetSchema: string;
}) {
  assertSchemaName(input.targetSchema);
  await input.target.query("BEGIN");
  try {
    await input.target.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`score-runtime-triggers:${input.targetSchema}`],
    );
    const tableResult = await input.target.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    `, [input.targetSchema]);
    const runtimeTriggers = await createRuntimeTriggers(
      input.target,
      input.targetSchema,
      new Set(tableResult.rows.map((row) => row.table_name)),
    );
    await input.target.query("COMMIT");
    return { targetSchema: input.targetSchema, runtimeTriggers };
  } catch (error) {
    await input.target.query("ROLLBACK");
    throw error;
  }
}

async function insertTableRows(input: {
  source: DatabaseSync;
  target: PoolClient;
  table: string;
  columns: SqliteColumn[];
  batchRows: number;
}) {
  const names = input.columns.map((column) => quoteIdentifier(column.name));
  const statement = input.source.prepare(`SELECT ${names.join(", ")} FROM ${quoteIdentifier(input.table)}`);
  const checksum = createChecksumAccumulator();
  let batch: Record<string, unknown>[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      const placeholders = input.columns.map((column) => {
        values.push(row[column.name]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await input.target.query(
      `INSERT INTO ${quoteIdentifier(input.table)} (${names.join(", ")}) VALUES ${tuples.join(", ")}`,
      values,
    );
    batch = [];
  };

  for (const row of statement.iterate() as Iterable<Record<string, unknown>>) {
    checksum.add(row, input.columns);
    batch.push(row);
    if (batch.length >= input.batchRows) await flush();
  }
  await flush();
  return checksum.result();
}

async function checksumTarget(client: PoolClient, table: string, columns: SqliteColumn[]) {
  const names = columns.map((column) => quoteIdentifier(column.name));
  const result = await client.query(`SELECT ${names.join(", ")} FROM ${quoteIdentifier(table)}`);
  const checksum = createChecksumAccumulator();
  for (const row of result.rows as Record<string, unknown>[]) checksum.add(row, columns);
  return checksum.result();
}

function checksumSource(db: DatabaseSync, table: string, columns: SqliteColumn[]) {
  const names = columns.map((column) => quoteIdentifier(column.name));
  const checksum = createChecksumAccumulator();
  // Keep the statement alive while async PostgreSQL verification yields between tables.
  const statement = db.prepare(`SELECT ${names.join(", ")} FROM ${quoteIdentifier(table)}`);
  for (const row of statement.iterate() as Iterable<Record<string, unknown>>) {
    checksum.add(row, columns);
  }
  return checksum.result();
}

export async function verifySqlitePostgresParity(input: {
  source: DatabaseSync;
  target: PoolClient;
  targetSchema: string;
}) {
  assertSchemaName(input.targetSchema);
  const startedAt = new Date().toISOString();
  let sourceTransactionOpen = false;
  await input.target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    input.source.exec("BEGIN");
    sourceTransactionOpen = true;
    await input.target.query("SELECT pg_advisory_xact_lock_shared(hashtext($1))", [`score-migration:${input.targetSchema}`]);
    await input.target.query(`SET LOCAL search_path TO ${quoteIdentifier(input.targetSchema)}, public`);
    const sourceTables = sqliteTables(input.source);
    const targetTableResult = await input.target.query<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [input.targetSchema]);
    const targetTables = new Set(targetTableResult.rows.map((row) => row.table_name));
    const sourceTableNames = new Set(sourceTables.map((table) => table.name));
    const reports: PostgresParityTableReport[] = [];

    for (const table of sourceTables) {
      const columns = tableColumns(input.source, table.name);
      const source = checksumSource(input.source, table.name, columns);
      if (!targetTables.has(table.name)) {
        reports.push({
          table: table.name,
          sourceRows: source.rows,
          targetRows: null,
          sourceChecksum: source.checksum,
          targetChecksum: null,
          matched: false,
          error: "Target table is missing.",
        });
        continue;
      }
      try {
        await input.target.query("SAVEPOINT parity_table");
        const target = await checksumTarget(input.target, table.name, columns);
        await input.target.query("RELEASE SAVEPOINT parity_table");
        reports.push({
          table: table.name,
          sourceRows: source.rows,
          targetRows: target.rows,
          sourceChecksum: source.checksum,
          targetChecksum: target.checksum,
          matched: source.rows === target.rows && source.checksum === target.checksum,
        });
      } catch (error) {
        await input.target.query("ROLLBACK TO SAVEPOINT parity_table");
        await input.target.query("RELEASE SAVEPOINT parity_table");
        reports.push({
          table: table.name,
          sourceRows: source.rows,
          targetRows: null,
          sourceChecksum: source.checksum,
          targetChecksum: null,
          matched: false,
          error: error instanceof Error ? error.message : "Target checksum failed.",
        });
      }
    }

    const missingTables = reports.filter((report) => report.targetRows === null).map((report) => report.table);
    const extraTables = [...targetTables].filter((table) => !sourceTableNames.has(table)).sort();
    input.source.exec("COMMIT");
    sourceTransactionOpen = false;
    await input.target.query("COMMIT");
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      targetSchema: input.targetSchema,
      tables: reports,
      missingTables,
      extraTables,
      sourceRows: reports.reduce((sum, report) => sum + report.sourceRows, 0),
      targetRows: reports.reduce((sum, report) => sum + (report.targetRows ?? 0), 0),
      verified: missingTables.length === 0 && extraTables.length === 0 && reports.every((report) => report.matched),
    } satisfies PostgresParityReport;
  } catch (error) {
    await input.target.query("ROLLBACK");
    if (sourceTransactionOpen) input.source.exec("ROLLBACK");
    throw error;
  }
}

export async function migrateSqliteToPostgres(input: {
  source: DatabaseSync;
  target: PoolClient;
  targetSchema: string;
  replaceSchema?: boolean;
  batchRows?: number;
}) {
  assertSchemaName(input.targetSchema);
  const startedAt = new Date().toISOString();
  const batchRows = Math.max(1, Math.min(1_000, Math.trunc(input.batchRows ?? 250)));
  await input.target.query("BEGIN");
  let sourceTransactionOpen = false;
  try {
    input.source.exec("BEGIN");
    sourceTransactionOpen = true;
    const tables = sqliteTables(input.source);
    await input.target.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`score-migration:${input.targetSchema}`]);
    if (input.replaceSchema) await input.target.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(input.targetSchema)} CASCADE`);
    await input.target.query(`CREATE SCHEMA ${quoteIdentifier(input.targetSchema)}`);
    await input.target.query(`SET LOCAL search_path TO ${quoteIdentifier(input.targetSchema)}, public`);

    const columnsByTable = new Map<string, SqliteColumn[]>();
    for (const table of tables) {
      if (/\b(?:CHECK|GENERATED)\b|WITHOUT\s+ROWID/iu.test(table.sql)) {
        throw new Error(`Table ${table.name} contains a constraint that requires a manual PostgreSQL migration.`);
      }
      const columns = tableColumns(input.source, table.name);
      if (columns.length === 0) throw new Error(`Table ${table.name} has no columns.`);
      columnsByTable.set(table.name, columns);
      await input.target.query(createTableSql(table.name, columns));
    }

    const reports: PostgresMigrationTableReport[] = [];
    for (const table of tables) {
      const columns = columnsByTable.get(table.name)!;
      const source = await insertTableRows({ source: input.source, target: input.target, table: table.name, columns, batchRows });
      const indexes = await createIndexes(input.target, input.source, table.name);
      reports.push({ table: table.name, rows: source.rows, sourceChecksum: source.checksum, targetChecksum: "", indexes, foreignKeys: 0 });
    }
    for (const report of reports) {
      report.foreignKeys = await createForeignKeys(input.target, input.source, report.table);
      const target = await checksumTarget(input.target, report.table, columnsByTable.get(report.table)!);
      report.targetChecksum = target.checksum;
      if (target.rows !== report.rows || target.checksum !== report.sourceChecksum) {
        throw new Error(`PostgreSQL verification failed for ${report.table}: source ${report.rows}/${report.sourceChecksum}, target ${target.rows}/${target.checksum}.`);
      }
    }
    const runtimeTriggers = await createRuntimeTriggers(
      input.target,
      input.targetSchema,
      new Set(tables.map((table) => table.name)),
    );
    input.source.exec("COMMIT");
    sourceTransactionOpen = false;
    await input.target.query("COMMIT");
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      targetSchema: input.targetSchema,
      tables: reports,
      totalRows: reports.reduce((sum, report) => sum + report.rows, 0),
      runtimeTriggers,
      verified: true,
    } satisfies PostgresMigrationReport;
  } catch (error) {
    await input.target.query("ROLLBACK");
    if (sourceTransactionOpen) input.source.exec("ROLLBACK");
    throw error;
  }
}

export async function rollbackPostgresMigration(input: {
  target: PoolClient;
  targetSchema: string;
  confirmation: string;
}) {
  assertSchemaName(input.targetSchema);
  if (input.confirmation !== input.targetSchema) {
    throw new Error(`Dropping a migrated schema requires confirmation equal to ${input.targetSchema}.`);
  }

  await input.target.query("BEGIN");
  try {
    await input.target.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`score-migration:${input.targetSchema}`]);
    const tableResult = await input.target.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [input.targetSchema]);
    if (tableResult.rows.length === 0) {
      throw new Error(`PostgreSQL schema ${input.targetSchema} does not exist or contains no base tables.`);
    }

    let removedRows = 0;
    for (const table of tableResult.rows) {
      const count = await input.target.query<{ rows: string }>(
        `SELECT COUNT(*)::text AS rows FROM ${quoteIdentifier(input.targetSchema)}.${quoteIdentifier(table.table_name)}`,
      );
      removedRows += Number(count.rows[0]?.rows ?? 0);
    }
    await input.target.query(`DROP SCHEMA ${quoteIdentifier(input.targetSchema)} CASCADE`);
    await input.target.query("COMMIT");
    return {
      completedAt: new Date().toISOString(),
      targetSchema: input.targetSchema,
      removedTables: tableResult.rows.length,
      removedRows,
      rolledBack: true,
    } satisfies PostgresMigrationRollbackReport;
  } catch (error) {
    await input.target.query("ROLLBACK");
    throw error;
  }
}
