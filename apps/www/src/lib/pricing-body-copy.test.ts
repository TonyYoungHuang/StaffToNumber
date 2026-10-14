import assert from "node:assert/strict";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { getSingleScorePassCopy } from "@score/shared";
import { getCreditGuideCopy, getPricingIntroCopy, getPurchaseFaqs } from "./pricing-body-copy";
import { pricingFacts } from "./pricing-facts";
import { pricingCopy } from "./localized-pricing";
import { frenchPricingFaqs } from "./french-pricing";

test("all nine languages provide the complete pricing introduction, fee guide and purchase answers", () => {
  assert.equal(SUPPORTED_LOCALES.length, 9);
  for (const locale of SUPPORTED_LOCALES) {
    const intro = getPricingIntroCopy(locale);
    const guide = getCreditGuideCopy(locale);
    const faqs = getPurchaseFaqs(locale);
    assert.equal(intro.notes.length, 4);
    assert.equal(guide.rows.length, 7);
    assert.equal(guide.examples.length, 5);
    assert.equal(guide.rules.length, 5);
    assert.equal(faqs.length, 3);
    for (const field of [intro.freeTitle, intro.freeDescription, intro.passTitle, intro.passDescription, intro.freeCta, intro.passCta, intro.comparisonNote, guide.title, guide.description, guide.examplesTitle, guide.rulesTitle, ...intro.notes, ...guide.columns, ...guide.examples, ...guide.rows.flatMap(row => [row.operation, row.cost, row.detail]), ...guide.rules.flatMap(rule => [rule.title, rule.body]), ...faqs.flatMap(faq => [faq.question, faq.answer])]) assert.ok(field.trim(), `${locale}: missing copy`);
    if (locale !== "en") {
      assert.notEqual(intro.freeTitle, getPricingIntroCopy("en").freeTitle);
      assert.notEqual(guide.description, getCreditGuideCopy("en").description);
      assert.notEqual(faqs[0].answer, getPurchaseFaqs("en")[0].answer);
    }
    assert.doesNotMatch(JSON.stringify([intro, guide, faqs, getSingleScorePassCopy(locale)]), /(?:up to|at most|max(?:imum)?)\s*5\s*pages|5\s*pages?\s*max|最多\s*5\s*[页頁]|最大\s*5\s*ページ|최대\s*5\s*페이지|(?:bis zu|höchstens)\s*5\s*Seiten|(?:hasta|máximo)\s*5\s*páginas|до\s*5\s*страниц/iu);
  }
});

test("displayed costs and worked examples use the same published credit budgets", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const guide = getCreditGuideCopy(locale);
    const rowCosts = [pricingFacts.simpleScanCredits, pricingFacts.complexScanCredits, pricingFacts.queuedJobCredits, 0, 0, 0, pricingFacts.queuedJobCredits];
    guide.rows.forEach((row, index) => assert.match(row.cost, new RegExp(`\\b${rowCosts[index]}\\b`), `${locale}: row ${index}`));
    for (const [index, budget] of [[1, pricingFacts.starterMonthlyCredits], [2, pricingFacts.proMonthlyCredits]] as const) {
      for (const number of [budget, Math.floor(budget / pricingFacts.simpleScanCredits), Math.floor(budget / pricingFacts.complexScanCredits)]) assert.match(guide.examples[index], new RegExp(`\\b${number}\\b`));
    }
    for (const number of [pricingFacts.oneScorePassCredits, pricingFacts.oneScorePassCredits - pricingFacts.simpleScanCredits, pricingFacts.oneScorePassCredits - pricingFacts.complexScanCredits]) assert.match(guide.examples[3], new RegExp(`\\b${number}\\b`));
    assert.match(guide.examples[4], new RegExp(`\\b${pricingFacts.freeMonthlyCredits}\\b`));
  }
});

test("French pass price uses a decimal comma and explicitly remains USD", () => {
  assert.match(getPricingIntroCopy("fr").passTitle, /2,99 USD/u);
});

test("the dedicated pricing FAQ sources include the three purchase answers exactly once", () => {
  for (const locale of ["en", "es", "de", "ru"] as const) {
    const faqs = pricingCopy[locale].faqs;
    assert.deepEqual(faqs.slice(-3), getPurchaseFaqs(locale));
    assert.equal(new Set(faqs.map(faq => faq.question)).size, faqs.length);
    assert.doesNotMatch(JSON.stringify(faqs), /activation code|códigos de activación|Aktivierungscodes|коды активации/iu);
  }
  assert.deepEqual(frenchPricingFaqs.slice(-3), getPurchaseFaqs("fr"));
  assert.equal(new Set(frenchPricingFaqs.map(faq => faq.question)).size, frenchPricingFaqs.length);
});
