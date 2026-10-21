import assert from "node:assert/strict";
import test from "node:test";
import { purchaseAnalyticsStorage, confirmedPurchaseEvent, queueConfirmedPurchase, flushConfirmedPurchases } from "../dist/confirmed-purchase.js";

const order = { id: "order", provider: "stripe", status: "paid", billingKind: "one_time", planCode: "converter-pro-lifetime",
  amountMinor: 9900, currency: "usd", lifetime: { status: "active", transactionId: "pi_test_confirmed" } };

test("lifetime purchase is emitted only with a backend ready confirmation and active entitlement", () => {
  for (const status of ["waiting_payment", "waiting_fulfillment", "verification_failed", "fulfillment_failed", "refunded"]) assert.equal(confirmedPurchaseEvent(order, { status, retryable: true }), null);
  assert.equal(confirmedPurchaseEvent(order, undefined), null);
  assert.equal(confirmedPurchaseEvent({ ...order, status: "pending" }, { status: "ready", retryable: false }), null);
  assert.equal(confirmedPurchaseEvent({ ...order, lifetime: null }, { status: "ready", retryable: false }), null);
  assert.equal(confirmedPurchaseEvent({ ...order, lifetime: { ...order.lifetime, status: "revoked" } }, { status: "ready", retryable: false }), null);
  const event = confirmedPurchaseEvent(order, { status: "ready", retryable: false });
  assert.deepEqual({ model: event.purchase_model, kind: event.billing_kind, code: event.plan_code, value: event.value, currency: event.currency, id: event.transaction_id },
    { model: "lifetime", kind: "one_time", code: "converter-pro-lifetime", value: 99, currency: "USD", id: "pi_test_confirmed" });
  assert.equal(confirmedPurchaseEvent({ ...order, amountMinor: 6490, lifetime: { ...order.lifetime, subtotalMinor: 9900, discountMinor: 4000, taxMinor: 590 } }, { status: "ready", retryable: false }).value, 59);
  for (const amountMinor of [0, -1, 10000, 3.5, null]) assert.equal(confirmedPurchaseEvent({ ...order, amountMinor }, { status: "ready", retryable: false }), null);
});

test("reloads, duplicate polls and analytics-readiness retries deduplicate by transaction id", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
  const event = confirmedPurchaseEvent(order, { status: "ready", retryable: false });
  queueConfirmedPurchase(storage, event); queueConfirmedPurchase(storage, event);
  flushConfirmedPurchases(storage, () => false);
  let sent = 0;
  flushConfirmedPurchases(storage, () => { sent++; return true; });
  queueConfirmedPurchase(storage, event);
  flushConfirmedPurchases(storage, () => { sent++; return true; });
  assert.equal(sent, 1);
});


test("confirmed events survive app-to-www redirects and deduplicate across origins", () => {
  const cookies = new Map();
  const jar = { get cookie() { return [...cookies].map(([key,value]) => `${key}=${value}`).join("; "); },
    set cookie(value) { const pair = value.split(";")[0]; const index = pair.indexOf("="); cookies.set(pair.slice(0,index), pair.slice(index+1)); } };
  const local = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value), removeItem: key => data.delete(key) }; };
  const app = purchaseAnalyticsStorage(local(), jar, "app.scoretransposer.com", true, ".scoretransposer.com");
  const www = purchaseAnalyticsStorage(local(), jar, "www.scoretransposer.com", true, ".scoretransposer.com");
  const event = confirmedPurchaseEvent(order, { status: "ready", retryable: false });
  queueConfirmedPurchase(app, event);
  // Checkout is private: analytics is unavailable until the landing page.
  flushConfirmedPurchases(app, () => false);
  let sent = 0;
  flushConfirmedPurchases(www, () => { sent++; return true; });
  queueConfirmedPurchase(app, event);
  flushConfirmedPurchases(app, () => { sent++; return true; });
  assert.equal(sent, 1);
});
