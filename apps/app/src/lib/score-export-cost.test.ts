import assert from "node:assert/strict";
import test from "node:test";
import { localizeApiError, SUPPORTED_LOCALES } from "@score/i18n";
import { isCreditUpgradeError, scoreCheckoutPath, readCheckoutAction, saveContinuationNotice, takeContinuationNotice } from "./score-pass-checkout";
import { getScorePassCopy } from "./billing-messages/client";
import { getScoreDetailMessages } from "./score-detail-messages";
import { canRequestScoreExport, checkExportQuote, type ScoreExportQuote } from "./score-export-cost";

const shown: ScoreExportQuote = {
  balance: { available: 9, creditSource: "score_pass" }, downloadCreditCost: 0,
  options: [{ format: "pdf", creditCost: 1, canSubmit: true }, { format: "jianpu", creditCost: 0, canSubmit: true }],
};

test("unchanged costs proceed immediately, changed costs require a second explicit action", () => {
  assert.equal(checkExportQuote(shown, shown, "pdf"), "ready");
  const changed = { ...shown, options: [{ format: "pdf", creditCost: 2, canSubmit: true }] };
  assert.equal(checkExportQuote(shown, changed, "pdf"), "changed");
  assert.equal(checkExportQuote(changed, changed, "pdf"), "ready");
  assert.equal(checkExportQuote(shown, { ...shown, balance: { available: 3, creditSource: "monthly" } }, "pdf"), "ready");
  assert.equal(checkExportQuote(shown, { ...shown, options: [{ format: "pdf", creditCost: 1, canSubmit: false }] }, "pdf"), "insufficient");
  assert.equal(checkExportQuote(shown, null, "pdf"), "unavailable");
  assert.equal(checkExportQuote(shown, shown, "missing"), "unavailable");
  assert.equal(checkExportQuote(null, shown, "pdf"), "changed");
});

test("zero-credit direct exports remain free and report an existing access restriction separately", () => {
  assert.equal(checkExportQuote(shown, shown, "jianpu"), "ready");
  const restricted: ScoreExportQuote = { ...shown, options: [{ format: "jianpu", creditCost: 0, canSubmit: false, reason: "SCORE_PASS_QUEUED_EXPORT_REQUIRED" }] };
  assert.equal(checkExportQuote(shown, restricted, "jianpu"), "restricted");
});

test("free paid formats request checkout while TXT and Score JSON need no credit balance", () => {
  const free: ScoreExportQuote = { balance: { available: 0, creditSource: "monthly" }, downloadCreditCost: 0,
    options: [
      ...["pdf", "musicxml", "midi", "svg", "png", "wav", "mp3"].map(format => ({ format, creditCost: 1, canSubmit: false, reason: "SCORE_PASS_REQUIRED" as const })),
      { format: "jianpu", creditCost: 0, canSubmit: true }, { format: "score-json", creditCost: 0, canSubmit: true },
    ] };
  for (const format of ["pdf", "musicxml", "midi", "svg", "png", "wav", "mp3"]) {
    assert.equal(checkExportQuote(free, free, format), "paywall");
    assert.equal(checkExportQuote(null, free, format), "paywall", "newly blocked access takes precedence over price confirmation");
    assert.equal(canRequestScoreExport(free, format), true, "a free user's paid action must open checkout");
  }
  for (const format of ["jianpu", "score-json"]) assert.equal(checkExportQuote(free, free, format), "ready");
  assert.equal(canRequestScoreExport(null, "pdf"), false);
  assert.equal(canRequestScoreExport({ ...free, options: [{ format: "pdf", creditCost: 1, canSubmit: false }] }, "pdf"), false, "paid users with insufficient credits still need an upgrade");
});

test("all nine locales explain generation, downloads, balances and changed-price confirmation", () => {
  const english = getScoreDetailMessages("en").exports.cost;
  for (const locale of SUPPORTED_LOCALES) {
    const cost = getScoreDetailMessages(locale).exports.cost;
    assert.match(cost.generate, /\{format\}/u);
    for (const key of ["costSingle", "costMultiple", "download"] as const) assert.match(cost[key], /\{count\}/u);
    assert.match(cost.balance, /\{source\}/u);
    assert.match(cost.balance, /\{balance\}/u);
    if (locale !== "en") for (const key of Object.keys(english) as (keyof typeof english)[]) {
      if (key === "sources") continue;
      assert.notEqual(cost[key], english[key], `${locale}: ${key}`);
    }
    for (const source of ["monthly", "prepaid", "score_pass"] as const) assert.ok(cost.sources[source].trim());
  }
});


test("pass-covered TXT and Score JSON quotes remain submit-ready after all group credits are spent", () => {
  const exhausted: ScoreExportQuote = { balance: { available: 0, creditSource: "score_pass" }, downloadCreditCost: 0,
    options: [{ format: "jianpu", creditCost: 0, canSubmit: true }, { format: "score-json", creditCost: 0, canSubmit: true }, { format: "pdf", creditCost: 1, canSubmit: false }] };
  for (const format of ["jianpu", "score-json"]) assert.equal(checkExportQuote(exhausted, exhausted, format), "ready");
  assert.equal(checkExportQuote(exhausted, exhausted, "pdf"), "insufficient");
});

test("credit quota errors have native text in all nine locales", () => {
  const english = localizeApiError({ code: "PLAN_JOB_QUOTA_EXCEEDED", status: 429 }, "en");
  for (const locale of SUPPORTED_LOCALES) {
    const text = localizeApiError({ code: "PLAN_JOB_QUOTA_EXCEEDED", error: "internal details", status: 429 }, locale);
    assert.ok(text && text !== "internal details");
    if (locale !== "en") assert.notEqual(text, english, locale);
  }
});


test("checkout transport preserves export choices and recognizes purchase and exhausted-credit errors", () => {
  const action = { kind: "export" as const, format: "wav" as const, options: { sampleRate: 96000 as const, audioChannels: 2 as const, mutedPartIds: ["part-2"], tempoBpm: 80 } };
  const params = new URL(scoreCheckoutPath("part 1", action, true), "https://app.example").searchParams;
  assert.equal(params.get("targetDocumentId"), "part 1");
  assert.equal(params.get("passMode"), "top_up");
  assert.deepEqual(readCheckoutAction(params.get("intendedAction") ?? undefined), action);
  assert.equal(readCheckoutAction("{invalid"), undefined);
  assert.equal(readCheckoutAction("x".repeat(16_385)), undefined);
  assert.ok(isCreditUpgradeError({ status: 403, code: "SCORE_PASS_CREDITS_EXHAUSTED" }));
  assert.ok(isCreditUpgradeError({ status: 429, data: { code: "PLAN_JOB_QUOTA_EXCEEDED" } }));
  for (const code of ["SCORE_PASS_REQUIRED", "FREE_TRIAL_OMR_LIMIT_REACHED", "COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED", "BIG_RECOGNITION_ENTITLEMENT_REQUIRED"]) {
    assert.ok(isCreditUpgradeError({ status: 403, code }), code);
    assert.ok(isCreditUpgradeError({ status: 403, data: { code } }), code);
    assert.equal(isCreditUpgradeError({ status: 500, code }), false, code);
  }
  assert.equal(isCreditUpgradeError({ status: 429, code: "RATE_LIMITED" }), false);
});

test("a failed consumed continuation shows once and does not become another payment or job request", () => {
  const original = globalThis.window;
  const entries = new Map<string, string>();
  globalThis.window = { sessionStorage: { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key) } } as unknown as Window & typeof globalThis;
  try {
    const result = { documentId: "score-1", error: "Original failure", code: "SCORE_PASS_CREDITS_EXHAUSTED", statusCode: 403 };
    saveContinuationNotice(result);
    assert.equal(takeContinuationNotice("another-score"), null);
    assert.deepEqual(takeContinuationNotice("score-1"), result);
    assert.equal(takeContinuationNotice("score-1"), null);
  } finally { globalThis.window = original; }
});

test("all nine upgrade catalogs explain score-and-parts credit sharing and offer native continuation copy", () => {
  const english = getScorePassCopy("en");
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getScorePassCopy(locale);
    for (const key of Object.keys(english) as (keyof typeof english)[]) {
      assert.ok(copy[key].trim(), `${locale}/${key}`);
      if (locale !== "en") assert.notEqual(copy[key], english[key], `${locale}/${key}`);
    }
    assert.match(copy.sharedBalance, /\{balance\}/u);
    assert.match(copy.topUp, /\{price\}/u);
    assert.match(copy.newPass, /\{price\}/u);
  }
});
