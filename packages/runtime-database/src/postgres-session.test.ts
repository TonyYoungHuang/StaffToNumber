import assert from "node:assert/strict";
import test from "node:test";
import { createSchemaScopedPostgresExecutor, transactionControl } from "./postgres-session.js";

test("classifies transaction control statements", () => {
  assert.equal(transactionControl("BEGIN"), "begin");
  assert.equal(transactionControl("BEGIN IMMEDIATE"), "begin");
  assert.equal(transactionControl("COMMIT;"), "commit");
  assert.equal(transactionControl("END"), "commit");
  assert.equal(transactionControl("ROLLBACK"), "rollback");
  assert.equal(transactionControl("SELECT 1"), null);
});

test("pins every standalone query to a schema-scoped transaction", async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const executor = createSchemaScopedPostgresExecutor("scoretransposer", async (sql, params = []) => {
    calls.push({ sql, params });
    return { rows: sql.startsWith("SELECT *") ? [{ id: "user-1" }] : [] };
  });

  const result = await executor.query("SELECT * FROM users WHERE id = $1", ["user-1"]);
  assert.deepEqual(result, { rows: [{ id: "user-1" }] });
  assert.deepEqual(calls, [
    { sql: "BEGIN", params: [] },
    { sql: "SELECT set_config('search_path', $1, true)", params: ['"scoretransposer", public'] },
    { sql: "SELECT * FROM users WHERE id = $1", params: ["user-1"] },
    { sql: "COMMIT", params: [] },
  ]);
});

test("keeps an explicit transaction schema-scoped until commit", async () => {
  const calls: string[] = [];
  const executor = createSchemaScopedPostgresExecutor("scoretransposer", async (sql) => {
    calls.push(sql);
    return { rows: [] };
  });

  await executor.query("BEGIN");
  await executor.query("INSERT INTO payment_orders (id) VALUES ($1)", ["order-1"]);
  await executor.query("SELECT * FROM users");
  await executor.query("COMMIT");

  assert.deepEqual(calls, [
    "BEGIN",
    "SELECT set_config('search_path', $1, true)",
    "INSERT INTO payment_orders (id) VALUES ($1)",
    "SELECT * FROM users",
    "COMMIT",
  ]);
});

test("rolls back a failed standalone query and restores the executor", async () => {
  const calls: string[] = [];
  let fail = true;
  const executor = createSchemaScopedPostgresExecutor("scoretransposer", async (sql) => {
    calls.push(sql);
    if (sql === "SELECT * FROM users" && fail) {
      fail = false;
      throw new Error("relation users does not exist");
    }
    return { rows: [] };
  });

  await assert.rejects(() => executor.query("SELECT * FROM users"), /relation users does not exist/u);
  await executor.query("SELECT * FROM payment_orders");

  assert.deepEqual(calls, [
    "BEGIN",
    "SELECT set_config('search_path', $1, true)",
    "SELECT * FROM users",
    "ROLLBACK",
    "BEGIN",
    "SELECT set_config('search_path', $1, true)",
    "SELECT * FROM payment_orders",
    "COMMIT",
  ]);
});
