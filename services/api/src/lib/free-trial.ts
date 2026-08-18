import { config } from "../config.js";
import { db } from "../db.js";
import { PDFDocument } from "pdf-lib";

export type FreeTrialAccess = {
  omrJobsUsed: number;
  omrJobsLimit: number;
  omrJobsRemaining: number;
  available: boolean;
  maxSourcePages: number;
};

export class FreeTrialLimitError extends Error {
  readonly statusCode = 403;
  readonly code = "FREE_TRIAL_OMR_LIMIT_REACHED";
  readonly trial: FreeTrialAccess;

  constructor(trial: FreeTrialAccess) {
    super("The free score preview has already been used. Upgrade to process another score.");
    this.name = "FreeTrialLimitError";
    this.trial = trial;
  }
}

export class FreeTrialPageLimitError extends Error {
  readonly statusCode = 400;
  readonly code = "FREE_TRIAL_PAGE_LIMIT_EXCEEDED";
  readonly actualPages: number;
  readonly maxSourcePages: number;

  constructor(actualPages: number, maxSourcePages: number) {
    super(`The free preview accepts up to ${maxSourcePages} PDF page. Upgrade to process multi-page scores.`);
    this.name = "FreeTrialPageLimitError";
    this.actualPages = actualPages;
    this.maxSourcePages = maxSourcePages;
  }
}

export function getFreeTrialAccess(userId: string): FreeTrialAccess {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM score_jobs
    WHERE user_id = ? AND job_type = 'omr_import'
  `).get(userId) as { count?: number } | undefined;
  const used = Math.max(0, Number(row?.count ?? 0));
  const limit = config.freeTrialOmrJobs;
  const remaining = Math.max(0, limit - used);
  return {
    omrJobsUsed: used,
    omrJobsLimit: limit,
    omrJobsRemaining: remaining,
    available: remaining > 0,
    maxSourcePages: config.freeTrialMaxSourcePages,
  };
}

export function assertFreeTrialOmrAvailable(userId: string) {
  const trial = getFreeTrialAccess(userId);
  if (!trial.available) throw new FreeTrialLimitError(trial);
  return trial;
}

export async function assertFreeTrialPdfPageLimit(source: Uint8Array, maxSourcePages: number) {
  const pdf = await PDFDocument.load(source);
  const actualPages = pdf.getPageCount();
  if (actualPages > maxSourcePages) throw new FreeTrialPageLimitError(actualPages, maxSourcePages);
  return actualPages;
}
