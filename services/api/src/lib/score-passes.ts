import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { processingJobCreditCost } from "./plan-quotas.js";

export class ScorePassError extends Error {
  readonly statusCode = 403;
  constructor(readonly code: "SCORE_PASS_REQUIRED" | "SCORE_PASS_CREDITS_EXHAUSTED" | "SCORE_PASS_PAGE_LIMIT", message: string) { super(message); }
}

type Pass = { purchase_id: string; document_id: string | null; credit_limit: number; max_pages: number };

export function listScorePasses(db: RuntimeDatabaseLike, userId: string) {
  const passes = db.prepare(`SELECT p.* FROM score_passes p JOIN billing_one_time_purchases b ON b.id = p.purchase_id
    WHERE b.user_id = ? AND b.status = 'active' AND b.paid_at IS NOT NULL ORDER BY p.created_at, p.purchase_id`).all(userId) as Pass[];
  return passes.map(p => ({ id: p.purchase_id, documentId: p.document_id, credits: p.credit_limit,
    remaining: Math.max(0, p.credit_limit - creditsUsed(db, p.purchase_id)), maxPages: p.max_pages }));
}

export function scorePassForDocument(db: RuntimeDatabaseLike, userId: string, documentId: string) {
  return listScorePasses(db, userId).find(p => p.documentId === documentId);
}

function creditsUsed(db: RuntimeDatabaseLike, passId: string) {
  // Queueing reserves a credit. Failure/cancellation releases it automatically;
  // successful work and deleted job records remain charged, across all months.
  const rows = db.prepare(`SELECT j.job_type, j.params_json FROM score_pass_jobs p LEFT JOIN score_jobs j ON j.id = p.job_id
    WHERE p.purchase_id = ? AND (j.status IS NULL OR j.status NOT IN ('failed', 'cancelled'))`).all(passId) as Array<{ job_type: string | null; params_json: string | null }>;
  return rows.reduce((used, row) => used + processingJobCreditCost({ job_type: row.job_type ?? undefined, params_json: row.params_json }), 0);
}

export function lockScorePassAccount(db: RuntimeDatabaseLike, userId: string) {
  // Caller owns the transaction. Serializes imports, retries and exports across
  // API processes on PostgreSQL as well as SQLite's write transaction.
  db.prepare("UPDATE users SET updated_at = updated_at WHERE id = ?").run(userId);
}

export function bindScorePass(db: RuntimeDatabaseLike, userId: string, documentId: string, pageCount: number, creditCost = 1) {
  const available = listScorePasses(db, userId).filter(p => !p.documentId);
  const pass = available.find(p => p.remaining >= creditCost);
  if (!pass && available.length) throw new ScorePassError("SCORE_PASS_CREDITS_EXHAUSTED", "This score pass does not have enough processing credits.");
  if (!pass) throw new ScorePassError("SCORE_PASS_REQUIRED", "Buy a One Score Pass or choose a subscription to process another score.");
  if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > pass.maxPages) {
    throw new ScorePassError("SCORE_PASS_PAGE_LIMIT", "A One Score Pass supports one score of up to 5 pages.");
  }
  db.prepare("UPDATE score_passes SET document_id = ? WHERE purchase_id = ? AND document_id IS NULL").run(documentId, pass.id);
  return pass.id;
}

export function assertScorePassCredit(db: RuntimeDatabaseLike, userId: string, documentId: string, creditCost = 1) {
  const pass = scorePassForDocument(db, userId, documentId);
  if (!pass) throw new ScorePassError("SCORE_PASS_REQUIRED", "This score needs an active One Score Pass or subscription.");
  if (pass.remaining < creditCost) throw new ScorePassError("SCORE_PASS_CREDITS_EXHAUSTED", "The 10 processing credits for this score have been used or are insufficient for this operation. Choose a subscription for more processing.");
  return pass.id;
}

export function recordScorePassJob(db: RuntimeDatabaseLike, passId: string, jobId: string) {
  db.prepare(`INSERT INTO score_pass_jobs (job_id, purchase_id, created_at) VALUES (?, ?, ?)
    ON CONFLICT(job_id) DO NOTHING`).run(jobId, passId, new Date().toISOString());
}
