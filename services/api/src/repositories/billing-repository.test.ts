import assert from "node:assert/strict";
import test from "node:test";
import { db, initDb } from "../db.js";
import {
  assignBillingSeat,
  findActiveSubscriptionEntitlement,
  markBillingSubscriptionCancellation,
  listBillingForUser,
  processBillingWebhookEvent,
  revokeBillingSeat,
} from "./billing-repository.js";

function insertUser(id: string, email: string) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at, account_status)
    VALUES (?, ?, 'hash', 'salt', ?, ?, 'active')
  `).run(id, email, now, now);
}

test("billing webhook ledger handles renewal failure, recovery, refunds, and duplicate delivery", () => {
  initDb();
  const suffix = crypto.randomUUID();
  const userId = `billing-user-${suffix}`;
  insertUser(userId, `${suffix}@example.test`);
  const periodEnd = new Date(Date.now() + 31 * 86_400_000).toISOString();
  const activePayload = JSON.stringify({ id: `evt-active-${suffix}` });
  const active = processBillingWebhookEvent(db, {
    provider: "stripe",
    eventId: `evt-active-${suffix}`,
    eventType: "customer.subscription.created",
    rawPayload: activePayload,
    customer: { providerCustomerId: `cus-${suffix}`, userId, email: `${suffix}@example.test` },
    subscription: {
      providerSubscriptionId: `sub-${suffix}`,
      providerCustomerId: `cus-${suffix}`,
      userId,
      status: "active",
      planRef: "price-pro",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: periodEnd,
    },
  });
  assert.deepEqual(active, { duplicate: false, processed: true });
  assert.equal(findActiveSubscriptionEntitlement(db, userId)?.provider, "stripe");

  const duplicate = processBillingWebhookEvent(db, {
    provider: "stripe",
    eventId: `evt-active-${suffix}`,
    eventType: "customer.subscription.created",
    rawPayload: activePayload,
  });
  assert.deepEqual(duplicate, { duplicate: true, processed: true });
  assert.throws(() => processBillingWebhookEvent(db, {
    provider: "stripe",
    eventId: `evt-active-${suffix}`,
    eventType: "customer.subscription.created",
    rawPayload: "different-payload",
  }), /reused with a different payload/u);

  processBillingWebhookEvent(db, {
    provider: "stripe",
    eventId: `evt-failed-${suffix}`,
    eventType: "invoice.payment_failed",
    rawPayload: `failed-${suffix}`,
    subscription: { providerSubscriptionId: `sub-${suffix}`, status: "past_due", paymentFailedAt: new Date().toISOString() },
    invoice: {
      providerInvoiceId: `in-${suffix}`,
      providerSubscriptionId: `sub-${suffix}`,
      status: "failed",
      amountDueMinor: 9900,
      currency: "CNY",
      failedAt: new Date().toISOString(),
    },
  });
  assert.equal(findActiveSubscriptionEntitlement(db, userId), undefined);

  processBillingWebhookEvent(db, {
    provider: "stripe",
    eventId: `evt-paid-${suffix}`,
    eventType: "invoice.paid",
    rawPayload: `paid-${suffix}`,
    subscription: { providerSubscriptionId: `sub-${suffix}`, status: "active", currentPeriodEnd: periodEnd },
    invoice: {
      providerInvoiceId: `in-${suffix}`,
      providerSubscriptionId: `sub-${suffix}`,
      status: "paid",
      amountDueMinor: 9900,
      amountPaidMinor: 9900,
      currency: "CNY",
      paidAt: new Date().toISOString(),
    },
  });
  assert.ok(findActiveSubscriptionEntitlement(db, userId));

  processBillingWebhookEvent(db, {
    provider: "stripe",
    eventId: `evt-refund-${suffix}`,
    eventType: "charge.refunded",
    rawPayload: `refund-${suffix}`,
    refund: { providerInvoiceId: `in-${suffix}`, amountRefundedMinor: 9900, fullyRefunded: true },
  });
  const billing = listBillingForUser(db, userId);
  assert.equal((billing.invoices[0] as { status: string }).status, "refunded");
  assert.equal((billing.invoices[0] as { amountRefundedMinor: number }).amountRefundedMinor, 9900);
});

test("school subscription enforces seat capacity and grants active members access", () => {
  initDb();
  const suffix = crypto.randomUUID();
  const ownerId = `school-owner-${suffix}`;
  const firstId = `school-first-${suffix}`;
  const secondId = `school-second-${suffix}`;
  const thirdId = `school-third-${suffix}`;
  insertUser(ownerId, `owner-${suffix}@example.test`);
  insertUser(firstId, `first-${suffix}@example.test`);
  insertUser(secondId, `second-${suffix}@example.test`);
  insertUser(thirdId, `third-${suffix}@example.test`);
  const organizationId = `org-${suffix}`;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO score_organizations (id, owner_user_id, name, slug, created_at, updated_at, archived_at) VALUES (?, ?, 'School', ?, ?, ?, NULL)")
    .run(organizationId, ownerId, `school-${suffix}`, now, now);

  processBillingWebhookEvent(db, {
    provider: "paddle",
    eventId: `evt-school-${suffix}`,
    eventType: "subscription.created",
    rawPayload: `school-${suffix}`,
    customer: { providerCustomerId: `ctm-${suffix}`, userId: ownerId, organizationId },
    subscription: {
      providerSubscriptionId: `sub-school-${suffix}`,
      providerCustomerId: `ctm-${suffix}`,
      userId: ownerId,
      organizationId,
      status: "active",
      seatQuantity: 2,
      currentPeriodEnd: new Date(Date.now() + 31 * 86_400_000).toISOString(),
    },
  });
  const subscription = db.prepare("SELECT id FROM billing_subscriptions WHERE provider_subscription_id = ?")
    .get(`sub-school-${suffix}`) as { id: string };
  assignBillingSeat(db, { subscriptionId: subscription.id, organizationId, email: `first-${suffix}@example.test`, userId: firstId });
  assignBillingSeat(db, { subscriptionId: subscription.id, organizationId, email: `second-${suffix}@example.test`, userId: secondId });
  assert.ok(findActiveSubscriptionEntitlement(db, firstId));
  assert.throws(() => assignBillingSeat(db, {
    subscriptionId: subscription.id,
    organizationId,
    email: `third-${suffix}@example.test`,
    userId: thirdId,
  }), /No subscription seats/u);
  assert.equal(revokeBillingSeat(db, { subscriptionId: subscription.id, organizationId, email: `first-${suffix}@example.test` }), true);
  assert.equal(findActiveSubscriptionEntitlement(db, firstId), undefined);
  assignBillingSeat(db, { subscriptionId: subscription.id, organizationId, email: `third-${suffix}@example.test`, userId: thirdId });
  assert.ok(findActiveSubscriptionEntitlement(db, thirdId));
  assert.throws(() => assignBillingSeat(db, {
    subscriptionId: subscription.id,
    organizationId,
    email: `first-${suffix}@example.test`,
    userId: firstId,
  }), /No subscription seats/u);
  assert.equal(markBillingSubscriptionCancellation(db, subscription.id, true), true);
  const scheduled = db.prepare("SELECT status, cancel_at_period_end AS cancelAtPeriodEnd FROM billing_subscriptions WHERE id = ?")
    .get(subscription.id) as { status: string; cancelAtPeriodEnd: number };
  assert.equal(scheduled.status, "active");
  assert.equal(scheduled.cancelAtPeriodEnd, 1);
  assert.equal(markBillingSubscriptionCancellation(db, subscription.id, false), true);
  assert.equal((db.prepare("SELECT status FROM billing_subscriptions WHERE id = ?").get(subscription.id) as { status: string }).status, "cancelled");
});
