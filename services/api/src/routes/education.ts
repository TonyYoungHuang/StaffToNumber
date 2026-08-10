import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { db } from "../db.js";
import {
  canAdminOrganization,
  linkEducationInvitationsByEmail,
  listAccessibleClassroomIds,
  resolveClassroomAccess,
  resolveOrganizationRole,
} from "../lib/education-access.js";
import { createId } from "../lib/auth.js";
import { fetchLtiRoster, publishLtiScore } from "../lib/lti-service-client.js";
import { storeVerifiedUpload, uploadErrorResponse, uploadKinds } from "../lib/upload-security.js";
import { deleteStoredFileObject, openStoredFile, storedFileExists } from "../lib/object-storage.js";
import { createStoredFile, findStoredFileById } from "../repositories/file-repository.js";
import {
  archiveClassroomResource,
  archiveClassroomResourceFolder,
  canReadClassroomResource,
  cancelStudentExitRequest,
  createClassroomResource,
  createClassroomResourceFolder,
  createClassroomResourceVersion,
  createStudentExitRequest,
  decideStudentExitRequest,
  getStudentEducationHome,
  inviteStudentGuardian,
  linkGuardianMembershipsByEmail,
  linkStudentMembershipsByEmail,
  listClassroomResources,
  listClassroomResourceFolders,
  listClassroomResourceVersions,
  listStudentGuardians,
  markStudentNotificationRead,
  moveClassroomResourceToFolder,
  removeStudentGuardian,
  reuseClassroomResource,
  restoreClassroomResourceVersion,
  updateClassroomResourceFolder,
} from "../repositories/education-repository.js";
import {
  createEducationCampus,
  createEducationOrganization,
  inviteClassroomStaff,
  inviteEducationOrganizationMember,
  listClassroomStaff,
  listEducationOrganizations,
  removeClassroomStaff,
  removeEducationOrganizationMember,
  type ClassroomStaffRole,
  type OrganizationMemberRole,
} from "../repositories/education-organization-repository.js";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../repositories/notification-preferences-repository.js";
import {
  getClassroomResourceRetentionPolicy,
  listClassroomResourceRetentionCandidates,
  purgeClassroomResourceRetentionCandidates,
  setClassroomResourceRetentionHold,
  updateClassroomResourceRetentionPolicy,
} from "../repositories/classroom-resource-retention-repository.js";

const organizationMemberRoles = new Set<OrganizationMemberRole>(["admin", "teacher", "assistant", "observer"]);
const classroomStaffRoles = new Set<ClassroomStaffRole>(["teacher", "assistant", "observer"]);

function requireText(value: unknown, label: string, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max) throw new Error(`${label} is required and must be at most ${max} characters.`);
  return text;
}

function optionalText(value: unknown, label: string, max: number) {
  if (value === undefined || value === null || value === "") return null;
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max) throw new Error(`${label} must be at most ${max} characters.`);
  return text;
}

function validateHttpUrl(value: unknown) {
  const text = requireText(value, "URL", 1000);
  const parsed = new URL(text);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("URL must use HTTP or HTTPS.");
  return parsed.toString();
}

function validateLtiUrl(value: unknown, label: string) {
  const parsed = new URL(requireText(value, label, 1000));
  const host = parsed.hostname.toLocaleLowerCase();
  if (parsed.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  if (host === "localhost" || host === "::1" || /^127\./u.test(host) || /^10\./u.test(host) || /^192\.168\./u.test(host) || /^169\.254\./u.test(host) || /^172\.(?:1[6-9]|2\d|3[01])\./u.test(host)) {
    throw new Error(`${label} must use a public host.`);
  }
  return parsed.toString();
}

function resourceInput(body: Record<string, unknown>, classroomId: string) {
  return { ...resourceMetadataInput(body, classroomId), url: validateHttpUrl(body.url) };
}

function resourceFolderInput(body: Record<string, unknown>, classroomId: string) {
  const folderId = optionalText(body.folderId, "Folder", 80);
  const folder = folderId ? listClassroomResourceFolders(db, classroomId).find((candidate) => candidate.id === folderId) : null;
  if (folderId && !folder) throw new Error("Resource folder not found.");
  return { folderId, folderPath: folder?.path ?? null } as const;
}

function resourceMetadataInput(body: Record<string, unknown>, classroomId: string) {
  const tags = Array.isArray(body.tags)
    ? [...new Set(body.tags.map((tag) => typeof tag === "string" ? tag.trim() : "").filter(Boolean))]
    : typeof body.tags === "string"
      ? [...new Set(body.tags.split(",").map((tag) => tag.trim()).filter(Boolean))]
      : [];
  if (tags.length > 10 || tags.some((tag) => tag.length > 40)) throw new Error("Resources support at most 10 tags of 40 characters each.");
  const visibility = body.visibility === "staff" || body.visibility === "selected" ? body.visibility : "classroom";
  const rawStudentIds = Array.isArray(body.selectedStudentIds)
    ? body.selectedStudentIds
    : typeof body.selectedStudentIds === "string"
      ? body.selectedStudentIds.split(",")
      : [];
  const selectedStudentIds = [...new Set(rawStudentIds.map((studentId) => typeof studentId === "string" ? studentId.trim() : "").filter(Boolean))];
  if (selectedStudentIds.length > 500 || selectedStudentIds.some((studentId) => studentId.length > 80)) {
    throw new Error("A resource can be assigned to at most 500 valid students.");
  }
  const folder = resourceFolderInput(body, classroomId);
  return {
    title: requireText(body.title, "Title", 160),
    resourceType: requireText(body.resourceType, "Resource type", 40),
    folderId: folder.folderId,
    folderPath: folder.folderPath ?? optionalText(body.folderPath, "Folder path", 240),
    tags,
    visibility,
    selectedStudentIds,
  } as const;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/gu, "-").slice(-180) || "classroom-resource";
}

function inferredResourceType(mimeType: string) {
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.includes("musicxml") || mimeType === "audio/midi") return "score";
  return "document";
}

function requireEmail(value: unknown) {
  const email = requireText(value, "Email", 320).toLocaleLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw new Error("Email must be valid.");
  return email;
}

function linkCurrentEducationIdentity(userId: string) {
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string } | undefined;
  if (user) linkEducationInvitationsByEmail(db, userId, user.email);
}

export async function educationRoutes(app: FastifyInstance) {
  app.get("/education/overview", { preHandler: app.requireActiveEntitlement }, async (request) => {
    linkCurrentEducationIdentity(request.authUserId!);
    const classroomIds = listAccessibleClassroomIds(db, request.authUserId!);
    const classrooms = classroomIds.map((id) => db.prepare("SELECT id, name, organization_id AS organizationId, campus_id AS campusId FROM score_classrooms WHERE id = ?").get(id) as { id: string; name: string; organizationId: string | null; campusId: string | null });
    return {
      classrooms: classrooms.map((classroom) => ({
        ...classroom,
        access: resolveClassroomAccess(db, classroom.id, request.authUserId!),
        staff: listClassroomStaff(db, classroom.id),
        students: db.prepare(`
          SELECT id, display_name AS displayName, contact_email AS contactEmail, status
          FROM score_classroom_students
          WHERE classroom_id = ? AND status = 'active'
          ORDER BY lower(display_name), id
        `).all(classroom.id),
        exitRequests: db.prepare(`
          SELECT requests.id, requests.student_id AS studentId, students.display_name AS studentName,
                 requests.status, requests.reason, requests.requested_at AS requestedAt,
                 requests.decided_at AS decidedAt, requests.cancelled_at AS cancelledAt
          FROM score_student_exit_requests requests
          JOIN score_classroom_students students ON students.id = requests.student_id
          WHERE requests.classroom_id = ?
          ORDER BY datetime(requests.requested_at) DESC
          LIMIT 100
        `).all(classroom.id),
        resourceFolders: listClassroomResourceFolders(db, classroom.id),
        resources: listClassroomResources(db, { classroomId: classroom.id }),
        retentionPolicy: getClassroomResourceRetentionPolicy(db, classroom.id),
        notifications: db.prepare(`
          SELECT notifications.id, notifications.title, notifications.body,
                 notifications.scheduled_at AS scheduledAt, notifications.published_at AS publishedAt,
                 CASE WHEN notifications.archived_at IS NOT NULL THEN 'cancelled'
                      WHEN datetime(notifications.published_at) > datetime('now') THEN 'scheduled'
                      ELSE 'published' END AS status,
                 (SELECT count(*) FROM score_classroom_students students WHERE students.classroom_id = notifications.classroom_id AND students.status = 'active') AS recipientCount,
                 (SELECT count(*) FROM score_classroom_notification_receipts receipts WHERE receipts.notification_id = notifications.id) AS readCount,
                 (SELECT count(*) FROM score_notification_deliveries deliveries WHERE deliveries.notification_id = notifications.id AND deliveries.status IN ('queued', 'processing')) AS emailPendingCount,
                 (SELECT count(*) FROM score_notification_deliveries deliveries WHERE deliveries.notification_id = notifications.id AND deliveries.status = 'sent') AS emailSentCount,
                 (SELECT count(*) FROM score_notification_deliveries deliveries WHERE deliveries.notification_id = notifications.id AND deliveries.status = 'failed') AS emailFailedCount
          FROM score_classroom_notifications notifications
          WHERE notifications.classroom_id = ?
          ORDER BY datetime(notifications.published_at) DESC
        `).all(classroom.id),
        lmsConnections: db.prepare(`
          SELECT id, provider, base_url AS baseUrl, course_ref AS courseRef, status,
                 issuer, client_id AS clientId, deployment_id AS deploymentId,
                 lti_context_id AS ltiContextId, verified_at AS verifiedAt, last_error AS lastError,
                 nrps_url AS nrpsUrl, ags_lineitems_url AS agsLineitemsUrl,
                 last_roster_sync_at AS lastRosterSyncAt, last_grade_sync_at AS lastGradeSyncAt
          FROM score_lms_connections WHERE classroom_id = ? ORDER BY created_at DESC
        `).all(classroom.id),
      })),
    };
  });

  app.get("/education/classrooms/:classroomId/resources", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access) return reply.code(404).send({ error: "Classroom not found." });
    const query = request.query as { q?: string; folder?: string; includeArchived?: string };
    return reply.send({
      resources: listClassroomResources(db, {
        classroomId,
        query: query.q,
        folderPath: query.folder,
        includeArchived: query.includeArchived === "true",
      }),
    });
  });

  app.get("/education/classrooms/:classroomId/resource-retention/preview", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access) return reply.code(404).send({ error: "Classroom not found." });
    const policy = getClassroomResourceRetentionPolicy(db, classroomId);
    return reply.send({
      policy,
      preview: listClassroomResourceRetentionCandidates(db, {
        classroomId,
        historicalVersionDays: policy.historicalVersionDays,
        minimumVersionsPerGroup: policy.minimumVersionsPerGroup,
      }),
    });
  });

  app.put("/education/classrooms/:classroomId/resource-retention", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canAdmin) return reply.code(404).send({ error: "Classroom not found." });
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (typeof body.enabled !== "boolean") return reply.code(400).send({ error: "Retention enabled must be true or false." });
    try {
      const policy = updateClassroomResourceRetentionPolicy(db, {
        classroomId,
        userId: request.authUserId!,
        enabled: body.enabled,
        historicalVersionDays: Number(body.historicalVersionDays),
        minimumVersionsPerGroup: Number(body.minimumVersionsPerGroup),
      });
      return reply.send({ policy });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid retention policy." });
    }
  });

  app.post("/education/classrooms/:classroomId/resource-retention/purge", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canAdmin) return reply.code(404).send({ error: "Classroom not found." });
    const policy = getClassroomResourceRetentionPolicy(db, classroomId);
    if (!policy.enabled) return reply.code(409).send({ error: "Resource retention must be enabled before content can be purged." });
    return reply.send({ result: purgeClassroomResourceRetentionCandidates(db, {
      classroomId,
      historicalVersionDays: policy.historicalVersionDays,
      minimumVersionsPerGroup: policy.minimumVersionsPerGroup,
    }) });
  });

  app.patch("/education/classrooms/:classroomId/resources/:resourceId/retention-hold", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, resourceId } = request.params as { classroomId: string; resourceId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canAdmin) return reply.code(404).send({ error: "Classroom not found." });
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (typeof body.retentionHold !== "boolean") return reply.code(400).send({ error: "Retention hold must be true or false." });
    if (!setClassroomResourceRetentionHold(db, { classroomId, resourceId, retentionHold: body.retentionHold })) {
      return reply.code(404).send({ error: "Historical resource version not found." });
    }
    return reply.send({ resourceId, retentionHold: body.retentionHold });
  });

  app.post("/education/classrooms/:classroomId/resource-folders", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const folder = createClassroomResourceFolder(db, {
        classroomId, createdByUserId: request.authUserId!,
        name: requireText(body.name, "Folder name", 80), parentId: optionalText(body.parentId, "Parent folder", 80),
      });
      return reply.code(201).send({ folder });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid folder." }); }
  });

  app.patch("/education/classrooms/:classroomId/resource-folders/:folderId", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, folderId } = request.params as { classroomId: string; folderId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const result = updateClassroomResourceFolder(db, {
        classroomId,
        folderId,
        name: requireText(body.name, "Folder name", 80),
        parentId: optionalText(body.parentId, "Parent folder", 80),
      });
      if (!result) return reply.code(404).send({ error: "Folder not found." });
      return reply.send({ folder: result.folder, resources: result.resources });
    } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : "Folder could not be updated." }); }
  });

  app.delete("/education/classrooms/:classroomId/resource-folders/:folderId", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, folderId } = request.params as { classroomId: string; folderId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      if (!archiveClassroomResourceFolder(db, { classroomId, folderId })) return reply.code(404).send({ error: "Folder not found." });
      return reply.send({ archived: true });
    } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : "Folder is not empty." }); }
  });

  app.post("/education/classrooms/:classroomId/resources/reuse", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const targetAccess = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!targetAccess?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const sourceClassroomId = requireText(body.sourceClassroomId, "Source classroom", 80);
      const sourceResourceId = requireText(body.sourceResourceId, "Source resource", 80);
      if (!resolveClassroomAccess(db, sourceClassroomId, request.authUserId!)) return reply.code(404).send({ error: "Source resource not found." });
      const folder = resourceFolderInput(body, classroomId);
      const resource = reuseClassroomResource(db, { sourceClassroomId, sourceResourceId, targetClassroomId: classroomId, folderId: folder.folderId, folderPath: folder.folderPath, createdByUserId: request.authUserId! });
      if (!resource) return reply.code(404).send({ error: "Source resource not found." });
      return reply.code(201).send({ resource });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Resource could not be reused." }); }
  });

  app.post("/education/classrooms/:classroomId/resources/:resourceId/move", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, resourceId } = request.params as { classroomId: string; resourceId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const folder = resourceFolderInput(body, classroomId);
      const resource = moveClassroomResourceToFolder(db, { classroomId, resourceId, folderId: folder.folderId, folderPath: folder.folderPath });
      if (!resource) return reply.code(404).send({ error: "Resource not found." });
      return reply.code(201).send({ resource });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Resource could not be moved." }); }
  });

  app.post("/education/classrooms/:classroomId/resources", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const resource = createClassroomResource(db, { classroomId, createdByUserId: request.authUserId!, ...resourceInput(body, classroomId) });
      return reply.code(201).send({ resource });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid resource." }); }
  });

  app.post("/education/classrooms/:classroomId/resources/upload", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "No classroom resource file was uploaded." });
    try {
      const query = request.query as Record<string, unknown>;
      const metadata = resourceMetadataInput({
        ...query,
        title: query.title || file.filename,
        resourceType: query.resourceType || "document",
      }, classroomId);
      const userDir = path.join(config.storageDir, request.authUserId!, "classroom-resources");
      const storedName = `${createId()}.resource`;
      const targetPath = path.join(userDir, storedName);
      const verified = await storeVerifiedUpload({
        stream: file.file,
        targetPath,
        allowedKinds: uploadKinds.classroomResource,
        mediaSafety: { mode: "performance", maxDurationSeconds: config.performanceUploadMaxDurationSeconds },
      });
      const storedFile = await createStoredFile({
        userId: request.authUserId!, originalName: file.filename || "classroom-resource", storedName,
        storagePath: targetPath, mimeType: verified.mimeType, sizeBytes: verified.sizeBytes, fileKind: "classroom_resource",
      });
      if (!storedFile) {
        await fs.promises.rm(targetPath, { force: true });
        return reply.code(500).send({ error: "Could not save the classroom resource file." });
      }
      try {
        const resource = createClassroomResource(db, {
          classroomId, createdByUserId: request.authUserId!, ...metadata, resourceType: query.resourceType ? metadata.resourceType : inferredResourceType(verified.mimeType),
          sourceType: "file", fileId: storedFile.id,
        });
        return reply.code(201).send({ resource });
      } catch (error) {
        await deleteStoredFileObject(storedFile).catch(() => undefined);
        db.prepare("DELETE FROM files WHERE id = ?").run(storedFile.id);
        await fs.promises.rm(targetPath, { force: true });
        throw error;
      }
    } catch (error) {
      const response = uploadErrorResponse(error);
      request.log.warn({ error, uploadCode: response.body.code }, "Classroom resource upload rejected.");
      return reply.code(response.statusCode).send(response.body);
    }
  });

  app.post("/education/classrooms/:classroomId/resources/:resourceId/versions", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, resourceId } = request.params as { classroomId: string; resourceId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const resource = createClassroomResourceVersion(db, { classroomId, resourceId, createdByUserId: request.authUserId!, ...resourceInput(request.body as Record<string, unknown>, classroomId) });
      if (!resource) return reply.code(404).send({ error: "Resource not found." });
      return reply.code(201).send({ resource });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid resource version." }); }
  });

  app.get("/education/classrooms/:classroomId/resources/:resourceId/versions", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, resourceId } = request.params as { classroomId: string; resourceId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access) return reply.code(404).send({ error: "Classroom not found." });
    const versions = listClassroomResourceVersions(db, { classroomId, resourceId });
    if (!versions) return reply.code(404).send({ error: "Resource not found." });
    return reply.send({ versions });
  });

  app.post("/education/classrooms/:classroomId/resources/:resourceId/restore", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, resourceId } = request.params as { classroomId: string; resourceId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const resource = restoreClassroomResourceVersion(db, { classroomId, resourceId });
      if (!resource) return reply.code(404).send({ error: "Resource not found." });
      return reply.code(201).send({ resource });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Resource version could not be restored." });
    }
  });

  app.post("/education/classrooms/:classroomId/resources/:resourceId/versions/upload", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, resourceId } = request.params as { classroomId: string; resourceId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    const current = db.prepare("SELECT id FROM score_classroom_resources WHERE id = ? AND classroom_id = ? AND archived_at IS NULL").get(resourceId, classroomId) as { id: string } | undefined;
    if (!current) return reply.code(404).send({ error: "Resource not found." });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "No classroom resource file was uploaded." });
    try {
      const query = request.query as Record<string, unknown>;
      const metadata = resourceMetadataInput({ ...query, title: query.title || file.filename, resourceType: query.resourceType || "document" }, classroomId);
      const userDir = path.join(config.storageDir, request.authUserId!, "classroom-resources");
      const storedName = `${createId()}.resource`;
      const targetPath = path.join(userDir, storedName);
      const verified = await storeVerifiedUpload({
        stream: file.file, targetPath, allowedKinds: uploadKinds.classroomResource,
        mediaSafety: { mode: "performance", maxDurationSeconds: config.performanceUploadMaxDurationSeconds },
      });
      const storedFile = await createStoredFile({
        userId: request.authUserId!, originalName: file.filename || "classroom-resource", storedName,
        storagePath: targetPath, mimeType: verified.mimeType, sizeBytes: verified.sizeBytes, fileKind: "classroom_resource",
      });
      if (!storedFile) {
        await fs.promises.rm(targetPath, { force: true });
        return reply.code(500).send({ error: "Could not save the classroom resource file." });
      }
      try {
        const resource = createClassroomResourceVersion(db, {
          classroomId, resourceId, createdByUserId: request.authUserId!, ...metadata, resourceType: query.resourceType ? metadata.resourceType : inferredResourceType(verified.mimeType),
          sourceType: "file", fileId: storedFile.id,
        });
        if (!resource) throw new Error("Resource version could not be created.");
        return reply.code(201).send({ resource });
      } catch (error) {
        await deleteStoredFileObject(storedFile).catch(() => undefined);
        db.prepare("DELETE FROM files WHERE id = ?").run(storedFile.id);
        await fs.promises.rm(targetPath, { force: true });
        throw error;
      }
    } catch (error) {
      const response = uploadErrorResponse(error);
      request.log.warn({ error, uploadCode: response.body.code }, "Classroom resource version upload rejected.");
      return reply.code(response.statusCode).send(response.body);
    }
  });

  app.get("/education/resources/:resourceId/download", { preHandler: app.requireAuth }, async (request, reply) => {
    const { resourceId } = request.params as { resourceId: string };
    const resource = db.prepare(`
      SELECT id, classroom_id AS classroomId, file_id AS fileId, visibility, archived_at AS archivedAt
      FROM score_classroom_resources WHERE id = ? AND source_type = 'file'
    `).get(resourceId) as { id: string; classroomId: string; fileId: string | null; visibility: string; archivedAt: string | null } | undefined;
    if (!resource?.fileId) return reply.code(404).send({ error: "Resource not found." });
    if (!canReadClassroomResource(db, { resourceId, userId: request.authUserId! })) {
      return reply.code(404).send({ error: "Resource not found." });
    }
    const file = findStoredFileById(resource.fileId);
    if (!file || !(await storedFileExists(file))) return reply.code(404).send({ error: "Stored resource file is missing." });
    const fallback = sanitizeFilename(file.original_name).replace(/"/gu, "");
    reply.header("Content-Type", file.mime_type);
    reply.header("Content-Length", String(file.size_bytes));
    reply.header("Content-Disposition", `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(file.original_name)}`);
    reply.header("Cache-Control", "private, no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    return reply.send(await openStoredFile(file));
  });

  app.delete("/education/classrooms/:classroomId/resources/:resourceId", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, resourceId } = request.params as { classroomId: string; resourceId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    if (!archiveClassroomResource(db, { classroomId, resourceId })) return reply.code(404).send({ error: "Resource not found." });
    return reply.send({ archived: true });
  });

  app.post("/education/classrooms/:classroomId/notifications", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const now = new Date();
      const publishAtText = optionalText(body.publishAt, "Publish time", 80);
      const publishAt = publishAtText ? new Date(publishAtText) : now;
      if (Number.isNaN(publishAt.getTime())) throw new Error("Publish time must be a valid date.");
      if (publishAt.getTime() > now.getTime() + 366 * 24 * 60 * 60 * 1000) throw new Error("Publish time cannot be more than one year ahead.");
      const scheduled = publishAt.getTime() > now.getTime() + 1_000;
      const id = createId();
      db.prepare("INSERT INTO score_classroom_notifications (id, classroom_id, title, body, scheduled_at, published_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, NULL)")
        .run(id, classroomId, requireText(body.title, "Title", 160), requireText(body.body, "Body", 4000), scheduled ? publishAt.toISOString() : null, scheduled ? publishAt.toISOString() : now.toISOString());
      return reply.code(201).send({ id, status: scheduled ? "scheduled" : "published", publishAt: scheduled ? publishAt.toISOString() : now.toISOString() });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid notification." }); }
  });

  app.delete("/education/classrooms/:classroomId/notifications/:notificationId", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, notificationId } = request.params as { classroomId: string; notificationId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    let changed = 0;
    try {
      changed = Number(db.prepare("UPDATE score_classroom_notifications SET archived_at = ? WHERE id = ? AND classroom_id = ? AND archived_at IS NULL")
        .run(now, notificationId, classroomId).changes);
      if (changed > 0) {
        db.prepare(`
          UPDATE score_notification_deliveries
          SET status = 'cancelled', locked_at = NULL, updated_at = ?
          WHERE notification_id = ? AND status IN ('queued', 'processing')
        `).run(now, notificationId);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    if (changed === 0) return reply.code(404).send({ error: "Notification not found." });
    return reply.send({ cancelled: true });
  });

  app.post("/education/classrooms/:classroomId/notifications/:notificationId/retry-failed", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, notificationId } = request.params as { classroomId: string; notificationId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    const notification = db.prepare(`
      SELECT id FROM score_classroom_notifications
      WHERE id = ? AND classroom_id = ? AND archived_at IS NULL
    `).get(notificationId, classroomId);
    if (!notification) return reply.code(404).send({ error: "Notification not found." });
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE score_notification_deliveries
      SET status = 'queued', attempts = 0, next_attempt_at = ?, locked_at = NULL,
          last_error = NULL, updated_at = ?
      WHERE notification_id = ? AND channel = 'email' AND status = 'failed'
    `).run(now, now, notificationId);
    return reply.send({ retried: Number(result.changes) });
  });

  app.post("/education/classrooms/:classroomId/lms", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const provider = requireText(body.provider, "Provider", 40);
      if (!new Set(["canvas", "moodle", "google-classroom", "manual"]).has(provider)) throw new Error("Unsupported LMS provider.");
      const baseUrl = optionalText(body.baseUrl, "LMS URL", 1000);
      if (baseUrl) validateHttpUrl(baseUrl);
      const issuer = optionalText(body.issuer, "Issuer", 1000);
      const clientId = optionalText(body.clientId, "Client ID", 500);
      const deploymentId = optionalText(body.deploymentId, "Deployment ID", 255);
      const oidcAuthUrl = optionalText(body.oidcAuthUrl, "OIDC authorization URL", 1000);
      const tokenUrl = optionalText(body.tokenUrl, "OAuth token URL", 1000);
      const jwksUrl = optionalText(body.jwksUrl, "JWKS URL", 1000);
      const ltiValues = [issuer, clientId, deploymentId, oidcAuthUrl, tokenUrl, jwksUrl];
      if (ltiValues.some(Boolean) && !ltiValues.every(Boolean)) throw new Error("Issuer, client ID, deployment ID, OIDC URL, token URL, and JWKS URL are all required for LTI 1.3.");
      if (issuer) validateLtiUrl(issuer, "Issuer");
      const verifiedOidcAuthUrl = oidcAuthUrl ? validateLtiUrl(oidcAuthUrl, "OIDC authorization URL") : null;
      const verifiedTokenUrl = tokenUrl ? validateLtiUrl(tokenUrl, "OAuth token URL") : null;
      const verifiedJwksUrl = jwksUrl ? validateLtiUrl(jwksUrl, "JWKS URL") : null;
      const platformJwks = optionalText(body.platformJwks, "Platform JWKS", 100_000);
      if (platformJwks) {
        const parsed = JSON.parse(platformJwks) as { keys?: unknown[] };
        if (!Array.isArray(parsed.keys) || parsed.keys.length === 0) throw new Error("Platform JWKS must contain at least one key.");
      }
      const id = createId();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO score_lms_connections (
          id, classroom_id, provider, base_url, course_ref, status, issuer, client_id, deployment_id,
          oidc_auth_url, token_url, jwks_url, platform_jwks_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, classroomId, provider, baseUrl, requireText(body.courseRef, "Course reference", 160), issuer, clientId, deploymentId, verifiedOidcAuthUrl, verifiedTokenUrl, verifiedJwksUrl, platformJwks, now, now);
      return reply.code(201).send({
        id,
        status: "draft",
        loginUrl: `${config.publicApiUrl.replace(/\/$/u, "")}/api/lti/login`,
        launchUrl: `${config.publicApiUrl.replace(/\/$/u, "")}/api/lti/launch`,
        message: issuer ? "LTI registration saved. Launch it once from the LMS to verify the signed deployment." : "LMS mapping saved as a draft. LTI registration is still required before synchronization.",
      });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid LMS connection." }); }
  });

  app.post("/education/classrooms/:classroomId/lms/:connectionId/sync-roster", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, connectionId } = request.params as { classroomId: string; connectionId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    const connection = db.prepare(`
      SELECT id, issuer, client_id AS clientId, deployment_id AS deploymentId,
             token_url AS tokenUrl, nrps_url AS nrpsUrl
      FROM score_lms_connections WHERE id = ? AND classroom_id = ? AND status = 'verified'
    `).get(connectionId, classroomId) as { id: string; issuer: string; clientId: string; deploymentId: string; tokenUrl: string; nrpsUrl: string } | undefined;
    if (!connection?.tokenUrl || !connection.nrpsUrl) return reply.code(409).send({ error: "Verified LTI roster service is not available." });
    try {
      const members = await fetchLtiRoster(connection);
      let imported = 0;
      let skipped = 0;
      const now = new Date().toISOString();
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const rawMember of members) {
          const member = rawMember && typeof rawMember === "object" ? rawMember as Record<string, unknown> : {};
          const roles = Array.isArray(member.roles) ? member.roles.filter((role): role is string => typeof role === "string") : [];
          const isLearner = roles.some((role) => /(?:^|#|\/)(?:Learner|Student)$/iu.test(role));
          const ltiUserId = typeof member.user_id === "string" ? member.user_id.trim() : "";
          if (!isLearner || !ltiUserId) { skipped += 1; continue; }
          const externalRef = `lti:${connection.issuer}:${ltiUserId}`.slice(0, 500);
          const email = typeof member.email === "string" && /^\S+@\S+\.\S+$/u.test(member.email) ? member.email.trim().toLocaleLowerCase() : null;
          const displayName = (typeof member.name === "string" && member.name.trim() ? member.name.trim() : email ?? ltiUserId).slice(0, 160);
          const linkedUser = email ? db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email) as { id: string } | undefined : undefined;
          const existing = db.prepare("SELECT id FROM score_classroom_students WHERE classroom_id = ? AND external_ref = ?")
            .get(classroomId, externalRef) as { id: string } | undefined;
          if (existing) {
            db.prepare("UPDATE score_classroom_students SET display_name = ?, contact_email = ?, user_id = COALESCE(?, user_id), status = 'active', updated_at = ? WHERE id = ?")
              .run(displayName, email, linkedUser?.id ?? null, now, existing.id);
          } else {
            db.prepare(`
              INSERT INTO score_classroom_students (id, classroom_id, display_name, contact_email, external_ref, status, created_at, updated_at, user_id)
              VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
            `).run(createId(), classroomId, displayName, email, externalRef, now, now, linkedUser?.id ?? null);
          }
          imported += 1;
        }
        db.prepare("UPDATE score_lms_connections SET last_roster_sync_at = ?, last_error = NULL, updated_at = ? WHERE id = ?")
          .run(now, now, connectionId);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return reply.send({ imported, skipped, total: members.length, syncedAt: now });
    } catch (error) {
      const message = error instanceof Error ? error.message : "LTI roster synchronization failed.";
      db.prepare("UPDATE score_lms_connections SET last_error = ?, updated_at = ? WHERE id = ?")
        .run(message.slice(0, 1000), new Date().toISOString(), connectionId);
      request.log.error({ event: "lti.roster_sync_failed", connectionId, error });
      return reply.code(502).send({ error: message });
    }
  });

  app.post("/education/classrooms/:classroomId/lms/:connectionId/grades", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, connectionId } = request.params as { classroomId: string; connectionId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canOperate) return reply.code(404).send({ error: "Classroom not found." });
    const connection = db.prepare(`
      SELECT client_id AS clientId, deployment_id AS deploymentId, token_url AS tokenUrl,
             ags_lineitem_url AS lineitemUrl
      FROM score_lms_connections WHERE id = ? AND classroom_id = ? AND status = 'verified'
    `).get(connectionId, classroomId) as { clientId: string; deploymentId: string; tokenUrl: string; lineitemUrl: string } | undefined;
    if (!connection?.tokenUrl || !connection.lineitemUrl) return reply.code(409).send({ error: "Verified LTI grade service is not available." });
    try {
      const body = request.body as Record<string, unknown>;
      const ltiUserId = requireText(body.ltiUserId, "LTI user ID", 500);
      const scoreGiven = Number(body.scoreGiven);
      const scoreMaximum = Number(body.scoreMaximum);
      if (!Number.isFinite(scoreGiven) || !Number.isFinite(scoreMaximum) || scoreMaximum <= 0 || scoreGiven < 0 || scoreGiven > scoreMaximum) throw new Error("A valid score within the positive maximum is required.");
      await publishLtiScore({ ...connection, ltiUserId, scoreGiven, scoreMaximum, comment: optionalText(body.comment, "Comment", 2000) });
      const now = new Date().toISOString();
      db.prepare("UPDATE score_lms_connections SET last_grade_sync_at = ?, last_error = NULL, updated_at = ? WHERE id = ?")
        .run(now, now, connectionId);
      return reply.code(202).send({ published: true, publishedAt: now });
    } catch (error) {
      const message = error instanceof Error ? error.message : "LTI grade publish failed.";
      db.prepare("UPDATE score_lms_connections SET last_error = ?, updated_at = ? WHERE id = ?")
        .run(message.slice(0, 1000), new Date().toISOString(), connectionId);
      request.log.error({ event: "lti.grade_publish_failed", connectionId, error });
      return reply.code(502).send({ error: message });
    }
  });

  app.get("/education/organizations", { preHandler: app.requireAuth }, async (request) => {
    linkCurrentEducationIdentity(request.authUserId!);
    return {
      organizations: listEducationOrganizations(db, request.authUserId!).map((organization) => ({
        ...organization,
        currentRole: resolveOrganizationRole(db, String(organization.id), request.authUserId!),
      })),
    };
  });

  app.post("/education/organizations", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    try {
      const organization = createEducationOrganization(db, {
        ownerUserId: request.authUserId!,
        name: requireText((request.body as Record<string, unknown>)?.name, "Organization name", 160),
      });
      if (!organization) return reply.code(404).send({ error: "User not found." });
      return reply.code(201).send({ organization });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid organization." }); }
  });

  app.post("/education/organizations/:organizationId/campuses", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string };
    if (!canAdminOrganization(resolveOrganizationRole(db, organizationId, request.authUserId!))) return reply.code(404).send({ error: "Organization not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const timezone = optionalText(body.timezone, "Timezone", 80) ?? "Asia/Shanghai";
      try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); } catch { throw new Error("Timezone must be a valid IANA timezone."); }
      const campus = createEducationCampus(db, {
        organizationId,
        name: requireText(body.name, "Campus name", 160),
        code: optionalText(body.code, "Campus code", 40),
        timezone,
      });
      return reply.code(201).send({ campus });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid campus." }); }
  });

  app.post("/education/organizations/:organizationId/members", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string };
    if (!canAdminOrganization(resolveOrganizationRole(db, organizationId, request.authUserId!))) return reply.code(404).send({ error: "Organization not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const role = requireText(body.role, "Role", 40) as OrganizationMemberRole;
      if (!organizationMemberRoles.has(role)) throw new Error("Organization role is invalid.");
      const member = inviteEducationOrganizationMember(db, {
        organizationId,
        invitedByUserId: request.authUserId!,
        email: requireEmail(body.email),
        displayName: requireText(body.displayName, "Display name", 120),
        role,
      });
      return reply.code(201).send({ member });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid organization member." }); }
  });

  app.delete("/education/organizations/:organizationId/members/:memberId", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { organizationId, memberId } = request.params as { organizationId: string; memberId: string };
    if (!canAdminOrganization(resolveOrganizationRole(db, organizationId, request.authUserId!))) return reply.code(404).send({ error: "Organization not found." });
    if (!removeEducationOrganizationMember(db, { organizationId, memberId })) return reply.code(404).send({ error: "Organization member not found." });
    return reply.send({ removed: true });
  });

  app.patch("/education/classrooms/:classroomId/placement", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canAdmin) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const organizationId = optionalText(body.organizationId, "Organization", 80);
      const campusId = optionalText(body.campusId, "Campus", 80);
      const classroom = db.prepare("SELECT owner_user_id AS ownerUserId, organization_id AS organizationId FROM score_classrooms WHERE id = ? AND archived_at IS NULL")
        .get(classroomId) as { ownerUserId: string; organizationId: string | null } | undefined;
      if (!classroom) return reply.code(404).send({ error: "Classroom not found." });
      if (classroom.ownerUserId !== request.authUserId! && organizationId !== classroom.organizationId) {
        throw new Error("Only the classroom owner can move or detach this classroom.");
      }
      if (organizationId && !canAdminOrganization(resolveOrganizationRole(db, organizationId, request.authUserId!))) throw new Error("Organization is not available.");
      if (campusId) {
        const campus = db.prepare("SELECT id FROM score_organization_campuses WHERE id = ? AND organization_id = ? AND archived_at IS NULL").get(campusId, organizationId) as { id: string } | undefined;
        if (!campus) throw new Error("Campus is not available for this organization.");
      }
      db.prepare("UPDATE score_classrooms SET organization_id = ?, campus_id = ?, updated_at = ? WHERE id = ?")
        .run(organizationId, campusId, new Date().toISOString(), classroomId);
      return reply.send({ classroomId, organizationId, campusId });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid classroom placement." }); }
  });

  app.post("/education/classrooms/:classroomId/staff", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canAdmin) return reply.code(404).send({ error: "Classroom not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const role = requireText(body.role, "Role", 40) as ClassroomStaffRole;
      if (!classroomStaffRoles.has(role)) throw new Error("Classroom staff role is invalid.");
      const member = inviteClassroomStaff(db, {
        classroomId,
        invitedByUserId: request.authUserId!,
        email: requireEmail(body.email),
        displayName: requireText(body.displayName, "Display name", 120),
        role,
      });
      return reply.code(201).send({ member, staff: listClassroomStaff(db, classroomId) });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid classroom staff member." }); }
  });

  app.delete("/education/classrooms/:classroomId/staff/:staffId", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, staffId } = request.params as { classroomId: string; staffId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    if (!access?.canAdmin) return reply.code(404).send({ error: "Classroom not found." });
    if (!removeClassroomStaff(db, { classroomId, staffId })) return reply.code(404).send({ error: "Classroom staff member not found." });
    return reply.send({ removed: true, staff: listClassroomStaff(db, classroomId) });
  });

  app.post("/education/classrooms/:classroomId/students/:studentId/guardians", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, studentId } = request.params as { classroomId: string; studentId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    const student = db.prepare("SELECT id FROM score_classroom_students WHERE id = ? AND classroom_id = ? AND status != 'archived'").get(studentId, classroomId) as { id: string } | undefined;
    if (!access?.canOperate || !student) return reply.code(404).send({ error: "Student not found." });
    try {
      const body = request.body as Record<string, unknown>;
      const guardian = inviteStudentGuardian(db, {
        studentId,
        invitedByUserId: request.authUserId!,
        email: requireEmail(body.email),
        displayName: requireText(body.displayName, "Display name", 120),
        relationship: optionalText(body.relationship, "Relationship", 80),
      });
      return reply.code(201).send({ guardian, guardians: listStudentGuardians(db, studentId) });
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid guardian." }); }
  });

  app.delete("/education/classrooms/:classroomId/students/:studentId/guardians/:guardianId", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const { classroomId, studentId, guardianId } = request.params as { classroomId: string; studentId: string; guardianId: string };
    const access = resolveClassroomAccess(db, classroomId, request.authUserId!);
    const student = db.prepare("SELECT id FROM score_classroom_students WHERE id = ? AND classroom_id = ? AND status != 'archived'").get(studentId, classroomId) as { id: string } | undefined;
    if (!access?.canOperate || !student || !removeStudentGuardian(db, { studentId, guardianId })) return reply.code(404).send({ error: "Guardian not found." });
    return reply.send({ removed: true, guardians: listStudentGuardians(db, studentId) });
  });

  app.get("/education/student-home", { preHandler: app.requireAuth }, async (request) => {
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(request.authUserId!) as { email: string };
    linkStudentMembershipsByEmail(db, request.authUserId!, user.email);
    linkGuardianMembershipsByEmail(db, request.authUserId!, user.email);
    return getStudentEducationHome(db, request.authUserId!);
  });

  app.get("/education/notification-preferences", { preHandler: app.requireAuth }, async (request) => {
    return { preferences: getNotificationPreferences(db, request.authUserId!) };
  });

  app.patch("/education/notification-preferences", { preHandler: app.requireAuth }, async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (typeof body.emailClassroomAnnouncements !== "boolean") {
      return reply.code(400).send({ error: "Email classroom announcement preference must be true or false." });
    }
    if (body.locale !== "zh-CN" && body.locale !== "en") {
      return reply.code(400).send({ error: "Notification locale must be zh-CN or en." });
    }
    const preferences = updateNotificationPreferences(db, {
      userId: request.authUserId!,
      emailClassroomAnnouncements: body.emailClassroomAnnouncements,
      locale: body.locale,
    });
    return reply.send({ preferences });
  });

  app.post("/education/student-classrooms/:classroomId/exit-requests", { preHandler: app.requireAuth }, async (request, reply) => {
    const { classroomId } = request.params as { classroomId: string };
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const exitRequest = createStudentExitRequest(db, {
        classroomId,
        userId: request.authUserId!,
        reason: optionalText(body.reason, "Reason", 500),
      });
      return reply.code(201).send({ exitRequest });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Exit request could not be created.";
      if (message === "Active student membership not found.") return reply.code(404).send({ error: "Classroom not found." });
      return reply.code(409).send({ error: message });
    }
  });

  app.delete("/education/student-exit-requests/:requestId", { preHandler: app.requireAuth }, async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const exitRequest = cancelStudentExitRequest(db, { requestId, userId: request.authUserId! });
    if (!exitRequest) return reply.code(404).send({ error: "Exit request not found." });
    return reply.send({ exitRequest });
  });

  app.post("/education/guardian-exit-requests/:requestId/decision", { preHandler: app.requireAuth }, async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (body.decision !== "approve" && body.decision !== "reject") return reply.code(400).send({ error: "Decision must be approve or reject." });
    const exitRequest = decideStudentExitRequest(db, { requestId, guardianUserId: request.authUserId!, decision: body.decision });
    if (!exitRequest) return reply.code(404).send({ error: "Exit request not found." });
    return reply.send({ exitRequest });
  });

  app.post("/education/student-notifications/:notificationId/read", { preHandler: app.requireAuth }, async (request, reply) => {
    const { notificationId } = request.params as { notificationId: string };
    const receipt = markStudentNotificationRead(db, request.authUserId!, notificationId);
    if (!receipt) return reply.code(404).send({ error: "Notification not found." });
    return reply.send({ receipt });
  });
}
