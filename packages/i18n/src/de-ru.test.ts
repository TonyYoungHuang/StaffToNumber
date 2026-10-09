import assert from "node:assert/strict";
import test from "node:test";
import { localizeApiError } from "./api-errors.ts";
import { localizeUsdText } from "./formatters.ts";

test("German and Russian API errors map codes, aliases, statuses and unknown messages", () => {
  for (const locale of ["de", "ru"] as const) {
    const quota = localizeApiError({ code: "PLAN_JOB_QUOTA_EXCEEDED", error: "Internal quota details", status: 403 }, locale);
    assert.doesNotMatch(quota, /Internal quota/);
    assert.notEqual(quota, localizeApiError({status:403}, locale));
    assert.equal(localizeApiError({code:"ACTIVATION_NOT_FOUND"},locale),localizeApiError({code:"ACTIVATION_INVALID"},locale));
    assert.doesNotMatch(localizeApiError({error:"Unknown backend failure",status:500},locale),/Unknown backend|Request failed/);
    assert.notEqual(localizeApiError({status:0},locale),localizeApiError({status:401},locale));
    assert.doesNotMatch(localizeApiError({error:"Invalid email or password."},locale),/Invalid email/);
  }
});

test("USD display retains fractional precision and currency in German and Russian", () => {
  for (const locale of ["de", "ru"] as const) {
    const value = localizeUsdText("$7.99 / $0.082",locale);
    assert.match(value,/7,99/); assert.match(value,/0,082/); assert.match(value,/USD/);
  }
  assert.equal(localizeUsdText("$7.99","en"),"$7.99");
});
