import { randomBytes } from "node:crypto";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { nowIso } from "../lib/time.js";

export type SupportRequestRow = {
  id: string;
  reference_code: string;
  category: string;
  locale: string;
  contact_name: string | null;
  contact_email: string;
  account_email: string | null;
  subject: string;
  message: string;
  order_reference: string | null;
  job_reference: string | null;
  source_page: string | null;
  source_context: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SupportRequestStatus = "open" | "in_review" | "resolved" | "closed";

type CreateSupportRequestInput = {
  category: string;
  locale: string;
  contactName?: string | null;
  contactEmail: string;
  accountEmail?: string | null;
  subject: string;
  message: string;
  orderReference?: string | null;
  jobReference?: string | null;
  sourcePage?: string | null;
  sourceContext?: string | null;
};

export function createSupportRequest(input: CreateSupportRequestInput) {
  const id = createId();
  const referenceCode = createSupportReferenceCode();
  const timestamp = nowIso();

  db.prepare(
    `
      INSERT INTO support_requests (
        id,
        reference_code,
        category,
        locale,
        contact_name,
        contact_email,
        account_email,
        subject,
        message,
        order_reference,
        job_reference,
        source_page,
        source_context,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `,
  ).run(
    id,
    referenceCode,
    input.category,
    input.locale,
    input.contactName ?? null,
    input.contactEmail,
    input.accountEmail ?? null,
    input.subject,
    input.message,
    input.orderReference ?? null,
    input.jobReference ?? null,
    input.sourcePage ?? null,
    input.sourceContext ?? null,
    timestamp,
    timestamp,
  );

  return findSupportRequestById(id);
}

export function findSupportRequestById(id: string) {
  return db
    .prepare(
      `
        SELECT
          id,
          reference_code,
          category,
          locale,
          contact_name,
          contact_email,
          account_email,
          subject,
          message,
          order_reference,
          job_reference,
          source_page,
          source_context,
          status,
          created_at,
          updated_at
        FROM support_requests
        WHERE id = ?
      `,
    )
    .get(id) as SupportRequestRow | undefined;
}

export function listSupportRequests(input?: { limit?: number; status?: SupportRequestStatus | null }) {
  const limit = Math.max(1, Math.min(input?.limit ?? 100, 200));

  if (input?.status) {
    return db
      .prepare(
        `
          SELECT
            id,
            reference_code,
            category,
            locale,
            contact_name,
            contact_email,
            account_email,
            subject,
            message,
            order_reference,
            job_reference,
            source_page,
            source_context,
            status,
            created_at,
            updated_at
          FROM support_requests
          WHERE status = ?
          ORDER BY datetime(created_at) DESC
          LIMIT ?
        `,
      )
      .all(input.status, limit) as SupportRequestRow[];
  }

  return db
    .prepare(
      `
        SELECT
          id,
          reference_code,
          category,
          locale,
          contact_name,
          contact_email,
          account_email,
          subject,
          message,
          order_reference,
          job_reference,
          source_page,
          source_context,
          status,
          created_at,
          updated_at
        FROM support_requests
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `,
    )
    .all(limit) as SupportRequestRow[];
}

export function updateSupportRequestStatus(id: string, status: SupportRequestStatus) {
  const timestamp = nowIso();

  db.prepare(
    `
      UPDATE support_requests
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `,
  ).run(status, timestamp, id);

  return findSupportRequestById(id);
}

function createSupportReferenceCode() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const referenceCode = `SUP-${datePart}-${suffix}`;

    const existing = db
      .prepare("SELECT id FROM support_requests WHERE reference_code = ? LIMIT 1")
      .get(referenceCode) as { id: string } | undefined;

    if (!existing) {
      return referenceCode;
    }
  }

  throw new Error("Unable to create a unique support reference code.");
}
