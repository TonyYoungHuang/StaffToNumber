import assert from "node:assert/strict";
import test from "node:test";
import { db, initDb } from "../db.js";
import { processBillingWebhookEvent } from "../repositories/billing-repository.js";
import {
  PlanQuotaExceededError,
  assertProcessingQuota,
  assertStorageQuota,
  getPlanQuotaUsage,
} from "./plan-quotas.js";

function insertUser(id: string, email: string) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at, account_status)
    VALUES (?, ?, 'hash', 'salt', ?, ?, 'active')
  `).run(id, email, now, now);
}

test("legacy processing and storage quotas reject excess usage", () => {
  initDb();
  const suffix = crypto.randomUUID();
  const userId = `quota-legacy-${suffix}`;
  insertUser(userId, `${suffix}@quota.test`);
  const now = new Date().toISOString();
  for (let index = 0; index < 25; index += 1) {
    db.prepare(`
      INSERT INTO score_jobs (id, user_id, document_id, input_file_id, job_type, status, created_at, updated_at)
      VALUES (?, ?, NULL, NULL, 'render_export', 'completed', ?, ?)
    `).run(`quota-job-${suffix}-${index}`, userId, now, now);
  }

  const usage = getPlanQuotaUsage(userId);
  assert.equal(usage.tier, "legacy");
  assert.equal(usage.jobs.used, 25);
  assert.equal(usage.jobs.remaining, 0);
  assert.throws(
    () => assertProcessingQuota(userId),
    (error: unknown) => error instanceof PlanQuotaExceededError && error.code === "PLAN_JOB_QUOTA_EXCEEDED" && error.statusCode === 429,
  );
  assert.throws(
    () => assertStorageQuota(userId, usage.storage.limitBytes + 1),
    (error: unknown) => error instanceof PlanQuotaExceededError && error.code === "PLAN_STORAGE_QUOTA_EXCEEDED",
  );
});

test("an active personal subscription receives the pro quota", () => {
  initDb();
  const suffix = crypto.randomUUID();
  const userId = `quota-pro-${suffix}`;
  insertUser(userId, `${suffix}@quota.test`);
  processBillingWebhookEvent(db, {
    provider: "stripe",
    eventId: `evt-quota-${suffix}`,
    eventType: "customer.subscription.created",
    rawPayload: `quota-${suffix}`,
    customer: { providerCustomerId: `cus-${suffix}`, userId },
    subscription: {
      providerSubscriptionId: `sub-${suffix}`,
      providerCustomerId: `cus-${suffix}`,
      userId,
      status: "active",
      planRef: "price-pro-test",
      seatQuantity: 1,
      currentPeriodEnd: new Date(Date.now() + 31 * 86_400_000).toISOString(),
    },
  });

  const usage = getPlanQuotaUsage(userId);
  assert.equal(usage.tier, "pro");
  assert.equal(usage.jobs.limit, 100);
  assert.equal(usage.storage.limitBytes, 10 * 1024 * 1024 * 1024);
  assert.doesNotThrow(() => assertProcessingQuota(userId));
});
