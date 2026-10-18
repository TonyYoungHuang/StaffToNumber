import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { formatMessage, recognitionUsedPaidCredits } from "@score/i18n";
import { RecognitionPlanSummary } from "@score/ui";
import { getFlowMessages } from "../lib/flow-messages";
import { FlowMessagesProvider } from "../lib/flow-messages/client";
import { getAuthMessages } from "../lib/auth-messages";
import { getCheckoutReturnCopy } from "../lib/checkout-return-copy";
import { removeRecognitionPage } from "../lib/recognition-candidates";
import { shareAvailability } from "../lib/share-availability";
import { AppAuthModalProvider } from "./AppAuthModal";
import { AppLocaleProvider } from "./AppLocaleProvider";
import { RecognitionPurchaseDialog } from "./RecognitionPurchaseDialog";
import { OneScorePassUpsell } from "./OneScorePassUpsell";
import { ScoreImportStatus } from "./ScoreImportStatus";

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

test("FA-09 missing-order return has a finished explanation in both customer languages", () => {
  assert.match(getCheckoutReturnCopy("en").missing, /no order reference.*return to your scores/);
  assert.match(getCheckoutReturnCopy("zh-CN").missing, /缺少订单编号.*返回乐谱列表/);
});

test("removing a source page retains the other pages and candidates until the last page is removed", () => {
  const candidate = { id: "multi", sourcePages: [1, 3, 5] };
  const selected = ["multi", "other"];
  const first = removeRecognitionPage(selected, { multi: [1, 3, 5], other: [2] }, candidate, 3);
  assert.deepEqual(first, { selected, retained: { multi: [1, 5], other: [2] } });
  assert.deepEqual(candidate.sourcePages, [1, 3, 5], "the original recognition draft stays intact");
  const second = removeRecognitionPage(first.selected, first.retained, candidate, 1);
  const last = removeRecognitionPage(second.selected, second.retained, candidate, 5);
  assert.deepEqual(last, { selected: ["other"], retained: { multi: [], other: [2] } });
});
