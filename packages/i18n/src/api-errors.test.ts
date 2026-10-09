import assert from "node:assert/strict";
import test from "node:test";
import { localizeApiError } from "./api-errors.ts";
import { localizeUsdText } from "./formatters.ts";

test("checkout and quota errors retain translated recovery guidance without exposing server diagnostics", () => {
  const quota = localizeApiError({ code: "PLAN_JOB_QUOTA_EXCEEDED", status: 429 }, "es");
  assert.match(quota, /créditos/u);
  assert.equal(localizeApiError({ error: "The monthly credit balance for this plan has been used up.", status: 429 }, "es"), quota);
  assert.match(localizeApiError({ error: "Invalid email or password.", status: 401 }, "es"), /contraseña/u);
  for (const locale of ["en", "es", "fr", "de", "ru"]) {
    const unavailable = localizeApiError({ status: 503, error: "Internal trace: private /srv/config" }, locale);
    assert.doesNotMatch(unavailable, /private|\/srv|Internal trace/u);
    assert.notEqual(unavailable, localizeApiError({ status: 0 }, locale));
    assert.notEqual(localizeApiError({ code: "SCORE_PASS_PAGE_LIMIT" }, locale), "Request failed.");
  }
});

test("localized USD text preserves catalog amounts and sub-cent precision", () => {
  assert.equal(localizeUsdText("$7.99", "es").replace(/\s/gu, " "), "7,99 USD");
  assert.equal(localizeUsdText("$0.082", "es").replace(/\s/gu, " "), "0,082 USD");
  assert.equal(localizeUsdText("$7.99", "en"), "$7.99");
});
