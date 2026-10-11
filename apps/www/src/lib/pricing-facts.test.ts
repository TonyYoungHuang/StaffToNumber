import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { getPricingPlanCatalog, SHOP_CREDIT_PACKS, SINGLE_SCORE_PASS } from "@score/shared";
import { pricingFacts } from "./pricing-facts";

// Read source defaults without importing API config, its environment or DB.
// These URLs are relative to this test's final apps/www/src/lib location.
const apiConfigSource = readFileSync(new URL("../../../../services/api/src/config.ts", import.meta.url), "utf8");
const quotaSource = readFileSync(new URL("../../../../services/api/src/lib/plan-quotas.ts", import.meta.url), "utf8");
const deploymentSource = readFileSync(new URL("../../../../deploy/hetzner/score-workspaces.override.yaml", import.meta.url), "utf8");

function positiveIntegerDefault(property: string): number {
  const declaration = apiConfigSource.match(new RegExp(`^\\s*${property}:\\s*positiveInteger\\([^\\n]+,\\s*(\\d+)\\),?\\s*$`, "m"));
  assert.ok(declaration, `Cannot find the positiveInteger default for API config ${property}; review the published pricing facts.`);
  return Number(declaration[1]);
}

function monthlyCredits(copy: string): number {
  const quota = copy.match(/(\d+)\s*(?:credits\s*\/\s*month|积分)/u);
  assert.ok(quota, `Cannot identify the monthly credit allowance in pricing catalog copy: ${copy}`);
  return Number(quota[1]);
}

test("published scan costs, lifetime free eligibility and monthly budgets match API defaults", () => {
  const fields = [
    ["simpleScanCredits", "omrSimpleCreditCost"],
    ["complexScanCredits", "omrComplexCreditCost"],
    ["freeScanJobs", "freeTrialOmrJobs"],
    ["freeMonthlyCredits", "quotaFreeJobsPerMonth"],
    ["starterMonthlyCredits", "quotaStarterJobsPerMonth"],
    ["proMonthlyCredits", "quotaConverterProJobsPerMonth"],
  ] as const;
  for (const [published, api] of fields) {
    assert.equal(pricingFacts[published], positiveIntegerDefault(api), `${published} must follow the default in services/api/src/config.ts (${api}).`);
  }
});

test("the published queued export cost follows the non-OMR job price", () => {
  const cost = quotaSource.match(/if\s*\(\s*job\.job_type\s*!==\s*["']omr_import["']\s*\)\s*return\s+(\d+)\s*;/u);
  assert.ok(cost, "Cannot identify the non-OMR queued job price; review the published export cost.");
  assert.equal(pricingFacts.queuedJobCredits, Number(cost[1]));
  // This is the public promise for existing operations that create no job.
  assert.equal(pricingFacts.unmeteredOperationCredits, 0);
});

test("One Score Pass displayed price and score-bound budget match the shared purchase definition", () => {
  assert.equal(SINGLE_SCORE_PASS.currency, "usd");
  assert.equal(pricingFacts.oneScorePassPriceUsd, SINGLE_SCORE_PASS.amountMinor / 100);
  assert.equal(pricingFacts.oneScorePassCredits, SINGLE_SCORE_PASS.credits);
});

test("the two illustrated credit budgets also match the shared prepaid pack sizes", () => {
  assert.equal(SHOP_CREDIT_PACKS["credits-50"].credits, pricingFacts.starterMonthlyCredits);
  assert.equal(SHOP_CREDIT_PACKS["credits-200"].credits, pricingFacts.proMonthlyCredits);
});

test("pricing catalog monthly credit labels agree with the published credit guide in every locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const plan of getPricingPlanCatalog(locale)) {
      const expected = plan.code === "free" ? pricingFacts.freeMonthlyCredits
        : plan.code.startsWith("starter-") ? pricingFacts.starterMonthlyCredits
          : pricingFacts.proMonthlyCredits;
      assert.equal(monthlyCredits(plan.credits), expected, `${locale}/${plan.code} pricing card and credit guide must describe the same budget.`);
    }
  }
});

test("published scan costs match the checked-in deployment overrides", () => {
  for (const [envName, displayed] of [
    ["OMR_SIMPLE_CREDIT_COST", pricingFacts.simpleScanCredits],
    ["OMR_COMPLEX_CREDIT_COST", pricingFacts.complexScanCredits],
  ] as const) {
    const setting = deploymentSource.match(new RegExp(`^\\s*${envName}:\\s*["']?(\\d+)["']?\\s*$`, "m"));
    assert.ok(setting, `Cannot find the checked-in ${envName} override; review the published default costs.`);
    assert.equal(Number(setting[1]), displayed, `${envName} override and public copy must agree.`);
  }
});
