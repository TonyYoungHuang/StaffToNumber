import { SHOP_CREDIT_PACKS, type ShopCreditPackCode } from "@score/shared";
import { db } from "../db.js";

export function prepaidCreditBalance(userId: string) {
  const grants = db.prepare("SELECT COALESCE(SUM(credits), 0) AS total, MIN(created_at) AS startsAt FROM prepaid_credit_grants WHERE user_id = ?").get(userId) as { total: number; startsAt: string | null };
  const charged = db.prepare("SELECT COALESCE(SUM(credit_cost), 0) AS used FROM prepaid_credit_charges WHERE user_id = ? AND status <> 'released'").get(userId) as { used: number };
  const total = Number(grants.total), used = Number(charged.used);
  return { total, used, remaining: Math.max(0, total - used), startsAt: grants.startsAt };
}

// Caller owns the transaction and has locked the code and then the account.
export function grantPrepaidCredits(userId: string, activationCodeId: string, planCode: ShopCreditPackCode, timestamp: string) {
  const pack = SHOP_CREDIT_PACKS[planCode];
  db.prepare(`INSERT INTO prepaid_credit_grants (activation_code_id, user_id, plan_code, credits, storage_tier, created_at)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(activation_code_id) DO NOTHING`)
    .run(activationCodeId, userId, planCode, pack.credits, pack.storageTier, timestamp);
}

// Caller owns the same account lock as job creation/retry. Charges survive job
// deletion; database triggers release failed/cancelled reservations atomically.
export function reservePrepaidCredits(userId: string, family: "score" | "legacy", jobId: string, creditCost: number) {
  if (!Number.isSafeInteger(creditCost) || creditCost < 1) throw new Error("Invalid prepaid credit cost.");
  const existing = db.prepare("SELECT user_id, status, credit_cost FROM prepaid_credit_charges WHERE job_family = ? AND job_id = ?").get(family, jobId) as { user_id: string; status: string; credit_cost: number } | undefined;
  if (existing && (existing.user_id !== userId || Number(existing.credit_cost) !== creditCost)) throw new Error("Credit reservation identity changed.");
  if (existing && existing.status !== "released") return;
  if (prepaidCreditBalance(userId).remaining < creditCost) throw Object.assign(new Error("The prepaid credit balance is insufficient."), { statusCode: 429, code: "PLAN_JOB_QUOTA_EXCEEDED" });
  db.prepare(`INSERT INTO prepaid_credit_charges (job_family, job_id, user_id, credit_cost, status, created_at)
    VALUES (?, ?, ?, ?, 'reserved', ?) ON CONFLICT(job_family, job_id) DO UPDATE SET status = 'reserved'`)
    .run(family, jobId, userId, creditCost, new Date().toISOString());
}
