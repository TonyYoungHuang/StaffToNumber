import assert from "node:assert/strict";
import test from "node:test";
import { SINGLE_SCORE_PASS, getSingleScorePassCopy } from "../dist/index.js";

test("the single-score offer keeps its price and credits without a page-count cap", () => {
  assert.equal(SINGLE_SCORE_PASS.code, "single-score");
  assert.equal(SINGLE_SCORE_PASS.amountMinor, 299);
  assert.equal(SINGLE_SCORE_PASS.currency, "usd");
  assert.equal(SINGLE_SCORE_PASS.credits, 10);
  assert.equal(Object.hasOwn(SINGLE_SCORE_PASS, "maxPages"), false);
  for (const locale of ["en", "zh-CN", "zh-TW", "ja", "ko", "fr", "es", "de", "ru"]) {
    const copy = getSingleScorePassCopy(locale);
    assert.match(copy.benefits[0], /1/);
    assert.doesNotMatch(copy.benefits[0], /5|five/i, locale);
    assert.match(copy.benefits[1], /10/);
  }
});
