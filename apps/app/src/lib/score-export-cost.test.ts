import assert from "node:assert/strict";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { getScoreDetailMessages } from "./score-detail-messages";
import { checkExportQuote, type ScoreExportQuote } from "./score-export-cost";

const shown: ScoreExportQuote = {
  balance: { available: 9, creditSource: "score_pass" }, downloadCreditCost: 0,
  options: [{ format: "pdf", creditCost: 1, canSubmit: true }, { format: "jianpu", creditCost: 0, canSubmit: true }],
};

test("unchanged costs proceed immediately, changed costs require a second explicit action", () => {
  assert.equal(checkExportQuote(shown, shown, "pdf"), "ready");
  const changed = { ...shown, options: [{ format: "pdf", creditCost: 2, canSubmit: true }] };
  assert.equal(checkExportQuote(shown, changed, "pdf"), "changed");
  assert.equal(checkExportQuote(changed, changed, "pdf"), "ready");
  assert.equal(checkExportQuote(shown, { ...shown, balance: { available: 3, creditSource: "monthly" } }, "pdf"), "ready");
  assert.equal(checkExportQuote(shown, { ...shown, options: [{ format: "pdf", creditCost: 1, canSubmit: false }] }, "pdf"), "insufficient");
  assert.equal(checkExportQuote(shown, null, "pdf"), "unavailable");
  assert.equal(checkExportQuote(shown, shown, "missing"), "unavailable");
  assert.equal(checkExportQuote(null, shown, "pdf"), "changed");
});

test("zero-credit direct exports remain free and report an existing access restriction separately", () => {
  assert.equal(checkExportQuote(shown, shown, "jianpu"), "ready");
  const restricted: ScoreExportQuote = { ...shown, options: [{ format: "jianpu", creditCost: 0, canSubmit: false, reason: "SCORE_PASS_QUEUED_EXPORT_REQUIRED" }] };
  assert.equal(checkExportQuote(shown, restricted, "jianpu"), "restricted");
});

test("all nine locales explain generation, downloads, balances and changed-price confirmation", () => {
  const english = getScoreDetailMessages("en").exports.cost;
  for (const locale of SUPPORTED_LOCALES) {
    const cost = getScoreDetailMessages(locale).exports.cost;
    assert.match(cost.generate, /\{format\}/u);
    for (const key of ["costSingle", "costMultiple", "download"] as const) assert.match(cost[key], /\{count\}/u);
    assert.match(cost.balance, /\{source\}/u);
    assert.match(cost.balance, /\{balance\}/u);
    if (locale !== "en") for (const key of Object.keys(english) as (keyof typeof english)[]) {
      if (key === "sources") continue;
      assert.notEqual(cost[key], english[key], `${locale}: ${key}`);
    }
    for (const source of ["monthly", "prepaid", "score_pass"] as const) assert.ok(cost.sources[source].trim());
  }
});
