import assert from "node:assert/strict";
import test from "node:test";
import { completePurchaseIntent, isPublicPricingDestination, persistentPurchaseIntent, purchaseIntentSignature, purchaseReturnContext, rememberPurchaseOrder, shouldReplacePurchaseIntent, withPurchaseOrigin } from "./checkout-return";
import { getCheckoutUrl } from "./site";
import { getPurchaseRecoveryCopy } from "./purchase-copy";
import { SUPPORTED_LOCALES } from "@score/i18n";
import wwwConfig, { publicLocalePrefixes } from "../../next.config.js";
import appConfig from "../../../app/next.config.js";
import { trackFunnelEvent } from "./analytics";
import { readPurchaseSelection } from "./purchase-flow";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); }, clear: () => values.clear() };
}

test("www origin carries full query and anchor through pricing and a new tab", () => {
  const source = { pathname: "/fr/features", search: "?instrument=piano", hash: "#exports" };
  const href = withPurchaseOrigin("/fr/pricing?plan=starter-annual&billing=subscription", source);
  const opened = new URL(href, "https://site.invalid");
  assert.equal(opened.searchParams.get("returnPath"), "/fr/features?instrument=piano#exports");
  const context = purchaseReturnContext(opened);
  assert.equal(context.returnSite, "www");
  assert.equal(context.returnPath, "/fr/features?instrument=piano#exports");
  assert.equal(context.returnState.intent, "restore_view");
  assert.equal(purchaseReturnContext(new URL(withPurchaseOrigin("/pricing", opened), opened)).returnPath, context.returnPath);
  const generated = new URL(getCheckoutUrl("fr", "starter-monthly", "subscription", context.returnPath), "https://site.invalid");
  assert.equal(generated.searchParams.get("returnPath"), context.returnPath);
});

test("ordinary pricing navigation and homepage pricing sections carry their source", () => {
  for (const [pathname, hash] of [["/pricing", ""], ["/zh-cn/pricing", "#plans"], ["/", "#pricing"], ["/de/", "#pricing"]]) assert.ok(isPublicPricingDestination(pathname, hash));
  assert.equal(isPublicPricingDestination("/features", "#pricing"), false);
  const result = new URL(withPurchaseOrigin("/zh-cn/#pricing", { pathname: "/zh-cn/transpose-score", search: "?instrument=flute", hash: "#example" }), "https://site.invalid");
  assert.equal(purchaseReturnContext(result).returnPath, "/zh-cn/transpose-score?instrument=flute#example");
});

test("cross-browser app cancellation restores the chosen annual plan and provider on www", () => {
  const returned = "?plan=single-score&checkoutResult=cancelled&checkoutPlan=starter-annual&checkoutBilling=subscription&checkoutProvider=paddle";
  assert.deepEqual(readPurchaseSelection(returned), { planCode: "starter-annual", billingKind: "subscription", provider: "paddle" });
  assert.equal(readPurchaseSelection("?checkoutPlan=starter-annual"), null);
});

test("www keeps a concrete app score and intended action across the pricing link", () => {
  const action = { kind: "export", format: "pdf", options: {} };
  const source = new URL(`https://site.invalid/pricing?${new URLSearchParams({ next: "/scores/mine?view=staff#export-center", target: "mine", action: JSON.stringify(action) })}`);
  const restored = purchaseReturnContext(new URL(withPurchaseOrigin("/pricing?plan=single-score", source), source));
  assert.equal(restored.returnSite, "app");
  assert.equal(restored.returnPath, "/scores/mine?view=staff#export-center");
  assert.equal(restored.targetDocumentId, "mine");
  assert.deepEqual(restored.intendedAction, action);
});

test("unsafe origins and checkout loops fall back to safe business pages", () => {
  for (const path of ["https://evil.invalid", "//evil.invalid", "/checkout/success", "/%2f%2fevil.invalid", "/scores%255c@evil.invalid"]) {
    const context = purchaseReturnContext(new URL(`https://site.invalid/pricing?${new URLSearchParams({ returnSite: "app", returnPath: path })}`));
    assert.equal(context.returnSite, "www");
  }
  assert.equal(purchaseReturnContext({ pathname: "/checkout/cancel", search: "", hash: "" }).returnPath, "/");
});

test("purchase identity survives refresh, remount and timeout until completed handoff", () => {
  const storage = memoryStorage();
  let generated = 0;
  const create = () => `intent-${++generated}`;
  const before = purchaseReturnContext({ pathname: "/pricing", search: "", hash: "#plans" });
  const after = purchaseReturnContext({ pathname: "/pricing", search: "?plan=starter-monthly&billing=subscription&provider=stripe", hash: "#plans" });
  const signature = purchaseIntentSignature("user", "en", "starter-monthly", before);
  assert.equal(purchaseIntentSignature("user", "en", "starter-monthly", after), signature);
  const first = persistentPurchaseIntent(signature, storage, create);
  rememberPurchaseOrder(signature, first, "order-1", storage);
  assert.deepEqual(persistentPurchaseIntent(signature, storage, create), { ...first, orderId: "order-1" });
  assert.equal(generated, 1);
  completePurchaseIntent("unrelated", storage);
  assert.equal(persistentPurchaseIntent(signature, storage, create).key, first.key);
  completePurchaseIntent("order-1", storage);
  assert.equal(persistentPurchaseIntent(signature, storage, create).key, "intent-2");
});

test("storage failure stops a new purchase identity from being silently volatile", () => {
  assert.throws(() => persistentPurchaseIntent("user-plan", { getItem: () => null, setItem: () => { throw new Error("storage unavailable"); } }), /storage unavailable/u);
});

test("terminal purchases need a new explicit choice; login, timeout and uncertain pending orders keep their identity", () => {
  for (const status of ["pending", "paid", "cancelled", "failed"]) assert.equal(shouldReplacePurchaseIntent(status, undefined, false, false), false);
  assert.equal(shouldReplacePurchaseIntent("pending", undefined, true, false), false);
  assert.equal(shouldReplacePurchaseIntent("paid", undefined, true, false), false);
  assert.equal(shouldReplacePurchaseIntent("paid", "refunded", false, false), false);
  assert.equal(shouldReplacePurchaseIntent("paid", "refunded", true, false), true);
  for (const status of ["cancelled", "failed"]) assert.equal(shouldReplacePurchaseIntent(status, undefined, true, false), true);
  assert.equal(shouldReplacePurchaseIntent("paid", undefined, true, true), true);
});

test("purchase recovery choices are translated in all nine languages", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getPurchaseRecoveryCopy(locale);
    assert.ok(copy.found && copy.resume && copy.newPurchase, locale);
  }
});

test("payment return pages prevent referrer, cache and analytics disclosure of credentials", async () => {
  const publicHeaders = await wwwConfig.headers!();
  const appHeaders = await appConfig.headers!();
  for (const prefix of ["", ...publicLocalePrefixes.map(([, prefix]) => prefix)]) {
    const rule = publicHeaders.find(rule => rule.source === `${prefix}/checkout/:path*`);
    assert.ok(rule);
    assert.ok(rule.headers.some(header => header.key === "Referrer-Policy" && header.value === "no-referrer"));
    assert.ok(rule.headers.some(header => header.key === "Cache-Control" && header.value.includes("no-store")));
  }
  assert.ok(appHeaders[0].headers.some(header => header.key === "Referrer-Policy" && header.value === "no-referrer"));
  const global = globalThis as unknown as { window?: unknown };
  const previous = global.window;
  const events: unknown[] = [];
  try {
    global.window = { location: { pathname: "/fr/checkout/success", href: "https://site.invalid/fr/checkout/success?return_token=private-locator" }, gtag: (...event: unknown[]) => events.push(event) };
    assert.equal(trackFunnelEvent("purchase"), false);
    assert.equal(events.length, 0);
    (global.window as { location: { pathname: string } }).location.pathname = "/pricing";
    assert.equal(trackFunnelEvent("begin_checkout"), true);
    assert.equal(events.length, 1);
  } finally { global.window = previous; }
});
