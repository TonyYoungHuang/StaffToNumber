import { config } from "../config.js";
import { db } from "../db.js";
import { findActiveSubscriptionEntitlement } from "../repositories/billing-repository.js";

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
      ? "The monthly processing quota for this plan has been reached."
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
  const entitlement = findActiveSubscriptionEntitlement(db, userId);
  if (!entitlement) {
    const activationEntitlement = db.prepare(`
      SELECT 1 AS active
      FROM user_entitlements
      WHERE user_id = ?
        AND datetime(starts_at) <= datetime('now')
        AND datetime(ends_at) > datetime('now')
      LIMIT 1
    `).get(userId) as { active: number } | undefined;
    return activationEntitlement ? "starter" : "free";
  }
  const converterProPlanRefs = new Set([
    config.stripeConverterProMonthlyPriceId,
    config.stripeConverterProAnnualPriceId,
    config.paddleConverterProMonthlyPriceId,
    config.paddleConverterProAnnualPriceId,
  ].filter(Boolean));
  const starterPlanRefs = new Set([
    config.stripeStarterMonthlyPriceId,
    config.stripeStarterAnnualPriceId,
    config.paddleStarterMonthlyPriceId,
    config.paddleStarterAnnualPriceId,
  ].filter(Boolean));
  if (entitlement.planRef && converterProPlanRefs.has(entitlement.planRef)) return "converter-pro";
  if (entitlement.planRef && starterPlanRefs.has(entitlement.planRef)) return "starter";
  // Preserve unrecognized legacy organization subscriptions without overriding a known Starter price.
  if (entitlement.organizationId || entitlement.seatQuantity > 1) return "converter-pro";
  return "starter";
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
  `).get(userId, period.start, period.end) as { count: number } | undefined;
  const scoreJobs = db.prepare(`
    SELECT COUNT(*) AS count FROM score_jobs
    WHERE user_id = ? AND datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)
  `).get(userId, period.start, period.end) as { count: number } | undefined;
  const storage = db.prepare(`
    SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM files WHERE user_id = ?
  `).get(userId) as { bytes: number } | undefined;
  const jobsUsed = Number(legacyJobs?.count ?? 0) + Number(scoreJobs?.count ?? 0);
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

export function assertProcessingQuota(userId: string) {
  const quota = getPlanQuotaUsage(userId);
  if (quota.jobs.used >= quota.jobs.limit) {
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
