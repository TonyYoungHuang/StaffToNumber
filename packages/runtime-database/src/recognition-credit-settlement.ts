import type { RuntimeDatabaseLike } from "./index.js";

export type RecognitionCreditSettlementInput = {
  jobId: string;
  quotedCredits: number;
  sourcePageCount: number;
  deliveredPages: number | number[];
};
export type RecognitionCreditSettlement = {
  schemaVersion: 1;
  quotedCredits: number;
  sourcePageCount: number;
  deliveredPages: number;
  settledCreditCost: number;
  creditsReturned: number;
  refundMethod: "credits-only";
};

/** Four decimal places, rounded toward the customer, using integer arithmetic. */
export function recognitionCreditSettlement(input: Omit<RecognitionCreditSettlementInput, "jobId">): RecognitionCreditSettlement {
  const delivered = Array.isArray(input.deliveredPages) ? new Set(input.deliveredPages).size : input.deliveredPages;
  if (!Number.isSafeInteger(input.quotedCredits) || input.quotedCredits < 1 || !Number.isSafeInteger(input.sourcePageCount) || input.sourcePageCount < 1 ||
      !Number.isSafeInteger(delivered) || delivered < 0 || delivered > input.sourcePageCount ||
      (Array.isArray(input.deliveredPages) && input.deliveredPages.some(page => !Number.isSafeInteger(page) || page < 1 || page > input.sourcePageCount))) {
    throw new Error("Invalid recognition delivery credit settlement.");
  }
  const units = BigInt(input.quotedCredits) * BigInt(delivered) * 10_000n / BigInt(input.sourcePageCount);
  const settledCreditCost = Number(units) / 10_000;
  const creditsReturned = Number(BigInt(input.quotedCredits) * 10_000n - units) / 10_000;
  return { schemaVersion: 1, quotedCredits: input.quotedCredits, sourcePageCount: input.sourcePageCount, deliveredPages: delivered,
    settledCreditCost, creditsReturned, refundMethod: "credits-only" };
}

/** Read only server settlements whose quote and coverage remain self-consistent. */
export function settledRecognitionCreditCost(params: Record<string, unknown>): number | null {
  const value = params.creditSettlement;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const settlement = value as RecognitionCreditSettlement;
  try {
    const expected = recognitionCreditSettlement(settlement);
    if (settlement.schemaVersion !== 1 || settlement.refundMethod !== "credits-only" || params.creditCost !== settlement.quotedCredits ||
        settlement.settledCreditCost !== expected.settledCreditCost || settlement.creditsReturned !== expected.creditsReturned) return null;
    return expected.settledCreditCost;
  } catch { return null; }
}

/** Caller holds the job/document transaction. No cash/payment provider is involved. */
export function settleRecognitionCredits(db: RuntimeDatabaseLike, input: RecognitionCreditSettlementInput): RecognitionCreditSettlement {
  const job = db.prepare("SELECT status, job_type, params_json FROM score_jobs WHERE id = ?").get(input.jobId) as {
    status: string; job_type: string; params_json: string | null;
  } | undefined;
  if (!job || job.job_type !== "omr_import" || job.status !== "processing") throw new Error("Recognition credit settlement requires the processing source job.");
  const params = job.params_json ? JSON.parse(job.params_json) as Record<string, unknown> : {};
  if (params.creditCost !== undefined && params.creditCost !== input.quotedCredits) throw new Error("Recognition quote changed before credit settlement.");
  const settlement = recognitionCreditSettlement(input);
  if (params.creditSettlement && JSON.stringify(params.creditSettlement) !== JSON.stringify(settlement)) throw new Error("Recognition delivery settlement changed after it was recorded.");
  const charge = db.prepare("SELECT credit_cost, status FROM prepaid_credit_charges WHERE job_family = 'score' AND job_id = ?").get(input.jobId) as { credit_cost: number; status: string } | undefined;
  if (charge) {
    if (charge.status !== "reserved" && !(charge.status === "released" && settlement.settledCreditCost === 0)) throw new Error("Recognition credit reservation is no longer active.");
    if (settlement.settledCreditCost === 0) {
      db.prepare("UPDATE prepaid_credit_charges SET status = 'released' WHERE job_family = 'score' AND job_id = ? AND status = 'reserved'").run(input.jobId);
    } else {
      db.prepare("UPDATE prepaid_credit_charges SET credit_cost = ? WHERE job_family = 'score' AND job_id = ? AND status = 'reserved'").run(settlement.settledCreditCost, input.jobId);
    }
  }
  db.prepare("UPDATE score_jobs SET params_json = ? WHERE id = ? AND status = 'processing'")
    .run(JSON.stringify({ ...params, creditCost: input.quotedCredits, settledCreditCost: settlement.settledCreditCost,
      creditsReturned: settlement.creditsReturned, creditSettlement: settlement }), input.jobId);
  return settlement;
}
