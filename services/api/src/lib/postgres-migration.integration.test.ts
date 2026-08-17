import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Pool } from "pg";
import { migrateSqliteToPostgres, rollbackPostgresMigration, verifySqlitePostgresParity } from "./postgres-migration.js";

const connectionString = process.env.POSTGRES_TEST_URL?.trim();

test("real PostgreSQL migration preserves rows, bytes, partial uniqueness, and foreign keys", { skip: !connectionString }, async () => {
  const source = new DatabaseSync(":memory:");
  source.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE parents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      payload BLOB,
      created_at TEXT NOT NULL
    );
    CREATE TABLE children (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      archived_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX idx_children_active_name ON children(parent_id, name) WHERE archived_at IS NULL;
  `);
  source.prepare("INSERT INTO parents VALUES (?, ?, ?, ?)").run("parent-1", "Teacher's score", Buffer.from([0, 1, 2, 255]), "2026-07-16T00:00:00.000Z");
  source.prepare("INSERT INTO children VALUES (?, ?, ?, ?, ?)").run("child-1", "parent-1", "Current", null, 1);
  source.prepare("INSERT INTO children VALUES (?, ?, ?, ?, ?)").run("child-2", "parent-1", "Current", "2026-07-16T01:00:00.000Z", 2);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  const schema = `score_migration_${randomUUID().replace(/-/gu, "").slice(0, 16)}`;
  try {
    const report = await migrateSqliteToPostgres({ source, target: client, targetSchema: schema });
    assert.equal(report.verified, true);
    assert.equal(report.totalRows, 3);
    assert.equal(report.tables.length, 2);
    assert.equal(report.runtimeTriggers, 0);
    const parity = await verifySqlitePostgresParity({ source, target: client, targetSchema: schema });
    assert.equal(parity.verified, true);
    assert.equal(parity.sourceRows, 3);
    assert.equal(parity.targetRows, 3);
    await client.query(`UPDATE "${schema}".parents SET name = 'Drifted' WHERE id = 'parent-1'`);
    const drift = await verifySqlitePostgresParity({ source, target: client, targetSchema: schema });
    assert.equal(drift.verified, false);
    assert.equal(drift.tables.find((table) => table.table === "parents")?.matched, false);
    await client.query(`UPDATE "${schema}".parents SET name = 'Teacher''s score' WHERE id = 'parent-1'`);
    const parent = await client.query(`SELECT name, payload FROM "${schema}".parents WHERE id = 'parent-1'`);
    assert.equal(parent.rows[0].name, "Teacher's score");
    assert.deepEqual(parent.rows[0].payload, Buffer.from([0, 1, 2, 255]));
    await assert.rejects(
      client.query(`INSERT INTO "${schema}".children (id, parent_id, name, archived_at, sort_order) VALUES ('child-3', 'parent-1', 'Current', NULL, 3)`),
      /duplicate key/u,
    );
    await assert.rejects(
      client.query(`INSERT INTO "${schema}".children (id, parent_id, name, archived_at, sort_order) VALUES ('child-4', 'missing', 'Other', NULL, 4)`),
      /foreign key/u,
    );
    await assert.rejects(
      rollbackPostgresMigration({ target: client, targetSchema: schema, confirmation: "wrong_schema" }),
      /requires confirmation equal/u,
    );
    const preserved = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${schema}".parents`,
    );
    assert.equal(preserved.rows[0]?.count, "1");
    const rollback = await rollbackPostgresMigration({ target: client, targetSchema: schema, confirmation: schema });
    assert.equal(rollback.rolledBack, true);
    assert.equal(rollback.removedTables, 2);
    assert.equal(rollback.removedRows, 3);
    const remaining = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM information_schema.schemata WHERE schema_name = $1",
      [schema],
    );
    assert.equal(remaining.rows[0]?.count, "0");
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release();
    await pool.end();
    source.close();
  }
});

test("real PostgreSQL migration installs functional job dispatch triggers", { skip: !connectionString }, async () => {
  const source = new DatabaseSync(":memory:");
  source.exec(`
    CREATE TABLE job_dispatch_outbox (
      id TEXT PRIMARY KEY,
      queue_name TEXT NOT NULL,
      job_family TEXT NOT NULL,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      locked_at TEXT,
      dispatched_at TEXT,
      acknowledged_at TEXT,
      broker_job_id TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE score_jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL, updated_at TEXT NOT NULL);
  `);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  const schema = `score_triggers_${randomUUID().replace(/-/gu, "").slice(0, 16)}`;
  try {
    const report = await migrateSqliteToPostgres({ source, target: client, targetSchema: schema });
    assert.equal(report.runtimeTriggers, 6);

    await client.query(`INSERT INTO "${schema}".jobs (id, status, updated_at) VALUES ('legacy-1', 'queued', '2026-08-16T00:00:00.000Z')`);
    await client.query(`INSERT INTO "${schema}".score_jobs (id, status, updated_at) VALUES ('score-1', 'queued', '2026-08-16T00:00:00.000Z')`);
    const queued = await client.query<{ job_family: string; job_id: string; status: string }>(`
      SELECT job_family, job_id, status FROM "${schema}".job_dispatch_outbox ORDER BY job_family
    `);
    assert.deepEqual(queued.rows, [
      { job_family: "legacy", job_id: "legacy-1", status: "queued" },
      { job_family: "score", job_id: "score-1", status: "queued" },
    ]);

    await client.query(`UPDATE "${schema}".jobs SET status = 'processing', updated_at = '2026-08-16T00:01:00.000Z' WHERE id = 'legacy-1'`);
    await client.query(`UPDATE "${schema}".score_jobs SET status = 'processing', updated_at = '2026-08-16T00:01:00.000Z' WHERE id = 'score-1'`);
    const acknowledged = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM "${schema}".job_dispatch_outbox WHERE status = 'acknowledged'
    `);
    assert.equal(acknowledged.rows[0]?.count, "2");

    await client.query(`UPDATE "${schema}".jobs SET status = 'failed' WHERE id = 'legacy-1'`);
    await client.query(`UPDATE "${schema}".jobs SET status = 'queued', updated_at = '2026-08-16T00:02:00.000Z' WHERE id = 'legacy-1'`);
    const retried = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM "${schema}".job_dispatch_outbox WHERE job_family = 'legacy' AND job_id = 'legacy-1'
    `);
    assert.equal(retried.rows[0]?.count, "2");
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release();
    await pool.end();
    source.close();
  }
});
