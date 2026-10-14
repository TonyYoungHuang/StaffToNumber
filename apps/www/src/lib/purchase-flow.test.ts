import assert from "node:assert/strict";
import test from "node:test";
import { clearPendingPurchase, DEFAULT_PURCHASE_PLAN_CODE, defaultPurchaseSelection, readPendingPurchase, readPurchaseReturn, readPurchaseSelection, savePendingPurchase, savePurchaseReturn } from "./purchase-flow";
import { readFileSync } from "node:fs";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { getPurchaseFlowCopy } from "./purchase-copy";
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

test("default purchase selection is a one-time One Score Pass through Stripe", () => {
  assert.equal(DEFAULT_PURCHASE_PLAN_CODE, "single-score");
  assert.deepEqual(defaultPurchaseSelection(), { planCode: "single-score", billingKind: "one_time", provider: "stripe" });
  assert.deepEqual(defaultPurchaseSelection("?provider=paddle"), { planCode: "single-score", billingKind: "one_time", provider: "stripe" });
});

test("pricing starts with the pass while subscription choices are collapsed", () => {
  const offers = readFileSync(new URL("../components/PricingOffersClient.tsx", import.meta.url), "utf8");
  const pass = readFileSync(new URL("../components/SingleScoreOffer.tsx", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../components/PurchaseFlowProvider.tsx", import.meta.url), "utf8");
  assert.match(offers, /data-primary-plan="single-score"/u);
  assert.match(offers, /useState\(false\)/u);
  assert.match(offers, /<details className=\{styles\.morePlans\}/u);
  assert.match(pass, /provider: "stripe"/u);
  assert.match(pass, /const action = `\$\{copy\.name\} · US\$2\.99`/u);
  assert.doesNotMatch(auth, /activate|activationCode/u);
  assert.match(auth, /onError=\{message => \{ setAuthError\(message\); setEmailOpen\(true\); \}\}/u);
  assert.match(auth, /next: "\/forgot-password"/u);
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(getPurchaseFlowCopy(locale).forgotPassword);
    assert.doesNotMatch(getPurchaseFlowCopy(locale).authBody, /click it again|再点一次|再點一次/u);
  }
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
  savePurchaseReturn("pass-order", `?next=${encodeURIComponent("/scores/original#export-center")}`);
  assert.equal(readPurchaseReturn("pass-order"), "/scores/original#export-center");
  for (const next of ["https://external.invalid", "//external.invalid", "/activate", "/checkout/success", "/scores/../activate"]) {
    savePurchaseReturn("unsafe-order", `?next=${encodeURIComponent(next)}`);
    assert.equal(readPurchaseReturn("unsafe-order"), "/scores");
  }
});
