import { SINGLE_SCORE_PASS } from "@score/shared";

/** Published defaults, checked against API config and deployment overrides by pricing-facts.test.ts.
 * Account eligibility, access and the app's current scan quote still govern each submission.
 * Keep this public content module free of API config imports and runtime side effects.
 */
export const pricingFacts = {
  simpleScanCredits: 1,
  complexScanCredits: 5,
  queuedJobCredits: 1,
  unmeteredOperationCredits: 0,
  freeMonthlyCredits: 25,
  starterMonthlyCredits: 50,
  proMonthlyCredits: 200,
  freeScanJobs: 1,
  oneScorePassCredits: SINGLE_SCORE_PASS.credits,
  oneScorePassPriceUsd: SINGLE_SCORE_PASS.amountMinor / 100,
} as const;
