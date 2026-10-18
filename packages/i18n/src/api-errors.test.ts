import assert from "node:assert/strict";
import test from "node:test";
import { localizeApiError } from "./api-errors.ts";
import { localizeUsdText } from "./formatters.ts";
import { SUPPORTED_LOCALES } from "./locales.ts";

test("invalid and revoked share responses use localized recovery copy in all nine locales", () => {
  const messages = new Set<string>();
  for (const locale of SUPPORTED_LOCALES) {
    const message = localizeApiError({ error: "Shared score not found.", status: 404 }, locale);
    assert.ok(message.trim(), `${locale} has a share error message`);
    assert.notEqual(message, "Shared score not found.", `${locale} does not expose the server error`);
    messages.add(message);
  }
  assert.equal(messages.size, SUPPORTED_LOCALES.length, "each locale has its own translation");
  assert.equal(localizeApiError({ error: "Shared score not found.", status: 404 }, "zh-cn"), "分享的乐谱不存在或已失效。");
});

test("wrong-password errors follow the current locale for every supported email sign-in", () => {
  const messages = new Set<string>();
  for (const locale of SUPPORTED_LOCALES) {
    const message = localizeApiError({ error: "Invalid email or password.", status: 401 }, locale);
    assert.ok(message.trim());
    assert.notEqual(message, localizeApiError({ status: 401 }, locale), `${locale} retains the credential error instead of session-expired guidance`);
    if (locale !== "en") assert.notEqual(message, "Invalid email or password.", `${locale} has a credential translation`);
    messages.add(message);
  }
  assert.equal(messages.size, SUPPORTED_LOCALES.length);
  assert.equal(localizeApiError({ error: "Invalid email or password.", status: 401 }, "en"), "Invalid email or password.");
});

test("checkout and quota errors retain translated recovery guidance without exposing server diagnostics", () => {
  const quota = localizeApiError({ code: "PLAN_JOB_QUOTA_EXCEEDED", status: 429 }, "es");
  assert.match(quota, /créditos/u);
  assert.equal(localizeApiError({ error: "The monthly credit balance for this plan has been used up.", status: 429 }, "es"), quota);
  assert.match(localizeApiError({ error: "Invalid email or password.", status: 401 }, "es"), /contraseña/u);
  for (const locale of ["en", "es", "fr", "de", "ru"]) {
    const unavailable = localizeApiError({ status: 503, error: "Internal trace: private /srv/config" }, locale);
    assert.doesNotMatch(unavailable, /private|\/srv|Internal trace/u);
    assert.notEqual(unavailable, localizeApiError({ status: 0 }, locale));
    assert.notEqual(localizeApiError({ code: "SCORE_SOURCE_PAGE_COUNT_INVALID" }, locale), "Request failed.");
  }
});

test("localized USD text preserves catalog amounts and sub-cent precision", () => {
  assert.equal(localizeUsdText("$7.99", "es").replace(/\s/gu, " "), "7,99 USD");
  assert.equal(localizeUsdText("$0.082", "es").replace(/\s/gu, " "), "0,082 USD");
  assert.equal(localizeUsdText("$7.99", "en"), "$7.99");
});
