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
        payment_status: "paid",
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

test("Stripe Checkout waits for settlement before granting subscription access", () => {
  const object = {
    id: "cs_delayed", customer: "cus-delayed", subscription: "sub-delayed",
    metadata: { userId: "user-delayed", priceId: "price-delayed" },
  };
  for (const payment_status of ["unpaid", "no_payment_required", undefined]) {
    assert.equal(normalizeStripeBillingEvent({
      id: "evt-pending", type: "checkout.session.completed",
      data: { object: { ...object, payment_status } },
    }, Buffer.from("pending")), null);
  }
  const paid = normalizeStripeBillingEvent({
    id: "evt-settled", type: "checkout.session.async_payment_succeeded",
    data: { object: { ...object, payment_status: "paid" } },
  }, Buffer.from("settled"));
  assert.equal(paid?.subscription?.userId, "user-delayed");
  assert.equal(paid?.subscription?.status, "active");
});

test("Stripe subscription cancellation retains modern item-level and legacy billing periods", () => {
  const period = { current_period_start: 1788220800, current_period_end: 1790812800 };
  for (const modern of [true, false]) {
    const normalized = normalizeStripeBillingEvent({
      id: `evt-period-${modern}`, type: "customer.subscription.updated",
      data: { object: {
        id: "sub-period", customer: "cus-period", status: "active", cancel_at_period_end: true,
        canceled_at: null, ended_at: null,
        ...(modern ? {} : period),
        items: { data: [{ price: "price-period", quantity: 1, ...(modern ? period : {}) }] },
      } },
    }, Buffer.from(`period-${modern}`));
    assert.equal(normalized?.subscription?.currentPeriodStart, "2026-09-01T00:00:00.000Z");
    assert.equal(normalized?.subscription?.currentPeriodEnd, "2026-10-01T00:00:00.000Z");
    assert.equal(normalized?.subscription?.cancelAtPeriodEnd, true);
    assert.equal(normalized?.subscription?.canceledAt, null);
    assert.equal(normalized?.subscription?.endedAt, null);
  }
});

const invoiceServicePeriod = { start: 1791123950, end: 1793802350 };

function paidSubscriptionInvoice(lines: unknown[], extra: Record<string, unknown> = {}) {
  return normalizeStripeBillingEvent({
    id: "evt-invoice-service-period", type: "invoice.paid",
    data: { object: {
      id: "in-service-period", status: "paid", customer: "cus-period",
      parent: { subscription_details: { subscription: "sub-period" } },
      // Invoice accumulation bounds can both equal its creation timestamp.
      period_start: invoiceServicePeriod.start, period_end: invoiceServicePeriod.start,
      lines: { data: lines, has_more: false },
      ...extra,
    } },
  }, Buffer.from("invoice-service-period"));
}

test("Stripe paid invoices retain the modern subscription line's full service period", () => {
  const normalized = paidSubscriptionInvoice([{
    parent: {
      type: "subscription_item_details",
      subscription_item_details: { subscription: "sub-period", proration: false },
    },
    period: invoiceServicePeriod,
  }]);
  assert.equal(normalized?.subscription?.status, "active");
  assert.equal(normalized?.subscription?.currentPeriodStart, "2026-10-04T14:25:50.000Z");
  assert.equal(normalized?.subscription?.currentPeriodEnd, "2026-11-04T14:25:50.000Z");
});

test("Stripe paid invoices retain legacy subscription line service periods", () => {
  const normalized = paidSubscriptionInvoice([{
    type: "subscription", subscription: { id: "sub-period" }, proration: false,
    period: invoiceServicePeriod,
  }], { subscription: "sub-period" });
  assert.equal(normalized?.subscription?.currentPeriodStart, "2026-10-04T14:25:50.000Z");
  assert.equal(normalized?.subscription?.currentPeriodEnd, "2026-11-04T14:25:50.000Z");
});

test("Stripe invoice periods ignore one-time items, other subscriptions and prorations", () => {
  const normalized = paidSubscriptionInvoice([
    { type: "invoiceitem", subscription: "sub-period", period: { start: 1, end: 9999999999 } },
    { type: "subscription", subscription: "sub-other", proration: false, period: { start: 2, end: 9999999998 } },
    { type: "subscription", subscription: "sub-period", proration: true, period: { start: 3, end: 9999999997 } },
    { parent: { type: "subscription_item_details", subscription_item_details: { subscription: "sub-period", proration: true } }, period: { start: 4, end: 9999999996 } },
    { type: "subscription", subscription: "sub-period", proration: false, period: invoiceServicePeriod },
  ]);
  assert.equal(normalized?.subscription?.currentPeriodStart, "2026-10-04T14:25:50.000Z");
  assert.equal(normalized?.subscription?.currentPeriodEnd, "2026-11-04T14:25:50.000Z");
});

test("Stripe invoices without reliable subscription lines preserve existing subscription dates", () => {
  const invalidPeriods = [
    undefined, {}, { start: null, end: invoiceServicePeriod.end },
    { start: invoiceServicePeriod.start, end: invoiceServicePeriod.start },
    { start: invoiceServicePeriod.end, end: invoiceServicePeriod.start },
  ];
  const lineSets = [
    [],
    [{ type: "invoiceitem", period: invoiceServicePeriod }],
    [{ type: "subscription", subscription: "sub-period", proration: true, period: invoiceServicePeriod }],
    ...invalidPeriods.map((period) => [{ type: "subscription", subscription: "sub-period", proration: false, period }]),
  ];
  for (const lines of lineSets) {
    const normalized = paidSubscriptionInvoice(lines);
    assert.equal(normalized?.subscription?.status, "active");
    assert.equal(normalized?.subscription?.currentPeriodStart ?? null, null);
    assert.equal(normalized?.subscription?.currentPeriodEnd ?? null, null);
  }
});

test("Stripe invoice lines with different service periods leave lifecycle dates unchanged", () => {
  const line = { type: "subscription", subscription: "sub-period", proration: false, period: invoiceServicePeriod };
  const normalized = paidSubscriptionInvoice([
    line,
    { ...line, period: { start: invoiceServicePeriod.start, end: invoiceServicePeriod.end + 86400 } },
  ]);
  assert.equal(normalized?.subscription?.currentPeriodStart ?? null, null);
  assert.equal(normalized?.subscription?.currentPeriodEnd ?? null, null);

  const paginated = paidSubscriptionInvoice([line], { lines: { data: [line], has_more: true } });
  assert.equal(paginated?.subscription?.currentPeriodStart ?? null, null);
  assert.equal(paginated?.subscription?.currentPeriodEnd ?? null, null);
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

test("Paddle completed transactions activate the subscription for the registered user", () => {
  const normalized = normalizePaddleBillingEvent({
    event_id: "evt-transaction-completed",
    event_type: "transaction.completed",
    occurred_at: "2026-08-18T10:00:00Z",
    data: {
      id: "txn-1",
      status: "completed",
      customer_id: "ctm-1",
      subscription_id: "sub-1",
      custom_data: { userId: "user-1", orderId: "order-1" },
      details: { totals: { grand_total: "999", currency_code: "USD" } },
    },
  }, Buffer.from("transaction-completed"));

  assert.equal(normalized?.subscription?.providerSubscriptionId, "sub-1");
  assert.equal(normalized?.subscription?.userId, "user-1");
  assert.equal(normalized?.subscription?.status, "active");
  assert.equal(normalized?.invoice?.amountPaidMinor, 999);
  assert.equal(normalized?.invoice?.currency, "USD");
});
