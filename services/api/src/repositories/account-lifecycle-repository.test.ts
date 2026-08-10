import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import Fastify from "fastify";
import { config } from "../config.js";
import { db, initDb } from "../db.js";
import { createSalt, createToken, hashPassword } from "../lib/auth.js";
import { authPlugin } from "../plugins/auth.js";
import { accountRoutes } from "../routes/account.js";
import { createSession, createUser, findUserById } from "./auth-repository.js";
import { createStoredFile, findStoredFileById } from "./file-repository.js";
import { recordSecurityAuditEvent } from "./security-audit-repository.js";
import {
  buildAccountDataExport,
  cancelAccountDeletion,
  getAccountLifecycle,
  pruneExpiredOrphanFiles,
  purgeDueAccountDeletions,
  scheduleAccountDeletion,
} from "./account-lifecycle-repository.js";

function createTestAccount(prefix: string) {
  const password = "privacy-test-password";
  const salt = createSalt();
  const user = createUser(`${prefix}-${crypto.randomUUID()}@example.test`, hashPassword(password, salt), salt);
  assert.ok(user);
  return { user, password };
}

test("account export omits credentials and deletion lifecycle revokes sessions before a cancellable grace period", async () => {
  initDb();
  const { user, password } = createTestAccount("privacy-export");
  const token = createToken();
  createSession(user.id, token, 1);
  const userDir = path.join(config.storageDir, user.id);
  const filePath = path.join(userDir, "source.musicxml");
  await fs.promises.mkdir(userDir, { recursive: true });
  await fs.promises.writeFile(filePath, "<score-partwise/>");
  const storedFile = await createStoredFile({
    userId: user.id,
    originalName: "source.musicxml",
    storedName: "source.musicxml",
    storagePath: filePath,
    mimeType: "application/vnd.recordare.musicxml+xml",
    sizeBytes: 17,
    fileKind: "source_musicxml",
  });
  assert.ok(storedFile);
  const { user: teacher } = createTestAccount("privacy-teacher");
  const classroomId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const protectedStudentId = crypto.randomUUID();
  const guardianId = crypto.randomUUID();
  const guardianReceiptId = crypto.randomUUID();
  const notificationId = crypto.randomUUID();
  const organizationId = crypto.randomUUID();
  const ownerMemberId = crypto.randomUUID();
  const successorMemberId = crypto.randomUUID();
  const staffId = crypto.randomUUID();
  const documentId = crypto.randomUUID();
  const assignmentId = crypto.randomUUID();
  const submissionId = crypto.randomUUID();
  const resourceId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  db.prepare("INSERT INTO score_classrooms (id, owner_user_id, name, description, created_at, updated_at, archived_at) VALUES (?, ?, 'Privacy class', NULL, ?, ?, NULL)").run(classroomId, teacher.id, timestamp, timestamp);
  db.prepare("INSERT INTO score_classroom_students (id, classroom_id, display_name, contact_email, external_ref, status, created_at, updated_at, user_id) VALUES (?, ?, 'Personal Name', ?, NULL, 'active', ?, ?, ?)").run(studentId, classroomId, user.email, timestamp, timestamp, user.id);
  db.prepare("INSERT INTO score_classroom_students (id, classroom_id, display_name, contact_email, external_ref, status, created_at, updated_at, user_id) VALUES (?, ?, 'Protected student', NULL, NULL, 'active', ?, ?, NULL)").run(protectedStudentId, classroomId, timestamp, timestamp);
  db.prepare("INSERT INTO score_student_guardians (id, student_id, user_id, invited_email, display_name, relationship, status, invited_by_user_id, created_at, updated_at, accepted_at, removed_at) VALUES (?, ?, ?, ?, 'Private guardian', 'Parent', 'active', ?, ?, ?, ?, NULL)").run(guardianId, protectedStudentId, user.id, user.email, teacher.id, timestamp, timestamp, timestamp);
  db.prepare("INSERT INTO score_classroom_notifications (id, classroom_id, title, body, published_at) VALUES (?, ?, 'Private notice', 'Private body', ?)").run(notificationId, classroomId, timestamp);
  db.prepare("INSERT INTO score_guardian_notification_receipts (id, notification_id, guardian_id, read_at, created_at) VALUES (?, ?, ?, ?, ?)").run(guardianReceiptId, notificationId, guardianId, timestamp, timestamp);
  db.prepare("INSERT INTO score_classroom_staff (id, classroom_id, user_id, invited_email, display_name, role, status, invited_by_user_id, created_at, updated_at, accepted_at, removed_at) VALUES (?, ?, ?, ?, 'Private assistant', 'assistant', 'active', ?, ?, ?, ?, NULL)").run(staffId, classroomId, user.id, user.email, teacher.id, timestamp, timestamp, timestamp);
  db.prepare("INSERT INTO score_organizations (id, owner_user_id, name, slug, created_at, updated_at, archived_at) VALUES (?, ?, 'Transfer organization', ?, ?, ?, NULL)").run(organizationId, user.id, `transfer-${organizationId}`, timestamp, timestamp);
  db.prepare("INSERT INTO score_organization_members (id, organization_id, user_id, invited_email, display_name, role, status, invited_by_user_id, created_at, updated_at, accepted_at, removed_at) VALUES (?, ?, ?, ?, 'Deleting owner', 'owner', 'active', ?, ?, ?, ?, NULL)").run(ownerMemberId, organizationId, user.id, user.email, user.id, timestamp, timestamp, timestamp);
  db.prepare("INSERT INTO score_organization_members (id, organization_id, user_id, invited_email, display_name, role, status, invited_by_user_id, created_at, updated_at, accepted_at, removed_at) VALUES (?, ?, ?, ?, 'Successor admin', 'admin', 'active', ?, ?, ?, ?, NULL)").run(successorMemberId, organizationId, teacher.id, teacher.email, user.id, timestamp, timestamp, timestamp);
  db.prepare("INSERT INTO score_documents (id, user_id, title, current_revision_id, pending_revision_id, source_file_id, settings_json, status, created_at, updated_at) VALUES (?, ?, 'Teacher score', NULL, NULL, NULL, NULL, 'active', ?, ?)").run(documentId, teacher.id, timestamp, timestamp);
  db.prepare("INSERT INTO score_assignments (id, document_id, created_by_user_id, revision_id, share_id, title, instructions, due_at, rubric_json, practice_settings_json, status, created_at, updated_at, classroom_id) VALUES (?, ?, ?, NULL, NULL, 'Assignment', NULL, NULL, NULL, NULL, 'open', ?, ?, ?)").run(assignmentId, documentId, teacher.id, timestamp, timestamp, classroomId);
  db.prepare("INSERT INTO score_assignment_submissions (id, assignment_id, document_id, submitter_name, submitter_contact, note, recording_url, performance_file_id, practice_minutes, practice_settings_json, performance_analysis_json, status, teacher_feedback, grade_score, grade_max, rubric_scores_json, review_token, submitted_at, updated_at, student_id) VALUES (?, ?, ?, 'Personal Name', ?, 'private note', 'https://media.example.test/private', ?, 10, NULL, '{\"private\":true}', 'submitted', NULL, 80, 100, NULL, NULL, ?, ?, ?)").run(submissionId, assignmentId, documentId, user.email, storedFile.id, timestamp, timestamp, studentId);
  db.prepare(`
    INSERT INTO score_classroom_resources (
      id, classroom_id, file_id, source_type, title, resource_type, url, folder_path, tags_json,
      visibility, version_group_id, version_number, previous_version_id, created_at, updated_at, archived_at
    ) VALUES (?, ?, ?, 'file', 'Shared score', 'score', '', NULL, '[]', 'classroom', ?, 1, NULL, ?, ?, NULL)
  `).run(resourceId, classroomId, storedFile.id, resourceId, timestamp, timestamp);
  db.prepare(`
    INSERT INTO score_classroom_resource_student_grants
      (id, classroom_id, version_group_id, student_id, created_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), classroomId, resourceId, studentId, user.id, timestamp);

  const exported = buildAccountDataExport(user.id);
  assert.ok(exported);
  const serialized = JSON.stringify(exported);
  assert.equal(serialized.includes(password), false);
  assert.equal(serialized.includes(user.password_hash), false);
  assert.equal(serialized.includes(token), false);
  assert.equal(serialized.includes(`/api/files/${storedFile.id}/download`), true);
  assert.equal((exported as { ownedOrganizations: unknown[] }).ownedOrganizations.length, 1);
  assert.equal((exported as { guardianMemberships: unknown[] }).guardianMemberships.length, 1);
  assert.equal((exported as { classroomResourceGrants: unknown[] }).classroomResourceGrants.length, 1);

  const pending = scheduleAccountDeletion(user.id, 14);
  assert.equal(pending?.status, "deletion_pending");
  assert.ok(pending?.scheduledDeletionAt);
  const session = db.prepare("SELECT revoked_at FROM sessions WHERE token = ?").get(token) as { revoked_at: string | null };
  assert.ok(session.revoked_at);

  const cancelled = cancelAccountDeletion(user.id);
  assert.equal(cancelled?.status, "active");
  assert.equal(cancelled?.scheduledDeletionAt, null);

  scheduleAccountDeletion(user.id, 14);
  db.prepare("UPDATE users SET scheduled_deletion_at = ? WHERE id = ?").run("2000-01-01T00:00:00.000Z", user.id);
  recordSecurityAuditEvent({ eventType: "privacy.test", severity: "info", actorType: "user", actorId: user.id, outcome: "success" });
  const result = await purgeDueAccountDeletions();
  assert.equal(result.accountsDeleted >= 1, true);
  assert.equal(findUserById(user.id), undefined);
  assert.equal(fs.existsSync(filePath), true);
  assert.equal((findStoredFileById(storedFile.id) as { user_id: string }).user_id, teacher.id);
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_classroom_resources WHERE id = ?").get(resourceId) as { count: number }).count, 1);
  assert.equal((db.prepare("SELECT created_by_user_id AS createdByUserId FROM score_classroom_resource_student_grants WHERE version_group_id = ?").get(resourceId) as { createdByUserId: string }).createdByUserId, teacher.id);
  const audit = db.prepare("SELECT actor_id FROM security_audit_events WHERE event_type = 'privacy.test' ORDER BY created_at DESC LIMIT 1").get() as { actor_id: string | null };
  assert.equal(audit.actor_id, null);
  const anonymized = db.prepare("SELECT submitter_name, submitter_contact, note, recording_url, performance_file_id, performance_analysis_json FROM score_assignment_submissions WHERE id = ?").get(submissionId) as Record<string, unknown>;
  assert.deepEqual({ ...anonymized }, {
    submitter_name: "Deleted student",
    submitter_contact: null,
    note: null,
    recording_url: null,
    performance_file_id: null,
    performance_analysis_json: null,
  });
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_student_guardians WHERE id = ?").get(guardianId) as { count: number }).count, 0);
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_guardian_notification_receipts WHERE id = ?").get(guardianReceiptId) as { count: number }).count, 0);
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_classroom_staff WHERE id = ?").get(staffId) as { count: number }).count, 0);
  assert.equal((db.prepare("SELECT owner_user_id AS ownerUserId FROM score_organizations WHERE id = ?").get(organizationId) as { ownerUserId: string }).ownerUserId, teacher.id);
  assert.equal((db.prepare("SELECT role FROM score_organization_members WHERE id = ?").get(successorMemberId) as { role: string }).role, "owner");
  db.prepare("DELETE FROM score_assignment_submissions WHERE id = ?").run(submissionId);
  db.prepare("DELETE FROM score_assignments WHERE id = ?").run(assignmentId);
  db.prepare("DELETE FROM score_classroom_resource_student_grants WHERE version_group_id = ?").run(resourceId);
  db.prepare("DELETE FROM score_classroom_resources WHERE id = ?").run(resourceId);
  db.prepare("DELETE FROM files WHERE id = ?").run(storedFile.id);
  await fs.promises.rm(filePath, { force: true });
  db.prepare("DELETE FROM score_guardian_notification_receipts WHERE notification_id = ?").run(notificationId);
  db.prepare("DELETE FROM score_classroom_notifications WHERE id = ?").run(notificationId);
  db.prepare("DELETE FROM score_classroom_students WHERE id = ?").run(studentId);
  db.prepare("DELETE FROM score_classroom_students WHERE id = ?").run(protectedStudentId);
  db.prepare("DELETE FROM score_classrooms WHERE id = ?").run(classroomId);
  db.prepare("DELETE FROM score_documents WHERE id = ?").run(documentId);
  db.prepare("DELETE FROM score_organization_members WHERE organization_id = ?").run(organizationId);
  db.prepare("DELETE FROM score_organizations WHERE id = ?").run(organizationId);
  db.prepare("DELETE FROM users WHERE id = ?").run(teacher.id);
});

test("orphan file retention removes only expired unreferenced rows and safe physical paths", async () => {
  initDb();
  const { user } = createTestAccount("privacy-retention");
  const classroomId = crypto.randomUUID();
  const resourceId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const userDir = path.join(config.storageDir, user.id);
  const filePath = path.join(userDir, "orphan.pdf");
  await fs.promises.mkdir(userDir, { recursive: true });
  await fs.promises.writeFile(filePath, "%PDF-1.7 orphan");
  const storedFile = await createStoredFile({
    userId: user.id,
    originalName: "orphan.pdf",
    storedName: "orphan.pdf",
    storagePath: filePath,
    mimeType: "application/pdf",
    sizeBytes: 15,
    fileKind: "input_pdf",
  });
  assert.ok(storedFile);
  db.prepare("UPDATE files SET created_at = ? WHERE id = ?").run("2000-01-01T00:00:00.000Z", storedFile.id);
  db.prepare("INSERT INTO score_classrooms (id, owner_user_id, name, description, created_at, updated_at, archived_at) VALUES (?, ?, 'Retention class', NULL, ?, ?, NULL)")
    .run(classroomId, user.id, timestamp, timestamp);
  db.prepare(`
    INSERT INTO score_classroom_resources (
      id, classroom_id, file_id, source_type, title, resource_type, url, folder_path, tags_json,
      visibility, version_group_id, version_number, previous_version_id, created_at, updated_at, archived_at
    ) VALUES (?, ?, ?, 'file', 'Protected resource', 'document', '', NULL, '[]', 'classroom', ?, 1, NULL, ?, ?, NULL)
  `).run(resourceId, classroomId, storedFile.id, resourceId, timestamp, timestamp);

  const protectedResult = await pruneExpiredOrphanFiles(30);
  assert.equal(protectedResult.deleted, 0);
  assert.ok(findStoredFileById(storedFile.id));
  assert.equal(fs.existsSync(filePath), true);

  db.prepare("DELETE FROM score_classroom_resources WHERE id = ?").run(resourceId);
  db.prepare("DELETE FROM score_classrooms WHERE id = ?").run(classroomId);
  const result = await pruneExpiredOrphanFiles(30);
  assert.equal(result.deleted, 1);
  assert.equal(findStoredFileById(storedFile.id), undefined);
  assert.equal(fs.existsSync(filePath), false);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
});

test("account API verifies the password, returns a private export, and supports deletion cancellation after signing in again", async () => {
  initDb();
  const { user, password } = createTestAccount("privacy-route");
  const token = createToken();
  createSession(user.id, token, 1);
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(accountRoutes, { prefix: "/api" });
  await app.ready();

  try {
    const exported = await app.inject({ method: "GET", url: "/api/account/data-export", headers: { authorization: `Bearer ${token}` } });
    assert.equal(exported.statusCode, 200);
    assert.equal(exported.headers["cache-control"], "private, no-store");
    assert.match(exported.headers["content-disposition"] ?? "", /scoretransposer-data-export/u);

    const denied = await app.inject({
      method: "POST",
      url: "/api/account/deletion",
      headers: { authorization: `Bearer ${token}` },
      payload: { password: "wrong-password", confirmation: "DELETE" },
    });
    assert.equal(denied.statusCode, 401);

    const scheduled = await app.inject({
      method: "POST",
      url: "/api/account/deletion",
      headers: { authorization: `Bearer ${token}` },
      payload: { password, confirmation: "DELETE" },
    });
    assert.equal(scheduled.statusCode, 200);
    assert.equal(getAccountLifecycle(user.id)?.status, "deletion_pending");

    const replacementToken = createToken();
    createSession(user.id, replacementToken, 1);
    const cancelled = await app.inject({
      method: "POST",
      url: "/api/account/deletion/cancel",
      headers: { authorization: `Bearer ${replacementToken}` },
      payload: { password },
    });
    assert.equal(cancelled.statusCode, 200);
    assert.equal(getAccountLifecycle(user.id)?.status, "active");
  } finally {
    await app.close();
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  }
});
