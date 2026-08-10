import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { flushPostgresMirrorOutbox, installPostgresMirrorOutbox } from "./postgres-mirror.js";

test("PostgreSQL mirror captures inserts, updates, deletes, and flushes idempotent statements", async () => {
  const source = new DatabaseSync(":memory:");
  source.exec("CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, payload BLOB); INSERT INTO notes VALUES ('before', 'snapshot', X'01');");
  const installed = installPostgresMirrorOutbox({ db: source, tables: ["notes"] });
  assert.deepEqual(installed, { installed: ["notes"], skipped: [] });
  source.prepare("INSERT INTO notes VALUES (?, ?, ?)").run("n1", "first", Buffer.from([2, 3]));
  source.prepare("UPDATE notes SET title = ? WHERE id = ?").run("updated", "n1");
  source.prepare("DELETE FROM notes WHERE id = ?").run("n1");
  assert.equal((source.prepare("SELECT COUNT(*) AS count FROM postgres_mirror_outbox").get() as { count: number }).count, 3);

  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  const target = { async query(sql: string, values?: unknown[]) { queries.push({ sql, values }); return { rows: [] }; } };
  const result = await flushPostgresMirrorOutbox({ source, target: target as never, targetSchema: "score_live" });
  assert.deepEqual(result, { selected: 3, mirrored: 3, failed: 0 });
  assert.equal(queries.filter((query) => query.sql.startsWith("INSERT INTO")).length, 2);
  assert.equal(queries.filter((query) => query.sql.startsWith("DELETE FROM")).length, 1);
  assert.ok(queries.some((query) => query.values?.some((value) => Buffer.isBuffer(value))));
  assert.equal((source.prepare("SELECT COUNT(*) AS count FROM postgres_mirror_outbox WHERE status = 'completed'").get() as { count: number }).count, 3);
  source.close();
});
