import type { DatabaseSync } from "node:sqlite";
import { createId } from "../lib/auth.js";

type ClassroomResourceRow = {
  id: string;
  classroom_id: string;
  folder_id: string | null;
  file_id: string | null;
  source_type: "external" | "file";
  title: string;
  resource_type: string;
  url: string;
  folder_path: string | null;
  tags_json: string;
  visibility: "classroom" | "selected" | "staff";
  version_group_id: string;
  version_number: number;
  previous_version_id: string | null;
  restored_from_id: string | null;
  reused_from_resource_id: string | null;
  retention_hold: number;
  content_purged_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
};

type ClassroomResourceVisibility = ClassroomResourceRow["visibility"];

function mapClassroomResource(row: ClassroomResourceRow, selectedStudentIds: string[] = []) {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    folderId: row.folder_id,
    fileId: row.file_id,
    sourceType: row.source_type,
    title: row.title,
    resourceType: row.resource_type,
    url: row.source_type === "external" ? row.url : null,
    downloadPath: row.source_type === "file" && row.file_id ? `/api/education/resources/${row.id}/download` : null,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    folderPath: row.folder_path,
    tags: JSON.parse(row.tags_json) as string[],
    visibility: row.visibility,
    selectedStudentIds,
    versionGroupId: row.version_group_id,
    versionNumber: row.version_number,
    previousVersionId: row.previous_version_id,
    restoredFromId: row.restored_from_id,
    reusedFromResourceId: row.reused_from_resource_id,
    retentionHold: row.retention_hold === 1,
    contentPurgedAt: row.content_purged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export function listClassroomResources(db: DatabaseSync, input: { classroomId: string; query?: string; folderPath?: string | null; audience?: "staff" | "student"; studentId?: string | null; includeArchived?: boolean }) {
  const query = input.query?.trim().toLocaleLowerCase() ?? "";
  const rows = db.prepare(`
    SELECT resources.id, resources.classroom_id, resources.folder_id, resources.file_id, resources.source_type,
           resources.title, resources.resource_type, resources.url, resources.folder_path,
           resources.tags_json, resources.visibility, resources.version_group_id,
           resources.version_number, resources.previous_version_id, resources.restored_from_id, resources.reused_from_resource_id,
           resources.retention_hold, resources.content_purged_at, resources.created_at,
           resources.updated_at, resources.archived_at, files.original_name, files.mime_type, files.size_bytes
    FROM score_classroom_resources resources
    LEFT JOIN files ON files.id = resources.file_id
    WHERE resources.classroom_id = ?
      AND (? = 1 OR resources.archived_at IS NULL)
      AND (
        ? = 'staff'
        OR resources.visibility = 'classroom'
        OR (
          resources.visibility = 'selected' AND ? != '' AND EXISTS (
            SELECT 1 FROM score_classroom_resource_student_grants grants
            WHERE grants.classroom_id = resources.classroom_id
              AND grants.version_group_id = resources.version_group_id
              AND grants.student_id = ?
          )
        )
      )
      AND (? = '' OR lower(resources.title) LIKE '%' || ? || '%' OR lower(resources.tags_json) LIKE '%' || ? || '%')
      AND (? = '' OR coalesce(resources.folder_path, '') = ?)
    ORDER BY coalesce(resources.folder_path, ''), lower(resources.title), resources.version_number DESC
  `).all(
    input.classroomId,
    input.includeArchived ? 1 : 0,
    input.audience ?? "staff",
    input.studentId ?? "",
    input.studentId ?? "",
    query,
    query,
    query,
    input.folderPath?.trim() ?? "",
    input.folderPath?.trim() ?? "",
  ) as ClassroomResourceRow[];
  const grants = db.prepare(`
    SELECT version_group_id AS versionGroupId, student_id AS studentId
    FROM score_classroom_resource_student_grants
    WHERE classroom_id = ?
    ORDER BY student_id
  `).all(input.classroomId) as Array<{ versionGroupId: string; studentId: string }>;
  const studentIdsByGroup = new Map<string, string[]>();
  for (const grant of grants) {
    const studentIds = studentIdsByGroup.get(grant.versionGroupId) ?? [];
    studentIds.push(grant.studentId);
    studentIdsByGroup.set(grant.versionGroupId, studentIds);
  }
  return rows.map((row) => mapClassroomResource(row, row.visibility === "selected" ? studentIdsByGroup.get(row.version_group_id) ?? [] : []));
}

function resourceGrantCreator(db: DatabaseSync, classroomId: string, createdByUserId?: string) {
  if (createdByUserId) return createdByUserId;
  const classroom = db.prepare("SELECT owner_user_id AS ownerUserId FROM score_classrooms WHERE id = ?").get(classroomId) as { ownerUserId: string } | undefined;
  if (!classroom) throw new Error("Classroom not found.");
  return classroom.ownerUserId;
}

function replaceClassroomResourceStudentGrants(db: DatabaseSync, input: {
  classroomId: string;
  versionGroupId: string;
  visibility: ClassroomResourceVisibility;
  selectedStudentIds?: string[];
  createdByUserId?: string;
}) {
  const studentIds = [...new Set(input.selectedStudentIds ?? [])];
  if (studentIds.length > 500) throw new Error("A resource can be assigned to at most 500 students.");
  if (input.visibility === "selected" && studentIds.length === 0) throw new Error("Select at least one student for restricted visibility.");
  if (studentIds.length > 0) {
    const placeholders = studentIds.map(() => "?").join(", ");
    const valid = db.prepare(`
      SELECT id FROM score_classroom_students
      WHERE classroom_id = ? AND status = 'active' AND id IN (${placeholders})
    `).all(input.classroomId, ...studentIds) as Array<{ id: string }>;
    if (valid.length !== studentIds.length) throw new Error("Every selected student must be active in this classroom.");
  }
  if (input.visibility !== "selected") return;
  db.prepare("DELETE FROM score_classroom_resource_student_grants WHERE classroom_id = ? AND version_group_id = ?")
    .run(input.classroomId, input.versionGroupId);
  const creator = resourceGrantCreator(db, input.classroomId, input.createdByUserId);
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO score_classroom_resource_student_grants
      (id, classroom_id, version_group_id, student_id, created_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const studentId of studentIds) insert.run(createId(), input.classroomId, input.versionGroupId, studentId, creator, now);
}

export function createClassroomResource(db: DatabaseSync, input: { classroomId: string; title: string; resourceType: string; url?: string | null; fileId?: string | null; sourceType?: "external" | "file"; folderId?: string | null; folderPath?: string | null; tags?: string[]; visibility?: ClassroomResourceVisibility; selectedStudentIds?: string[]; createdByUserId?: string; reusedFromResourceId?: string | null }) {
  const id = createId();
  const now = new Date().toISOString();
  const visibility = input.visibility ?? "classroom";
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO score_classroom_resources (
        id, classroom_id, folder_id, file_id, source_type, title, resource_type, url, folder_path, tags_json, visibility,
        version_group_id, version_number, previous_version_id, restored_from_id, reused_from_resource_id, created_at, updated_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, ?, ?, ?, NULL)
    `).run(id, input.classroomId, input.folderId ?? null, input.fileId ?? null, input.sourceType ?? "external", input.title, input.resourceType, input.url ?? "", input.folderPath ?? null, JSON.stringify(input.tags ?? []), visibility, id, input.reusedFromResourceId ?? null, now, now);
    replaceClassroomResourceStudentGrants(db, { classroomId: input.classroomId, versionGroupId: id, visibility, selectedStudentIds: input.selectedStudentIds, createdByUserId: input.createdByUserId });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return listClassroomResources(db, { classroomId: input.classroomId, includeArchived: true }).find((resource) => resource.id === id)!;
}

export function createClassroomResourceVersion(db: DatabaseSync, input: { classroomId: string; resourceId: string; title: string; resourceType: string; url?: string | null; fileId?: string | null; sourceType?: "external" | "file"; folderId?: string | null; folderPath?: string | null; tags?: string[]; visibility?: ClassroomResourceVisibility; selectedStudentIds?: string[]; createdByUserId?: string }) {
  const current = db.prepare(`
    SELECT resources.id, resources.classroom_id, resources.folder_id, resources.file_id, resources.source_type,
           resources.title, resources.resource_type, resources.url, resources.folder_path,
           resources.tags_json, resources.visibility, resources.version_group_id,
           resources.version_number, resources.previous_version_id, resources.restored_from_id, resources.reused_from_resource_id, resources.created_at,
           resources.updated_at, resources.archived_at, files.original_name, files.mime_type, files.size_bytes
    FROM score_classroom_resources resources LEFT JOIN files ON files.id = resources.file_id
    WHERE resources.id = ? AND resources.classroom_id = ? AND resources.archived_at IS NULL
  `).get(input.resourceId, input.classroomId) as ClassroomResourceRow | undefined;
  if (!current) return null;
  const id = createId();
  const now = new Date().toISOString();
  const visibility = input.visibility ?? "classroom";
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE score_classroom_resources SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL").run(now, now, current.id);
    db.prepare(`
      INSERT INTO score_classroom_resources (
        id, classroom_id, folder_id, file_id, source_type, title, resource_type, url, folder_path, tags_json, visibility,
        version_group_id, version_number, previous_version_id, restored_from_id, reused_from_resource_id, created_at, updated_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL)
    `).run(
      id, input.classroomId, input.folderId ?? null, input.fileId ?? null, input.sourceType ?? "external", input.title, input.resourceType, input.url ?? "", input.folderPath ?? null,
      JSON.stringify(input.tags ?? []), visibility, current.version_group_id,
      current.version_number + 1, current.id, current.reused_from_resource_id, now, now,
    );
    if (input.selectedStudentIds !== undefined || visibility !== current.visibility) {
      replaceClassroomResourceStudentGrants(db, {
        classroomId: input.classroomId,
        versionGroupId: current.version_group_id,
        visibility,
        selectedStudentIds: input.selectedStudentIds,
        createdByUserId: input.createdByUserId,
      });
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return listClassroomResources(db, { classroomId: input.classroomId, includeArchived: true }).find((resource) => resource.id === id)!;
}

export function listClassroomResourceVersions(db: DatabaseSync, input: { classroomId: string; resourceId: string }) {
  const group = db.prepare("SELECT version_group_id AS versionGroupId FROM score_classroom_resources WHERE id = ? AND classroom_id = ?")
    .get(input.resourceId, input.classroomId) as { versionGroupId: string } | undefined;
  if (!group) return null;
  return listClassroomResources(db, { classroomId: input.classroomId, includeArchived: true })
    .filter((resource) => resource.versionGroupId === group.versionGroupId)
    .sort((left, right) => right.versionNumber - left.versionNumber);
}

export function restoreClassroomResourceVersion(db: DatabaseSync, input: { classroomId: string; resourceId: string }) {
  const target = db.prepare(`
    SELECT resources.id, resources.classroom_id, resources.folder_id, resources.file_id, resources.source_type,
           resources.title, resources.resource_type, resources.url, resources.folder_path,
           resources.tags_json, resources.visibility, resources.version_group_id,
           resources.version_number, resources.previous_version_id, resources.restored_from_id, resources.reused_from_resource_id, resources.created_at,
           resources.updated_at, resources.archived_at, files.original_name, files.mime_type, files.size_bytes
    FROM score_classroom_resources resources LEFT JOIN files ON files.id = resources.file_id
    WHERE resources.id = ? AND resources.classroom_id = ?
  `).get(input.resourceId, input.classroomId) as ClassroomResourceRow | undefined;
  if (!target) return null;
  if (target.source_type === "file" && !target.file_id) throw new Error("This historical version's file content has expired and cannot be restored.");
  const current = db.prepare(`
    SELECT id, version_number AS versionNumber FROM score_classroom_resources
    WHERE classroom_id = ? AND version_group_id = ? AND archived_at IS NULL
    ORDER BY version_number DESC LIMIT 1
  `).get(input.classroomId, target.version_group_id) as { id: string; versionNumber: number } | undefined;
  if (current?.id === target.id) throw new Error("The current resource version cannot be restored.");
  const maximum = db.prepare("SELECT max(version_number) AS versionNumber FROM score_classroom_resources WHERE classroom_id = ? AND version_group_id = ?")
    .get(input.classroomId, target.version_group_id) as { versionNumber: number };
  const id = createId();
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (current) db.prepare("UPDATE score_classroom_resources SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL").run(now, now, current.id);
    db.prepare(`
      INSERT INTO score_classroom_resources (
        id, classroom_id, folder_id, file_id, source_type, title, resource_type, url, folder_path, tags_json, visibility,
        version_group_id, version_number, previous_version_id, restored_from_id, reused_from_resource_id, created_at, updated_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(
      id, input.classroomId, target.folder_id, target.file_id, target.source_type, target.title, target.resource_type, target.url,
      target.folder_path, target.tags_json, target.visibility, target.version_group_id, maximum.versionNumber + 1,
      current?.id ?? null, target.id, target.reused_from_resource_id, now, now,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return listClassroomResources(db, { classroomId: input.classroomId, includeArchived: true }).find((resource) => resource.id === id)!;
}

type ResourceFolderRow = { id: string; classroom_id: string; parent_id: string | null; name: string; created_at: string; updated_at: string; archived_at: string | null };

export function listClassroomResourceFolders(db: DatabaseSync, classroomId: string, includeArchived = false) {
  const folders = db.prepare(`
    SELECT id, classroom_id, parent_id, name, created_at, updated_at, archived_at
    FROM score_classroom_resource_folders WHERE classroom_id = ? AND (? = 1 OR archived_at IS NULL)
    ORDER BY lower(name)
  `).all(classroomId, includeArchived ? 1 : 0) as ResourceFolderRow[];
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const pathFor = (folder: ResourceFolderRow) => {
    const segments = [folder.name];
    let parentId = folder.parent_id;
    const visited = new Set([folder.id]);
    while (parentId) {
      if (visited.has(parentId)) break;
      visited.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      segments.unshift(parent.name);
      parentId = parent.parent_id;
    }
    return segments.join("/");
  };
  return folders.map((folder) => ({ id: folder.id, classroomId: folder.classroom_id, parentId: folder.parent_id, name: folder.name, path: pathFor(folder), createdAt: folder.created_at, updatedAt: folder.updated_at, archivedAt: folder.archived_at }));
}

function validateResourceFolderName(value: string) {
  const name = value.trim();
  if (!name || name.length > 80 || /[\\/]/u.test(name)) throw new Error("Folder name must be 1-80 characters and cannot contain slashes.");
  return name;
}

export function createClassroomResourceFolder(db: DatabaseSync, input: { classroomId: string; parentId?: string | null; name: string; createdByUserId: string }) {
  const name = validateResourceFolderName(input.name);
  const normalized = name.toLocaleLowerCase();
  if (input.parentId) {
    const parent = db.prepare("SELECT id FROM score_classroom_resource_folders WHERE id = ? AND classroom_id = ? AND archived_at IS NULL").get(input.parentId, input.classroomId);
    if (!parent) throw new Error("Parent folder not found.");
    const folders = listClassroomResourceFolders(db, input.classroomId);
    const parentFolder = folders.find((folder) => folder.id === input.parentId)!;
    if (parentFolder.path.split("/").length >= 8) throw new Error("Resource folders support at most 8 levels.");
  }
  const duplicate = db.prepare(`SELECT id FROM score_classroom_resource_folders
    WHERE classroom_id = ? AND coalesce(parent_id, '') = coalesce(?, '') AND normalized_name = ? AND archived_at IS NULL`)
    .get(input.classroomId, input.parentId ?? null, normalized);
  if (duplicate) throw new Error("A folder with this name already exists here.");
  const id = createId();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO score_classroom_resource_folders
    (id, classroom_id, parent_id, name, normalized_name, created_by_user_id, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`)
    .run(id, input.classroomId, input.parentId ?? null, name, normalized, input.createdByUserId, now, now);
  return listClassroomResourceFolders(db, input.classroomId).find((folder) => folder.id === id)!;
}

export function updateClassroomResourceFolder(db: DatabaseSync, input: { classroomId: string; folderId: string; parentId?: string | null; name: string }) {
  const name = validateResourceFolderName(input.name);
  const normalized = name.toLocaleLowerCase();
  const parentId = input.parentId ?? null;
  db.exec("BEGIN IMMEDIATE");
  try {
    const folders = listClassroomResourceFolders(db, input.classroomId);
    const target = folders.find((folder) => folder.id === input.folderId);
    if (!target) {
      db.exec("ROLLBACK");
      return null;
    }
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const descendants = new Set([target.id]);
    let added = true;
    while (added) {
      added = false;
      for (const folder of folders) {
        if (folder.parentId && descendants.has(folder.parentId) && !descendants.has(folder.id)) {
          descendants.add(folder.id);
          added = true;
        }
      }
    }
    if (parentId && descendants.has(parentId)) throw new Error("A folder cannot be moved into itself or one of its descendants.");
    const parent = parentId ? byId.get(parentId) : null;
    if (parentId && !parent) throw new Error("Parent folder not found.");
    const duplicate = folders.find((folder) => folder.id !== target.id && folder.parentId === parentId && folder.name.toLocaleLowerCase() === normalized);
    if (duplicate) throw new Error("A folder with this name already exists here.");

    let maximumRelativeDepth = 0;
    for (const folder of folders) {
      if (!descendants.has(folder.id)) continue;
      let relativeDepth = 0;
      let current = folder;
      while (current.id !== target.id) {
        const ancestor = current.parentId ? byId.get(current.parentId) : null;
        if (!ancestor) throw new Error("Resource folder hierarchy is invalid.");
        current = ancestor;
        relativeDepth += 1;
      }
      maximumRelativeDepth = Math.max(maximumRelativeDepth, relativeDepth);
    }
    const targetDepth = (parent?.path.split("/").length ?? 0) + 1;
    if (targetDepth + maximumRelativeDepth > 8) throw new Error("Resource folders support at most 8 levels.");

    if (target.name === name && target.parentId === parentId) {
      db.exec("COMMIT");
      return { folder: target, resources: [] };
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE score_classroom_resource_folders
      SET parent_id = ?, name = ?, normalized_name = ?, updated_at = ?
      WHERE id = ? AND classroom_id = ? AND archived_at IS NULL`)
      .run(parentId, name, normalized, now, target.id, input.classroomId);
    const updatedFolders = listClassroomResourceFolders(db, input.classroomId);
    const paths = new Map(updatedFolders.map((folder) => [folder.id, folder.path]));
    const currentResources = listClassroomResources(db, { classroomId: input.classroomId })
      .filter((resource) => resource.folderId && descendants.has(resource.folderId));
    const createdIds: string[] = [];
    for (const resource of currentResources) {
      const id = createId();
      const folderPath = resource.folderId ? paths.get(resource.folderId) : null;
      if (!folderPath) throw new Error("Resource folder path could not be resolved.");
      db.prepare("UPDATE score_classroom_resources SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL")
        .run(now, now, resource.id);
      db.prepare(`INSERT INTO score_classroom_resources (
        id, classroom_id, folder_id, file_id, source_type, title, resource_type, url, folder_path, tags_json, visibility,
        version_group_id, version_number, previous_version_id, restored_from_id, reused_from_resource_id, created_at, updated_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL)`)
        .run(
          id, input.classroomId, resource.folderId, resource.fileId, resource.sourceType, resource.title, resource.resourceType,
          resource.url ?? "", folderPath, JSON.stringify(resource.tags), resource.visibility, resource.versionGroupId,
          resource.versionNumber + 1, resource.id, resource.reusedFromResourceId, now, now,
        );
      createdIds.push(id);
    }
    db.exec("COMMIT");
    const resources = listClassroomResources(db, { classroomId: input.classroomId });
    return {
      folder: listClassroomResourceFolders(db, input.classroomId).find((folder) => folder.id === target.id)!,
      resources: resources.filter((resource) => createdIds.includes(resource.id)),
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function archiveClassroomResourceFolder(db: DatabaseSync, input: { classroomId: string; folderId: string }) {
  const folder = db.prepare("SELECT id FROM score_classroom_resource_folders WHERE id = ? AND classroom_id = ? AND archived_at IS NULL").get(input.folderId, input.classroomId);
  if (!folder) return false;
  const child = db.prepare("SELECT id FROM score_classroom_resource_folders WHERE parent_id = ? AND archived_at IS NULL LIMIT 1").get(input.folderId);
  const resource = db.prepare("SELECT id FROM score_classroom_resources WHERE folder_id = ? AND archived_at IS NULL LIMIT 1").get(input.folderId);
  if (child || resource) throw new Error("Move or archive the folder contents first.");
  const now = new Date().toISOString();
  return db.prepare("UPDATE score_classroom_resource_folders SET archived_at = ?, updated_at = ? WHERE id = ? AND classroom_id = ? AND archived_at IS NULL")
    .run(now, now, input.folderId, input.classroomId).changes > 0;
}

export function reuseClassroomResource(db: DatabaseSync, input: { sourceClassroomId: string; sourceResourceId: string; targetClassroomId: string; folderId?: string | null; folderPath?: string | null; createdByUserId?: string }) {
  const source = listClassroomResources(db, { classroomId: input.sourceClassroomId }).find((resource) => resource.id === input.sourceResourceId);
  if (!source) return null;
  return createClassroomResource(db, {
    classroomId: input.targetClassroomId, folderId: input.folderId ?? null, folderPath: input.folderPath ?? null,
    title: source.title, resourceType: source.resourceType, sourceType: source.sourceType,
    url: source.url, fileId: source.fileId, tags: source.tags, visibility: source.visibility === "selected" ? "staff" : source.visibility,
    createdByUserId: input.createdByUserId,
    reusedFromResourceId: source.id,
  });
}

export function moveClassroomResourceToFolder(db: DatabaseSync, input: { classroomId: string; resourceId: string; folderId?: string | null; folderPath?: string | null }) {
  const current = listClassroomResources(db, { classroomId: input.classroomId }).find((resource) => resource.id === input.resourceId);
  if (!current) return null;
  return createClassroomResourceVersion(db, {
    classroomId: input.classroomId, resourceId: current.id, folderId: input.folderId ?? null, folderPath: input.folderPath ?? null,
    title: current.title, resourceType: current.resourceType, sourceType: current.sourceType,
    url: current.url, fileId: current.fileId, tags: current.tags, visibility: current.visibility,
  });
}

export function archiveClassroomResource(db: DatabaseSync, input: { classroomId: string; resourceId: string }) {
  const now = new Date().toISOString();
  return db.prepare("UPDATE score_classroom_resources SET archived_at = ?, updated_at = ? WHERE id = ? AND classroom_id = ? AND archived_at IS NULL")
    .run(now, now, input.resourceId, input.classroomId).changes > 0;
}

export function canReadClassroomResource(db: DatabaseSync, input: { resourceId: string; userId: string }) {
  const resource = db.prepare(`
    SELECT resources.classroom_id AS classroomId, resources.visibility,
           resources.version_group_id AS versionGroupId, resources.archived_at AS archivedAt,
           CASE WHEN classrooms.owner_user_id = ? THEN 1 ELSE 0 END AS isOwner,
           CASE WHEN organizations.owner_user_id = ? OR organization_members.id IS NOT NULL THEN 1 ELSE 0 END AS isOrganizationAdmin,
           CASE WHEN staff.id IS NOT NULL THEN 1 ELSE 0 END AS isStaff
    FROM score_classroom_resources resources
    JOIN score_classrooms classrooms ON classrooms.id = resources.classroom_id AND classrooms.archived_at IS NULL
    LEFT JOIN score_organizations organizations
      ON organizations.id = classrooms.organization_id AND organizations.archived_at IS NULL
    LEFT JOIN score_organization_members organization_members
      ON organization_members.organization_id = classrooms.organization_id
      AND organization_members.user_id = ? AND organization_members.role = 'admin'
      AND organization_members.status = 'active' AND organization_members.removed_at IS NULL
    LEFT JOIN score_classroom_staff staff
      ON staff.classroom_id = classrooms.id AND staff.user_id = ?
      AND staff.status = 'active' AND staff.removed_at IS NULL
    WHERE resources.id = ?
  `).get(input.userId, input.userId, input.userId, input.userId, input.resourceId) as {
    classroomId: string;
    visibility: ClassroomResourceVisibility;
    versionGroupId: string;
    archivedAt: string | null;
    isOwner: number;
    isOrganizationAdmin: number;
    isStaff: number;
  } | undefined;
  if (!resource) return false;
  if (resource.isOwner || resource.isOrganizationAdmin || resource.isStaff) return true;
  if (resource.archivedAt || resource.visibility === "staff") return false;
  const memberships = db.prepare(`
    SELECT students.id
    FROM score_classroom_students students
    WHERE students.classroom_id = ? AND students.status = 'active' AND (
      students.user_id = ? OR EXISTS (
        SELECT 1 FROM score_student_guardians guardians
        WHERE guardians.student_id = students.id AND guardians.user_id = ?
          AND guardians.status = 'active' AND guardians.removed_at IS NULL
      )
    )
  `).all(resource.classroomId, input.userId, input.userId) as Array<{ id: string }>;
  if (memberships.length === 0) return false;
  if (resource.visibility === "classroom") return true;
  const placeholders = memberships.map(() => "?").join(", ");
  return Boolean(db.prepare(`
    SELECT 1 FROM score_classroom_resource_student_grants
    WHERE classroom_id = ? AND version_group_id = ? AND student_id IN (${placeholders})
    LIMIT 1
  `).get(resource.classroomId, resource.versionGroupId, ...memberships.map((membership) => membership.id)));
}

export function linkStudentMembershipsByEmail(db: DatabaseSync, userId: string, email: string) {
  return db.prepare("UPDATE score_classroom_students SET user_id = ?, status = 'active', updated_at = ? WHERE lower(contact_email) = lower(?) AND status IN ('invited', 'active')")
    .run(userId, new Date().toISOString(), email).changes;
}

export function listStudentGuardians(db: DatabaseSync, studentId: string) {
  return db.prepare(`
    SELECT id, student_id AS studentId, user_id AS userId, invited_email AS invitedEmail,
           display_name AS displayName, relationship, status, created_at AS createdAt, accepted_at AS acceptedAt
    FROM score_student_guardians
    WHERE student_id = ? AND removed_at IS NULL
    ORDER BY lower(display_name)
  `).all(studentId);
}

export function inviteStudentGuardian(db: DatabaseSync, input: { studentId: string; invitedByUserId: string; email: string; displayName: string; relationship?: string | null }) {
  const email = input.email.trim().toLocaleLowerCase();
  const student = db.prepare("SELECT contact_email AS contactEmail FROM score_classroom_students WHERE id = ? AND status != 'archived'")
    .get(input.studentId) as { contactEmail: string | null } | undefined;
  if (!student) throw new Error("Student not found.");
  if (student.contactEmail?.toLocaleLowerCase() === email) throw new Error("Student and guardian must use different sign-in emails.");
  const user = db.prepare("SELECT id FROM users WHERE lower(email) = ? AND account_status = 'active'").get(email) as { id: string } | undefined;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO score_student_guardians (
      id, student_id, user_id, invited_email, display_name, relationship, status,
      invited_by_user_id, created_at, updated_at, accepted_at, removed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(student_id, invited_email) DO UPDATE SET
      user_id = excluded.user_id, display_name = excluded.display_name, relationship = excluded.relationship,
      status = excluded.status, invited_by_user_id = excluded.invited_by_user_id,
      updated_at = excluded.updated_at, accepted_at = excluded.accepted_at, removed_at = NULL
  `).run(
    createId(), input.studentId, user?.id ?? null, email, input.displayName, input.relationship ?? null,
    user ? "active" : "invited", input.invitedByUserId, now, now, user ? now : null,
  );
  return listStudentGuardians(db, input.studentId).find((guardian) => (guardian as { invitedEmail: string }).invitedEmail === email)!;
}

export function removeStudentGuardian(db: DatabaseSync, input: { studentId: string; guardianId: string }) {
  const now = new Date().toISOString();
  return db.prepare("UPDATE score_student_guardians SET status = 'removed', removed_at = ?, updated_at = ? WHERE id = ? AND student_id = ? AND removed_at IS NULL")
    .run(now, now, input.guardianId, input.studentId).changes > 0;
}

type StudentExitRequestRow = {
  id: string;
  classroom_id: string;
  student_id: string;
  requested_by_user_id: string | null;
  status: "pending_guardian" | "approved" | "rejected" | "cancelled";
  reason: string | null;
  requested_at: string;
  updated_at: string;
  decided_by_guardian_id: string | null;
  decided_at: string | null;
  cancelled_at: string | null;
};

function mapStudentExitRequest(row: StudentExitRequestRow) {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    studentId: row.student_id,
    requestedByUserId: row.requested_by_user_id,
    status: row.status,
    reason: row.reason,
    requestedAt: row.requested_at,
    updatedAt: row.updated_at,
    decidedByGuardianId: row.decided_by_guardian_id,
    decidedAt: row.decided_at,
    cancelledAt: row.cancelled_at,
  };
}

export function findLatestStudentExitRequest(db: DatabaseSync, studentId: string) {
  const request = db.prepare(`
    SELECT id, classroom_id, student_id, requested_by_user_id, status, reason, requested_at,
           updated_at, decided_by_guardian_id, decided_at, cancelled_at
    FROM score_student_exit_requests
    WHERE student_id = ?
    ORDER BY datetime(requested_at) DESC, rowid DESC LIMIT 1
  `).get(studentId) as StudentExitRequestRow | undefined;
  return request ? mapStudentExitRequest(request) : null;
}

function findStudentExitRequestById(db: DatabaseSync, requestId: string) {
  const request = db.prepare(`
    SELECT id, classroom_id, student_id, requested_by_user_id, status, reason, requested_at,
           updated_at, decided_by_guardian_id, decided_at, cancelled_at
    FROM score_student_exit_requests WHERE id = ?
  `).get(requestId) as StudentExitRequestRow | undefined;
  return request ? mapStudentExitRequest(request) : null;
}

export function createStudentExitRequest(db: DatabaseSync, input: { classroomId: string; userId: string; reason?: string | null }) {
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    const student = db.prepare(`
      SELECT id FROM score_classroom_students
      WHERE classroom_id = ? AND user_id = ? AND status = 'active'
    `).get(input.classroomId, input.userId) as { id: string } | undefined;
    if (!student) throw new Error("Active student membership not found.");
    const pending = db.prepare("SELECT id FROM score_student_exit_requests WHERE student_id = ? AND status = 'pending_guardian'").get(student.id);
    if (pending) throw new Error("An exit request is already awaiting guardian consent.");
    const guardianCount = (db.prepare(`
      SELECT count(*) AS count FROM score_student_guardians
      WHERE student_id = ? AND status = 'active' AND removed_at IS NULL
    `).get(student.id) as { count: number }).count;
    const id = createId();
    const status = guardianCount > 0 ? "pending_guardian" : "approved";
    db.prepare(`
      INSERT INTO score_student_exit_requests (
        id, classroom_id, student_id, requested_by_user_id, status, reason,
        requested_at, updated_at, decided_by_guardian_id, decided_at, cancelled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
    `).run(id, input.classroomId, student.id, input.userId, status, input.reason ?? null, now, now, status === "approved" ? now : null);
    if (status === "approved") {
      db.prepare("UPDATE score_classroom_students SET status = 'archived', updated_at = ? WHERE id = ? AND status = 'active'").run(now, student.id);
    }
    db.exec("COMMIT");
    return findStudentExitRequestById(db, id)!;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function cancelStudentExitRequest(db: DatabaseSync, input: { requestId: string; userId: string }) {
  const now = new Date().toISOString();
  const request = db.prepare(`
    SELECT requests.student_id AS studentId
    FROM score_student_exit_requests requests
    JOIN score_classroom_students students ON students.id = requests.student_id
    WHERE requests.id = ? AND requests.status = 'pending_guardian'
      AND students.user_id = ? AND students.status = 'active'
  `).get(input.requestId, input.userId) as { studentId: string } | undefined;
  if (!request) return null;
  const updated = db.prepare(`
    UPDATE score_student_exit_requests
    SET status = 'cancelled', cancelled_at = ?, updated_at = ?
    WHERE id = ? AND status = 'pending_guardian'
  `).run(now, now, input.requestId);
  return updated.changes === 1 ? findStudentExitRequestById(db, input.requestId) : null;
}

export function decideStudentExitRequest(db: DatabaseSync, input: { requestId: string; guardianUserId: string; decision: "approve" | "reject" }) {
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    const request = db.prepare(`
      SELECT requests.student_id AS studentId, guardians.id AS guardianId
      FROM score_student_exit_requests requests
      JOIN score_classroom_students students ON students.id = requests.student_id
      JOIN score_student_guardians guardians ON guardians.student_id = students.id
      WHERE requests.id = ? AND requests.status = 'pending_guardian' AND students.status = 'active'
        AND guardians.user_id = ? AND guardians.status = 'active' AND guardians.removed_at IS NULL
    `).get(input.requestId, input.guardianUserId) as { studentId: string; guardianId: string } | undefined;
    if (!request) {
      db.exec("ROLLBACK");
      return null;
    }
    const status = input.decision === "approve" ? "approved" : "rejected";
    const updated = db.prepare(`
      UPDATE score_student_exit_requests
      SET status = ?, decided_by_guardian_id = ?, decided_at = ?, updated_at = ?
      WHERE id = ? AND status = 'pending_guardian'
    `).run(status, request.guardianId, now, now, input.requestId);
    if (updated.changes !== 1) throw new Error("Exit request was already decided.");
    if (status === "approved") {
      const archived = db.prepare("UPDATE score_classroom_students SET status = 'archived', updated_at = ? WHERE id = ? AND status = 'active'").run(now, request.studentId);
      if (archived.changes !== 1) throw new Error("Student membership could not be archived.");
    }
    db.exec("COMMIT");
    return findStudentExitRequestById(db, input.requestId)!;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function linkGuardianMembershipsByEmail(db: DatabaseSync, userId: string, email: string) {
  const now = new Date().toISOString();
  return db.prepare(`
    UPDATE score_student_guardians
    SET user_id = ?, status = 'active', accepted_at = coalesce(accepted_at, ?), updated_at = ?
    WHERE lower(invited_email) = lower(?) AND status IN ('invited', 'active') AND removed_at IS NULL
  `).run(userId, now, now, email).changes;
}

type EducationHomeMembership = {
  student_id: string;
  id: string;
  name: string;
  subject_student_name: string;
  role: "student" | "guardian";
  guardian_id: string | null;
};

function listEducationNotifications(db: DatabaseSync, classroom: EducationHomeMembership) {
  if (classroom.role === "guardian") {
    return db.prepare(`
      SELECT notifications.id, notifications.title, notifications.body, notifications.published_at AS publishedAt,
             receipts.read_at AS readAt
      FROM score_classroom_notifications notifications
      LEFT JOIN score_guardian_notification_receipts receipts
        ON receipts.notification_id = notifications.id AND receipts.guardian_id = ?
      WHERE notifications.classroom_id = ? AND notifications.archived_at IS NULL
        AND datetime(notifications.published_at) <= datetime('now')
      ORDER BY notifications.published_at DESC
    `).all(classroom.guardian_id, classroom.id);
  }
  return db.prepare(`
    SELECT notifications.id, notifications.title, notifications.body, notifications.published_at AS publishedAt,
           receipts.read_at AS readAt
    FROM score_classroom_notifications notifications
    LEFT JOIN score_classroom_notification_receipts receipts
      ON receipts.notification_id = notifications.id AND receipts.student_id = ?
    WHERE notifications.classroom_id = ? AND notifications.archived_at IS NULL
      AND datetime(notifications.published_at) <= datetime('now')
    ORDER BY notifications.published_at DESC
  `).all(classroom.student_id, classroom.id);
}

export function getStudentEducationHome(db: DatabaseSync, userId: string) {
  const memberships = db.prepare(`
    SELECT students.id AS student_id, classrooms.id, classrooms.name,
           students.display_name AS subject_student_name, 'student' AS role, NULL AS guardian_id
    FROM score_classrooms classrooms
    JOIN score_classroom_students students ON students.classroom_id = classrooms.id
    WHERE students.user_id = ? AND students.status = 'active' AND classrooms.archived_at IS NULL
    UNION ALL
    SELECT students.id AS student_id, classrooms.id, classrooms.name,
           students.display_name AS subject_student_name, 'guardian' AS role, guardians.id AS guardian_id
    FROM score_classrooms classrooms
    JOIN score_classroom_students students ON students.classroom_id = classrooms.id
    JOIN score_student_guardians guardians ON guardians.student_id = students.id
    WHERE guardians.user_id = ? AND guardians.status = 'active' AND guardians.removed_at IS NULL
      AND students.status = 'active' AND classrooms.archived_at IS NULL
    ORDER BY name, subject_student_name
  `).all(userId, userId) as EducationHomeMembership[];

  return {
    classrooms: memberships.map((classroom) => ({
      id: classroom.id,
      name: classroom.name,
      studentId: classroom.student_id,
      subjectStudentName: classroom.subject_student_name,
      role: classroom.role,
      exitRequest: findLatestStudentExitRequest(db, classroom.student_id),
      resources: listClassroomResources(db, { classroomId: classroom.id, audience: "student", studentId: classroom.student_id }),
      notifications: listEducationNotifications(db, classroom),
      assignments: db.prepare(`
        SELECT assignments.id, assignments.title, assignments.instructions, assignments.due_at AS dueAt, assignments.status,
               documents.title AS scoreTitle, shares.share_token AS shareToken,
               submissions.id AS submissionId, submissions.status AS submissionStatus,
               submissions.teacher_feedback AS teacherFeedback, submissions.grade_score AS gradeScore,
               submissions.grade_max AS gradeMax, submissions.submitted_at AS submittedAt
        FROM score_assignments assignments
        JOIN score_documents documents ON documents.id = assignments.document_id
        LEFT JOIN score_shares shares ON shares.id = assignments.share_id AND shares.revoked_at IS NULL
        LEFT JOIN score_assignment_submissions submissions ON submissions.id = (
          SELECT latest.id FROM score_assignment_submissions latest
          WHERE latest.assignment_id = assignments.id AND latest.student_id = ?
          ORDER BY latest.submitted_at DESC LIMIT 1
        )
        WHERE assignments.classroom_id = ?
        ORDER BY CASE WHEN assignments.due_at IS NULL THEN 1 ELSE 0 END, assignments.due_at, assignments.created_at DESC
      `).all(classroom.student_id, classroom.id),
    })),
  };
}

export function markStudentNotificationRead(db: DatabaseSync, userId: string, notificationId: string) {
  const membership = db.prepare(`
    SELECT students.id AS student_id
    FROM score_classroom_notifications notifications
    JOIN score_classroom_students students ON students.classroom_id = notifications.classroom_id
    WHERE notifications.id = ? AND students.user_id = ? AND students.status = 'active'
      AND notifications.archived_at IS NULL
      AND datetime(notifications.published_at) <= datetime('now')
  `).get(notificationId, userId) as { student_id: string } | undefined;
  const now = new Date().toISOString();
  if (membership) {
    db.prepare(`
      INSERT INTO score_classroom_notification_receipts (id, notification_id, student_id, read_at, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(notification_id, student_id) DO UPDATE SET read_at = excluded.read_at
    `).run(createId(), notificationId, membership.student_id, now, now);
    return { notificationId, studentId: membership.student_id, role: "student", readAt: now };
  }
  const guardian = db.prepare(`
    SELECT guardians.id AS guardian_id, students.id AS student_id
    FROM score_classroom_notifications notifications
    JOIN score_classroom_students students ON students.classroom_id = notifications.classroom_id
    JOIN score_student_guardians guardians ON guardians.student_id = students.id
    WHERE notifications.id = ? AND guardians.user_id = ? AND guardians.status = 'active'
      AND guardians.removed_at IS NULL AND students.status = 'active'
      AND notifications.archived_at IS NULL AND datetime(notifications.published_at) <= datetime('now')
  `).get(notificationId, userId) as { guardian_id: string; student_id: string } | undefined;
  if (!guardian) return null;
  db.prepare(`
    INSERT INTO score_guardian_notification_receipts (id, notification_id, guardian_id, read_at, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(notification_id, guardian_id) DO UPDATE SET read_at = excluded.read_at
  `).run(createId(), notificationId, guardian.guardian_id, now, now);
  return { notificationId, studentId: guardian.student_id, role: "guardian", readAt: now };
}
