import { workbenchCopy } from "@score/ui";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { getRecognitionExperienceMessages, SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, getGoogleAuthCopy, getPricingPlanCatalog, getPurchaseOptionsCopy, SINGLE_SCORE_PASS } from "@score/shared";
import { getBillingMessages } from "./billing-messages";
import { getScorePassCopy } from "./billing-messages/score-pass-copy";
import { getAuthMessages } from "./auth-messages";
import { getAppMessages } from "./app-messages";
import { getFlowMessages } from "./flow-messages";
import { getScoreEntryMessages } from "./score-entry-messages";
import { getScoreDetailMessages } from "./score-detail-messages";
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
  const location = { origin: "https://scoretransposer.com", hostname: "scoretransposer.com", protocol: "https:", href: "https://scoretransposer.com/scores/score-1#transpose-score", pathname: "/scores/score-1", search: "", hash: "#transpose-score", assign(value: string) { this.href = value; }, replace(value: string) { this.href = value; } };
  const browser = {
    location,
    localStorage: storage(),
    sessionStorage: storage(),
    navigator: { userAgent: "Desktop Chrome fixture" },
    open() { return { close() {} }; },
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
    useMemo(factory: () => unknown) { cursor++; return factory(); },
    useSyncExternalStore(_subscribe: unknown, snapshot: () => unknown) { cursor++; return snapshot(); },
    useEffect(callback: () => void | (() => void), deps?: unknown[]) {
      const index = cursor++, previous = effects.get(index);
      if (previous && deps && previous.deps && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps![i]))) return;
      queued.push(() => { previous?.cleanup?.(); effects.set(index, { deps, cleanup: callback() ?? undefined }); });
    },
  };
  const exports: Record<string, any> = {};
  const realRequire = createRequire(filename);
  class EventElement {
    constructor(readonly anchor: unknown) {}
    closest() { return this.anchor; }
  }
  vm.runInNewContext(source, {
    exports, require(id: string) {
      if (id === "./AppAuthModal" && !Object.hasOwn(mocks, id)) return { useAppAuthModal: () => () => {} };
      if (id === "@score/shared" && !Object.hasOwn(mocks, id)) return { ...realRequire(id), prepareGoogleSignIn: async () => true, consumeGoogleRedirectResult: () => undefined, isInAppBrowser: () => false, isGoogleAutoSignInAllowed: () => false, launchGoogleSignIn: () => ({ cancel() {} }) };
      if (id === "../lib/checkout-flow" && !Object.hasOwn(mocks, id)) return {
        prepareCheckout: async () => true,
        completeCheckoutIntent() {},
        checkoutLoginPath: (path: string, values: Record<string, string>) => { const url = new URL(path, location.origin); for (const [key, value] of Object.entries(values)) if (value !== undefined) url.searchParams.set(key, value); return `${url.pathname}${url.search}`; },
        checkoutReturnContext: (path?: string, action?: unknown, state?: unknown) => ({ returnSite: "app", returnPath: path ?? `${location.pathname}${location.search}${location.hash}`, returnState: state ?? { version: 1, intent: action ? "continue_action" : "restore_view" } }),
        lookupAndStartCheckout: (payload: object, token: string) => (mocks["../lib/api"] as any).apiRequest("/api/payments/checkout/authenticated", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": "persisted-fixture-intent" }, body: JSON.stringify(payload) }),
      };
      return id === "react" ? hooks : Object.hasOwn(mocks, id) ? mocks[id] : realRequire(id);
    },
    element(type: unknown, props: object | null, ...children: unknown[]) { return { type, props: { ...props, children } }; }, fragment: "fragment",
    window: browser, navigator: browser.navigator, document: { body: {}, cookie: "", addEventListener: browser.addEventListener, removeEventListener: browser.removeEventListener, querySelector: () => null, querySelectorAll: () => [], ...mocks["test/document"] as object }, process: { env: { ...process.env, NEXT_PUBLIC_GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com", ...env } },
    URL, URLSearchParams, AbortController, Event, Element: EventElement, crypto: globalThis.crypto,
  }, { filename });
  return {
    exports, browser, timers,
    eventElement(anchor: unknown) { return new EventElement(anchor); },
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
    assert.equal(text(primary[0]), getGoogleAuthCopy(locale).googleSignIn);
    assert.match(text(primary[0]), /Google/u);
    assert.equal(nodes(tree).filter(node => node.type === "form" || node.type === "input").length, 0, `${locale}/${mode} email initially folded`);
    assert.doesNotMatch(text(tree), /activation code|激活码|啟用碼|アクティベーションコード|활성화 코드|code d.activation|código de activación|Aktivierungscode|Активировать код/iu);
    assert.equal(nodes(tree).find(node => node.props["aria-expanded"] === false)?.props.children[0], messages.shared.googleDivider);
  }
});

test("the email link, a failed GSI load, and the blocked-load deadline expose email login and password recovery", () => {
  for (const trigger of ["link", "error", "timeout"] as const) {
    const harness = authHarness("en"), props = { mode: "login", messages: getAuthMessages("en").form, googleFallbackOnly: trigger !== "link" };
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
    const footer = nodes(tree).find(node => node.type === "footer")!;
    assert.ok(footer.props.links.some((link: { href: string; label: string }) => link.href.includes("method=email") && link.label === getGoogleAuthCopy(locale).emailSignIn));
  }
  const release = componentHarness("./release.ts", {}, { NEXT_PUBLIC_CHECKOUT_AVAILABLE: "false" });
  assert.equal(release.exports.accountActivationRoute, APP_ROUTES.checkout);
});

test("the app shell hides the free monthly balance while retaining paid and prepaid balances", async () => {
  for (const usage of [
    { tier: "free", creditMode: "monthly", jobs: { remaining: 0 } },
    { tier: "starter", creditMode: "monthly", jobs: { remaining: 49 } },
    { tier: "free", creditMode: "prepaid", jobs: { remaining: 20 } },
  ]) {
    const harness = componentHarness("../components/AppChrome.tsx", {
      "next/link": "a", "next/navigation": { usePathname: () => "/scores" },
      "@score/ui": { SiteShellHeader: "header", SiteShellFooter: "footer", SparkIcon: "icon", ArrowNorthEastIcon: "icon" },
      "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) }, "./AppLocaleSwitcher": { AppLocaleSwitcher: "locale" }, "./PendingOmrReviewBanner": { PendingOmrReviewBanner: "reviews" },
      "../lib/auth-storage": { getStoredToken: () => "auth-token", getServerAuthToken: () => null, subscribeAuthChanges() {}, preferredLoginPath },
      "../lib/api": { apiRequest: async () => ({ ok: true, data: { usage } }) },
    });
    Object.assign(harness.browser, { setInterval: () => 1, clearInterval() {} });
    const props = { children: null, copy: getAppMessages("en").shell, reviewEntryCopy: {} };
    harness.render("AppChrome", props); harness.flushEffects();
    await new Promise(resolve => setImmediate(resolve));
    const header = nodes(harness.render("AppChrome", props)).find(node => node.type === "header")!;
    const balanceAction = header.props.actions.find((action: { href: string }) => action.href === APP_ROUTES.billing);
    assert.equal(balanceAction.label, usage.tier === "free" && usage.creditMode === "monthly" ? getPurchaseOptionsCopy("en").manage : `${props.copy.credits}: ${usage.jobs.remaining}`);
    harness.dispose();
  }
});

test("the advanced recognition picker labels the lifetime scan as free in every locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const flow = getFlowMessages(locale);
    const harness = componentHarness("../components/RecognitionModeCards.tsx", {
      "./AppLocaleProvider": { useAppLocale: () => ({ locale }) },
      "../lib/flow-messages/client": { useFlowMessages: () => flow },
      "./ScoreEnsembleWorkspace.module.css": {}, "@score/ui": { ProcessingProgress: "progress" },
    });
    const tree = harness.render("RecognitionModeCards", { options: { options: [
      { mode: "simple", creditCost: 1, canSubmit: true, reason: null, creditSource: "free_trial" },
      { mode: "complex", creditCost: 5, canSubmit: false, reason: "COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED", creditSource: null },
    ] }, selected: "simple", loading: false, error: null, onRetry() {}, onSelect() {} });
    const simple = nodes(tree).find(node => node.props["data-recognition-mode"] === "simple")!;
    assert.ok(text(simple).includes(flow.preflight.freeProjectPrice), locale);
    assert.equal(nodes(simple).some(node => node.props["data-credit-cost"] !== undefined), false, locale);
  }
});

test("billing shows storage for free accounts and preserves monthly and prepaid credit meters", async () => {
  for (const account of [{ tier: "free", creditMode: "monthly" }, { tier: "starter", creditMode: "monthly" }, { tier: "free", creditMode: "prepaid" }]) {
    const copy = getBillingMessages("en").billing.manager;
    const quota = { ...account, jobs: { remaining: 0, used: 0, limit: 0 }, storage: { usedBytes: 1000, limitBytes: 10_000, remainingBytes: 9000 } };
    const harness = componentHarness("../components/BillingManager.tsx", {
      "next/link": "a", "./OwnedCheckoutRecovery": { OwnedCheckoutRecovery: "recovery" },
      "../lib/auth-storage": { getStoredToken: () => "auth-token", getServerAuthToken: () => null, subscribeAuthChanges() {} },
      "../lib/api": { apiRequest: async (path: string) => ({ ok: true, data: path.endsWith("/usage") ? { usage: quota } : path.endsWith("/me") ? { user: { entitlement: { status: "inactive" }, scorePasses: [] } } : { subscriptions: [], invoices: [], seatAssignments: [] } }) },
    });
    const props = { locale: "en", copy, freePlanCredits: "0" };
    harness.render("BillingManager", props); harness.flushEffects();
    await new Promise(resolve => setImmediate(resolve));
    const tree = harness.render("BillingManager", props);
    const creditPanel = nodes(tree).find(node => node.props.className?.includes("credit-balance-panel"));
    const freeAccount = account.tier === "free" && account.creditMode === "monthly";
    assert.equal(Boolean(creditPanel), !freeAccount, `${account.tier}/${account.creditMode}`);
    assert.ok(nodes(tree).some(node => node.props.label === copy.storage), "storage remains visible for every account");
    harness.dispose();
  }
});

test("candidate score rendering uses preview XML and never falls back to downloading the paid asset", () => {
  const originalXml = "<score-partwise><work><work-title>Original layout</work-title></work></score-partwise>";
  const score = { parts: [], measures: [] };
  const harness = componentHarness("../components/ScoreCandidateReviewWorkspace.tsx", {
    "next/link": "a", "./ScoreMusicXmlPreview": { ScoreMusicXmlPreview: "preview" },
    "./ScoreOmrReviewPanel": { ScoreOmrReviewPanel: "source" }, "./ScoreCorrectionPanel": { ScoreCorrectionPanel: "correction" },
    "./ScoreVisualEditorPanel": { ScoreVisualEditorPanel: "editor" }, "./ScoreRecognitionCandidates": { ScoreRecognitionCandidates: "candidates" },
    "./OneScorePassUpsell": { OneScorePassUpsell: "upsell" }, "./ScoreOperationBoundary": { useScoreNavigationLocked: () => false },
    "../lib/flow-messages/client": { useFlowMessages: () => getFlowMessages("en") },
    "../lib/score-entry-messages/client": { useScoreReviewMessages: () => ({ candidate: getScoreEntryMessages("en").candidate }) },
  });
  for (const xml of [null, originalXml]) {
    const tree = harness.render("ScoreCandidateReviewWorkspace", { title: "Score", scoreId: "score-1", revision: { id: "revision", revisionNumber: 1, scoreJson: score, musicxmlFileId: "paid-output-xml" },
      sourceFile: null, pageFiles: [], token: "auth-token", locale: "en", generatedMusicXml: xml, freeEditing: true });
    const preview = nodes(tree).find(node => node.type === "preview")!;
    assert.equal(preview.props.fileId, null, "a missing preview must not trigger paid file download");
    assert.equal(preview.props.musicXml, xml);
  }
});

test("ensemble loads both candidate and accepted preview APIs and passes XML to OSMD without file downloads", async () => {
  for (const candidate of [true, false]) {
    const requests: Array<{ documentId: string; candidate: boolean }> = [];
    const originalXml = "<score-partwise><defaults><scaling/></defaults></score-partwise>";
    const harness = componentHarness("../components/ScoreEnsembleWorkspace.tsx", {
      "next/link": "a", "./ScoreEnsembleWorkspace.module.css": {},
      "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
      "../lib/flow-messages/client": { useFlowMessages: () => getFlowMessages("en") },
      "../lib/score-entry-messages/client": { useScoreReviewMessages: () => ({ detail: getScoreDetailMessages("en") }) },
      "../lib/score-preview-request": { readScoreMusicXmlPreview: async (input: { documentId: string; candidate: boolean }) => { requests.push(input); return { ok: true, data: { musicXml: originalXml } }; } },
      "./ScoreOperationBoundary": { useScoreNavigationLocked: () => false }, "./ScoreMusicXmlPreview": { ScoreMusicXmlPreview: "preview" },
      "./ScoreAlphaTabPanel": { ScoreAlphaTabPanel: "alpha" }, "./ScoreNotationProperties": { ScoreNotationProperties: "properties" },
      "./ScoreEnsemblePartCreator": { ScoreEnsemblePartCreator: "creator" },
    });
    const props = { scoreId: "score-1", scoreJson: { parts: [], measures: [] }, candidatePreview: candidate, token: "auth-token", generatedMusicXml: null, revisionId: "revision", selectedEventId: null, showFullPreview: true };
    harness.render("ScoreEnsembleWorkspace", props); harness.flushEffects();
    await new Promise(resolve => setImmediate(resolve));
    const tree = harness.render("ScoreEnsembleWorkspace", props);
    assert.equal(requests.length, 1); assert.equal(requests[0].documentId, "score-1"); assert.equal(requests[0].candidate, candidate);
    const preview = nodes(tree).find(node => node.type === "preview")!;
    assert.equal(preview.props.fileId, null); assert.equal(preview.props.musicXml, originalXml);
    harness.dispose();
  }
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
      "../lib/flow-messages/client": { useFlowMessages: () => ({ recognitionExperience: getRecognitionExperienceMessages(locale) }) },
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
    const payload = JSON.parse(String(requests[0].init.body));
    assert.equal(payload.provider, "stripe"); assert.equal(payload.billingKind, "one_time"); assert.equal(payload.planCode, "single-score"); assert.equal(payload.locale, locale);
    assert.equal(payload.returnSite, "app"); assert.equal(payload.returnPath, next); assert.equal(payload.returnState.intent, "restore_view");
    assert.equal(saved[0][0], "order-1"); assert.equal(saved[0][1], next); assert.match(String(saved[0][2]), /^\/checkout\?/u); assert.equal(harness.browser.location.href, "https://checkout.stripe.com/fixture");
  }
});

test("an unauthenticated pass purchase starts Google in the original click and preserves the plan after login", async () => {
  const next = "/scores/score-1?task=edit#visual-editor";
  let token: string | null = null;
  let finish: (() => void) | undefined;
  const requests: Array<{ path: string; init: RequestInit }> = [];
  const harness = componentHarness("../components/OneScorePassUpsell.tsx", {
    "next/link": "a", "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) }, "../lib/release": { checkoutAvailable: true },
    "../lib/flow-messages/client": { useFlowMessages: () => ({ recognitionExperience: getRecognitionExperienceMessages("en") }) },
    "./AppAuthModal": { useAppAuthModal: () => (_mode: string, onDone: () => void) => { finish = onDone; } },
    "../lib/auth-storage": { getStoredToken: () => token }, "../lib/analytics": { trackFunnelEvent() {} },
    "../lib/api": { apiRequest: async (path: string, init: RequestInit) => { requests.push({ path, init }); return { ok: true, data: { orderId: "order-1", url: "https://checkout.stripe.com/fixture" } }; } },
    "../lib/flow-return": { currentWorkPath: () => next, workReturnPath, saveCheckoutReturn() {}, upgradePath: (path: string) => `/checkout?${new URLSearchParams({ next: path })}` },
  });
  const tree = harness.render("OneScorePassUpsell", { source: "test", returnTo: next });
  nodes(tree).find(node => node.props["data-plan-type"] === "one_score")!.props.onClick();
  assert.ok(finish, "Google starts synchronously before preparation or payment calls");
  assert.equal(requests.length, 0);
  token = "verified-fixture-session"; finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length, 1);
  const payload = JSON.parse(String(requests[0].init.body));
  assert.equal(payload.planCode, "single-score"); assert.equal(payload.billingKind, "one_time");
  assert.equal(payload.returnPath, next);
  assert.equal(harness.browser.location.href, "https://checkout.stripe.com/fixture");
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
  const launches: Array<{ onSuccess(): void; onFallback(reason: string): void }> = [];
  const plan = { planCode: "single-score", billingKind: "one_time", provider: "stripe", name: "One Score Pass", cycle: "one-time", price: "US$2.99" };
  const harness = componentHarness("../../../www/src/components/PurchaseFlowProvider.tsx", {
    "@score/shared": { ...createRequire(import.meta.url)("@score/shared"), prepareGoogleSignIn: async () => true, consumeGoogleRedirectResult: () => undefined, isInAppBrowser: () => false,
      launchGoogleSignIn: (options: typeof launches[number]) => { launches.push(options); return { cancel() {} }; } },
    "react-dom": { createPortal: (tree: Tree) => tree }, "./PurchaseFlow.module.css": {},
    "./HomeGoogleSignIn": { HomeGoogleSignIn: "google-signin" }, "./GoogleOneTap": { GoogleOneTap: "one-tap" },
    "../lib/analytics": { trackFunnelEvent() {} }, "../lib/site": { siteConfig: { appUrl: "https://app.scoretransposer.com" } },
    "../lib/api": { apiRequest: async (path: string, init?: RequestInit) => {
      requests.push({ path, init });
      if (path === "/api/auth/google") loggedIn = true;
      if (path.startsWith("/api/auth/")) return loggedIn ? { ok: true, data: { user: { id: "user-1", email: "fixture@example.test" }, isNewUser: true } } : { ok: false, status: 401, error: "Sign in" };
      if (path.startsWith("/api/payments/orders/by-intent?")) return { ok: false, status: 404, error: "No prior order" };
      if (path === "/api/payments/orders?pending=1") return { ok: true, data: { orders: [] } };
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
  harness.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  harness.render("PurchaseFlowProvider", props).props.value.purchase(plan);
  assert.equal(launches.length, 1, "the purchase click launches Google without rendering a login dialog");
  assert.deepEqual(pending, plan);
  const modal = harness.render("PurchaseFlowProvider", props);
  assert.ok(nodes(modal).some(node => node.type === "one-tap"));
  assert.equal(nodes(modal).filter(node => node.type === "form").length, 0);
  assert.equal(nodes(modal).some(node => node.type === "dialog" || node.type === "google-signin"), false);
  launches[0].onFallback("unavailable");
  const google = nodes(harness.render("PurchaseFlowProvider", props)).find(node => node.type === "google-signin")!;
  google.props.onError("Use email");
  const fallback = harness.render("PurchaseFlowProvider", props);
  assert.ok(nodes(fallback).some(node => node.type === "form"));
  assert.ok(nodes(fallback).some(node => String(node.props.href).includes("forgot-password")));
  loggedIn = true;
  launches[0].onSuccess();
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

test("public normal pricing navigation intercepts Next Link and carries the complete originating page", () => {
  const harness = componentHarness("../../../www/src/components/PublicChrome.tsx", {
    "next/link": "a", "next/navigation": { usePathname: () => "/features" },
    "./SiteLocaleProvider": { useSiteLocale: () => ({ locale: "en" }) },
    "./PurchaseFlowProvider": { usePurchaseFlow: () => ({ user: { email: "fixture@example.test" }, signIn() {} }) },
    "../lib/site": { siteConfig: { appUrl: "https://app.scoretransposer.com", release: { checkoutAvailable: true }, discordInviteUrl: "" },
      getAppLoginUrl: () => "https://app.scoretransposer.com/login", getAppScoreProjectsUrl: () => "https://app.scoretransposer.com/scores", getAppStartConversionUrl: () => "https://app.scoretransposer.com/scores", getCheckoutUrl: () => "/pricing" },
  });
  Object.assign(harness.browser.location, { href: "https://scoretransposer.com/features?instrument=piano#exports", pathname: "/features", search: "?instrument=piano", hash: "#exports" });
  const tree = harness.render("PublicChrome", { children: null, announcement: null, copy: {} });
  let prevented = false;
  const anchor = { href: "https://scoretransposer.com/pricing", target: "", closest: () => null, hasAttribute: () => false };
  tree.props.onClickCapture({ target: harness.eventElement(anchor), button: 0, preventDefault() { prevented = true; }, stopPropagation() {} });
  assert.equal(prevented, true);
  const target = new URL(harness.browser.location.href, "https://scoretransposer.com");
  assert.equal(target.pathname, "/pricing");
  assert.equal(target.searchParams.get("returnPath"), "/features?instrument=piano#exports");
});

test("www cancel preserves confirmed-payment fulfillment failures on the status route", async () => {
  const requests: string[] = [];
  const harness = componentHarness("../../../www/src/components/CheckoutCancelClient.tsx", {
    "./SiteLocaleProvider": { useSiteLocale: () => ({ locale: "en" }) },
    "../lib/site": { siteConfig: { appUrl: "https://app.scoretransposer.com", siteUrl: "https://scoretransposer.com" }, getCheckoutUrl: () => "/pricing", getSupportUrl: () => "/support" },
    "../lib/api": { apiRequest: async (path: string) => { requests.push(path); return { ok: true, data: { order: { status: "pending" }, verification: { status: "fulfillment_failed", retryable: true } } }; } },
  });
  harness.render("CheckoutCancelClient", { orderId: "pending-original", token: "public-token", provider: "stripe", copy: { nextSteps: [] }, translationNotice: "" });
  harness.flushEffects();
  await new Promise(resolve => setImmediate(resolve));
  const destination = new URL(harness.browser.location.href);
  assert.match(destination.searchParams.get("next") ?? "", /^\/checkout\/success\?/u);
  assert.equal(requests.length, 1, "uncertain fulfillment cannot consume a cancellation handoff or create another order");
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
  assert.ok(text(tree).includes(getScorePassCopy("en").topUp.replace("{price}", "US$2.99")));
  targeted.dispose();
});

test("upgrade modal sends all three v7 plans with exact export options to hosted checkout", async () => {
  for (const code of ["single-score", "starter-monthly", "converter-pro-monthly"] as const) {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    let release: (result: unknown) => void = () => {};
    const harness = componentHarness("../components/ScorePassUpgradeModal.tsx", {
      "next/link": "a", "./ScorePassUpgradeModal.module.css": { recommended: "recommended" },
      "@score/ui": { PostRecognitionValue: "value-hook", workbenchCopy },
      "../lib/auth-storage": { getStoredToken: () => "auth-token" },
      "../lib/flow-return": { saveCheckoutReturn() {} },
      "../lib/api": { apiRequest: (path: string, init?: RequestInit) => { calls.push({ path, init }); return new Promise(resolve => { release = resolve; }); } },
    });
    const action = { kind: "export", format: "png", options: { pageSize: "a4", imageResolutionDpi: 300, trimImage: true } };
    const tree = harness.render("ScorePassUpgradeModal", { documentId: "score-1", action, locale: "en", topUp: true, onClose() {} });
    const hook = nodes(tree).find(node => node.type === "value-hook")!;
    assert.ok(hook, "v7 value panel is connected to the existing checkout flow");
    hook.props.onPurchase(code); hook.props.onPurchase(code);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.length, 1, "rapid duplicate clicks create one checkout");
    const payload = JSON.parse(String(calls[0].init?.body));
    assert.equal(payload.targetDocumentId, "score-1"); assert.deepEqual(payload.intendedAction, action);
    assert.equal(payload.planCode, code); assert.equal(payload.provider, "stripe");
    assert.equal(payload.billingKind, code === "single-score" ? "one_time" : "subscription");
    assert.ok(new Headers(calls[0].init?.headers).get("Idempotency-Key"));
    release({ ok: true, data: { orderId: "order-topup", url: "https://checkout.stripe.com/test-only" } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(harness.browser.location.href, "https://checkout.stripe.com/test-only");
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
  assert.deepEqual(routes, ["/scores/part-1?checkoutOrderId=topup-order"]);
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

test("server return path restores its query and panel, and upload recognition waits for an explicit click", async () => {
  for (const requiresConfirmation of [true, false]) {
    const routes: string[] = [], requests: Array<{ path: string; init?: RequestInit }> = [];
    const context = { site: "app", path: "/scores/score-1?tab=custom#export-center", successSite: "app", successPath: "/scores/score-1?tab=custom#export-center", state: { version: 1, intent: "continue_action", panel: "export-center", ...(requiresConfirmation ? { confirmation: "required", uploadDraftId: "draft-1" } : {}) } };
    const router = { replace: (path: string) => routes.push(path), refresh() {} }; const signIn = () => {};
    const harness = componentHarness("../components/AppCheckoutStatusClient.tsx", {
      "next/link": "a", "next/navigation": { useRouter: () => router }, "./AppAuthModal": { useAppAuthModal: () => signIn },
      "../lib/auth-storage": { getStoredToken: () => null, clearStoredToken() {} },
      "../lib/flow-messages/client": { useFlowMessages: () => ({}) },
      "../lib/flow-return": { readCheckoutReturn: () => ({ next: "/scores/cache#wrong", retry: "/checkout", createdAt: 1 }) },
      "../lib/analytics": { trackFunnelEventOnce() {} },
      "../lib/api": { apiRequest: async (path: string, init?: RequestInit) => {
        requests.push({ path, init });
        if (path === "/api/auth/me") return { ok: true, data: { user: { id: "owner", entitlement: { status: "active" } } } };
        if (path.endsWith("/return")) return { ok: true, data: { returnContext: context } };
        if (path.endsWith("/continue")) return { ok: true, data: { documentId: "score-1", job: { id: "only-job" } } };
        return { ok: true, data: { verification: { status: "ready" }, order: { id: "order", userId: "owner", status: "paid", planCode: "starter-monthly", returnContext: context, continuation: { documentId: "score-1", available: true, consumed: false } } } };
      } },
    });
    const props = { orderId: "order", token: "locator", returnToken: "one-time", provider: "stripe", locale: "en", copy: getBillingMessages("en").checkout.status };
    harness.render("AppCheckoutStatusClient", props); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
    harness.render("AppCheckoutStatusClient", props); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(routes, ["/scores/score-1?tab=custom&checkoutOrderId=order#export-center"]);
    assert.equal(requests.filter(request => request.path.endsWith("/continue")).length, requiresConfirmation ? 0 : 1);
    const handoff = requests.find(request => request.path.endsWith("/return"))!;
    assert.deepEqual(JSON.parse(String(handoff.init?.body)), { returnToken: "one-time" });
    assert.ok(requests.some(request => request.path.endsWith("/owned")));
    harness.dispose();
  }
});

test("cancel authenticates by cookie, consumes only during POST handoff and restores server origin", async () => {
  const routes: string[] = [], requests: Array<{ path: string; init?: RequestInit }> = [];
  const context = { site: "app", path: "/scores/score-1?tab=edit#export-center", successSite: "app", successPath: "/scores/score-1", state: { version: 1, intent: "restore_view" } };
  const router = { replace: (path: string) => routes.push(path) }; const signIn = () => { throw new Error("cookie session must not prompt login"); };
  const harness = componentHarness("../components/AppCheckoutCancelClient.tsx", {
    "next/link": "a", "next/navigation": { useRouter: () => router }, "./AppAuthModal": { useAppAuthModal: () => signIn }, "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
    "../lib/auth-storage": { getStoredToken: () => null }, "../lib/flow-messages/client": { useFlowMessages: () => ({}) },
    "../lib/flow-return": { readCheckoutReturn: () => ({ next: "/scores/cache", retry: "/checkout", createdAt: 1 }) },
    "../lib/api": { apiRequest: async (path: string, init?: RequestInit) => { requests.push({ path, init }); return path.endsWith("/return") ? { ok: true, data: { returnContext: context } } : { ok: true, data: { order: { status: "pending", planCode: "single-score", billingKind: "one_time", returnContext: context } } }; } },
  });
  harness.render("AppCheckoutCancelClient", { orderId: "order", token: "locator", returnToken: "once", title: "Cancelled", body: "Original work" }); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests[0].path, "/api/payments/orders/order/owned"); assert.equal(requests[0].init?.method, undefined);
  assert.equal(requests[1].init?.method, "POST"); assert.deepEqual(JSON.parse(String(requests[1].init?.body)), { returnToken: "once" });
  assert.match(routes[0], /^\/scores\/score-1\?tab=edit&checkoutOrderId=order&checkoutResult=cancelled/u); assert.ok(routes[0].endsWith("#export-center")); assert.doesNotMatch(routes[0], /once|locator/);
  harness.dispose();
});

test("owned order recovery includes paid subscriptions after return tokens expire", async () => {
  const calls: string[] = [];
  const harness = componentHarness("../components/OwnedCheckoutRecovery.tsx", {
    "../lib/auth-storage": { getStoredToken: () => null },
    "../lib/api": { apiRequest: async (path: string) => { calls.push(path); return { ok: true, data: { orders: [{ id: "paid", provider: "stripe", token: "owned-locator", status: "paid", planCode: "starter-annual", createdAt: "2026-10-15T00:00:00Z" }, { id: "refunded", provider: "stripe", token: "old", status: "paid", purchaseStatus: "refunded", createdAt: "2026-10-15T00:00:00Z" }] } }; } },
  });
  harness.render("OwnedCheckoutRecovery", { locale: "en" }); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
  const links = nodes(harness.render("OwnedCheckoutRecovery", { locale: "en" })).filter(node => node.type === "a");
  assert.deepEqual(calls, ["/api/payments/orders"]); assert.equal(links.length, 1); assert.match(links[0].props.href, /order_id=paid&token=owned-locator&provider=stripe/u);
  harness.dispose();
});

test("cancel preserves unresolved payment verification without announcing cancellation or consuming return handoff", async () => {
  for (const status of ["waiting_fulfillment", "fulfillment_failed", "verification_failed"]) {
    const routes: string[] = [], requests: Array<{ path: string; init?: RequestInit }> = [];
    const router = { replace: (path: string) => routes.push(path) }; const signIn = () => {};
    const harness = componentHarness("../components/AppCheckoutCancelClient.tsx", {
      "next/link": "a", "next/navigation": { useRouter: () => router }, "./AppAuthModal": { useAppAuthModal: () => signIn }, "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
      "../lib/auth-storage": { getStoredToken: () => null }, "../lib/flow-messages/client": { useFlowMessages: () => ({ waitingAccess: "Checking original order" }) },
      "../lib/flow-return": { readCheckoutReturn: () => ({ next: "/scores/original", retry: "/checkout", createdAt: 1 }) },
      "../lib/api": { apiRequest: async (path: string, init?: RequestInit) => { requests.push({ path, init }); return { ok: true, data: { order: { status: "pending" }, token: "owner-token", verification: { status } } }; } },
    });
    const props = { orderId: "order", returnToken: "unused-once", title: "Cancelled notice", body: "Cancelled body" };
    harness.render("AppCheckoutCancelClient", props); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(requests.map(request => request.path), ["/api/payments/orders/order/owned"]);
    assert.equal(requests.some(request => request.init?.method === "POST"), false);
    assert.deepEqual(routes, ["/checkout/success?order_id=order&token=owner-token&provider=stripe&return_token=unused-once"]);
    assert.doesNotMatch(text(harness.render("AppCheckoutCancelClient", props)), /Cancelled notice|Cancelled body/u);
    harness.dispose();
  }
});

test("checkout waits for a resolved session before displaying a real sign-in action", async () => {
  const harness = componentHarness("../components/AppCheckoutClient.tsx", {
    "./AppCheckout.module.css": {}, "./AuthForm": { AuthForm: "auth-form" },
    "../lib/auth-storage": { getStoredToken: () => null },
    "../lib/flow-messages/client": { useFlowMessages: () => ({}) },
    "../lib/api": { apiRequest: async () => ({ ok: false, status: 401, error: "Sign in" }) },
  });
  const props = { selectedPlan: { code: "single-score", name: "One Score Pass", cycle: "one-time", price: "US$2.99", credits: "10" }, locale: "en", authMessages: getAuthMessages("en").form, copy: getBillingMessages("en").checkout.client };
  assert.equal(nodes(harness.render("AppCheckoutClient", props)).filter(node => node.type === "auth-form").length, 0);
  harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(nodes(harness.render("AppCheckoutClient", props)).filter(node => node.type === "auth-form").length, 1);
  harness.dispose();
});

test("all checkout plans retain continue=1, top_up, query and panel in Google redirect fallback", () => {
  const shared = createRequire(import.meta.url)("@score/shared");
  for (const plan of ["single-score", "starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"]) {
    for (const billing of plan === "single-score" ? ["one_time"] : ["one_time", "subscription"]) {
      let launched: { returnPath: string } | undefined;
      const harness = componentHarness("../components/AuthForm.tsx", {
        "@score/shared": { ...shared, launchGoogleSignIn: (options: typeof launched) => { launched = options; return { cancel() {} }; } },
        "next/link": "a", "next/script": "script", "next/navigation": { useRouter: () => ({ refresh() {} }) },
        "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
        "../lib/auth-storage": { getStoredToken: () => null, subscribeAuthChanges() {}, getServerAuthToken: () => null },
      });
      const params = new URLSearchParams({ plan, billing, next: "/scores/one?tab=edit#export-center", passMode: "top_up", targetDocumentId: "one", return_token: "original-order-locator" });
      const path = `/checkout?${params}#checkout-action`;
      Object.assign(harness.browser.location, { pathname: "/checkout", search: `?${params}`, hash: "#checkout-action", href: `https://scoretransposer.com${path}` });
      params.set("continue", "1");
      const tree = harness.render("AuthForm", { mode: "login", redirectTo: `/checkout?${params}`, onAuthenticated() {}, messages: getAuthMessages("en").form });
      nodes(tree).find(node => node.type === "button" && text(node).includes("Google"))!.props.onClick();
      assert.ok(launched);
      const result = new URL(launched.returnPath, harness.browser.location.origin);
      assert.equal(result.searchParams.get("plan"), plan); assert.equal(result.searchParams.get("billing"), billing);
      assert.equal(result.searchParams.get("continue"), "1"); assert.equal(result.searchParams.get("passMode"), "top_up");
      assert.equal(result.searchParams.get("next"), "/scores/one?tab=edit#export-center");
      assert.equal(result.searchParams.get("return_token"), "original-order-locator"); assert.equal(result.hash, "#checkout-action");
    }
  }
});

test("AuthForm responds to a cookie restore after its first anonymous render", async () => {
  let token: string | null = null;
  let lookups = 0;
  const next = "/jobs?filter=processing#original-job";
  const harness = componentHarness("../components/AuthForm.tsx", {
    "next/link": "a", "next/script": "script", "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
    "../lib/auth-storage": { getStoredToken: () => token, subscribeAuthChanges() {}, getServerAuthToken: () => null },
    "../lib/api": { apiRequest: async () => { lookups++; return { ok: true, data: { user: { id: "restored-user" } } }; } },
  });
  const props = { mode: "login", redirectTo: next, messages: getAuthMessages("en").form };
  harness.render("AuthForm", props); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(lookups, 0);
  token = "cookie-restored-session";
  harness.render("AuthForm", props); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(lookups, 1); assert.equal(harness.browser.location.href, next);
  harness.dispose();
});

test("a gate 401 clears the stale token and waits for the user's Google click", async () => {
  let token: string | null = "expired-session";
  let clicks = 0;
  const signIn = () => { clicks++; };
  const harness = componentHarness("../components/EntitlementGate.tsx", {
    "next/link": "a", "next/navigation": { useRouter: () => ({ replace() {} }) },
    "./AppAuthModal": { useAppAuthModal: () => signIn },
    "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
    "../lib/auth-storage": { getStoredToken: () => token, clearStoredToken: () => { token = null; }, subscribeAuthChanges() {}, getServerAuthToken: () => null },
    "../lib/flow-messages/client": { useFlowMessages: () => ({ signInLabel: "Sign in" }) },
    "../lib/api": { apiRequest: async () => ({ ok: false, status: 401, error: "Sign in" }) },
  });
  const props = { children: null, copy: getAuthMessages("en").entitlement };
  harness.render("EntitlementGate", props); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(token, null); assert.equal(clicks, 0, "an automatic 401 cannot open a popup");
  const buttons = nodes(harness.render("EntitlementGate", props)).filter(node => node.type === "button");
  assert.equal(buttons.length, 1); buttons[0].props.onClick(); assert.equal(clicks, 1);
  harness.dispose();
});

test("activation submits start Google synchronously, then redeem once without another click", async () => {
  let token: string | null = null;
  let finish: (() => void) | undefined;
  const requests: Array<{ path: string; init: RequestInit }> = [];
  const router = { push() {}, refresh() {} };
  const harness = componentHarness("../components/ActivationForm.tsx", {
    "next/navigation": { useRouter: () => router },
    "./AppAuthModal": { useAppAuthModal: () => (_mode: string, callback: () => void) => { finish = callback; } },
    "../lib/auth-storage": { getStoredToken: () => token, subscribeAuthChanges() {}, getServerAuthToken: () => null },
    "../lib/api": { apiRequest: async (path: string, init: RequestInit) => { requests.push({ path, init }); return { ok: true, data: { ok: true, entitlement: null } }; } },
  });
  const props = { copy: getBillingMessages("en").activation.form, returnTo: "/scores/one#visual-editor" };
  let tree = harness.render("ActivationForm", props);
  nodes(tree).find(node => node.type === "input")!.props.onChange({ target: { value: "ACTIVATION-LOCAL-FIXTURE" } });
  tree = harness.render("ActivationForm", props);
  nodes(tree).find(node => node.type === "form")!.props.onSubmit({ preventDefault() {} });
  assert.ok(finish); assert.equal(requests.length, 0);
  token = "restored-verified-session"; finish(); finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length, 1); assert.equal(requests[0].path, "/api/activation/redeem");
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), { code: "ACTIVATION-LOCAL-FIXTURE" });
  assert.equal(new Headers(requests[0].init.headers).get("Authorization"), "Bearer restored-verified-session");
});

test("a click while app session is checking reserves the popup and continues the verified account", async () => {
  let status = "checking", closed = 0, completed = 0, launches = 0;
  let resolveSession: (value: string) => void = () => {};
  const shared = createRequire(import.meta.url)("@score/shared");
  const harness = componentHarness("../components/AppAuthModal.tsx", {
    "@score/shared": { ...shared, launchGoogleSignIn: () => { launches++; return { cancel() {} }; } },
    "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
    "../lib/auth-storage": { getSessionStatus: () => status, restoreSessionFromCookie: () => new Promise(resolve => { resolveSession = resolve; }) },
  });
  harness.browser.open = () => ({ close() { closed++; } });
  const tree = harness.render("AppAuthModalProvider", { children: null, messages: getAuthMessages("en") });
  tree.props.value("login", () => { completed++; });
  assert.equal(closed, 0); assert.equal(launches, 0); assert.equal(completed, 0);
  status = "signed-in"; resolveSession("signed-in");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, 1); assert.equal(completed, 1); assert.equal(launches, 0);
});

test("app One Tap closes its frame when client navigation enters checkout", () => {
  const shared = createRequire(import.meta.url)("@score/shared");
  let pathname = "/scores", initialized = 0, closes = 0;
  const script = { addEventListener() {}, removeEventListener() {} };
  const frame = { src: "https://scoretransposer.com/api/auth/google-one-tap?parent=https%3A%2F%2Fscoretransposer.com&locale=en&g_csrf_token=fixture", contentWindow: { postMessage(message: { type: string }, origin: string) { assert.equal(message.type, "close"); assert.equal(origin, "https://scoretransposer.com"); closes++; } } };
  const harness = componentHarness("../components/AppGoogleOneTap.tsx", {
    "@score/shared": shared,
    "next/navigation": { usePathname: () => pathname },
    "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
    "../lib/auth-storage": { getSessionStatus: () => "signed-out", getServerSessionStatus: () => "checking", subscribeAuthChanges() {} },
    "test/document": { querySelector: () => script, querySelectorAll: () => [frame] },
  });
  Object.assign(harness.browser, { google: { accounts: { id: { initializeIntermediate() { initialized++; } } } } });
  harness.browser.location.pathname = pathname;
  harness.render("AppGoogleOneTap", { paused: false }); harness.flushEffects();
  assert.equal(initialized, 1);
  pathname = "/checkout"; harness.browser.location.pathname = pathname;
  harness.render("AppGoogleOneTap", { paused: false }); harness.flushEffects();
  assert.equal(closes, 1); assert.equal(initialized, 1);
  harness.dispose();
});

test("the free upload gate keeps its child mounted in the same slot after login", async () => {
  let token: string | null = null;
  const signIn = () => {};
  const child = { type: "selected-file-workbench", props: { file: "in-memory-fixture" } };
  const router = { replace() {} };
  const harness = componentHarness("../components/EntitlementGate.tsx", {
    "next/link": "a", "next/navigation": { useRouter: () => router },
    "./AppLocaleProvider": { useAppLocale: () => ({ locale: "en" }) },
    "./AppAuthModal": { useAppAuthModal: () => signIn },
    "../lib/auth-storage": { getStoredToken: () => token, subscribeAuthChanges() {}, getServerAuthToken: () => null },
    "../lib/flow-messages/client": { useFlowMessages: () => ({ signInLabel: "Sign in" }) },
    "../lib/api": { apiRequest: async () => token ? { ok: true, data: { user: { entitlement: { status: "active" } } } } : { ok: false, status: 401, error: "Sign in" } },
  });
  const props = { children: child, allowFreePreview: true, copy: getAuthMessages("en").entitlement };
  harness.render("EntitlementGate", props); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
  const guest = harness.render("EntitlementGate", props);
  assert.equal(guest.type, "div"); assert.equal(guest.props.children[1], child);
  token = "verified-session";
  harness.render("EntitlementGate", props); harness.flushEffects(); await new Promise(resolve => setImmediate(resolve));
  const signedIn = harness.render("EntitlementGate", props);
  assert.equal(signedIn.type, "div"); assert.equal(signedIn.props.children[0], null);
  assert.equal(signedIn.props.children[1], child, "the file owner remains in the same React child slot");
  harness.dispose();
});
