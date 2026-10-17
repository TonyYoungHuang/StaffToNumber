import assert from "node:assert/strict";
import test from "node:test";
import { load } from "cheerio";
import { renderToStaticMarkup } from "react-dom/server";
import { SUPPORTED_LOCALES, formatMessage, formatNumber, getScorePreflightMessages, type SupportedLocale } from "@score/i18n";
import type { ScoreRecognitionOption, ScoreStructurePreflight } from "@score/shared";
import { getHomeRuntimeCopy } from "../lib/home-runtime-copy";
import { HomeRecognitionPreflightResult, isHomeRecognitionRejected } from "./HomeRecognitionPreflightResult";

const result: ScoreStructurePreflight = {
  schemaVersion: 1, recommendation: "uncertain", confidence: "low", sourcePageCount: 1, pagesAnalyzed: 1, complete: true,
  reasonCodes: ["NO_STAFF_DETECTED"], pages: [{ page: 1, staffCount: 0, systemCount: 0, maxStavesPerSystem: 0, hasTab: false, uncertain: true }],
  recognitionSupport: { supported: true, code: "READY" },
  memoryAssessment: { version: 1, capacityVersion: "cx33-test", lane: "normal", estimatedMemoryMb: 1536, reasonCodes: [], waitEstimateSeconds: [0, 0], sourcePageCount: 1, maxPagePixels: 8_294_400, enabled: true },
};

function renderResult(locale: SupportedLocale, preflight: ScoreStructurePreflight, options: ScoreRecognitionOption[] = []) {
  return load(renderToStaticMarkup(<HomeRecognitionPreflightResult locale={locale} copy={getScorePreflightMessages(locale)} runtimeCopy={getHomeRuntimeCopy(locale)} preflight={preflight} recognitionMode="complex" options={options} busy={false} onSelectMode={() => undefined} />));
}

test("homepage admission refusal excludes support, recommendations and mode prices in all nine locales", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const runtimeCopy = getHomeRuntimeCopy(locale);
    const refusals: ScoreStructurePreflight[] = [
      { ...result, memoryAssessment: { ...result.memoryAssessment!, lane: "unsupported" } },
      { ...result, memoryAssessment: { ...result.memoryAssessment!, lane: "unsupported" }, recognitionSupport: { supported: false, code: "RECOGNITION_CAPACITY_LIMIT" } },
      { ...result, recognitionSupport: { supported: false, code: "PDF_TOTAL_PIXEL_LIMIT" } },
      { ...result, recognitionSupport: { supported: false, code: "PDF_INVALID" } },
    ];
    for (const refusal of refusals) {
      const $ = renderResult(locale, refusal);
      assert.equal(isHomeRecognitionRejected(refusal), true, locale);
      assert.equal($("[role='alert'][data-recognition-lane='unsupported']").length, 1, locale);
      assert.equal($("[role='status'], [data-preflight-recommendation], [data-recognition-plans], fieldset, input, button").length, 0, locale);
      assert.equal($.root().text().includes(runtimeCopy.support.READY), false, locale);
      assert.equal($.root().text().includes(runtimeCopy.support.PDF_ADAPTIVE_RENDER), false, locale);
    }
    assert.equal(runtimeCopy.support.RECOGNITION_CAPACITY_LIMIT, runtimeCopy.recognitionExperience.unsupportedLane, locale);
  }
});

test("an available free scan is labelled free while paid modes retain their actual quote", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getScorePreflightMessages(locale);
    const $ = renderResult(locale, result, [
      { mode: "simple", creditCost: 1, creditSource: "free_trial", canSubmit: true, reason: null },
      { mode: "complex", creditCost: 5, creditSource: null, canSubmit: false, reason: "COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED" },
    ]);
    const labels = $("fieldset label");
    assert.ok(labels.eq(0).text().includes(copy.freeProjectPrice), locale);
    assert.ok(labels.eq(1).text().includes(formatMessage(copy.price, { credits: formatNumber(5, locale) })), locale);
  }
});

test("homepage low-confidence photos remain normal when complex mode is selected", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const $ = renderResult(locale, result);
    assert.equal(isHomeRecognitionRejected(result), false, locale);
    assert.equal($("[data-recognition-lane='normal']").length, 1, locale);
    assert.equal($("[data-recognition-lane='big'], [role='alert']").length, 0, locale);
    assert.equal($("input[type='radio']").length, 2, locale);
    assert.ok($.root().text().includes(getHomeRuntimeCopy(locale).support.READY), locale);
    const copy = getHomeRuntimeCopy(locale).recognitionExperience;
    assert.ok($.root().text().includes(copy.normalBody), locale);
    assert.equal($("[data-recognition-plans] li").length, 3, locale);
    for (const text of [copy.freePlan, copy.passPlan, copy.starterPlan, copy.creditRule]) assert.ok($.root().text().includes(text), locale);
  }
});

test("large files explain the reason with their actual page count in every locale", () => {
  for (const locale of SUPPORTED_LOCALES) for (const pages of [6, 11, 21]) {
    const copy = getHomeRuntimeCopy(locale).recognitionExperience;
    const $ = renderResult(locale, { ...result, sourcePageCount: pages, memoryAssessment: { ...result.memoryAssessment!, lane: "big", sourcePageCount: pages } });
    assert.equal($("[data-recognition-lane='big']").length, 1, locale);
    assert.equal($("[data-large-file-reason]").text(), formatMessage(copy.bigReason, { pages: formatNumber(pages, locale) }), locale);
    assert.ok($("[data-large-file-reason]").text().includes(formatNumber(pages, locale)), locale);
    assert.ok($.root().text().includes(copy.bigBody), locale);
    assert.equal($("[data-recognition-plans] li").length, 3, locale);
    assert.doesNotMatch($.root().text(), /1536|2048|\{pages\}/u, locale);
  }
});

test("homepage refusal names page, pixel, and general capacity causes in all nine locales", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getHomeRuntimeCopy(locale).recognitionExperience;
    const cases = [
      { sourcePageCount: 25, maxPagePixels: 8_415_000, code: "RECOGNITION_CAPACITY_LIMIT", key: "unsupportedPages" },
      { sourcePageCount: 25, maxPagePixels: 8_415_000, code: "PDF_TOTAL_PIXEL_LIMIT", key: "unsupportedPixels" },
      { sourcePageCount: 1, maxPagePixels: 40_000_000, code: "RECOGNITION_CAPACITY_LIMIT", key: "unsupportedPixels" },
      { sourcePageCount: 1, maxPagePixels: 32_000_000, code: "RECOGNITION_CAPACITY_LIMIT", key: "unsupportedLane" },
    ] as const;
    for (const item of cases) {
      const $ = renderResult(locale, { ...result, sourcePageCount: item.sourcePageCount,
        memoryAssessment: { ...result.memoryAssessment!, lane: "unsupported", sourcePageCount: item.sourcePageCount, maxPagePixels: item.maxPagePixels, reasonCodes: ["CAPACITY_CEILING"] },
        recognitionSupport: { supported: false, code: item.code } });
      assert.equal($("[data-recognition-refusal]").attr("data-recognition-refusal"), item.key, locale);
      assert.equal($("[role='alert']").text(), copy[item.key], locale);
      assert.equal($("fieldset, input, button, [data-recognition-plans]").length, 0, locale);
    }
  }
});
