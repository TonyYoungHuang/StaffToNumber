import { config } from "../config.js";
import { db } from "../db.js";
import { resolveStorageQuotaTier } from "@score/runtime-database";
import { assertMinimumFreeSpace } from "@score/storage";
import type { ScoreRecognitionMode } from "@score/shared";

export function recognitionCreditCost(mode: ScoreRecognitionMode) {
  return mode === "complex" ? config.omrComplexCreditCost : config.omrSimpleCreditCost;
}

export function processingJobParams(paramsJson: string | null): Record<string, unknown> {
  try {
    const value: unknown = paramsJson ? JSON.parse(paramsJson) : null;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch { return {}; }
}

/** Existing jobs without a server quote retain their historic one-credit price. */
export function processingJobCreditCost(job: { job_type?: string; params_json: string | null }) {
  if (job.job_type !== "omr_import") return 1;
  const params = processingJobParams(job.params_json);
  if (params.recognitionMode !== "simple" && params.recognitionMode !== "complex") return 1;
  const cost = params.creditCost;
  return typeof cost === "number" && Number.isSafeInteger(cost) && cost > 0
    ? cost : params.recognitionMode === "complex" ? recognitionCreditCost("complex") : 1;
}

export type PlanQuotaTier = "free" | "starter" | "converter-pro";

export type PlanQuotaUsage = {
  tier: PlanQuotaTier;
  periodStart: string;
  periodEnd: string;
  jobs: { used: number; limit: number; remaining: number };
  storage: { usedBytes: number; limitBytes: number; remainingBytes: number };
};

export class PlanQuotaExceededError extends Error {
  readonly statusCode = 429;
  readonly code: "PLAN_JOB_QUOTA_EXCEEDED" | "PLAN_STORAGE_QUOTA_EXCEEDED";
  readonly quota: PlanQuotaUsage;

  constructor(code: PlanQuotaExceededError["code"], quota: PlanQuotaUsage) {
    super(code === "PLAN_JOB_QUOTA_EXCEEDED"
      ? "The monthly credit balance for this plan has been used up."
      : "The storage quota for this plan has been reached.");
    this.name = "PlanQuotaExceededError";
    this.code = code;
    this.quota = quota;
  }
}

function utcMonthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

function quotaTier(userId: string): PlanQuotaTier {
  return resolveStorageQuotaTier(db, userId, {
    free: config.quotaFreeStorageBytes,
    starter: config.quotaStarterStorageBytes,
    converterPro: config.quotaConverterProStorageBytes,
    starterPlanRefs: [config.stripeStarterMonthlyPriceId, config.stripeStarterAnnualPriceId, config.paddleStarterMonthlyPriceId, config.paddleStarterAnnualPriceId].filter(Boolean),
    converterProPlanRefs: [config.stripeConverterProMonthlyPriceId, config.stripeConverterProAnnualPriceId, config.paddleConverterProMonthlyPriceId, config.paddleConverterProAnnualPriceId].filter(Boolean),
  });
}

function limitsForTier(tier: PlanQuotaTier) {
  if (tier === "converter-pro") {
    return { jobs: config.quotaConverterProJobsPerMonth, storageBytes: config.quotaConverterProStorageBytes };
  }
  if (tier === "starter") {
    return { jobs: config.quotaStarterJobsPerMonth, storageBytes: config.quotaStarterStorageBytes };
  }
  return { jobs: config.quotaFreeJobsPerMonth, storageBytes: config.quotaFreeStorageBytes };
}

export function getPlanQuotaUsage(userId: string, now = new Date()): PlanQuotaUsage {
  const tier = quotaTier(userId);
  const limits = limitsForTier(tier);
  const period = utcMonthBounds(now);
  const legacyJobs = db.prepare(`
    SELECT COUNT(*) AS count FROM jobs
    WHERE user_id = ? AND datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)
      AND status NOT IN ('failed', 'cancelled')
  `).get(userId, period.start, period.end) as { count: number } | undefined;
  const scoreJobs = db.prepare(`
    SELECT job_type, params_json, created_at FROM score_jobs
    WHERE NOT EXISTS (SELECT 1 FROM score_pass_jobs p WHERE p.job_id = score_jobs.id)
      AND user_id = ? AND status NOT IN ('failed', 'cancelled')
  `).all(userId) as Array<{ job_type: string; params_json: string | null; created_at: string }>;
  const storage = db.prepare(`
    SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM files WHERE user_id = ?
  `).get(userId) as { bytes: number } | undefined;
  const scoreCredits = scoreJobs.reduce((sum, job) => {
    const reservedAt = processingJobParams(job.params_json).creditReservedAt;
    const chargedAt = typeof reservedAt === "string" && Number.isFinite(Date.parse(reservedAt)) ? reservedAt : job.created_at;
    const time = Date.parse(chargedAt);
    return time >= Date.parse(period.start) && time < Date.parse(period.end) ? sum + processingJobCreditCost(job) : sum;
  }, 0);
  const jobsUsed = Number(legacyJobs?.count ?? 0) + scoreCredits;
  const storageUsed = Number(storage?.bytes ?? 0);
  return {
    tier,
    periodStart: period.start,
    periodEnd: period.end,
    jobs: {
      used: jobsUsed,
      limit: limits.jobs,
      remaining: Math.max(0, limits.jobs - jobsUsed),
    },
    storage: {
      usedBytes: storageUsed,
      limitBytes: limits.storageBytes,
      remainingBytes: Math.max(0, limits.storageBytes - storageUsed),
    },
  };
}

export function assertProcessingQuota(userId: string, dedicatedScorePass = false, creditCost = 1) {
  if (!Number.isSafeInteger(creditCost) || creditCost < 1) throw new Error("Processing credit cost must be a positive integer.");
  assertMinimumFreeSpace(config.storageDir, config.storageMinFreeBytes, config.uploadMaxBytes * 2);
  const quota = getPlanQuotaUsage(userId);
  if (!dedicatedScorePass && creditCost > quota.jobs.remaining) {
    throw new PlanQuotaExceededError("PLAN_JOB_QUOTA_EXCEEDED", quota);
  }
  return quota;
}

export function assertStorageQuota(userId: string, incomingBytes: number) {
  const quota = getPlanQuotaUsage(userId);
  if (incomingBytes < 0 || quota.storage.usedBytes + incomingBytes > quota.storage.limitBytes) {
    throw new PlanQuotaExceededError("PLAN_STORAGE_QUOTA_EXCEEDED", quota);
  }
  return quota;
}
