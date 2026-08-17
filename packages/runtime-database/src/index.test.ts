import assert from "node:assert/strict";
import test from "node:test";
import { assertPostgresRuntimeTables, postgresSchemaName, runtimeDatabasePrimary, translateSqliteSql } from "./index.js";

test("production defaults to PostgreSQL and development defaults to SQLite", () => {
  assert.equal(runtimeDatabasePrimary(undefined, "production"), "postgres");
  assert.equal(runtimeDatabasePrimary(undefined, "staging"), "postgres");
  assert.equal(runtimeDatabasePrimary(undefined, "development"), "sqlite");
});

test("validates PostgreSQL runtime schema names", () => {
  assert.equal(postgresSchemaName(undefined), "public");
  assert.equal(postgresSchemaName("scoretransposer_runtime"), "scoretransposer_runtime");
  assert.throws(() => postgresSchemaName("public; DROP SCHEMA public"), /POSTGRES_SCHEMA/u);
});

test("translates SQLite placeholders and transaction syntax", () => {
  const translated = translateSqliteSql("BEGIN IMMEDIATE; SELECT * FROM jobs WHERE id = ? AND label = '?';");
  assert.match(translated.sql, /^BEGIN;/u);
  assert.match(translated.sql, /id = \$1/u);
  assert.match(translated.sql, /label = '\?'/u);
});

test("translates SQLite date and conflict syntax", () => {
  const translated = translateSqliteSql("INSERT OR IGNORE INTO jobs (id, created_at) VALUES (?, datetime('now'));");
  assert.match(translated.sql, /^INSERT INTO jobs/u);
  assert.match(translated.sql, /VALUES \(\$1, to_char\(/u);
  assert.match(translated.sql, /ON CONFLICT DO NOTHING;/u);
});

test("maps PRAGMA table_info to PostgreSQL catalog lookup", () => {
  const translated = translateSqliteSql("PRAGMA table_info(score_documents)");
  assert.match(translated.sql, /information_schema\.columns/u);
  assert.match(translated.sql, /score_documents/u);
});

test("preserves camelCase aliases in PostgreSQL result rows", () => {
  const translated = translateSqliteSql(`
    SELECT user_id AS userId, created_at AS createdAt,
      CAST(score AS INTEGER) AS score
    FROM users WHERE id = ? AND note = 'AS untouchedAlias'
  `);
  assert.match(translated.sql, /user_id AS "userId"/u);
  assert.match(translated.sql, /created_at AS "createdAt"/u);
  assert.match(translated.sql, /CAST\(score AS INTEGER\) AS score/u);
  assert.match(translated.sql, /note = 'AS untouchedAlias'/u);
});

test("validates required tables only for PostgreSQL runtimes", () => {
  let sqlitePrepared = false;
  assertPostgresRuntimeTables({
    primary: "sqlite",
    prepare: () => { sqlitePrepared = true; },
    exec: () => undefined,
  }, ["users"]);
  assert.equal(sqlitePrepared, false);

  const postgres = {
    primary: "postgres" as const,
    prepare: () => ({ all: () => [{ tableName: "users" }] }),
    exec: () => undefined,
  };
  assertPostgresRuntimeTables(postgres, ["users"]);
  assert.throws(() => assertPostgresRuntimeTables(postgres, ["users", "score_jobs"]), /score_jobs/u);
  assert.throws(() => assertPostgresRuntimeTables(postgres, ["users;drop"]), /Invalid PostgreSQL runtime table name/u);
});
