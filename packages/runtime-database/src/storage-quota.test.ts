import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { assertAccountStorageQuota, resolveStorageQuotaTier, type StorageQuotaPolicy } from "./storage-quota.js";

const policy: StorageQuotaPolicy = { free:50, starter:250, converterPro:500, starterPlanRefs:["starter"], converterProPlanRefs:["pro"] };
test("storage quota supports schema 25 workers and honors prepaid tiers without upgrading monthly credit tiers", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`
      CREATE TABLE billing_subscriptions(id TEXT,user_id TEXT,plan_ref TEXT,organization_id TEXT,seat_quantity INTEGER,status TEXT,current_period_end TEXT);
      CREATE TABLE billing_seat_assignments(id TEXT,subscription_id TEXT,user_id TEXT,status TEXT);
      CREATE TABLE billing_one_time_purchases(user_id TEXT,plan_code TEXT,status TEXT,starts_at TEXT,ends_at TEXT);
      CREATE TABLE activation_codes(id TEXT,plan_code TEXT);
      CREATE TABLE user_entitlements(user_id TEXT,activation_code_id TEXT,starts_at TEXT,ends_at TEXT);
      CREATE TABLE files(user_id TEXT,size_bytes INTEGER);
    `);
    assert.equal(resolveStorageQuotaTier(db,"buyer",policy),"free");
    db.exec("INSERT INTO billing_subscriptions VALUES ('s','buyer','starter',NULL,1,'active',NULL)");
    assert.equal(resolveStorageQuotaTier(db,"buyer",policy),"starter");
    db.exec("CREATE TABLE prepaid_credit_grants(user_id TEXT,storage_tier TEXT)");
    db.exec("INSERT INTO prepaid_credit_grants VALUES ('buyer','converter-pro')");
    assert.equal(resolveStorageQuotaTier(db,"buyer",policy),"converter-pro");
    assert.equal(resolveStorageQuotaTier(db,"buyer",policy,false),"starter");
    db.exec("DELETE FROM billing_subscriptions");
    assert.equal(resolveStorageQuotaTier(db,"buyer",policy,false),"free");
    assert.doesNotThrow(()=>assertAccountStorageQuota(db,"buyer",500,policy));
    assert.throws(()=>assertAccountStorageQuota(db,"buyer",501,policy),/storage quota/);
  } finally { db.close(); }
});