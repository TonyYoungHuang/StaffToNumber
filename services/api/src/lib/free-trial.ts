import { config } from "../config.js";
import { db } from "../db.js";
import { inspectPdfRasterSafety } from "./upload-security.js";

export type FreeTrialAccess = {
  omrJobsUsed: number;
  omrJobsLimit: number;
  omrJobsRemaining: number;
  available: boolean;
};

export class FreeTrialLimitError extends Error {
  readonly statusCode = 403;
  readonly code = "FREE_TRIAL_OMR_LIMIT_REACHED";
  readonly trial: FreeTrialAccess;

  constructor(trial: FreeTrialAccess) {
    super("This account has already created its lifetime free score project. Upgrade to process another score.");
    this.name = "FreeTrialLimitError";
    this.trial = trial;
  }
}

export function getFreeTrialAccess(userId: string): FreeTrialAccess {
  const rows = db.prepare(`
    SELECT params_json
    FROM score_jobs
    WHERE user_id = ? AND job_type = 'omr_import'
  `).all(userId) as Array<{ params_json: string | null }>;
  const used = rows.reduce((count, row) => {
    if (!row.params_json) return count;
    try {
      const params = JSON.parse(row.params_json) as { freeTrial?: unknown };
      return count + (params.freeTrial === true ? 1 : 0);
    } catch {
      return count;
    }
  }, 0);
  const limit = config.freeTrialOmrJobs;
  const remaining = Math.max(0, limit - used);
  return {
    omrJobsUsed: used,
    omrJobsLimit: limit,
    omrJobsRemaining: remaining,
    available: remaining > 0,
  };
}

export function assertFreeTrialOmrAvailable(userId: string) {
  const trial = getFreeTrialAccess(userId);
  if (!trial.available) throw new FreeTrialLimitError(trial);
  return trial;
}

export function isFreeTrialScoreDocumentForUser(documentId: string, userId: string) {
  const jobs = db.prepare(`
    SELECT params_json
    FROM score_jobs
    WHERE document_id = ? AND user_id = ? AND job_type = 'omr_import'
    ORDER BY created_at ASC
  `).all(documentId, userId) as Array<{ params_json: string | null }>;

  return jobs.some((job) => {
    if (!job.params_json) return false;
    try {
      const params = JSON.parse(job.params_json) as { freeTrial?: unknown };
      return params.freeTrial === true;
    } catch {
      return false;
    }
  });
}

export async function inspectFreeTrialPdf(source: Uint8Array) {
  const inspection = await inspectPdfRasterSafety(source);
  return { pageCount: inspection.pageCount };
}
