import { DatabaseSync } from "node:sqlite";
import { deserialize } from "node:v8";
import { Worker } from "node:worker_threads";

export type RuntimeDatabasePrimary = "sqlite" | "postgres";

export type RuntimeRunResult = {
  changes: number;
  lastInsertRowid: number | bigint;
};

export interface RuntimeStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): RuntimeRunResult;
}

export interface RuntimeDatabaseLike {
  readonly primary?: RuntimeDatabasePrimary;
  prepare(sql: string): any;
  exec(sql: string): void;
}

export interface RuntimeDatabase extends RuntimeDatabaseLike {
  readonly primary: RuntimeDatabasePrimary;
  prepare(sql: string): RuntimeStatement;
  exec(sql: string): void;
  close(): void;
}

export type RuntimeDatabaseOptions = {
  primary: RuntimeDatabasePrimary;
  sqliteFile?: string;
  postgresUrl?: string;
  postgresSchema?: string;
  queryTimeoutMs?: number;
  responseBufferBytes?: number;
};

type WorkerResponse = {
  ok: boolean;
  rows?: unknown[];
  rowCount?: number;
  error?: string;
  code?: string;
};

const DEFAULT_RESPONSE_BUFFER_BYTES = 64 * 1024 * 1024;

class SqliteRuntimeDatabase implements RuntimeDatabase {
  readonly primary = "sqlite" as const;
  readonly #database: DatabaseSync;

  constructor(file: string) {
    this.#database = new DatabaseSync(file);
  }

  prepare(sql: string): RuntimeStatement {
    return this.#database.prepare(sql) as unknown as RuntimeStatement;
  }

  exec(sql: string) {
    this.#database.exec(sql);
  }

  close() {
    this.#database.close();
  }
}

class PostgresRuntimeDatabase implements RuntimeDatabase {
  readonly primary = "postgres" as const;
  readonly #worker: Worker;
  readonly #queryTimeoutMs: number;
  readonly #responseBufferBytes: number;
  #closed = false;

  constructor(url: string, schema: string, queryTimeoutMs: number, responseBufferBytes: number) {
    this.#queryTimeoutMs = queryTimeoutMs;
    this.#responseBufferBytes = responseBufferBytes;
    this.#worker = new Worker(new URL("./postgres-worker.js", import.meta.url), {
      workerData: { url, schema, statementTimeoutMs: queryTimeoutMs },
    });
  }

  prepare(sql: string): RuntimeStatement {
    return {
      get: (...params) => this.#query(sql, params).rows?.[0],
      all: (...params) => this.#query(sql, params).rows ?? [],
      run: (...params) => {
        const result = this.#query(sql, params);
        return { changes: result.rowCount ?? 0, lastInsertRowid: 0 };
      },
    };
  }

  exec(sql: string) {
    this.#query(sql, []);
  }

  close() {
    if (this.#closed) return;
    try {
      this.#execute({ operation: "close" });
    } finally {
      this.#closed = true;
      void this.#worker.terminate();
    }
  }

  #query(sql: string, params: unknown[]) {
    if (this.#closed) throw new Error("PostgreSQL runtime database is closed.");
    const translated = translateSqliteSql(sql);
    return this.#execute({ operation: "query", sql: translated.sql, params, ignored: translated.ignored });
  }

  #execute(message: { operation: "query" | "close"; sql?: string; params?: unknown[]; ignored?: boolean }): WorkerResponse {
    if (message.ignored) return { ok: true, rows: [], rowCount: 0 };
    const signal = new SharedArrayBuffer(16);
    const signalView = new Int32Array(signal);
    const response = new SharedArrayBuffer(this.#responseBufferBytes);
    this.#worker.postMessage({ ...message, signal, response });
    const waitResult = Atomics.wait(signalView, 0, 0, this.#queryTimeoutMs + 5_000);
    if (waitResult === "timed-out") throw new Error(`PostgreSQL runtime query exceeded ${this.#queryTimeoutMs + 5_000}ms.`);
    const byteLength = Atomics.load(signalView, 1);
    if (byteLength <= 0 || byteLength > this.#responseBufferBytes) throw new Error("PostgreSQL runtime returned an invalid response.");
    const result = deserialize(Buffer.from(new Uint8Array(response, 0, byteLength))) as WorkerResponse;
    if (!result.ok) {
      const error = new Error(result.error ?? "PostgreSQL runtime query failed.") as Error & { code?: string };
      error.code = result.code;
      throw error;
    }
    return result;
  }
}

export function createRuntimeDatabase(options: RuntimeDatabaseOptions): RuntimeDatabase {
  if (options.primary === "postgres") {
    const url = options.postgresUrl?.trim();
    if (!url) throw new Error("POSTGRES_URL is required when RUNTIME_DATABASE_PRIMARY=postgres.");
    const schema = postgresSchemaName(options.postgresSchema);
    return new PostgresRuntimeDatabase(
      url,
      schema,
      positiveInteger(options.queryTimeoutMs, 30_000),
      positiveInteger(options.responseBufferBytes, DEFAULT_RESPONSE_BUFFER_BYTES),
    );
  }
  const file = options.sqliteFile?.trim();
  if (!file) throw new Error("sqliteFile is required when RUNTIME_DATABASE_PRIMARY=sqlite.");
  return new SqliteRuntimeDatabase(file);
}

export function postgresSchemaName(value: string | undefined) {
  const schema = value?.trim() || "public";
  if (!/^[a-z_][a-z0-9_]{0,62}$/u.test(schema)) {
    throw new Error("POSTGRES_SCHEMA must be a lowercase PostgreSQL identifier (letters, digits, and underscores only).");
  }
  return schema;
}

export function runtimeDatabasePrimary(value: string | undefined, nodeEnv = "development"): RuntimeDatabasePrimary {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "postgres" || normalized === "sqlite") return normalized;
  return nodeEnv === "production" || nodeEnv === "staging" ? "postgres" : "sqlite";
}

export function assertPostgresRuntimeTables(db: RuntimeDatabaseLike, requiredTables: readonly string[]) {
  if (db.primary !== "postgres") return;
  const tables = [...new Set(requiredTables.map((table) => table.trim()).filter(Boolean))];
  if (tables.length === 0) return;
  for (const table of tables) {
    if (!/^[a-z_][a-z0-9_]{0,62}$/u.test(table)) throw new Error(`Invalid PostgreSQL runtime table name: ${table}.`);
  }
  const placeholders = tables.map(() => "?").join(", ");
  const rows = db.prepare(`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
      AND table_name IN (${placeholders})
  `).all(...tables) as Array<{ tableName: string }>;
  const available = new Set(rows.map((row) => row.tableName));
  const missing = tables.filter((table) => !available.has(table));
  if (missing.length > 0) {
    throw new Error(`PostgreSQL runtime schema is missing required tables: ${missing.join(", ")}. Run the owner migration before starting services.`);
  }
}

export function translateSqliteSql(source: string): { sql: string; ignored: boolean } {
  const trimmed = source.trim();
  if (/^PRAGMA\s+(?:foreign_keys|busy_timeout|user_version\s*=)/iu.test(trimmed)) return { sql: "SELECT 1", ignored: true };
  const tableInfo = /^PRAGMA\s+table_info\((?:"([^"]+)"|([^)]+))\)\s*;?$/iu.exec(trimmed);
  if (tableInfo) {
    const table = (tableInfo[1] ?? tableInfo[2]).trim().replace(/'/gu, "''");
    return {
      sql: `SELECT column_name AS name, data_type AS type, CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END AS notnull FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = '${table}' ORDER BY ordinal_position`,
      ignored: false,
    };
  }
  if (/^PRAGMA\s+user_version/iu.test(trimmed)) return { sql: "SELECT 0::integer AS user_version", ignored: false };

  let sql = replaceQuestionParameters(source);
  sql = sql.replace(/\bBEGIN\s+IMMEDIATE\b/giu, "BEGIN");
  sql = sql.replace(/\bBLOB\b/giu, "BYTEA");
  sql = sql.replace(/\bCOLLATE\s+NOCASE\b/giu, "");
  sql = sql.replace(/\bifnull\s*\(/giu, "COALESCE(");
  sql = sql.replace(/\browid\b/giu, "id");
  sql = sql.replace(/datetime\(\s*'now'\s*\)/giu, "to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')");
  sql = sql.replace(/datetime\(\s*'([^']+)'\s*\)/giu, "'$1'");
  sql = sql.replace(/datetime\(\s*([^,\)]+)\s*\)/giu, "$1");
  sql = quoteCamelCaseAliases(sql);

  const insertOrIgnore = /\bINSERT\s+OR\s+IGNORE\s+INTO\b/iu.test(sql);
  if (insertOrIgnore) {
    sql = sql.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/giu, "INSERT INTO");
    sql = appendConflictDoNothing(sql);
  }
  return { sql, ignored: false };
}

function quoteCamelCaseAliases(sql: string) {
  let output = "";
  let segment = "";
  let quoted: "'" | "\"" | null = null;
  const flush = () => {
    output += segment.replace(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b/gu, (match, alias: string) =>
      /[a-z]/u.test(alias) && /[A-Z]/u.test(alias) ? match.replace(alias, `"${alias}"`) : match,
    );
    segment = "";
  };
  for (let cursor = 0; cursor < sql.length; cursor += 1) {
    const character = sql[cursor];
    if (quoted) {
      output += character;
      if (character === quoted) {
        if (sql[cursor + 1] === quoted) output += sql[++cursor];
        else quoted = null;
      }
      continue;
    }
    if (character === "'" || character === "\"") {
      flush();
      quoted = character;
      output += character;
    } else {
      segment += character;
    }
  }
  flush();
  return output;
}

function replaceQuestionParameters(sql: string) {
  let index = 0;
  let quoted: "'" | "\"" | null = null;
  let output = "";
  for (let cursor = 0; cursor < sql.length; cursor += 1) {
    const character = sql[cursor];
    if (quoted) {
      output += character;
      if (character === quoted) {
        if (sql[cursor + 1] === quoted) output += sql[++cursor];
        else quoted = null;
      }
      continue;
    }
    if (character === "'" || character === "\"") {
      quoted = character;
      output += character;
    } else if (character === "?") {
      output += `$${++index}`;
    } else {
      output += character;
    }
  }
  return output;
}

function appendConflictDoNothing(sql: string) {
  const returningIndex = sql.search(/\bRETURNING\b/iu);
  if (returningIndex >= 0) return `${sql.slice(0, returningIndex).trimEnd()} ON CONFLICT DO NOTHING ${sql.slice(returningIndex)}`;
  const semicolon = sql.lastIndexOf(";");
  if (semicolon >= 0) return `${sql.slice(0, semicolon).trimEnd()} ON CONFLICT DO NOTHING${sql.slice(semicolon)}`;
  return `${sql.trimEnd()} ON CONFLICT DO NOTHING`;
}

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
