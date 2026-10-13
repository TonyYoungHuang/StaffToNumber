import assert from "node:assert/strict";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { homeCommercialCopy } from "./home-commercial-copy";

test("commercial controls and first-screen actions have native copy in nine locales", () => {
  assert.deepEqual(Object.keys(homeCommercialCopy).sort(), [...SUPPORTED_LOCALES].sort());
  for (const locale of SUPPORTED_LOCALES) {
    const copy = homeCommercialCopy[locale];
    for (const [key, value] of Object.entries(copy)) {
      assert.ok(value.trim(), `${locale}.${key}`);
      if (locale !== "en") assert.notEqual(value, homeCommercialCopy.en[key as keyof typeof copy], `${locale}.${key} must be localized`);
    }
  }
});
