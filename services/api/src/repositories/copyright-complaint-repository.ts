import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { nowIso } from "../lib/time.js";

export const COPYRIGHT_COMPLAINT_STATUSES = [
  "received",
  "validating",
  "info_required",
  "reviewing",
  "actioned",
  "rejected",
  "closed",
] as const;

export type CopyrightComplaintStatus = (typeof COPYRIGHT_COMPLAINT_STATUSES)[number];
export type CopyrightRightsBasis = "owner" | "authorized_agent";

export type CopyrightComplaintRow = {
  id: string;
  reference_code: string;
  access_code_hash: string;
  locale: string;
  claimant_name: string;
  claimant_email: string;
  organization: string | null;
  rights_basis: CopyrightRightsBasis;
  original_work_description: string;
  allegedly_infringing_urls_json: string;
  evidence_urls_json: string;
  requested_action: string;
  signature: string;
  good_faith_declared: number;
  accuracy_declared: number;
  status: CopyrightComplaintStatus;
  priority: "standard" | "urgent";
  acknowledged_at: string | null;
  response_due_at: string;
  resolved_at: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
};

export type CopyrightComplaintEventRow = {
  id: string;
  complaint_id: string;
  from_status: CopyrightComplaintStatus | null;
  to_status: CopyrightComplaintStatus;
  actor_type: "claimant" | "admin" | "system";
  actor_id: string | null;
  public_message: string | null;
  internal_note: string | null;
  action_taken: string | null;
  created_at: string;
};

const complaintSelect = `
  SELECT id, reference_code, access_code_hash, locale, claimant_name, claimant_email,
         organization, rights_basis, original_work_description,
         allegedly_infringing_urls_json, evidence_urls_json, requested_action,
         signature, good_faith_declared, accuracy_declared, status, priority,
         acknowledged_at, response_due_at, resolved_at, action_taken, created_at, updated_at
  FROM copyright_complaints
`;

const allowedTransitions: Record<CopyrightComplaintStatus, CopyrightComplaintStatus[]> = {
  received: ["validating", "info_required", "reviewing", "rejected"],
  validating: ["info_required", "reviewing", "rejected"],
  info_required: ["validating", "reviewing", "rejected", "closed"],
  reviewing: ["info_required", "actioned", "rejected"],
  actioned: ["reviewing", "closed"],
  rejected: ["reviewing", "closed"],
  closed: ["reviewing"],
};

function hashAccessCode(accessCode: string) {
  return createHash("sha256").update(accessCode, "utf8").digest("hex");
}

function accessCodeMatches(storedHash: string, accessCode: string) {
  const expected = Buffer.from(storedHash, "hex");
  const received = Buffer.from(hashAccessCode(accessCode), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function createReferenceCode() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `COPY-${datePart}-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!db.prepare("SELECT id FROM copyright_complaints WHERE reference_code = ?").get(code)) return code;
  }
  throw new Error("Unable to create a unique copyright complaint reference.");
}

function insertEvent(input: {
  complaintId: string;
  fromStatus: CopyrightComplaintStatus | null;
  toStatus: CopyrightComplaintStatus;
  actorType: CopyrightComplaintEventRow["actor_type"];
  actorId?: string | null;
  publicMessage?: string | null;
  internalNote?: string | null;
  actionTaken?: string | null;
  createdAt?: string;
}) {
  db.prepare(`
    INSERT INTO copyright_complaint_events (
      id, complaint_id, from_status, to_status, actor_type, actor_id,
      public_message, internal_note, action_taken, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    createId(), input.complaintId, input.fromStatus, input.toStatus, input.actorType,
    input.actorId ?? null, input.publicMessage ?? null, input.internalNote ?? null,
    input.actionTaken ?? null, input.createdAt ?? nowIso(),
  );
}

export function createCopyrightComplaint(input: {
  locale: string;
  claimantName: string;
  claimantEmail: string;
  organization?: string | null;
  rightsBasis: CopyrightRightsBasis;
  originalWorkDescription: string;
  allegedlyInfringingUrls: string[];
  evidenceUrls: string[];
  requestedAction: string;
  signature: string;
  responseHours: number;
  priority?: "standard" | "urgent";
}) {
  const id = createId();
  const accessCode = randomBytes(18).toString("base64url");
  const referenceCode = createReferenceCode();
  const createdAt = nowIso();
  const responseDueAt = new Date(Date.parse(createdAt) + input.responseHours * 60 * 60 * 1000).toISOString();

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO copyright_complaints (
        id, reference_code, access_code_hash, locale, claimant_name, claimant_email,
        organization, rights_basis, original_work_description,
        allegedly_infringing_urls_json, evidence_urls_json, requested_action,
        signature, good_faith_declared, accuracy_declared, status, priority,
        acknowledged_at, response_due_at, resolved_at, action_taken, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'received', ?, NULL, ?, NULL, NULL, ?, ?)
    `).run(
      id, referenceCode, hashAccessCode(accessCode), input.locale, input.claimantName,
      input.claimantEmail, input.organization ?? null, input.rightsBasis,
      input.originalWorkDescription, JSON.stringify(input.allegedlyInfringingUrls),
      JSON.stringify(input.evidenceUrls), input.requestedAction, input.signature,
      input.priority ?? "standard", responseDueAt, createdAt, createdAt,
    );
    insertEvent({
      complaintId: id,
      fromStatus: null,
      toStatus: "received",
      actorType: "claimant",
      publicMessage: input.locale === "zh-CN" ? "投诉材料已收到，等待完整性核验。" : "Complaint received and awaiting completeness review.",
      createdAt,
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { complaint: findCopyrightComplaintById(id)!, accessCode };
}

export function findCopyrightComplaintById(id: string) {
  return db.prepare(`${complaintSelect} WHERE id = ?`).get(id) as CopyrightComplaintRow | undefined;
}

export function findCopyrightComplaintByReference(referenceCode: string) {
  return db.prepare(`${complaintSelect} WHERE reference_code = ?`).get(referenceCode.trim().toUpperCase()) as CopyrightComplaintRow | undefined;
}

export function findPublicCopyrightComplaint(referenceCode: string, accessCode: string) {
  const complaint = findCopyrightComplaintByReference(referenceCode);
  if (!complaint || !accessCodeMatches(complaint.access_code_hash, accessCode.trim())) return undefined;
  return complaint;
}

export function listCopyrightComplaintEvents(complaintId: string) {
  return db.prepare(`
    SELECT id, complaint_id, from_status, to_status, actor_type, actor_id,
           public_message, internal_note, action_taken, created_at
    FROM copyright_complaint_events
    WHERE complaint_id = ?
    ORDER BY datetime(created_at) ASC, rowid ASC
  `).all(complaintId) as CopyrightComplaintEventRow[];
}

export function listCopyrightComplaints(input?: { status?: CopyrightComplaintStatus | null; limit?: number }) {
  const limit = Math.max(1, Math.min(input?.limit ?? 100, 200));
  if (input?.status) {
    return db.prepare(`${complaintSelect} WHERE status = ? ORDER BY datetime(created_at) DESC LIMIT ?`).all(input.status, limit) as CopyrightComplaintRow[];
  }
  return db.prepare(`${complaintSelect} ORDER BY datetime(created_at) DESC LIMIT ?`).all(limit) as CopyrightComplaintRow[];
}

export function transitionCopyrightComplaint(input: {
  id: string;
  toStatus: CopyrightComplaintStatus;
  actorId: string;
  publicMessage?: string | null;
  internalNote?: string | null;
  actionTaken?: string | null;
}) {
  const current = findCopyrightComplaintById(input.id);
  if (!current) return { ok: false as const, reason: "not_found" as const };
  if (current.status !== input.toStatus && !allowedTransitions[current.status].includes(input.toStatus)) {
    return { ok: false as const, reason: "invalid_transition" as const, current };
  }

  const publicMessage = input.publicMessage?.trim() || null;
  const internalNote = input.internalNote?.trim() || null;
  const actionTaken = input.actionTaken?.trim() || null;
  if (["info_required", "actioned", "rejected", "closed"].includes(input.toStatus) && !publicMessage) {
    return { ok: false as const, reason: "public_message_required" as const, current };
  }
  if (input.toStatus === "actioned" && !actionTaken) {
    return { ok: false as const, reason: "action_required" as const, current };
  }
  if (current.status === input.toStatus && !publicMessage && !internalNote && !actionTaken) {
    return { ok: false as const, reason: "empty_update" as const, current };
  }

  const timestamp = nowIso();
  const acknowledgedAt = current.acknowledged_at ?? (input.toStatus === "received" ? null : timestamp);
  const resolvedAt = ["actioned", "rejected", "closed"].includes(input.toStatus) ? timestamp : null;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      UPDATE copyright_complaints
      SET status = ?, acknowledged_at = ?, resolved_at = ?, action_taken = COALESCE(?, action_taken), updated_at = ?
      WHERE id = ?
    `).run(input.toStatus, acknowledgedAt, resolvedAt, actionTaken, timestamp, input.id);
    insertEvent({
      complaintId: input.id,
      fromStatus: current.status,
      toStatus: input.toStatus,
      actorType: "admin",
      actorId: input.actorId,
      publicMessage,
      internalNote,
      actionTaken,
      createdAt: timestamp,
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { ok: true as const, complaint: findCopyrightComplaintById(input.id)! };
}

export function deleteCopyrightComplaintForTest(id: string) {
  db.prepare("DELETE FROM copyright_complaint_events WHERE complaint_id = ?").run(id);
  db.prepare("DELETE FROM copyright_complaints WHERE id = ?").run(id);
}
