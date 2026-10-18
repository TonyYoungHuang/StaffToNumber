import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { SUPPORTED_LOCALES, formatMessage, getScoreProcessingMessages, recognitionUsedPaidCredits } from "@score/i18n";
import { ProcessingProgress, RecognitionPlanSummary } from "@score/ui";
import { getFlowMessages } from "../lib/flow-messages";
import { FlowMessagesProvider, getScoreUploadProcessingLabel } from "../lib/flow-messages/client";
import { getAuthMessages } from "../lib/auth-messages";
import { getCheckoutReturnCopy } from "../lib/checkout-return-copy";
import { shareAvailability } from "../lib/share-availability";
import { AppAuthModalProvider } from "./AppAuthModal";
import { AppLocaleProvider } from "./AppLocaleProvider";
import { RecognitionPurchaseDialog } from "./RecognitionPurchaseDialog";
import { OneScorePassUpsell } from "./OneScorePassUpsell";
import { ScoreImportStatus } from "./ScoreImportStatus";

test("upload busy buttons and progress render string labels from the structured processing catalog in every locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const flow = getFlowMessages(locale);
    assert.equal(typeof flow.processing, "object", locale);
    assert.equal(Array.isArray(flow.processing), false, locale);
    assert.deepEqual(flow.processing, getScoreProcessingMessages(locale), locale);

    const label = getScoreUploadProcessingLabel(flow);
    assert.equal(typeof label, "string", locale);
    assert.ok(label.trim().length > 0, locale);
    assert.equal(label, flow.processing.uploadTitle, locale);
    const $ = load(renderToStaticMarkup(<>
      <button type="submit" disabled>{label}</button>
      <ProcessingProgress active label={label} locale={locale} />
    </>));
    assert.equal($("button").text(), label, locale);
    assert.equal($("[data-processing-progress='active']").length, 1, locale);
    assert.equal($("[data-percent-progress] span").first().text(), label, locale);
    assert.equal($("[role='progressbar']").attr("aria-label"), label, locale);
  }
});

test("FA-03 upload payment options are an accessible modal containing both plans and the large-file reason", () => {
  for (const locale of ["en", "zh-CN"] as const) {
    const flow = getFlowMessages(locale), copy = flow.recognitionExperience;
    const $ = load(renderToStaticMarkup(<AppLocaleProvider locale={locale}><FlowMessagesProvider messages={flow}><AppAuthModalProvider messages={getAuthMessages(locale)}>
      <RecognitionPurchaseDialog><p>{formatMessage(copy.bigReason, { pages: "6" })}</p><RecognitionPlanSummary messages={copy} /><OneScorePassUpsell source="score_import" starterPrimary onSubscriptionClick={() => undefined} /></RecognitionPurchaseDialog>
    </AppAuthModalProvider></FlowMessagesProvider></AppLocaleProvider>));
    const dialog = $("dialog[data-recognition-purchase-dialog]");
    assert.equal(dialog.length, 1);
    assert.equal(dialog.attr("aria-label"), flow.paymentOptions);
    assert.ok(dialog.text().includes(formatMessage(copy.bigReason, { pages: "6" })));
    for (const value of [copy.freePlan, copy.passPlan, copy.starterPlan, copy.creditRule]) assert.ok(dialog.text().includes(value));
    assert.equal(dialog.find("[data-plan-type='subscription']").length, 1);
    assert.equal(dialog.find("[data-plan-type='one_score']").length, 1);
  }
});

test("FA-07 free and unknown-charge recognition failures never promise a credit return or retained pass", () => {
  for (const locale of ["en", "zh-CN"] as const) for (const params of [undefined, {}, { freeTrial: true, creditCost: 1, creditSource: "free_trial" }, { creditCost: 1, creditSource: "plan" }, { creditCost: 5, creditSource: "score_pass" }]) {
    const flow = getFlowMessages(locale);
    const $ = load(renderToStaticMarkup(<FlowMessagesProvider messages={flow}><ScoreImportStatus title="Test score" locale={locale} job={{ status: "failed", params }} busy={false} error={null} onRetry={() => undefined} onRefresh={() => undefined} /></FlowMessagesProvider>));
    assert.equal($.root().text().includes(flow.recognitionExperience.creditsOnly), recognitionUsedPaidCredits(params));
  }
});

test("FA-08 explicit share expiry is independent of membership and agrees with copy eligibility", () => {
  const now = Date.parse("2026-10-18T00:00:00Z");
  assert.equal(shareAvailability({ expiresAt: null }, now), "active");
  assert.equal(shareAvailability({ expiresAt: "2026-10-18T00:00:01Z" }, now), "active");
  for (const expiresAt of ["2026-01-01T00:00:00Z", "2026-10-18T00:00:00Z", "invalid"]) assert.equal(shareAvailability({ expiresAt }, now), "expired");
  assert.equal(shareAvailability({ revokedAt: "2026-01-01", expiresAt: "2027-01-01" }, now), "revoked");
});

test("failed and cancelled imports offer a primary retry in every locale, disabled while the request is pending", () => {
  for (const locale of SUPPORTED_LOCALES) for (const status of ["failed", "cancelled", "queued", "processing", "completed"] as const) for (const busy of [false, true]) {
    const flow = getFlowMessages(locale);
    const $ = load(renderToStaticMarkup(<FlowMessagesProvider messages={flow}><ScoreImportStatus title="Test score" locale={locale} job={{ status }} busy={busy} error={null} onRetry={() => undefined} onRefresh={() => undefined} /></FlowMessagesProvider>));
    const retry = $("button.button-primary");
    const canRetry = status === "failed" || status === "cancelled";
    assert.equal(retry.length, canRetry ? 1 : 0, `${locale}: ${status}`);
    if (canRetry) {
      assert.equal(retry.text(), flow.retry, locale);
      assert.equal(retry.is(":disabled"), busy, locale);
    }
  }
});

test("FA-09 missing-order return has a finished explanation in both customer languages", () => {
  assert.match(getCheckoutReturnCopy("en").missing, /no order reference.*return to your scores/);
  assert.match(getCheckoutReturnCopy("zh-CN").missing, /缺少订单编号.*返回乐谱列表/);
});
