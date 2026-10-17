import assert from "node:assert/strict";
import test from "node:test";
import { googleLoginDestination, publicLoginResume, publicSessionState } from "./google-login";
import { purchaseReturnContext } from "./checkout-return";
import { readPendingPurchase, savePendingPurchase } from "./purchase-flow";
import { SUPPORTED_LOCALES, getScoreProcessingFailureMessages, getScoreRecognitionSupportMessage } from "@score/i18n";
import { getHomeRuntimeCopy } from "./home-runtime-copy";
import { homeProcessingFailure } from "./home-runtime-client";

const app = "https://app.scoretransposer.com";
test("current-language homepage runtime slices preserve all original recovery and support messages", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getHomeRuntimeCopy(locale);
    for (const error of [null, "unknown failure", "too low interline", "low-resolution", "time-out", "timed out", "budget exhausted", "execution budget", "not configured", "could not start", "missing from storage", "adapter is missing", "STORAGE_CAPACITY_REACHED", "storage capacity temporarily unavailable"]) {
      assert.deepEqual(homeProcessingFailure(error, copy.failure), getScoreProcessingFailureMessages(locale, error), `${locale}:${error}`);
    }
    for (const code of ["READY", "PDF_ADAPTIVE_RENDER", "PDF_INVALID", "PDF_PAGE_PIXEL_LIMIT", "RECOGNITION_CAPACITY_LIMIT", "unknown"]) {
      assert.equal(copy.support[code] ?? copy.support.fallback, getScoreRecognitionSupportMessage(locale, code), `${locale}:${code}`);
    }
  }
});
test("public session remains checking on unknown, network failure or server failure", () => {
  assert.equal(publicSessionState(false), "checking");
  assert.equal(publicSessionState(false, 0), "checking");
  assert.equal(publicSessionState(false, 503), "checking");
  assert.equal(publicSessionState(false, 401), "signed-out");
  assert.equal(publicSessionState(true), "signed-in");
});

test("Google login preserves actual task destination and full query and hash", () => {
  assert.equal(googleLoginDestination(`${app}/login`, app), null);
  const next = "/scores/original?task=transpose&continue=1#visual-editor";
  assert.equal(googleLoginDestination(`${app}/login?${new URLSearchParams({ next })}`, app), `${app}${next}`);
  const wrapper = `${app}/api/locale?${new URLSearchParams({ locale: "fr", next: `/login?${new URLSearchParams({ next })}` })}`;
  const result = new URL(googleLoginDestination(wrapper, app)!);
  assert.equal(result.pathname, "/api/locale");
  assert.equal(result.searchParams.get("locale"), "fr");
  assert.equal(result.searchParams.get("next"), next);
  for (const page of ["/scores", "/jobs?status=running#latest", "/classrooms", "/student/assignments", "/billing#restore-checkout-orders", "/activate?code=sample#redeem", "/checkout/success?order_id=old-order#status"]) {
    assert.equal(googleLoginDestination(`${app}${page}`, app), `${app}${page}`);
  }
});

test("Google navigation rejects hostile origins, auth loops and encoded redirect paths", () => {
  for (const value of ["//evil.invalid", "https://evil.invalid/scores", "/\\evil.invalid", "/%2f%2fevil.invalid", "/%255cevil.invalid", "/scores/%0dfoo", "/scores\u0000x", "/api/auth/google/callback"]) {
    assert.equal(googleLoginDestination(`${app}/login?${new URLSearchParams({ next: value })}`, app), null, value);
  }
  assert.equal(googleLoginDestination("https://evil.invalid/scores", app), null);
  assert.equal(googleLoginDestination(`${app}/api/locale?${new URLSearchParams({ next: "https://evil.invalid/scores" })}`, app), null);
});

test("redirect continuation is short lived, exact-page bound and explicitly selected", () => {
  const path = "/fr/pricing?plan=single-score&continue=1&passMode=top_up#pricing";
  const value = { savedAt: 1_000_000, path, purchase: true, destination: `${app}/scores/original?mode=complex#review` };
  const resumed = publicLoginResume(JSON.stringify(value), path, app, 1_000_001);
  assert.equal(resumed?.purchase, true);
  assert.equal(resumed?.destination, value.destination);
  assert.equal(publicLoginResume(JSON.stringify(value), "/pricing", app, 1_000_001), null);
  assert.equal(publicLoginResume(JSON.stringify(value), path, app, 1_600_001), null);
  assert.equal(publicLoginResume(JSON.stringify(value), path, app, 999_999), null);
  assert.equal(publicLoginResume("broken", path, app), null);
  assert.equal(publicLoginResume(JSON.stringify({ ...value, purchase: "true", destination: "https://evil.invalid" }), path, app, 1_000_001)?.purchase, false);
});

test("every explicit plan survives login with B2 top-up, continue, original page and action intact", () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); }, removeItem: (key: string) => { memory.delete(key); } };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: storage } });
  try {
    for (const planCode of ["single-score", "starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"] as const) {
      for (const billingKind of ["one_time", "subscription"] as const) {
        if (planCode === "single-score" && billingKind === "subscription") continue;
        const plan = { planCode, billingKind, provider: "stripe" as const, name: planCode, cycle: billingKind, price: "$2.99" };
        savePendingPurchase(plan);
        assert.deepEqual(readPendingPurchase(), plan);
        const next = "/scores/original?mode=complex#export-center";
        const query = new URLSearchParams({ plan: planCode, billing: billingKind, continue: "1", passMode: "top_up", target: "original", next, action: JSON.stringify({ type: "export", format: "pdf" }) });
        const context = purchaseReturnContext({ pathname: "/pricing", search: `?${query}`, hash: "#pricing" });
        assert.equal(context.returnPath, next);
        assert.equal(context.returnSite, "app");
        assert.equal(context.passMode, "top_up");
        assert.equal(context.targetDocumentId, "original");
        assert.deepEqual(context.intendedAction, { type: "export", format: "pdf" });
      }
    }
    memory.set("scoretransposer_pending_purchase", JSON.stringify({ planCode: "single-score", billingKind: "one_time", provider: "stripe", name: "x", cycle: "x", price: "x", savedAt: Date.now() + 60_000 }));
    assert.equal(readPendingPurchase(), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous); else Reflect.deleteProperty(globalThis, "window");
  }
});
