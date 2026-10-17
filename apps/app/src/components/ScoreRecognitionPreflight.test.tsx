import assert from "node:assert/strict";
import test from "node:test";
import { load } from "cheerio";
import { renderToStaticMarkup } from "react-dom/server";
import { SUPPORTED_LOCALES, formatMessage, formatNumber, getScoreRecognitionSupportMessage, type SupportedLocale } from "@score/i18n";
import type { ScoreStructurePreflight } from "@score/shared";
import { getAuthMessages } from "../lib/auth-messages";
import { getFlowMessages } from "../lib/flow-messages";
import { FlowMessagesProvider } from "../lib/flow-messages/client";
import { AppAuthModalProvider } from "./AppAuthModal";
import { AppLocaleProvider } from "./AppLocaleProvider";
import { OneScorePassUpsell } from "./OneScorePassUpsell";
import { ScoreRecognitionPreflight } from "./ScoreRecognitionPreflight";

const file = new File(["score"], "score.pdf", { type: "application/pdf" });
const result: ScoreStructurePreflight = {
  schemaVersion: 1, recommendation: "simple", confidence: "high", sourcePageCount: 1, pagesAnalyzed: 1, complete: true,
  reasonCodes: ["PIANO_STAFF_LAYOUT"], pages: [{ page: 1, staffCount: 4, systemCount: 2, maxStavesPerSystem: 2, hasTab: false, uncertain: false }],
  recognitionSupport: { supported: true, code: "READY" },
  memoryAssessment: { version: 1, capacityVersion: "cx33-test", lane: "normal", estimatedMemoryMb: 600, reasonCodes: [], waitEstimateSeconds: [0, 0], sourcePageCount: 1, maxPagePixels: 2_796_000, enabled: true },
};

function renderPreflight(locale: SupportedLocale, preflight: ScoreStructurePreflight, compact = false) {
  return renderToStaticMarkup(<AppLocaleProvider locale={locale}>
    <FlowMessagesProvider messages={getFlowMessages(locale)}>
      <ScoreRecognitionPreflight state={{ status: "ready", file, result: preflight, stagedUploadId: "staged-test", stagedUploadExpiresAt: "2026-10-18T00:00:00.000Z" }} mode="complex" compact={compact} onRetry={() => undefined} />
    </FlowMessagesProvider>
  </AppLocaleProvider>);
}

test("refused preflights show one refusal and no support or recommendation in every locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const flow = getFlowMessages(locale);
    const refusals: ScoreStructurePreflight[] = [
      { ...result, memoryAssessment: { ...result.memoryAssessment!, lane: "unsupported" } }, // Defend against stale contradictory responses too.
      { ...result, memoryAssessment: { ...result.memoryAssessment!, lane: "unsupported" }, recognitionSupport: { supported: false, code: "RECOGNITION_CAPACITY_LIMIT" } },
      { ...result, recognitionSupport: { supported: false, code: "PDF_TOTAL_PIXEL_LIMIT" } },
      { ...result, recognitionSupport: { supported: false, code: "PDF_INVALID" } },
    ];
    for (const compact of [false, true]) for (const refusal of refusals) {
      const $ = load(renderPreflight(locale, refusal, compact));
      assert.equal($("[role='alert']").length, 1, locale);
      assert.equal($("[data-recognition-lane='unsupported']").length, 1, locale);
      assert.equal($("[role='status'], [data-preflight-recommendation], [data-recognition-plans], [data-large-file-reason]").length, 0, locale);
      for (const text of [getScoreRecognitionSupportMessage(locale, "READY"), getScoreRecognitionSupportMessage(locale, "PDF_ADAPTIVE_RENDER"), flow.preflight.recommendedSimple, flow.preflight.recommendedComplex, flow.preflight.freeBody]) {
        assert.equal($.root().text().includes(text), false, `${locale}: ${text}`);
      }
    }
  }
});

test("accepted photos stay in the standard lane even with complex recognition selected", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const $ = load(renderPreflight(locale, { ...result, recommendation: "uncertain", confidence: "low" }));
    assert.equal($("[data-recognition-lane='normal']").length, 1, locale);
    assert.equal($("[data-recognition-lane='big'], [data-recognition-lane='unsupported'], [role='alert']").length, 0, locale);
    assert.ok($.root().text().includes(getScoreRecognitionSupportMessage(locale, "READY")), locale);
    const copy = getFlowMessages(locale).recognitionExperience;
    assert.ok($.root().text().includes(copy.normalBody), locale);
    assert.equal($("[data-recognition-plans] li").length, 3, locale);
    for (const text of [copy.freePlan, copy.passPlan, copy.starterPlan, copy.creditRule]) assert.ok($.root().text().includes(text), locale);
  }
});

test("large-file preflights explain file size and actual pages even in compact view", () => {
  for (const locale of SUPPORTED_LOCALES) for (const pages of [6, 11, 21]) for (const compact of [false, true]) {
    const copy = getFlowMessages(locale).recognitionExperience;
    const $ = load(renderPreflight(locale, { ...result, sourcePageCount: pages, memoryAssessment: { ...result.memoryAssessment!, lane: "big", sourcePageCount: pages } }, compact));
    assert.equal($("[data-large-file-reason]").text(), formatMessage(copy.bigReason, { pages: formatNumber(pages, locale) }), locale);
    assert.ok($("[data-large-file-reason]").text().includes(formatNumber(pages, locale)), locale);
    assert.equal($("[data-recognition-lane='big']").length, 1, locale);
    assert.equal($("[data-recognition-plans] li").length, 3, locale);
    assert.doesNotMatch($.root().text(), /MiB|\{pages\}/u, locale);
  }
});

test("large-lane free-user purchase controls retain Starter primary and the $2.99 pass secondary", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const flow = getFlowMessages(locale);
    const html = renderToStaticMarkup(<AppLocaleProvider locale={locale}>
      <FlowMessagesProvider messages={flow}>
        <AppAuthModalProvider messages={getAuthMessages(locale)}>
          <OneScorePassUpsell source="score_import" starterPrimary onSubscriptionClick={() => undefined} />
        </AppAuthModalProvider>
      </FlowMessagesProvider>
    </AppLocaleProvider>);
    const $ = load(html);
    const buttons = $("[data-upsell-primary='starter'] button");
    assert.equal(buttons.length, 2, locale);
    assert.equal(buttons.eq(0).attr("data-plan-type"), "subscription", locale);
    assert.equal(buttons.eq(0).hasClass("button-primary"), true, locale);
    assert.equal(buttons.eq(0).text(), flow.recognitionExperience.starterCta, locale);
    assert.equal(buttons.eq(1).attr("data-plan-type"), "one_score", locale);
    assert.equal(buttons.eq(1).hasClass("button-secondary"), true, locale);
    assert.equal(buttons.eq(1).text(), flow.recognitionExperience.passCta, locale);
    assert.match(buttons.eq(1).text(), /2[.,]99/, locale);
  }
});
