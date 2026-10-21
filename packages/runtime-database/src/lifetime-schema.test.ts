import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { LIFETIME_SCHEMA_SQL } from "./lifetime.js";

test("additive deployment SQL matches runtime tables, is repeatable, and enforces permanent purchase identity", () => {
  const sql = readFileSync(new URL("../../../deploy/hetzner/converter-pro-lifetime.sql", import.meta.url), "utf8");
  const normalized = sql.replace(/--[^\n]*/g, "").replace(/^\s*(?:GRANT|REVOKE) [^;]+;/gm, "")
    .replace(/\b(?:BEGIN|COMMIT);/g, "").replace(/:"runtime_schema"\./g, "").trim();
  assert.equal(normalized.replace(/\r/g, ""), LIFETIME_SCHEMA_SQL.trim());
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users (id TEXT PRIMARY KEY); INSERT INTO users VALUES ('account');");
  db.exec(normalized); db.exec(normalized);
  const insert = db.prepare(`INSERT INTO lifetime_entitlements
    (id,user_id,product_code,source_order_id,checkout_session_id,payment_intent_id,status,granted_at,reason)
    VALUES (?,'account','converter-pro-lifetime',?,?,?,'active','2026-10-21','paid_checkout')`);
  insert.run("ent", "order", "session", "intent");
  for (const duplicate of [["ent2", "order", "other-session", "other-intent"], ["ent2", "other-order", "session", "other-intent"], ["ent2", "other-order", "other-session", "intent"]]) {
    assert.throws(() => insert.run(...duplicate), /UNIQUE/);
  }
  assert.throws(() => db.exec("UPDATE lifetime_entitlements SET expires_at = '2099-01-01'"), /CHECK/);
  assert.throws(() => db.exec("UPDATE lifetime_entitlements SET lifetime = 0"), /CHECK/);
  assert.throws(() => db.exec("UPDATE lifetime_entitlements SET status = 'revoked'"), /CHECK/);
  db.exec("UPDATE lifetime_entitlements SET status = 'revoked', revoked_at = '2026-10-22', reason = 'full_refund'");
  db.exec("DELETE FROM users WHERE id = 'account'");
  assert.equal(db.prepare("SELECT user_id FROM lifetime_entitlements").get()?.user_id, null);
  db.close();
});
