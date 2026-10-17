import assert from "node:assert/strict";
import test from "node:test";
import { load } from "cheerio";
import { renderToStaticMarkup } from "react-dom/server";
import { SUPPORTED_LOCALES, getScorePreflightMessages, type SupportedLocale } from "@score/i18n";
import type { ScoreStructurePreflight } from "@score/shared";
import { getHomeRuntimeCopy } from "../lib/home-runtime-copy";
import { HomeRecognitionPreflightResult, isHomeRecognitionRejected } from "./HomeRecognitionPreflightResult";

const result: ScoreStructurePreflight = {
  schemaVersion: 1, recommendation: "uncertain", confidence: "low", sourcePageCount: 1, pagesAnalyzed: 1, complete: true,
  reasonCodes: ["NO_STAFF_DETECTED"], pages: [{ page: 1, staffCount: 0, systemCount: 0, maxStavesPerSystem: 0, hasTab: false, uncertain: true }],
  recognitionSupport: { supported: true, code: "READY" },
  memoryAssessment: { version: 1, capacityVersion: "cx33-test", lane: "normal", estimatedMemoryMb: 1536, reasonCodes: [], waitEstimateSeconds: [0, 0], sourcePageCount: 1, maxPagePixels: 8_294_400, enabled: true },
};

function renderResult(locale: SupportedLocale, preflight: ScoreStructurePreflight) {
  return load(renderToStaticMarkup(<HomeRecognitionPreflightResult locale={locale} copy={getScorePreflightMessages(locale)} runtimeCopy={getHomeRuntimeCopy(locale)} preflight={preflight} recognitionMode="complex" options={[]} busy={false} onSelectMode={() => undefined} />));
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
      assert.equal($("[role='status'], [data-preflight-recommendation], fieldset, input, button").length, 0, locale);
      assert.equal($.root().text().includes(runtimeCopy.support.READY), false, locale);
      assert.equal($.root().text().includes(runtimeCopy.support.PDF_ADAPTIVE_RENDER), false, locale);
    }
    assert.equal(runtimeCopy.support.RECOGNITION_CAPACITY_LIMIT, runtimeCopy.recognitionExperience.unsupportedLane, locale);
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
  }
});
