import assert from "node:assert/strict";
import test from "node:test";
import { clearPendingPurchase, DEFAULT_PURCHASE_PLAN_CODE, defaultPurchaseSelection, readPendingPurchase, readPurchaseSelection, savePendingPurchase } from "./purchase-flow";
import { getCheckoutUrl } from "./site";

test("public checkout links point directly at the localized pricing selection", () => {
  assert.equal(getCheckoutUrl("en"), "/pricing");
  assert.equal(getCheckoutUrl("fr", "starter-annual", "one_time"), "/fr/pricing?plan=starter-annual&billing=one_time");
  assert.equal(getCheckoutUrl("zh-CN", "converter-pro-monthly"), "/zh-cn/pricing?plan=converter-pro-monthly");
});

test("selection restoration defaults to Stripe and never offers Paddle for one-time access", () => {
  assert.equal(readPurchaseSelection("?plan=invalid"), null);
  assert.equal(readPurchaseSelection("?plan=free"), null);
  assert.deepEqual(readPurchaseSelection("?plan=starter-annual"), { planCode: "starter-annual", billingKind: "subscription", provider: "stripe" });
  assert.equal(readPurchaseSelection("?plan=starter-annual&provider=paddle")?.provider, "paddle");
  assert.deepEqual(readPurchaseSelection("?plan=starter-annual&billing=one_time&provider=paddle"), { planCode: "starter-annual", billingKind: "one_time", provider: "stripe" });
});

test("default purchase selection prefers starter-monthly over featured annual", () => {
  assert.equal(DEFAULT_PURCHASE_PLAN_CODE, "starter-monthly");
  assert.deepEqual(defaultPurchaseSelection(), { planCode: "starter-monthly", billingKind: "subscription", provider: "stripe" });
  assert.deepEqual(defaultPurchaseSelection("?billing=one_time"), { planCode: "starter-monthly", billingKind: "one_time", provider: "stripe" });
});

test("pending purchase round-trips in sessionStorage and expires after thirty minutes", () => {
  const memory = new Map<string, string>();
  const storage: Storage = {
    get length() { return memory.size; },
    clear() { memory.clear(); },
    key(index) { return [...memory.keys()][index] ?? null; },
    getItem(key) { return memory.get(key) ?? null; },
    setItem(key, value) { memory.set(key, String(value)); },
    removeItem(key) { memory.delete(key); },
  };
  (globalThis as { window?: { sessionStorage: Storage } }).window = { sessionStorage: storage };
  const plan = { planCode: "starter-monthly" as const, billingKind: "subscription" as const, provider: "stripe" as const, name: "Starter", cycle: "Monthly", price: "$9" };
  savePendingPurchase(plan);
  assert.deepEqual(readPendingPurchase(), plan);
  clearPendingPurchase();
  assert.equal(readPendingPurchase(), null);
  memory.set("scoretransposer_pending_purchase", JSON.stringify({ ...plan, savedAt: Date.now() - 31 * 60 * 1000 }));
  assert.equal(readPendingPurchase(), null);
});
