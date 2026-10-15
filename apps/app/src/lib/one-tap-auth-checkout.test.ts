import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, getPricingPlanCatalog, SINGLE_SCORE_PASS } from "@score/shared";
import { getBillingMessages } from "./billing-messages";
import { getScorePassCopy } from "./billing-messages/score-pass-copy";
import { getAuthMessages } from "./auth-messages";
import { getAppMessages } from "./app-messages";
import { preferredLoginPath, setPreferredLoginMethod } from "./auth-storage";
import { readCheckoutReturn, saveCheckoutReturn, workReturnPath } from "./flow-return";

type Tree = { type: unknown; props: Record<string, any> };
type Effect = { deps?: unknown[]; cleanup?: () => void };

// Execute the real component with deterministic hook state and clocks. No GSI
// request, browser installation, or real payment is needed for these contracts.
function componentHarness(relative: string, mocks: Record<string, unknown> = {}, env: Record<string, string> = {}) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, jsxFactory: "element", jsxFragmentFactory: "fragment", esModuleInterop: true,
  } }).outputText;
  const state: unknown[] = [], effects = new Map<number, Effect>();
  const queued: Array<() => void> = [];
  let cursor = 0, nextTimer = 1;
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const listeners = new Map<string, Set<(event: any) => void>>();
  const location = { origin: "https://scoretransposer.com", href: "", pathname: "/scores/score-1", search: "", hash: "#transpose-score", assign(value: string) { this.href = value; }, replace(value: string) { this.href = value; } };
  const browser = {
    location,
    setTimeout(callback: () => void, delay: number) { const id = nextTimer++; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id: number) { timers.delete(id); },
    addEventListener(name: string, listener: (event: any) => void) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(listener); },
    removeEventListener(name: string, listener: (event: any) => void) { listeners.get(name)?.delete(listener); },
    dispatchEvent() { return true; },
  };
  const hooks = {
    createContext() { return { Provider: "context" }; },
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (value: unknown) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useRef(initial: unknown) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useId() { return `field-${cursor++}`; },
    useCallback(callback: unknown) { cursor++; return callback; },
    useSyncExternalStore(_subscribe: unknown, snapshot: () => unknown) { cursor++; return snapshot(); },
    useEffect(callback: () => void | (() => void), deps?: unknown[]) {
      const index = cursor++, previous = effects.get(index);
      if (previous && deps && previous.deps && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps![i]))) return;
      queued.push(() => { previous?.cleanup?.(); effects.set(index, { deps, cleanup: callback() ?? undefined }); });
    },
  };
  const exports: Record<string, any> = {};
  const realRequire = createRequire(filename);
  vm.runInNewContext(source, {
    exports, require(id: string) { return id === "react" ? hooks : Object.hasOwn(mocks, id) ? mocks[id] : realRequire(id); },
    element(type: unknown, props: object | null, ...children: unknown[]) { return { type, props: { ...props, children } }; }, fragment: "fragment",
    window: browser, document: { body: {} }, process: { env: { ...process.env, NEXT_PUBLIC_GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com", ...env } },
    URL, URLSearchParams, AbortController, Event, crypto: globalThis.crypto,
  }, { filename });
  return {
    exports, browser, timers,
    render(name: string, props: object): Tree { cursor = 0; return exports[name](props); },
    flushEffects() { while (queued.length) queued.shift()!(); },
    expireTimers() { for (const [id, timer] of [...timers]) { timers.delete(id); timer.callback(); } },
    message(event: any) { for (const listener of listeners.get("message") ?? []) listener(event); },
    dispose() { for (const effect of effects.values()) effect.cleanup?.(); },
  };
}

function nodes(value: unknown): Tree[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Tree;
  return [node, ...nodes(node.props.children)];
}

function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (value && typeof value === "object" && "props" in value) return text((value as Tree).props.children);
  return typeof value === "string" ? value : "";
}

function authHarness(locale: SupportedLocale, env: Record<string, string> = {}) {
  return componentHarness("../components/AuthForm.tsx", {
    "next/link": "a", "next/script": "script", "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "./AppLocaleProvider": { useAppLocale: () => ({ locale }) },
    "../lib/auth-storage": { getStoredToken: () => null, clearStoredToken() {}, setStoredToken() {}, setPreferredLoginMethod() {} },
    "../lib/analytics": { trackFunnelEvent() {} },
  }, env);
}

test("login and registration show Google as the sole primary action in all nine locales", () => {
  for (const locale of SUPPORTED_LOCALES) for (const mode of ["login", "register"] as const) {
    const harness = authHarness(locale);
    const messages = getAuthMessages(locale).form;
    const tree = harness.render("AuthForm", { mode, messages });
    const primary = nodes(tree).filter(node => node.props.className?.includes("button-primary"));
    assert.equal(primary.length, 1, `${locale}/${mode} primary action`);
    assert.equal(text(primary[0]), messages.shared.googleButtonRegionLabel);
    assert.match(text(primary[0]), /Google/u);
    assert.equal(nodes(tree).filter(node => node.type === "form" || node.type === "input").length, 0, `${locale}/${mode} email initially folded`);
    assert.doesNotMatch(text(tree), /activation code|激活码|啟用碼|アクティベーションコード|활성화 코드|code d.activation|código de activación|Aktivierungscode|Активировать код/iu);
    assert.equal(nodes(tree).find(node => node.props["aria-expanded"] === false)?.props.children[0], messages.shared.googleDivider);
  }
});

test("the email link, a failed GSI load, and the blocked-load deadline expose email login and password recovery", () => {
  for (const trigger of ["link", "error", "timeout"] as const) {
    const harness = authHarness("en"), props = { mode: "login", messages: getAuthMessages("en").form };
    const initial = harness.render("AuthForm", props);
    if (trigger === "link") nodes(initial).find(node => node.props["aria-expanded"] === false)!.props.onClick();
    if (trigger === "error") nodes(initial).find(node => node.type === "script")!.props.onError();
    if (trigger === "timeout") { harness.flushEffects(); assert.ok([...harness.timers.values()].some(timer => timer.delay <= 8000)); harness.expireTimers(); }
    const fallback = harness.render("AuthForm", props);
    assert.equal(nodes(fallback).filter(node => node.type === "input" && ["email", "password"].includes(node.props.type)).length, 2, trigger);
    assert.ok(nodes(fallback).some(node => node.props.href === APP_ROUTES.forgotPassword), trigger);
    assert.ok(nodes(fallback).some(node => node.type === "button" && node.props.type === "submit"), trigger);
    harness.dispose();
  }
  const missing = authHarness("en", { NEXT_PUBLIC_GOOGLE_CLIENT_ID: "" });
  assert.ok(nodes(missing.render("AuthForm", { mode: "login", messages: getAuthMessages("en").form })).some(node => node.type === "form"));
});

test("the public Google frame reports an unresponsive GSI load and ignores credentials from other origins", () => {
  const failures: string[] = [], credentials: string[] = [];
  const harness = componentHarness("../../../www/src/components/HomeGoogleSignIn.tsx", { "../app/home-page.module.css": {} });
  const props = { appUrl: "https://app.scoretransposer.com", locale: "en", disabled: false, label: "Continue with Google", loadingLabel: "Loading", errorLabel: "Use email", onCredential: (value: string) => credentials.push(value), onError: (value: string) => failures.push(value) };
  harness.render("HomeGoogleSignIn", props); harness.flushEffects();
  const frame = nodes(harness.render("HomeGoogleSignIn", props)).find(node => node.type === "iframe")!;
  const frameWindow = {}; frame.props.ref.current = { contentWindow: frameWindow };
  harness.message({ origin: "https://evil.example", source: frameWindow, data: { channel: "score-google-signin", type: "credential", credential: "forged" } });
  assert.equal(credentials.length, 0);
  harness.message({ origin: "https://app.scoretransposer.com", source: frameWindow, data: { channel: "score-google-signin", type: "credential", credential: "signed-fixture" } });
  assert.deepEqual(credentials, ["signed-fixture"]);
  harness.expireTimers();
  assert.deepEqual(failures, ["Use email"]);
  assert.ok(nodes(harness.render("HomeGoogleSignIn", props)).some(node => node.props.role === "alert"));
  harness.dispose();
});

function storage(): Storage {
  const entries = new Map<string, string>();
  return { get length() { return entries.size; }, clear() { entries.clear(); }, key(index) { return [...entries.keys()][index] ?? null; }, getItem(key) { return entries.get(key) ?? null; }, setItem(key, value) { entries.set(key, String(value)); }, removeItem(key) { entries.delete(key); } };
}

test("a prior shop login never sends main-site sign-in to activation and preserves the exact score intent", () => {
  const previous = globalThis.window;
  globalThis.window = { localStorage: storage() } as Window & typeof globalThis;
  try {
    const next = "/scores/score-1?task=transpose&targetTonic=Bb#transpose-score";
    for (const method of ["email", "google", "activation-code"] as const) {
      setPreferredLoginMethod(method);
      const route = new URL(preferredLoginPath(next), "https://app.scoretransposer.com");
      assert.equal(route.pathname, "/login"); assert.equal(route.searchParams.get("next"), next);
    }
    assert.equal(preferredLoginPath(), "/login");
  } finally { globalThis.window = previous; }
});

test("the app shell omits activation navigation for every locale even when checkout is unavailable", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const harness = componentHarness("../components/AppChrome.tsx", {
      "next/link": "a", "next/navigation": { usePathname: () => "/login" },
      "@score/ui": { SiteShellHeader: "header", SiteShellFooter: "footer", SparkIcon: "icon", ArrowNorthEastIcon: "icon" },
      "./AppLocaleProvider": { useAppLocale: () => ({ locale }) }, "./AppLocaleSwitcher": { AppLocaleSwitcher: "locale" }, "./PendingOmrReviewBanner": { PendingOmrReviewBanner: "reviews" },
      "../lib/auth-storage": { getStoredToken: () => null, getServerAuthToken: () => null, subscribeAuthChanges() {}, preferredLoginPath },
    }, { NEXT_PUBLIC_CHECKOUT_AVAILABLE: "false" });
    const tree = harness.render("AppChrome", { children: null, copy: getAppMessages(locale).shell, reviewEntryCopy: {} });
    for (const node of nodes(tree).filter(node => ["header", "footer"].includes(String(node.type)))) assert.doesNotMatch(JSON.stringify(node.props), /\/activate|shop=1/u);
  }
  const release = componentHarness("./release.ts", {}, { NEXT_PUBLIC_CHECKOUT_AVAILABLE: "false" });
  assert.equal(release.exports.accountActivationRoute, APP_ROUTES.checkout);
});

test("direct activation and the domestic shop entry still render their original forms", async () => {
  for (const locale of SUPPORTED_LOCALES) {
    const harness = componentHarness("../app/activate/page.tsx", {
      "../../components/AuthShell": { AuthShell: "auth-shell" }, "../../components/EntitlementGate": { EntitlementGate: "gate" },
      "../../components/ActivationForm": { ActivationForm: "activation-form" }, "../../components/ShopActivation": { ShopActivation: "shop-form" },
      "../../lib/locale": { readAppLocale: async () => locale },
    });
    const next = "/scores/score-1#visual-editor";
    const standard = await harness.exports.default({ searchParams: Promise.resolve({ next }) });
    assert.equal(nodes(standard).find(node => node.type === "activation-form")?.props.returnTo, next);
    const shop = await harness.exports.default({ searchParams: Promise.resolve({ shop: "1", next }) });
    assert.equal(shop.type, "shop-form"); assert.equal(shop.props.returnTo, next);
  }
  assert.match(readFileSync(new URL("../../../../services/api/src/routes/activation.ts", import.meta.url), "utf8"), /["']\/activation\/redeem["']/u);
  assert.match(readFileSync(new URL("../../../../services/api/src/routes/auth.ts", import.meta.url), "utf8"), /["']\/auth\/activation-code["']/u);
});

test("One Score Pass is the primary upsell in every locale and routes authenticated purchases to Stripe", async () => {
  for (const locale of SUPPORTED_LOCALES) {
    const requests: Array<{ path: string; init: RequestInit }> = [], saved: unknown[][] = [];
    const next = "/scores/score-1?task=transpose#transpose-score";
    const harness = componentHarness("../components/OneScorePassUpsell.tsx", {
      "next/link": "a", "./AppLocaleProvider": { useAppLocale: () => ({ locale }) }, "../lib/release": { checkoutAvailable: true },
      "../lib/auth-storage": { getStoredToken: () => "session-token" }, "../lib/analytics": { trackFunnelEvent() {} },
      "../lib/api": { apiRequest: async (path: string, init: RequestInit) => { requests.push({ path, init }); return { ok: true, data: { orderId: "order-1", url: "https://checkout.stripe.com/fixture" } }; } },
      "../lib/flow-return": { currentWorkPath: () => next, workReturnPath, upgradePath: (path: string) => `/checkout?${new URLSearchParams({ next: path })}`, saveCheckoutReturn: (...args: unknown[]) => saved.push(args) },
    });
    const tree = harness.render("OneScorePassUpsell", { source: "test", returnTo: next });
    const primary = nodes(tree).filter(node => node.props.className?.includes("button-primary"));
    assert.equal(primary.length, 1); assert.equal(primary[0].props["data-plan-type"], "one_score"); assert.match(text(primary[0]), /2\.99/u);
    assert.doesNotMatch(JSON.stringify(tree), /\/activate|activation_code/u);
    primary[0].props.onClick(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests.length, 1); assert.equal(requests[0].path, "/api/payments/checkout/authenticated");
    assert.deepEqual(JSON.parse(String(requests[0].init.body)), { provider: "stripe", billingKind: "one_time", locale, planCode: "single-score", seatQuantity: 1 });
    assert.deepEqual(saved, [["order-1", next, next]]); assert.equal(harness.browser.location.href, "https://checkout.stripe.com/fixture");
  }
});

test("an unauthenticated pass purchase carries its plan and continuation back to the original score", async () => {
  const next = "/scores/score-1?task=edit#visual-editor";
  const harness = componentHarness("../components/OneScorePassUpsell.tsx", {
    "next/link": "a", "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) }, "../lib/release": { checkoutAvailable: true },
    "../lib/auth-storage": { getStoredToken: () => null }, "../lib/analytics": { trackFunnelEvent() {} },
    "../lib/flow-return": { currentWorkPath: () => next, workReturnPath, upgradePath: (path: string) => `/checkout?${new URLSearchParams({ next: path })}` },
  });
  const tree = harness.render("OneScorePassUpsell", { source: "test", returnTo: next });
  nodes(tree).find(node => node.props["data-plan-type"] === "one_score")!.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  const target = new URL(harness.browser.location.href, "https://app.scoretransposer.com");
  assert.equal(target.pathname, "/checkout"); assert.equal(target.searchParams.get("plan"), "single-score");
  assert.equal(target.searchParams.get("billing"), "one_time"); assert.equal(target.searchParams.get("continue"), "1"); assert.equal(target.searchParams.get("next"), next);
});

test("payment return storage retains the original score and rejects activation or external return destinations", () => {
  const previous = globalThis.sessionStorage; globalThis.sessionStorage = storage();
  try {
    const next = "/scores/score-1?task=transpose&targetTonic=Bb#transpose-score";
    saveCheckoutReturn("order-1", next, "/checkout?plan=single-score&continue=1");
    assert.equal(readCheckoutReturn("order-1").next, next);
    assert.equal(readCheckoutReturn("order-1").retry, "/checkout?plan=single-score&continue=1");
    for (const invalid of ["/activate?shop=1", "//evil.example", "https://evil.example", "/checkout"]) {
      saveCheckoutReturn("order-2", invalid, "//evil.example");
      assert.equal(readCheckoutReturn("order-2").next, "/scores"); assert.equal(readCheckoutReturn("order-2").retry, "/checkout");
    }
  } finally { globalThis.sessionStorage = previous; }
});

test("public checkout resumes the pending pass automatically after Google sign-in and expands email after Google failure", async () => {
  let loggedIn = false, pending: any = null;
  const requests: Array<{ path: string; init?: RequestInit }> = [];
  const plan = { planCode: "single-score", billingKind: "one_time", provider: "stripe", name: "One Score Pass", cycle: "one-time", price: "US$2.99" };
  const harness = componentHarness("../../../www/src/components/PurchaseFlowProvider.tsx", {
    "react-dom": { createPortal: (tree: Tree) => tree }, "./PurchaseFlow.module.css": {},
    "./HomeGoogleSignIn": { HomeGoogleSignIn: "google-signin" }, "./GoogleOneTap": { GoogleOneTap: "one-tap" },
    "../lib/analytics": { trackFunnelEvent() {} }, "../lib/site": { siteConfig: { appUrl: "https://app.scoretransposer.com" } },
    "../lib/api": { apiRequest: async (path: string, init?: RequestInit) => {
      requests.push({ path, init });
      if (path === "/api/auth/google") loggedIn = true;
      if (path.startsWith("/api/auth/")) return loggedIn ? { ok: true, data: { user: { id: "user-1", email: "fixture@example.test" }, isNewUser: true } } : { ok: false, status: 401, error: "Sign in" };
      return { ok: true, data: { orderId: "order-1", url: "https://checkout.stripe.com/fixture" } };
    } },
    "../lib/purchase-flow": {
      SESSION_CHANGED_EVENT: "session", defaultPurchaseSelection: () => plan, readPurchaseSelection: () => null,
      rememberPurchaseSelection() {}, savePendingPurchase: (value: unknown) => { pending = value; }, readPendingPurchase: () => pending,
      clearPendingPurchase() { pending = null; }, purchaseSelectionKey: () => "single-score:one_time:stripe", savePurchaseReturn() {},
    },
  });
  const props = { children: null, locale: "en", auth: { googleLabel: "Continue with Google", googleFailed: "Use email", login: "Login", register: "Register", email: "Email", password: "Password" }, copy: { emailAction: "Other methods / Use email", forgotPassword: "Forgot password?" } };
  const initial = harness.render("PurchaseFlowProvider", props);
  initial.props.value.purchase(plan);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(pending, plan);
  const modal = harness.render("PurchaseFlowProvider", props);
  assert.ok(nodes(modal).some(node => node.type === "one-tap"));
  assert.equal(nodes(modal).filter(node => node.type === "form").length, 0);
  const google = nodes(modal).find(node => node.type === "google-signin")!;
  google.props.onError("Use email");
  const fallback = harness.render("PurchaseFlowProvider", props);
  assert.ok(nodes(fallback).some(node => node.type === "form"));
  assert.ok(nodes(fallback).some(node => String(node.props.href).includes("forgot-password")));
  google.props.onCredential("signed-fixture");
  await new Promise(resolve => setImmediate(resolve));
  harness.render("PurchaseFlowProvider", props); harness.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  const checkout = requests.find(request => request.path === "/api/payments/checkout/authenticated");
  assert.ok(checkout, "authentication resumes checkout without another purchase click");
  assert.equal(JSON.parse(String(checkout.init?.body)).planCode, "single-score");
  assert.equal(JSON.parse(String(checkout.init?.body)).provider, "stripe");
  assert.equal(harness.browser.location.href, "https://checkout.stripe.com/fixture");
  assert.equal(pending, null);
});


test("checkout defaults to Starter monthly and carries a targeted explicit pass through the real selector", () => {
  const harness = componentHarness("../components/CheckoutPlanSelector.tsx", {
    "next/link": "a", "./AppCheckout.module.css": {}, "@score/ui": { CreditPlanCard: "plan", CreditPlanGrid: "plans" },
    "./AppCheckoutClient": { AppCheckoutClient: "checkout" },
    "../lib/analytics": { trackFunnelEvent() {} },
    "../lib/flow-messages/client": { useFlowMessages: () => ({}) },
  });
  const props = { plans: getPricingPlanCatalog("en"), locale: "en", copy: getBillingMessages("en").checkout, authMessages: getAuthMessages("en").form };
  const checkout = nodes(harness.render("CheckoutPlanSelector", props)).find(node => node.type === "checkout")!;
  assert.equal(checkout.props.selectedPlan.code, "starter-monthly");
  assert.equal(checkout.props.billingKind, "subscription");
  harness.dispose();
  const targeted = componentHarness("../components/CheckoutPlanSelector.tsx", {
    "next/link": "a", "./AppCheckout.module.css": {}, "@score/ui": { CreditPlanCard: "plan", CreditPlanGrid: "plans" }, "./AppCheckoutClient": { AppCheckoutClient: "checkout" },
    "../lib/analytics": { trackFunnelEvent() {} }, "../lib/flow-messages/client": { useFlowMessages: () => ({}) },
  });
  const action = { kind: "export", format: "pdf", options: { pageSize: "a4" } };
  const tree = targeted.render("CheckoutPlanSelector", { ...props, initialPlanCode: "single-score", targetDocumentId: "score-1", intendedAction: action, isTopUp: true });
  const selected = nodes(tree).find(node => node.type === "checkout")!;
  assert.equal(selected.props.selectedPlan.code, "single-score");
  assert.equal(selected.props.billingKind, "one_time");
  assert.equal(selected.props.targetDocumentId, "score-1");
  assert.deepEqual(selected.props.intendedAction, action);
  assert.ok(text(tree).includes(getScorePassCopy("en").passTarget));
  assert.ok(text(tree).includes("Buy 10 more credits"));
  targeted.dispose();
});

test("upgrade modal recommends Starter and one click sends the score and exact export options to hosted checkout", async () => {
  for (const code of ["starter-monthly", "converter-pro-monthly", "single-score"] as const) {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    let release: (result: unknown) => void = () => {};
    const harness = componentHarness("../components/ScorePassUpgradeModal.tsx", {
      "next/link": "a", "./ScorePassUpgradeModal.module.css": { recommended: "recommended" },
      "../lib/auth-storage": { getStoredToken: () => "auth-token" },
      "../lib/flow-return": { saveCheckoutReturn() {} },
      "../lib/api": { apiRequest: (path: string, init?: RequestInit) => { calls.push({ path, init }); return new Promise(resolve => { release = resolve; }); } },
    });
    const action = { kind: "export", format: "png", options: { pageSize: "a4", imageResolutionDpi: 300, trimImage: true } };
    const tree = harness.render("ScorePassUpgradeModal", { documentId: "score-1", action, locale: "en", topUp: true, onClose() {} });
    const buttons = nodes(tree).filter(node => node.type === "button" && text(node) === getScorePassCopy("en").continuePayment);
    assert.equal(buttons.length, 3);
    assert.ok(buttons[0].props.className.includes("button-primary"));
    assert.ok(buttons[2].props.className.includes("button-secondary"));
    const index = ["starter-monthly", "converter-pro-monthly", "single-score"].indexOf(code);
    buttons[index].props.onClick(); buttons[index].props.onClick();
    assert.equal(calls.length, 1, "rapid duplicate clicks create one checkout");
    const payload = JSON.parse(String(calls[0].init?.body));
    assert.equal(payload.targetDocumentId, "score-1"); assert.deepEqual(payload.intendedAction, action);
    assert.equal(payload.planCode, code); assert.equal(payload.provider, "stripe");
    assert.equal(payload.billingKind, code === "single-score" ? "one_time" : "subscription");
    assert.ok(new Headers(calls[0].init?.headers).get("Idempotency-Key"));
    release({ ok: true, data: { orderId: "order-topup", url: "https://checkout.stripe.com/test-only" } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(harness.browser.location.href, "https://checkout.stripe.com/test-only");
    assert.ok(text(tree).includes(`US$${(SINGLE_SCORE_PASS.amountMinor / 100).toFixed(2)}`));
    harness.dispose();
  }
});

test("payment return recognizes top-ups by group membership and resumes only when an intended action exists", async () => {
 for (const available of [true, false]) {
  const routes: string[] = [], requests: Array<{ path: string; init?: RequestInit }> = [];
  const router = { replace: (path: string) => routes.push(path), refresh() {} };
  const signIn = () => {};
  const harness = componentHarness("../components/AppCheckoutStatusClient.tsx", {
    "next/link": "a", "next/navigation": { useRouter: () => router },
    "./AppAuthModal": { useAppAuthModal: () => signIn },
    "../lib/auth-storage": { getStoredToken: () => "fixture-auth", clearStoredToken() {} },
    "../lib/flow-messages/client": { useFlowMessages: () => ({}) },
    "../lib/flow-return": { readCheckoutReturn: () => ({ next: "/scores/part-1", retry: "/checkout", createdAt: 1 }) },
    "../lib/analytics": { trackFunnelEventOnce() {} },
    "../lib/api": { apiRequest: async (path: string, init?: RequestInit) => {
      requests.push({ path, init });
      if (path === "/api/auth/me") return { ok: true, data: { user: { id: "user-1", entitlement: { status: "inactive" }, scorePasses: [{ id: "root-pass", documentId: "root-1", documentIds: ["root-1", "part-1"] }] } } };
      if (path.endsWith("/continue")) return { ok: true, data: { documentId: "part-1", job: { id: "stored-job-1" } } };
      return { ok: true, data: { verification: { status: "ready" }, order: { id: "topup-order", userId: "user-1", provider: "stripe", status: "paid", billingKind: "one_time", planCode: "single-score", continuation: { documentId: "part-1", available, consumed: false } } } };
    } },
  });
  const props = { orderId: "topup-order", token: "public-return-token", provider: "stripe", locale: "en", copy: getBillingMessages("en").checkout.status };
  harness.render("AppCheckoutStatusClient", props); harness.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  harness.render("AppCheckoutStatusClient", props); harness.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  harness.render("AppCheckoutStatusClient", props); harness.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(routes, ["/scores/part-1"]);
  const continuations = requests.filter(request => request.path.endsWith("/continue"));
  assert.equal(continuations.length, available ? 1 : 0);
  if (available) {
    assert.equal(new Headers(continuations[0].init?.headers).get("Authorization"), "Bearer fixture-auth");
    assert.deepEqual(JSON.parse(String(continuations[0].init?.body)), { token: "public-return-token" });
  }
  assert.equal(requests.filter(request => request.path.includes("/exports") || request.path.includes("/retry")).length, 0, "browser delegates the retry and credit idempotency to the server");
  harness.dispose();
 }
});
