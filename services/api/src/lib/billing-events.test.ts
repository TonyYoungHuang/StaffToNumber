import assert from "node:assert/strict";
import test from "node:test";
import { normalizePaddleBillingEvent, normalizeStripeBillingEvent } from "./billing-events.js";

test("Stripe invoice lifecycle never downgrades an active subscription for informational invoice events", () => {
  const created = normalizeStripeBillingEvent({
    id: "evt-created",
    type: "invoice.created",
    data: { object: { id: "in-1", status: "draft", customer: "cus-1", subscription: "sub-1", amount_due: 1200, currency: "usd" } },
  }, Buffer.from("invoice-created"));
  assert.equal(created?.invoice?.status, "draft");
  assert.equal(created?.subscription, undefined);

  const failed = normalizeStripeBillingEvent({
    id: "evt-failed",
    type: "invoice.payment_failed",
    data: { object: { id: "in-1", status: "open", customer: "cus-1", subscription: "sub-1", amount_due: 1200, currency: "usd" } },
  }, Buffer.from("invoice-failed"));
  assert.equal(failed?.invoice?.status, "failed");
  assert.equal(failed?.subscription?.status, "past_due");
});

test("Stripe Checkout assigns a subscription to the registered customer identity", () => {
  const normalized = normalizeStripeBillingEvent({
    id: "evt-checkout",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        customer: "cus-1",
        subscription: "sub-1",
        customer_details: { email: "MEMBER@EXAMPLE.TEST" },
        metadata: { userId: "user-1", priceId: "price-pro", seatQuantity: "3" },
      },
    },
  }, Buffer.from("checkout"));
  assert.equal(normalized?.customer?.email, "MEMBER@EXAMPLE.TEST");
  assert.equal(normalized?.subscription?.userId, "user-1");
  assert.equal(normalized?.subscription?.planRef, "price-pro");
  assert.equal(normalized?.subscription?.seatQuantity, 3);
  assert.equal(normalized?.subscription?.status, "active");
});

test("Paddle full and partial adjustments preserve the intended subscription downgrade policy", () => {
  const partial = normalizePaddleBillingEvent({
    event_id: "evt-partial",
    event_type: "adjustment.updated",
    data: { status: "approved", action: "refund", type: "partial", transaction_id: "txn-1", totals: { grand_total: "500" } },
  }, Buffer.from("partial"));
  assert.equal(partial?.refund?.amountRefundedMinor, 500);
  assert.equal(partial?.refund?.fullyRefunded, false);

  const full = normalizePaddleBillingEvent({
    event_id: "evt-full",
    event_type: "adjustment.updated",
    data: { status: "approved", action: "refund", type: "full", transaction_id: "txn-1", totals: { grand_total: "1200" } },
  }, Buffer.from("full"));
  assert.equal(full?.refund?.fullyRefunded, true);
});
