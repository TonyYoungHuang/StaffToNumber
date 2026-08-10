import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { db } from "../db.js";
import { nowIso } from "../lib/time.js";
import { enqueueStorageDeletion, processStorageDeletionQueue } from "./storage-deletion-repository.js";

type AccountLifecycleRow = {
  id: string;
  email: string;
  account_status: "active" | "deletion_pending";
  deletion_requested_at: string | null;
  scheduled_deletion_at: string | null;
  created_at: string;
  updated_at: string;
};

type StoredPathRow = {
  id: string;
  storage_path: string;
  storage_backend: "local" | "s3";
  storage_key: string | null;
};

function parseJson(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function rows<T>(sql: string, ...params: Array<string | number | null>) {
  return db.prepare(sql).all(...params) as T[];
}

function row<T>(sql: string, ...params: Array<string | number | null>) {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function getAccountLifecycle(userId: string) {
  const account = row<AccountLifecycleRow>(
    `SELECT id, email, account_status, deletion_requested_at, scheduled_deletion_at, created_at, updated_at
     FROM users WHERE id = ?`,
    userId,
  );
  if (!account) return null;
  return {
    status: account.account_status,
    deletionRequestedAt: account.deletion_requested_at,
    scheduledDeletionAt: account.scheduled_deletion_at,
  };
}

export function scheduleAccountDeletion(userId: string, graceDays = config.accountDeletionGraceDays) {
  const requestedAt = nowIso();
  const scheduledDeletionAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000).toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = db.prepare(
      `UPDATE users
       SET account_status = 'deletion_pending', deletion_requested_at = ?, scheduled_deletion_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(requestedAt, scheduledDeletionAt, requestedAt, userId);
    if (result.changes !== 1) throw new Error("Account not found.");
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(requestedAt, userId);
    db.prepare(
      `UPDATE score_jobs SET status = 'cancelled', cancel_requested_at = ?, updated_at = ?, completed_at = ?
       WHERE user_id = ? AND status IN ('queued', 'processing')`,
    ).run(requestedAt, requestedAt, requestedAt, userId);
    db.prepare(
      `UPDATE jobs SET status = 'failed', error_message = 'Account deletion requested.', updated_at = ?, completed_at = ?
       WHERE user_id = ? AND status IN ('queued', 'processing')`,
    ).run(requestedAt, requestedAt, userId);
    db.prepare(
      `UPDATE score_shares SET revoked_at = ?, updated_at = ?
       WHERE revoked_at IS NULL AND (created_by_user_id = ? OR document_id IN (SELECT id FROM score_documents WHERE user_id = ?))`,
    ).run(requestedAt, requestedAt, userId, userId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return getAccountLifecycle(userId);
}

export function cancelAccountDeletion(userId: string) {
  const timestamp = nowIso();
  const result = db.prepare(
    `UPDATE users
     SET account_status = 'active', deletion_requested_at = NULL, scheduled_deletion_at = NULL, updated_at = ?
     WHERE id = ? AND account_status = 'deletion_pending'`,
  ).run(timestamp, userId);
  return result.changes === 1 ? getAccountLifecycle(userId) : null;
}

export function buildAccountDataExport(userId: string) {
  const account = row<AccountLifecycleRow>(
    `SELECT id, email, account_status, deletion_requested_at, scheduled_deletion_at, created_at, updated_at
     FROM users WHERE id = ?`,
    userId,
  );
  if (!account) return null;

  const files = rows<Record<string, unknown>>(
    `SELECT id, original_name, mime_type, size_bytes, file_kind, created_at FROM files WHERE user_id = ? ORDER BY created_at`,
    userId,
  ).map((file) => ({ ...file, download_path: `/api/files/${file.id}/download` }));
  const revisions = rows<Record<string, unknown>>(
    `SELECT r.id, r.document_id, r.revision_number, r.score_json, r.musicxml_file_id, r.created_from, r.status, r.created_at
     FROM score_revisions r JOIN score_documents d ON d.id = r.document_id WHERE d.user_id = ? ORDER BY r.created_at`,
    userId,
  ).map((revision) => ({ ...revision, score_json: parseJson(revision.score_json) }));

  return {
    schemaVersion: 1,
    generatedAt: nowIso(),
    account: {
      id: account.id,
      email: account.email,
      status: account.account_status,
      deletionRequestedAt: account.deletion_requested_at,
      scheduledDeletionAt: account.scheduled_deletion_at,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    },
    entitlements: rows(
      `SELECT id, starts_at, ends_at, created_at FROM user_entitlements WHERE user_id = ? ORDER BY created_at`,
      userId,
    ),
    payments: rows(
      `SELECT id, provider, status, customer_email, locale, entitlement_days, amount_minor, currency,
              paid_at, cancelled_at, failure_reason, created_at, updated_at
       FROM payment_orders WHERE user_id = ? ORDER BY created_at`,
      userId,
    ),
    billingSubscriptions: rows(
      `SELECT provider, provider_subscription_id, status, plan_ref, seat_quantity, current_period_start,
              current_period_end, cancel_at_period_end, canceled_at, ended_at, last_payment_failed_at, created_at, updated_at
       FROM billing_subscriptions WHERE user_id = ? ORDER BY created_at`,
      userId,
    ),
    billingInvoices: rows(
      `SELECT invoices.provider, invoices.provider_invoice_id, invoices.status, invoices.amount_due_minor,
              invoices.amount_paid_minor, invoices.amount_refunded_minor, invoices.currency, invoices.hosted_url,
              invoices.due_at, invoices.paid_at, invoices.failed_at, invoices.created_at, invoices.updated_at
       FROM billing_invoices invoices
       JOIN billing_subscriptions subscriptions ON subscriptions.id = invoices.subscription_id
       WHERE subscriptions.user_id = ? ORDER BY invoices.created_at`,
      userId,
    ),
    files,
    scoreDocuments: rows<Record<string, unknown>>(
      `SELECT id, title, current_revision_id, pending_revision_id, source_file_id, settings_json, status, created_at, updated_at
       FROM score_documents WHERE user_id = ? ORDER BY created_at`,
      userId,
    ).map((document: Record<string, unknown>) => ({ ...document, settings_json: parseJson(document.settings_json) })),
    scoreRevisions: revisions,
    scoreAssets: rows<Record<string, unknown>>(
      `SELECT a.id, a.document_id, a.file_id, a.asset_kind, a.revision_id, a.params_json, a.engine_json,
              a.checksum_sha256, a.stale_at, a.created_at
       FROM score_assets a JOIN score_documents d ON d.id = a.document_id WHERE d.user_id = ? ORDER BY a.created_at`,
      userId,
    ).map((asset: Record<string, unknown>) => ({
      ...asset,
      params_json: parseJson(asset.params_json),
      engine_json: parseJson(asset.engine_json),
    })),
    scoreJobs: rows<Record<string, unknown>>(
      `SELECT id, document_id, input_file_id, job_type, status, params_json, result_revision_id, output_file_ids_json,
              error_message, attempt_count, progress_percent, created_at, updated_at, started_at, completed_at
       FROM score_jobs WHERE user_id = ? ORDER BY created_at`,
      userId,
    ).map((job: Record<string, unknown>) => ({
      ...job,
      params_json: parseJson(job.params_json),
      output_file_ids_json: parseJson(job.output_file_ids_json),
    })),
    comments: rows<Record<string, unknown>>(
      `SELECT id, document_id, share_id, author_name, body, target_json, resolved_at, resolved_by_user_id, created_at, updated_at
       FROM score_comments WHERE user_id = ? ORDER BY created_at`,
      userId,
    ).map((comment: Record<string, unknown>) => ({ ...comment, target_json: parseJson(comment.target_json) })),
    shares: rows(
      `SELECT id, document_id, permission, label, expires_at, revoked_at, created_at, updated_at
       FROM score_shares WHERE created_by_user_id = ? ORDER BY created_at`,
      userId,
    ),
    ownedClassrooms: rows(
      `SELECT id, name, description, created_at, updated_at, archived_at
       FROM score_classrooms WHERE owner_user_id = ? ORDER BY created_at`,
      userId,
    ),
    ownedOrganizations: rows(
      `SELECT id, name, slug, created_at, updated_at, archived_at
       FROM score_organizations WHERE owner_user_id = ? ORDER BY created_at`,
      userId,
    ),
    organizationMemberships: rows(
      `SELECT organization_id, display_name, role, status, created_at, accepted_at
       FROM score_organization_members WHERE user_id = ? AND removed_at IS NULL ORDER BY created_at`,
      userId,
    ),
    classroomStaffMemberships: rows(
      `SELECT classroom_id, display_name, role, status, created_at, accepted_at
       FROM score_classroom_staff WHERE user_id = ? AND removed_at IS NULL ORDER BY created_at`,
      userId,
    ),
    classroomMemberships: rows(
      `SELECT s.id, s.classroom_id, s.display_name, s.status, s.created_at, s.updated_at
       FROM score_classroom_students s WHERE s.user_id = ? ORDER BY s.created_at`,
      userId,
    ),
    classroomResourceGrants: rows(
      `SELECT grants.classroom_id, grants.version_group_id, grants.student_id, grants.created_at
       FROM score_classroom_resource_student_grants grants
       JOIN score_classroom_students students ON students.id = grants.student_id
       WHERE students.user_id = ? OR grants.created_by_user_id = ?
       ORDER BY grants.created_at`,
      userId,
      userId,
    ),
    classroomResourceRetentionPolicies: rows(
      `SELECT policies.classroom_id, policies.enabled, policies.historical_version_days,
              policies.minimum_versions_per_group, policies.created_at, policies.updated_at
       FROM score_classroom_resource_retention_policies policies
       JOIN score_classrooms classrooms ON classrooms.id = policies.classroom_id
       WHERE policies.updated_by_user_id = ? OR classrooms.owner_user_id = ?
       ORDER BY policies.created_at`,
      userId,
      userId,
    ),
    studentExitRequests: rows(
      `SELECT requests.id, requests.classroom_id, requests.student_id, requests.status, requests.reason,
              requests.requested_at, requests.updated_at, requests.decided_at, requests.cancelled_at
       FROM score_student_exit_requests requests
       LEFT JOIN score_student_guardians guardians ON guardians.id = requests.decided_by_guardian_id
       WHERE requests.requested_by_user_id = ? OR guardians.user_id = ?
       ORDER BY requests.requested_at`,
      userId,
      userId,
    ),
    guardianMemberships: rows(
      `SELECT g.student_id, g.display_name, g.relationship, g.status, g.created_at, g.accepted_at
       FROM score_student_guardians g WHERE g.user_id = ? AND g.removed_at IS NULL ORDER BY g.created_at`,
      userId,
    ),
    notificationPreferences: row(
      `SELECT email_classroom_announcements, locale, created_at, updated_at
       FROM score_notification_preferences WHERE user_id = ?`,
      userId,
    ),
    notificationDeliveries: rows(
      `SELECT notification_id, channel, destination, status, attempts, provider_message_id,
              last_error, sent_at, created_at, updated_at
       FROM score_notification_deliveries WHERE recipient_user_id = ? ORDER BY created_at`,
      userId,
    ),
    rubricTemplates: rows<Record<string, unknown>>(
      `SELECT id, name, rubric_json, created_at, updated_at FROM score_rubric_templates WHERE user_id = ? ORDER BY created_at`,
      userId,
    ).map((template: Record<string, unknown>) => ({ ...template, rubric_json: parseJson(template.rubric_json) })),
    supportRequests: rows(
      `SELECT id, reference_code, category, locale, subject, message, order_reference, job_reference, status, created_at, updated_at
       FROM support_requests WHERE lower(contact_email) = lower(?) OR lower(account_email) = lower(?) ORDER BY created_at`,
      account.email,
      account.email,
    ),
    securityEvents: rows<Record<string, unknown>>(
      `SELECT id, event_type, severity, outcome, request_id, trace_id, method, route_template,
              resource_type, resource_id, metadata_json, created_at
       FROM security_audit_events WHERE actor_id = ? ORDER BY created_at`,
      userId,
    ).map((event: Record<string, unknown>) => ({ ...event, metadata_json: parseJson(event.metadata_json) })),
  };
}

function storagePathIsSafe(filePath: string) {
  const root = path.resolve(config.storageDir);
  const candidate = path.resolve(filePath);
  const normalizedRoot = process.platform === "win32" ? root.toLowerCase() : root;
  const normalizedCandidate = process.platform === "win32" ? candidate.toLowerCase() : candidate;
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
}

export async function purgeAccountNow(userId: string) {
  const account = row<AccountLifecycleRow>(
    `SELECT id, email, account_status, deletion_requested_at, scheduled_deletion_at, created_at, updated_at FROM users WHERE id = ?`,
    userId,
  );
  if (!account) return { deleted: false, physicalFilesDeleted: 0, unsafePathsSkipped: 0 };
  const physicalFiles = rows<StoredPathRow>(
    "SELECT id, storage_path, storage_backend, storage_key FROM files WHERE user_id = ?",
    userId,
  );

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE score_assignment_submissions SET performance_file_id = NULL WHERE performance_file_id IN (SELECT id FROM files WHERE user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_assignment_submissions WHERE document_id IN (SELECT id FROM score_documents WHERE user_id = ?) OR assignment_id IN (SELECT id FROM score_assignments WHERE created_by_user_id = ?)").run(userId, userId);
    db.prepare("DELETE FROM score_comments WHERE user_id = ? OR document_id IN (SELECT id FROM score_documents WHERE user_id = ?)").run(userId, userId);
    db.prepare("DELETE FROM score_assignments WHERE created_by_user_id = ? OR document_id IN (SELECT id FROM score_documents WHERE user_id = ?)").run(userId, userId);
    db.prepare("DELETE FROM score_shares WHERE created_by_user_id = ? OR document_id IN (SELECT id FROM score_documents WHERE user_id = ?)").run(userId, userId);
    db.prepare("DELETE FROM score_assets WHERE document_id IN (SELECT id FROM score_documents WHERE user_id = ?)").run(userId);
    db.prepare("DELETE FROM omr_diagnostics WHERE document_id IN (SELECT id FROM score_documents WHERE user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_jobs WHERE user_id = ? OR document_id IN (SELECT id FROM score_documents WHERE user_id = ?)").run(userId, userId);
    db.prepare("DELETE FROM score_revisions WHERE document_id IN (SELECT id FROM score_documents WHERE user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_documents WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM score_rubric_templates WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM jobs WHERE user_id = ?").run(userId);

    const ownedOrganizations = db.prepare("SELECT id FROM score_organizations WHERE owner_user_id = ?").all(userId) as Array<{ id: string }>;
    for (const organization of ownedOrganizations) {
      const successor = db.prepare(`
        SELECT members.user_id AS userId
        FROM score_organization_members members
        JOIN users ON users.id = members.user_id
        WHERE members.organization_id = ? AND members.user_id != ? AND members.role = 'admin'
          AND members.status = 'active' AND members.removed_at IS NULL AND users.account_status = 'active'
        ORDER BY members.accepted_at, members.created_at LIMIT 1
      `).get(organization.id, userId) as { userId: string } | undefined;
      if (successor) {
        db.prepare("UPDATE score_organizations SET owner_user_id = ?, updated_at = ? WHERE id = ?").run(successor.userId, nowIso(), organization.id);
        db.prepare("UPDATE score_organization_members SET role = 'owner', updated_at = ? WHERE organization_id = ? AND user_id = ?").run(nowIso(), organization.id, successor.userId);
        db.prepare("UPDATE score_organization_members SET invited_by_user_id = ? WHERE organization_id = ? AND invited_by_user_id = ?").run(successor.userId, organization.id, userId);
        db.prepare("DELETE FROM score_organization_members WHERE organization_id = ? AND user_id = ?").run(organization.id, userId);
      } else {
        db.prepare("UPDATE score_classrooms SET organization_id = NULL, campus_id = NULL, updated_at = ? WHERE organization_id = ?").run(nowIso(), organization.id);
        db.prepare("DELETE FROM score_organization_members WHERE organization_id = ?").run(organization.id);
        db.prepare("DELETE FROM score_organization_campuses WHERE organization_id = ?").run(organization.id);
        db.prepare("DELETE FROM score_organizations WHERE id = ?").run(organization.id);
      }
    }
    db.prepare(`
      UPDATE score_organization_members
      SET invited_by_user_id = (SELECT owner_user_id FROM score_organizations WHERE id = score_organization_members.organization_id), updated_at = ?
      WHERE invited_by_user_id = ?
    `).run(nowIso(), userId);
    db.prepare("DELETE FROM score_organization_members WHERE user_id = ? OR lower(invited_email) = lower(?)").run(userId, account.email);
    db.prepare(`
      UPDATE score_classroom_staff
      SET invited_by_user_id = (SELECT owner_user_id FROM score_classrooms WHERE id = score_classroom_staff.classroom_id), updated_at = ?
      WHERE invited_by_user_id = ? AND classroom_id NOT IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)
    `).run(nowIso(), userId, userId);
    db.prepare("DELETE FROM score_classroom_staff WHERE user_id = ? OR lower(invited_email) = lower(?)").run(userId, account.email);
    db.prepare(`
      UPDATE score_student_guardians
      SET invited_by_user_id = (
        SELECT classrooms.owner_user_id FROM score_classroom_students students
        JOIN score_classrooms classrooms ON classrooms.id = students.classroom_id
        WHERE students.id = score_student_guardians.student_id
      ), updated_at = ?
      WHERE invited_by_user_id = ?
        AND student_id NOT IN (SELECT students.id FROM score_classroom_students students JOIN score_classrooms classrooms ON classrooms.id = students.classroom_id WHERE classrooms.owner_user_id = ?)
    `).run(nowIso(), userId, userId);
    db.prepare("UPDATE score_student_exit_requests SET decided_by_guardian_id = NULL WHERE decided_by_guardian_id IN (SELECT id FROM score_student_guardians WHERE user_id = ? OR lower(invited_email) = lower(?))").run(userId, account.email);
    db.prepare("DELETE FROM score_guardian_notification_receipts WHERE guardian_id IN (SELECT id FROM score_student_guardians WHERE user_id = ? OR lower(invited_email) = lower(?))").run(userId, account.email);
    db.prepare("DELETE FROM score_student_guardians WHERE user_id = ? OR lower(invited_email) = lower(?)").run(userId, account.email);

    db.prepare("DELETE FROM billing_seat_assignments WHERE organization_id IN (SELECT id FROM score_organizations WHERE owner_user_id = ?)").run(userId);
    db.prepare("UPDATE billing_subscriptions SET organization_id = NULL, status = 'cancelled', ended_at = COALESCE(ended_at, ?), updated_at = ? WHERE organization_id IN (SELECT id FROM score_organizations WHERE owner_user_id = ?)").run(nowIso(), nowIso(), userId);
    db.prepare("UPDATE billing_customers SET organization_id = NULL, updated_at = ? WHERE organization_id IN (SELECT id FROM score_organizations WHERE owner_user_id = ?)").run(nowIso(), userId);
    db.prepare("DELETE FROM score_classroom_notification_receipts WHERE student_id IN (SELECT s.id FROM score_classroom_students s JOIN score_classrooms c ON c.id = s.classroom_id WHERE c.owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_student_exit_requests WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_guardian_notification_receipts WHERE guardian_id IN (SELECT g.id FROM score_student_guardians g JOIN score_classroom_students s ON s.id = g.student_id JOIN score_classrooms c ON c.id = s.classroom_id WHERE c.owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_notification_deliveries WHERE notification_id IN (SELECT id FROM score_classroom_notifications WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?))").run(userId);
    db.prepare("DELETE FROM score_student_guardians WHERE student_id IN (SELECT s.id FROM score_classroom_students s JOIN score_classrooms c ON c.id = s.classroom_id WHERE c.owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_classroom_staff WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("UPDATE score_assignment_submissions SET student_id = NULL WHERE student_id IN (SELECT s.id FROM score_classroom_students s JOIN score_classrooms c ON c.id = s.classroom_id WHERE c.owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_classroom_notifications WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_classroom_resource_student_grants WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_classroom_resource_retention_policies WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_classroom_resources WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_classroom_resource_folders WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_lms_connections WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_classroom_students WHERE classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id = ?)").run(userId);
    db.prepare("DELETE FROM score_classrooms WHERE owner_user_id = ?").run(userId);
    db.prepare(
      `UPDATE score_assignment_submissions
       SET submitter_name = 'Deleted student', submitter_contact = NULL, note = NULL, recording_url = NULL,
           performance_file_id = NULL, performance_analysis_json = NULL, updated_at = ?
       WHERE student_id IN (SELECT id FROM score_classroom_students WHERE user_id = ?)
          OR lower(submitter_contact) = lower(?)`,
    ).run(nowIso(), userId, account.email);
    db.prepare("UPDATE score_classroom_students SET user_id = NULL, contact_email = NULL, external_ref = NULL, display_name = 'Deleted student', updated_at = ? WHERE user_id = ?").run(nowIso(), userId);
    db.prepare("UPDATE score_student_exit_requests SET requested_by_user_id = NULL WHERE requested_by_user_id = ?").run(userId);
    db.prepare("UPDATE score_notification_deliveries SET recipient_user_id = NULL, destination = 'deleted-account', locked_at = NULL, updated_at = ? WHERE recipient_user_id = ?").run(nowIso(), userId);
    db.prepare("DELETE FROM score_notification_preferences WHERE user_id = ?").run(userId);

    db.prepare(`
      UPDATE score_classroom_resource_folders
      SET created_by_user_id = (
        SELECT owner_user_id FROM score_classrooms WHERE id = score_classroom_resource_folders.classroom_id
      ), updated_at = ?
      WHERE created_by_user_id = ?
        AND classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id != ?)
    `).run(nowIso(), userId, userId);

    db.prepare(`
      UPDATE score_classroom_resource_student_grants
      SET created_by_user_id = (
        SELECT owner_user_id FROM score_classrooms WHERE id = score_classroom_resource_student_grants.classroom_id
      )
      WHERE created_by_user_id = ?
        AND classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id != ?)
    `).run(userId, userId);

    db.prepare(`
      UPDATE score_classroom_resource_retention_policies
      SET updated_by_user_id = (
        SELECT owner_user_id FROM score_classrooms WHERE id = score_classroom_resource_retention_policies.classroom_id
      ), updated_at = ?
      WHERE updated_by_user_id = ?
        AND classroom_id IN (SELECT id FROM score_classrooms WHERE owner_user_id != ?)
    `).run(nowIso(), userId, userId);

    db.prepare(`
      UPDATE files
      SET user_id = (
        SELECT classrooms.owner_user_id
        FROM score_classroom_resources resources
        JOIN score_classrooms classrooms ON classrooms.id = resources.classroom_id
        WHERE resources.file_id = files.id AND classrooms.owner_user_id != ?
        LIMIT 1
      )
      WHERE user_id = ? AND EXISTS (
        SELECT 1 FROM score_classroom_resources resources
        JOIN score_classrooms classrooms ON classrooms.id = resources.classroom_id
        WHERE resources.file_id = files.id AND classrooms.owner_user_id != ?
      )
    `).run(userId, userId, userId);

    const filesToDelete = rows<StoredPathRow>(
      "SELECT id, storage_path, storage_backend, storage_key FROM files WHERE user_id = ?",
      userId,
    );
    for (const file of filesToDelete) enqueueStorageDeletion(db, file);
    db.prepare("DELETE FROM files WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_entitlements WHERE user_id = ?").run(userId);
    db.prepare("UPDATE activation_codes SET redeemed_by_user_id = NULL WHERE redeemed_by_user_id = ?").run(userId);
    db.prepare("UPDATE payment_orders SET user_id = NULL, customer_email = NULL, updated_at = ? WHERE user_id = ?").run(nowIso(), userId);
    db.prepare("UPDATE billing_seat_assignments SET user_id = NULL, assigned_email = 'deleted-' || id || '@invalid.local', status = 'revoked', revoked_at = COALESCE(revoked_at, ?), updated_at = ? WHERE user_id = ? OR lower(assigned_email) = lower(?)").run(nowIso(), nowIso(), userId, account.email);
    db.prepare("UPDATE billing_subscriptions SET user_id = NULL, status = 'cancelled', ended_at = COALESCE(ended_at, ?), updated_at = ? WHERE user_id = ?").run(nowIso(), nowIso(), userId);
    db.prepare("UPDATE billing_customers SET user_id = NULL, email = NULL, updated_at = ? WHERE user_id = ? OR lower(email) = lower(?)").run(nowIso(), userId, account.email);
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM support_requests WHERE lower(contact_email) = lower(?) OR lower(account_email) = lower(?)").run(account.email, account.email);
    db.prepare("UPDATE security_audit_events SET actor_id = NULL WHERE actor_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const retainedFileIds = new Set(
    physicalFiles
      .filter((file) => row<{ id: string }>("SELECT id FROM files WHERE id = ?", file.id))
      .map((file) => file.id),
  );
  const deletionResult = await processStorageDeletionQueue(db, { limit: Math.max(1, physicalFiles.length) });
  const userStorageDir = path.resolve(config.storageDir, userId);
  if (retainedFileIds.size === 0 && storagePathIsSafe(userStorageDir) && userStorageDir !== path.resolve(config.storageDir)) {
    await fs.promises.rm(userStorageDir, { recursive: true, force: true }).catch(() => undefined);
  }
  return { deleted: true, physicalFilesDeleted: deletionResult.deleted, unsafePathsSkipped: deletionResult.failed };
}

export async function purgeDueAccountDeletions() {
  const due = rows<{ id: string }>(
    `SELECT id FROM users WHERE account_status = 'deletion_pending' AND datetime(scheduled_deletion_at) <= datetime('now')`,
  );
  const results = [];
  for (const account of due) results.push(await purgeAccountNow(account.id));
  return { accountsDeleted: results.filter((result) => result.deleted).length, results };
}

export async function pruneExpiredOrphanFiles(retentionDays = config.orphanFileRetentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const candidates = rows<StoredPathRow>(
    `SELECT f.id, f.storage_path, f.storage_backend, f.storage_key FROM files f
     WHERE datetime(f.created_at) < datetime(?)
       AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.input_file_id = f.id OR j.output_file_id = f.id OR j.draft_bundle_file_id = f.id)
       AND NOT EXISTS (SELECT 1 FROM score_documents d WHERE d.source_file_id = f.id)
       AND NOT EXISTS (SELECT 1 FROM score_revisions r WHERE r.musicxml_file_id = f.id)
       AND NOT EXISTS (SELECT 1 FROM score_assets a WHERE a.file_id = f.id)
       AND NOT EXISTS (SELECT 1 FROM score_jobs sj WHERE sj.input_file_id = f.id OR sj.output_file_ids_json LIKE '%' || f.id || '%')
       AND NOT EXISTS (SELECT 1 FROM score_assignment_submissions s WHERE s.performance_file_id = f.id)
       AND NOT EXISTS (SELECT 1 FROM score_classroom_resources r WHERE r.file_id = f.id)`,
    cutoff,
  );
  if (candidates.length === 0) return { deleted: 0, physicalFilesDeleted: 0, unsafePathsSkipped: 0, cutoff };

  db.exec("BEGIN IMMEDIATE");
  try {
    const statement = db.prepare("DELETE FROM files WHERE id = ?");
    for (const candidate of candidates) {
      enqueueStorageDeletion(db, candidate);
      statement.run(candidate.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  const deletionResult = await processStorageDeletionQueue(db, { limit: candidates.length });
  return {
    deleted: candidates.length,
    physicalFilesDeleted: deletionResult.deleted,
    unsafePathsSkipped: deletionResult.failed,
    pendingPhysicalDeletes: deletionResult.pending,
    cutoff,
  };
}

export async function pruneExpiredQuarantineFiles(retentionHours = config.quarantineRetentionHours) {
  const quarantineDir = path.resolve(config.storageDir, ".quarantine");
  if (!storagePathIsSafe(quarantineDir)) return { deleted: 0, cutoff: null };
  const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;
  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.promises.readdir(quarantineDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { deleted: 0, cutoff: new Date(cutoff).toISOString() };
    throw error;
  }

  let deleted = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const target = path.join(quarantineDir, entry.name);
    if (!storagePathIsSafe(target)) continue;
    const stat = await fs.promises.stat(target).catch(() => null);
    if (stat && stat.mtimeMs < cutoff) {
      await fs.promises.rm(target, { force: true });
      deleted += 1;
    }
  }
  return { deleted, cutoff: new Date(cutoff).toISOString() };
}
