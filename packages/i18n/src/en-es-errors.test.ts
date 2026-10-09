import assert from "node:assert/strict";
import test from "node:test";
import { localizeApiError } from "./api-errors.ts";
import { localizeUsdText } from "./formatters.ts";
import { getTransactionalCopy } from "./transactional.ts";

test("Spanish errors cover stable codes, legacy messages and HTTP failures without exposing diagnostics", () => {
  const quota = localizeApiError({ code: "PLAN_JOB_QUOTA_EXCEEDED", status: 429 }, "es");
  assert.match(quota, /créditos/u);
  assert.equal(localizeApiError({ error: "The monthly credit balance for this plan has been used up.", status: 429 }, "es"), quota);
  assert.match(localizeApiError({ error: "Invalid email or password.", status: 401 }, "es"), /contraseña/u);
  assert.equal(localizeApiError({ code: "ACTIVATION_DISABLED" }, "es"), localizeApiError({ code: "ACTIVATION_REVOKED" }, "es"));
  for (const locale of ["en", "es"]) {
    const unavailable = localizeApiError({ status: 503, error: "Internal trace: private /srv/config" }, locale);
    assert.doesNotMatch(unavailable, /private|\/srv|Internal trace/u);
    assert.notEqual(unavailable, "Request failed.");
    assert.notEqual(unavailable, localizeApiError({ status: 0 }, locale));
  }
});

test("Spanish USD formatting preserves amounts and precision while system messages stay translated", () => {
  assert.equal(localizeUsdText("$7.99", "es").replace(/\s/gu, " "), "7,99 USD");
  assert.equal(localizeUsdText("$0.082", "es").replace(/\s/gu, " "), "0,082 USD");
  assert.equal(localizeUsdText("$7.99", "en"), "$7.99");
  const es = getTransactionalCopy("es-ES"), en = getTransactionalCopy("en");
  for (const key of Object.keys(en) as Array<keyof typeof en>) {
    assert.notEqual(es[key], en[key], key);
    assert.deepEqual(es[key].match(/\{\w+\}/gu)?.sort(), en[key].match(/\{\w+\}/gu)?.sort(), key);
  }
});
