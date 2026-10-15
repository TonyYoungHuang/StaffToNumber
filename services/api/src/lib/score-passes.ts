import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { processingJobCreditCost } from "./plan-quotas.js";

export class ScorePassError extends Error {
  readonly statusCode: number;
  constructor(readonly code: "SCORE_PASS_REQUIRED" | "SCORE_PASS_CREDITS_EXHAUSTED" | "SCORE_SOURCE_PAGE_COUNT_INVALID" | "SCORE_PASS_DOCUMENT_INVALID" | "SCORE_PASS_ALREADY_BOUND", message: string) {
    super(message);
    this.statusCode = code === "SCORE_SOURCE_PAGE_COUNT_INVALID" ? 422 : 403;
  }
}

export function assertScoreSourcePageCount(pageCount: number) {
  if (!Number.isSafeInteger(pageCount) || pageCount < 1) {
    throw new ScorePassError("SCORE_SOURCE_PAGE_COUNT_INVALID", "The uploaded score must contain at least one valid page.");
  }
}

type Pass = { purchase_id: string; document_id: string | null; credit_limit: number; group_pass_id: string | null };

function ensureLegacyMappings(db: RuntimeDatabaseLike, userId?: string, documentId?: string) {
  // Lazily upgrades passes sold before schema 27, including fixtures and a
  // fulfillment that raced the migration. This never changes credit_limit.
  const missing = db.prepare(`SELECT p.purchase_id, p.document_id, p.created_at FROM score_passes p
    JOIN billing_one_time_purchases b ON b.id = p.purchase_id JOIN score_documents d ON d.id = p.document_id
    WHERE p.document_id IS NOT NULL AND p.group_pass_id IS NULL
      AND b.status = 'active' AND b.paid_at IS NOT NULL
      ${userId ? "AND b.user_id = ?" : ""} ${documentId ? "AND p.document_id = ?" : ""}
      AND NOT EXISTS (SELECT 1 FROM score_pass_documents mapped WHERE mapped.document_id = p.document_id)`).all(...[userId, documentId].filter((id): id is string => Boolean(id))) as Array<{ purchase_id: string; document_id: string; created_at: string }>;
  for (const pass of missing) db.prepare(`INSERT INTO score_pass_documents (pass_id, document_id, role, created_at)
    VALUES (?, ?, 'root', ?) ON CONFLICT(document_id) DO NOTHING`).run(pass.purchase_id, pass.document_id, pass.created_at);
}

export function assertScorePassDocumentOwnership(db: RuntimeDatabaseLike, userId: string, documentId: string) {
  const document = db.prepare("SELECT id FROM score_documents WHERE id = ? AND user_id = ? AND status NOT IN ('deleted', 'archived')").get(documentId, userId);
  if (!document) throw new ScorePassError("SCORE_PASS_DOCUMENT_INVALID", "Choose an existing score owned by this account.");
  ensureLegacyMappings(db, undefined, documentId);
  const owner = db.prepare(`SELECT b.user_id FROM score_pass_documents d
    JOIN billing_one_time_purchases b ON b.id = d.pass_id WHERE d.document_id = ?`).get(documentId) as { user_id: string | null } | undefined;
  if (owner && owner.user_id !== userId) throw new ScorePassError("SCORE_PASS_ALREADY_BOUND", "This score belongs to another score pass account.");
}

export function assertScorePassPurchaseTarget(db: RuntimeDatabaseLike, userId: string, documentId: string) {
  assertScorePassDocumentOwnership(db, userId, documentId);
}

function detachRefundedGroup(db: RuntimeDatabaseLike, documentId: string) {
  const mapping = db.prepare(`SELECT d.pass_id, b.status FROM score_pass_documents d
    JOIN billing_one_time_purchases b ON b.id = d.pass_id WHERE d.document_id = ?`).get(documentId) as { pass_id: string; status: string } | undefined;
  if (mapping && mapping.status !== "active") {
    // Do not revive or migrate any old funding/charges. Rebuy creates a fresh
    // root, while every old topup remains attached to the revoked old group.
    db.prepare("DELETE FROM score_pass_documents WHERE pass_id = ?").run(mapping.pass_id);
    // The legacy schema also has a unique nullable score_passes.document_id.
    // Retire that binding, keeping the original target in immutable purchase
    // and order history before allowing the new root to claim the document.
    const retired = db.prepare("SELECT document_id FROM score_passes WHERE purchase_id = ?").get(mapping.pass_id) as { document_id: string | null } | undefined;
    if (retired?.document_id) {
      db.prepare("UPDATE billing_one_time_purchases SET target_document_id = COALESCE(target_document_id, ?) WHERE id = ?").run(retired.document_id, mapping.pass_id);
      db.prepare("UPDATE payment_orders SET target_document_id = COALESCE(target_document_id, ?) WHERE id = ?").run(retired.document_id, mapping.pass_id);
      db.prepare("UPDATE score_passes SET document_id = NULL WHERE purchase_id = ?").run(mapping.pass_id);
    }
  }
}

function mapProvenHistoricalParts(db: RuntimeDatabaseLike, userId: string, passId: string, sourceDocumentId: string) {
  const pending = [sourceDocumentId], visited = new Set<string>();
  while (pending.length) {
    const source = pending.shift()!;
    if (visited.has(source)) continue;
    visited.add(source);
    const parts = db.prepare(`SELECT d.document_id FROM score_document_derivations d
      JOIN score_documents child ON child.id = d.document_id
      WHERE d.source_document_id = ? AND d.user_id = ? AND child.user_id = ?
        AND child.status NOT IN ('deleted', 'archived') AND d.derivation_kind = 'part_extract'
        AND NOT EXISTS (SELECT 1 FROM score_pass_documents mapping WHERE mapping.document_id = d.document_id)`)
      .all(source, userId, userId) as Array<{ document_id: string }>;
    for (const part of parts) {
      db.prepare("INSERT INTO score_pass_documents (pass_id, document_id, role, created_at) VALUES (?, ?, 'part_extract', ?) ON CONFLICT(document_id) DO NOTHING").run(passId, part.document_id, new Date().toISOString());
      pending.push(part.document_id);
    }
  }
}

export function listScorePasses(db: RuntimeDatabaseLike, userId: string) {
  ensureLegacyMappings(db, userId);
  // Legacy max_pages values remain in storage for schema compatibility only.
  // A pass covers one document regardless of its page count.
  const passes = db.prepare(`SELECT p.purchase_id, p.document_id, p.credit_limit, p.group_pass_id FROM score_passes p JOIN billing_one_time_purchases b ON b.id = p.purchase_id
    WHERE b.user_id = ? AND b.status = 'active' AND b.paid_at IS NOT NULL ORDER BY p.created_at, p.purchase_id`).all(userId) as Pass[];
  return passes.filter(p => !p.group_pass_id).map(p => {
    const credits = passes.filter(funding => funding.purchase_id === p.purchase_id || funding.group_pass_id === p.purchase_id)
      .reduce((sum, funding) => sum + funding.credit_limit, 0);
    const documentIds = (db.prepare("SELECT document_id FROM score_pass_documents WHERE pass_id = ?").all(p.purchase_id) as Array<{ document_id: string }>).map(d => d.document_id);
    return { id: p.purchase_id, documentId: p.document_id, documentIds, credits, remaining: Math.max(0, credits - creditsUsed(db, p.purchase_id)) };
  });
}

export function scorePassForDocument(db: RuntimeDatabaseLike, userId: string, documentId: string) {
  ensureLegacyMappings(db, userId, documentId);
  const document = db.prepare("SELECT id FROM score_documents WHERE id = ? AND user_id = ? AND status NOT IN ('deleted', 'archived')").get(documentId, userId);
  if (!document) return undefined;
  return listScorePasses(db, userId).find(p => p.documentIds.includes(documentId));
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
  assertScorePassDocumentOwnership(db, userId, documentId);
  detachRefundedGroup(db, documentId);
  if (db.prepare("SELECT pass_id FROM score_pass_documents WHERE document_id = ?").get(documentId)) {
    throw new ScorePassError("SCORE_PASS_ALREADY_BOUND", "A score pass is already bound to this score.");
  }
  const available = listScorePasses(db, userId).filter(p => !p.documentId);
  const pass = available.find(p => p.remaining >= creditCost);
  if (!pass && available.length) throw new ScorePassError("SCORE_PASS_CREDITS_EXHAUSTED", "This score pass does not have enough processing credits.");
  if (!pass) throw new ScorePassError("SCORE_PASS_REQUIRED", "Buy a One Score Pass or choose a subscription to process another score.");
  assertScoreSourcePageCount(pageCount);
  db.prepare("UPDATE score_passes SET document_id = ? WHERE purchase_id = ? AND document_id IS NULL").run(documentId, pass.id);
  db.prepare("INSERT INTO score_pass_documents (pass_id, document_id, role, created_at) VALUES (?, ?, 'root', ?)")
    .run(pass.id, documentId, new Date().toISOString());
  mapProvenHistoricalParts(db, userId, pass.id, documentId);
  return pass.id;
}

// Caller owns the fulfillment transaction and holds the account lock. A second
// purchase becomes funding of the existing immutable group, including if bought
// from one of its extracted parts.
export function bindPurchasedScorePass(db: RuntimeDatabaseLike, userId: string, passId: string, documentId: string) {
  assertScorePassDocumentOwnership(db, userId, documentId);
  const purchased = db.prepare(`SELECT p.purchase_id, p.document_id, p.group_pass_id, b.user_id FROM score_passes p
    JOIN billing_one_time_purchases b ON b.id = p.purchase_id WHERE p.purchase_id = ?`).get(passId) as (Pass & { user_id: string | null }) | undefined;
  if (!purchased) throw new Error("Paid score pass is missing.");
  if (purchased.user_id !== userId) throw new ScorePassError("SCORE_PASS_REQUIRED", "This score pass belongs to another account.");
  if (!purchased.document_id && !purchased.group_pass_id) detachRefundedGroup(db, documentId);
  const mapping = db.prepare("SELECT pass_id FROM score_pass_documents WHERE document_id = ?").get(documentId) as { pass_id: string } | undefined;
  if (purchased.document_id || purchased.group_pass_id) {
    const groupId = purchased.group_pass_id ?? purchased.purchase_id;
    if (mapping?.pass_id !== groupId) throw new ScorePassError("SCORE_PASS_ALREADY_BOUND", "A purchased pass cannot be moved to another score.");
    return groupId;
  }
  if (mapping) {
    const group = db.prepare(`SELECT p.purchase_id FROM score_passes p JOIN billing_one_time_purchases b ON b.id = p.purchase_id
      WHERE p.purchase_id = ? AND b.user_id = ? AND b.status = 'active' AND b.paid_at IS NOT NULL`).get(mapping.pass_id, userId);
    if (!group) throw new ScorePassError("SCORE_PASS_REQUIRED", "The original score pass is no longer active.");
    db.prepare("UPDATE score_passes SET group_pass_id = ? WHERE purchase_id = ? AND document_id IS NULL AND group_pass_id IS NULL").run(mapping.pass_id, passId);
    return mapping.pass_id;
  }
  db.prepare("UPDATE score_passes SET document_id = ? WHERE purchase_id = ? AND document_id IS NULL AND group_pass_id IS NULL").run(documentId, passId);
  db.prepare("INSERT INTO score_pass_documents (pass_id, document_id, role, created_at) VALUES (?, ?, 'root', ?)")
    .run(passId, documentId, new Date().toISOString());
  mapProvenHistoricalParts(db, userId, passId, documentId);
  return passId;
}

// Only server extraction calls this, in the same transaction that inserts the
// derived document. Import endpoints never accept a pass/group ID from a file.
export function mapExtractedScorePassDocument(db: RuntimeDatabaseLike, userId: string, sourceDocumentId: string, partDocumentId: string) {
  const source = db.prepare("SELECT id FROM score_documents WHERE id = ? AND user_id = ? AND status NOT IN ('deleted', 'archived')").get(sourceDocumentId, userId);
  assertScorePassDocumentOwnership(db, userId, partDocumentId);
  if (!source) throw new ScorePassError("SCORE_PASS_DOCUMENT_INVALID", "The source score is no longer available.");
  const provenance = db.prepare("SELECT source_document_id, user_id FROM score_document_derivations WHERE document_id = ?").get(partDocumentId) as { source_document_id: string; user_id: string } | undefined;
  if (provenance && (provenance.source_document_id !== sourceDocumentId || provenance.user_id !== userId)) throw new ScorePassError("SCORE_PASS_ALREADY_BOUND", "This part already has a different server-recorded source.");
  db.prepare(`INSERT INTO score_document_derivations (document_id, source_document_id, user_id, derivation_kind, created_at)
    VALUES (?, ?, ?, 'part_extract', ?) ON CONFLICT(document_id) DO NOTHING`).run(partDocumentId, sourceDocumentId, userId, new Date().toISOString());
  const pass = scorePassForDocument(db, userId, sourceDocumentId);
  if (!pass) return;
  assertScorePassDocumentOwnership(db, userId, partDocumentId);
  const existing = db.prepare("SELECT pass_id FROM score_pass_documents WHERE document_id = ?").get(partDocumentId) as { pass_id: string } | undefined;
  if (existing && existing.pass_id !== pass.id) throw new ScorePassError("SCORE_PASS_ALREADY_BOUND", "This part is already covered by another score pass.");
  if (!existing) db.prepare("INSERT INTO score_pass_documents (pass_id, document_id, role, created_at) VALUES (?, ?, 'part_extract', ?)")
    .run(pass.id, partDocumentId, new Date().toISOString());
}

export function assertScorePassCredit(db: RuntimeDatabaseLike, userId: string, documentId: string, creditCost = 1) {
  const pass = scorePassForDocument(db, userId, documentId);
  if (!pass) throw new ScorePassError("SCORE_PASS_REQUIRED", "This score needs an active One Score Pass or subscription.");
  if (pass.remaining < creditCost) throw new ScorePassError("SCORE_PASS_CREDITS_EXHAUSTED", `The ${pass.credits} processing credits shared by this score and its parts have been used or are insufficient for this operation. Choose a subscription or add more credits to this score.`);
  return pass.id;
}

export function recordScorePassJob(db: RuntimeDatabaseLike, passId: string, jobId: string) {
  db.prepare(`INSERT INTO score_pass_jobs (job_id, purchase_id, created_at) VALUES (?, ?, ?)
    ON CONFLICT(job_id) DO NOTHING`).run(jobId, passId, new Date().toISOString());
}
