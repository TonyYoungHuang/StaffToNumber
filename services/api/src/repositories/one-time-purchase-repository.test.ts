import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { db, initDb } from "../db.js";
import { addPurchaseMonths, applyOneTimeRefund, findActiveOneTimePurchase, findOneTimePurchase, fulfillOneTimePurchase, hasRenewingSubscription, prepareOneTimePurchase } from "./one-time-purchase-repository.js";
import { resolveStorageQuotaTier } from "@score/runtime-database";
import { createPaymentOrder, completePaymentOrder, mapPaymentOrderForPublic } from "./payment-repository.js";
import { buildStripeCheckoutSessionParams } from "../lib/payments.js";
import { processBillingWebhookEvent } from "./billing-repository.js";
import type { CheckoutPlanCode } from "@score/shared";

const policy = { free: 50, starter: 250, converterPro: 500, starterPlanRefs: ["price-starter"], converterProPlanRefs: ["price-pro"] };
function user() {
  initDb();
  const id = randomUUID(), now = new Date().toISOString();
  db.prepare("INSERT INTO users(id,email,password_hash,password_salt,created_at,updated_at,account_status) VALUES (?,?,'hash','salt',?,?,'active')").run(id, `${id}@example.invalid`, now, now);
  return id;
}
function order(userId: string, planCode: CheckoutPlanCode = "starter-monthly") {
  const row = createPaymentOrder({ userId, provider: "stripe", locale: "en", entitlementDays: 30, billingKind: "one_time" });
  assert.ok(row);
  prepareOneTimePurchase(db, { orderId: row.id, userId, planCode, priceId: `price-${planCode}` });
  const session = { id: `cs_${randomUUID()}`, mode: "payment", status: "complete", payment_status: "paid", amount_total: 799, currency: "usd", payment_intent: `pi_${randomUUID()}`, metadata: { orderId: row.id, userId, planCode, priceId: `price-${planCode}`, billingKind: "one_time" } };
  return { row, session };
}

test("calendar purchase periods clamp month ends and leap years", () => {
  assert.equal(addPurchaseMonths("2028-01-31T15:30:00.000Z", 1), "2028-02-29T15:30:00.000Z");
  assert.equal(addPurchaseMonths("2028-02-29T15:30:00.000Z", 12), "2029-02-28T15:30:00.000Z");
  assert.equal(addPurchaseMonths("2026-12-28T15:30:00.000Z", 1), "2027-01-28T15:30:00.000Z");
});
test("unpaid sessions grant nothing; paid fulfillment is idempotent and issues no activation code", () => {
  const id = user(), { row, session } = order(id);
  assert.equal(fulfillOneTimePurchase(db, { ...session, payment_status: "unpaid" }), null);
  assert.equal(findActiveOneTimePurchase(db, id), undefined);
  assert.throws(() => completePaymentOrder({ orderId: row.id, createdBy: "test" }), /must be fulfilled/);
  const now = new Date().toISOString();
  const first = fulfillOneTimePurchase(db, session, now)!;
  assert.equal(first.ends_at, addPurchaseMonths(now, 1));
  const retry = fulfillOneTimePurchase(db, session, addPurchaseMonths(now, 2))!;
  assert.equal(retry.ends_at, first.ends_at);
  const paid = completePaymentOrder({ orderId: row.id, amountMinor: 799, currency: "usd", createdBy: "test" })!;
  assert.equal(paid.activation_code_id, null);
  assert.equal(mapPaymentOrderForPublic(paid).accessEndsAt, first.ends_at);
  assert.equal(resolveStorageQuotaTier(db, id, policy), "starter");
});
test("all four plans grant the correct tier and duration; expiry returns to free", () => {
  for (const plan of ["starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"] as const) {
    const id = user(), { session } = order(id, plan), now = new Date().toISOString();
    const paid = fulfillOneTimePurchase(db, session, now)!;
    assert.equal(paid.ends_at, addPurchaseMonths(now, plan.endsWith("annual") ? 12 : 1));
    assert.equal(resolveStorageQuotaTier(db, id, policy), plan.startsWith("converter-pro") ? "converter-pro" : "starter");
    db.prepare("UPDATE billing_one_time_purchases SET ends_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(paid.id);
    assert.equal(resolveStorageQuotaTier(db, id, policy), "free");
    assert.equal(findActiveOneTimePurchase(db, id), undefined);
  }
});
test("same tier extends; mixed tiers keep the highest active allowance", () => {
  const id = user(), now = new Date().toISOString();
  const first = fulfillOneTimePurchase(db, order(id).session, now)!;
  const annual = fulfillOneTimePurchase(db, order(id, "starter-annual").session, now)!;
  assert.equal(annual.starts_at, first.ends_at);
  assert.equal(annual.ends_at, addPurchaseMonths(first.ends_at!, 12));
  fulfillOneTimePurchase(db, order(id, "converter-pro-monthly").session, now);
  assert.equal(resolveStorageQuotaTier(db, id, policy), "converter-pro");
});
test("an existing paid subscription period is preserved before one-time access starts", () => {
  const id = user(), now = new Date().toISOString(), end = addPurchaseMonths(now, 1);
  const sub = `sub_${randomUUID()}`;
  processBillingWebhookEvent(db, { provider: "stripe", eventId: randomUUID(), eventType: "customer.subscription.created", rawPayload: randomUUID(), subscription: { providerSubscriptionId: sub, userId: id, status: "active", planRef: "price-starter", currentPeriodStart: now, currentPeriodEnd: end } });
  assert.equal(hasRenewingSubscription(db, id), true);
  db.prepare("UPDATE billing_subscriptions SET cancel_at_period_end = 1 WHERE provider_subscription_id = ?").run(sub);
  assert.equal(hasRenewingSubscription(db, id), false);
  const purchase = fulfillOneTimePurchase(db, order(id).session, now)!;
  assert.equal(purchase.starts_at, end);
  assert.equal(purchase.ends_at, addPurchaseMonths(end, 1));
});
test("partial refunds preserve access, full and out-of-order refunds cannot reactivate it", () => {
  const id = user(), { session } = order(id);
  fulfillOneTimePurchase(db, session);
  const charge = { payment_intent: session.payment_intent, amount: 799, amount_refunded: 100, metadata: session.metadata };
  applyOneTimeRefund(db, charge);
  assert.equal(resolveStorageQuotaTier(db, id, policy), "starter");
  applyOneTimeRefund(db, { ...charge, amount_refunded: 799 });
  applyOneTimeRefund(db, charge);
  fulfillOneTimePurchase(db, session);
  assert.equal(findOneTimePurchase(db, session.metadata.orderId)?.amount_refunded_minor, 799);
  assert.equal(resolveStorageQuotaTier(db, id, policy), "free");
  const early = order(id);
  applyOneTimeRefund(db, { ...charge, amount_refunded: 799, metadata: early.session.metadata, payment_intent: early.session.payment_intent });
  assert.equal(fulfillOneTimePurchase(db, early.session)?.status, "refunded");
  assert.equal(resolveStorageQuotaTier(db, id, policy), "free");
});
test("forged identity, currency, price, amount and reused sessions fail closed", () => {
  const { session } = order(user());
  for (const metadata of [{ ...session.metadata, userId: "other" }, { ...session.metadata, priceId: "cheap" }, { ...session.metadata, planCode: "converter-pro-annual" }]) {
    assert.throws(() => fulfillOneTimePurchase(db, { ...session, metadata }), /does not match/);
  }
  assert.throws(() => fulfillOneTimePurchase(db, { ...session, currency: "hkd" }), /does not match/);
  assert.throws(() => fulfillOneTimePurchase(db, { ...session, amount_total: -1 }), /does not match/);
  fulfillOneTimePurchase(db, session);
  assert.throws(() => fulfillOneTimePurchase(db, { ...session, id: "cs_other" }), /does not match/);
});
test("one-time checkout uses payment mode and payment-intent metadata; subscription stays recurring", () => {
  const base = { orderId: "order", publicToken: "secret-token", priceId: "price_single", userId: "user", planCode: "starter-monthly" as const };
  const single = buildStripeCheckoutSessionParams({ ...base, billingKind: "one_time" });
  assert.equal(single.mode, "payment");
  assert.equal(single.subscription_data, undefined);
  assert.equal(single.payment_intent_data?.metadata?.billingKind, "one_time");
  const recurring = buildStripeCheckoutSessionParams({ ...base, billingKind: "subscription" });
  assert.equal(recurring.mode, "subscription");
  assert.equal(recurring.payment_intent_data, undefined);
  assert.equal(recurring.subscription_data?.metadata?.planCode, "starter-monthly");
});
