import type { ScoreRecognitionCreditSource, ScoreRecognitionMode, ScoreRecognitionOption } from "@score/shared";
import { db } from "../db.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import { assertFreeTrialOmrAvailable, FreeTrialLimitError, getFreeTrialAccess } from "./free-trial.js";
import { getPlanQuotaUsage, PlanQuotaExceededError, recognitionCreditCost } from "./plan-quotas.js";
import { listScorePasses, ScorePassError } from "./score-passes.js";

export class RecognitionAccessError extends Error {
  readonly statusCode: number;
  constructor(readonly code: "INVALID_RECOGNITION_MODE" | "COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED", message: string) {
    super(message);
    this.statusCode = code === "INVALID_RECOGNITION_MODE" ? 400 : 403;
  }
}

export class RecognitionPriceChangedError extends Error {
  readonly code = "OMR_PRICE_CHANGED";
  readonly statusCode = 409;
  constructor() { super("The recognition price changed. Review the current price and confirm again."); }
}

export function assertRecognitionQuote(mode: ScoreRecognitionMode, expectedCreditCost: number | undefined) {
  if (expectedCreditCost !== undefined && expectedCreditCost !== recognitionCreditCost(mode)) throw new RecognitionPriceChangedError();
}

export function normalizeRecognitionMode(value: unknown): ScoreRecognitionMode {
  if (value === undefined) return "simple";
  if (value === "simple" || value === "complex") return value;
  throw new RecognitionAccessError("INVALID_RECOGNITION_MODE", "Recognition mode must be simple or complex.");
}

/** Advisory quote; callers reserve again inside the user-locked transaction. */
export function resolveRecognitionAccess(userId: string, mode: ScoreRecognitionMode): {
  mode: ScoreRecognitionMode; creditCost: number; creditSource: ScoreRecognitionCreditSource;
} {
  const creditCost = recognitionCreditCost(mode);
  const quota = getPlanQuotaUsage(userId);
  const paid = getUserProfile(userId)?.entitlement.status === "active";
  if (paid && (quota.monthly.remaining >= creditCost || quota.prepaid.remaining >= creditCost)) {
    return { mode, creditCost, creditSource: "plan" };
  }
  if (mode === "simple" && getFreeTrialAccess(userId).available && quota.jobs.remaining >= creditCost) {
    return { mode, creditCost, creditSource: "free_trial" };
  }
  const passes = listScorePasses(db, userId).filter(pass => !pass.documentId);
  if (passes.some(pass => pass.remaining >= creditCost)) return { mode, creditCost, creditSource: "score_pass" };
  if (passes.length) throw new ScorePassError("SCORE_PASS_CREDITS_EXHAUSTED", "This score pass does not have enough processing credits.");
  if (paid) throw new PlanQuotaExceededError("PLAN_JOB_QUOTA_EXCEEDED", quota);
  if (mode === "complex") throw new RecognitionAccessError("COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED", "Complex recognition needs an active membership or a paid One Score Pass with enough credits.");
  assertFreeTrialOmrAvailable(userId);
  throw new PlanQuotaExceededError("PLAN_JOB_QUOTA_EXCEEDED", quota);
}

export function getRecognitionOptions(userId: string) {
  const options: ScoreRecognitionOption[] = (["simple", "complex"] as const).map(mode => {
    try {
      return { ...resolveRecognitionAccess(userId, mode), canSubmit: true, reason: null };
    } catch (error) {
      if (!(error instanceof RecognitionAccessError || error instanceof PlanQuotaExceededError || error instanceof FreeTrialLimitError || error instanceof ScorePassError)) throw error;
      return { mode, creditCost: recognitionCreditCost(mode), canSubmit: false, creditSource: null, reason: error.code };
    }
  });
  return { defaultMode: "simple" as const, quota: getPlanQuotaUsage(userId), freeTrial: getFreeTrialAccess(userId), scorePasses: listScorePasses(db, userId), options };
}
