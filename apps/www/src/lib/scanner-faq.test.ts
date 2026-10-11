import assert from "node:assert/strict";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { englishFeatureOnPage, getFeatureOnPageContent } from "./feature-on-page";
import { spanishFeatureOnPage } from "./feature-on-page-es";
import { localizedFeatureOnPage } from "./feature-on-page-locales";
import { pricingFacts } from "./pricing-facts";
import { getScannerFaq } from "./scanner-faq";

test("scanner FAQ adds all six approved questions in every supported locale", () => {
  let additions = 0;
  for (const locale of SUPPORTED_LOCALES) {
    const faq = getScannerFaq(locale);
    assert.equal(faq.length, 6, locale);
    additions += faq.length;
    for (const item of faq) {
      assert.ok(item.question.trim().length > 0, locale);
      assert.ok(item.answer.trim().length > 0, locale);
      assert.doesNotMatch(`${item.question} ${item.answer}`, /HEIC|5\s*(?:pages|páginas|Seiten|страниц|ページ|페이지|页|頁)/iu);
    }
    for (const format of ["PDF", "PNG", "JPG/JPEG", "WebP", "TIFF"]) {
      assert.ok(faq[1].answer.includes(format), `${locale}: ${format}`);
    }
    assert.ok(faq[3].answer.includes(String(pricingFacts.freeScanJobs)), locale);
    assert.ok(faq[4].answer.includes(String(pricingFacts.simpleScanCredits)), locale);
    assert.ok(faq[4].answer.includes(String(pricingFacts.complexScanCredits)), locale);
    if (locale !== "en") assert.notEqual(faq[0].question, getScannerFaq("en")[0].question, locale);
  }
  assert.equal(additions, 54);
});

test("scanner FAQ preserves the original questions and reaches every final content path", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const original = locale === "en" ? englishFeatureOnPage["sheet-music-scanner"]
      : locale === "es" ? spanishFeatureOnPage["sheet-music-scanner"]
      : localizedFeatureOnPage[locale]!["sheet-music-scanner"];
    const visibleAndSchemaSource = getFeatureOnPageContent("sheet-music-scanner", locale)!;
    assert.equal(original.faq!.length, 5, locale);
    assert.equal(visibleAndSchemaSource.faq!.length, 11, locale);
    assert.deepEqual(visibleAndSchemaSource.faq!.slice(0, 5), original.faq, locale);
    assert.deepEqual(visibleAndSchemaSource.faq!.slice(5), getScannerFaq(locale), locale);
    assert.equal(new Set(visibleAndSchemaSource.faq!.map(item => item.question)).size, 11, locale);
    assert.equal(visibleAndSchemaSource.h1, original.h1, locale);
    assert.deepEqual(visibleAndSchemaSource.page, original.page, locale);
  }
});
