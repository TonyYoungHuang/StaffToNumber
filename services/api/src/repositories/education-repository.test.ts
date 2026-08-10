import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  archiveClassroomResource,
  archiveClassroomResourceFolder,
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
  listClassroomResourceVersions,
  listClassroomResourceFolders,
  listStudentGuardians,
  listClassroomResources,
  markStudentNotificationRead,
  removeStudentGuardian,
  reuseClassroomResource,
  moveClassroomResourceToFolder,
  restoreClassroomResourceVersion,
  updateClassroomResourceFolder,
} from "./education-repository.js";

function createEducationDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, account_status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE score_classrooms (
      id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, name TEXT NOT NULL,
      archived_at TEXT
    );
    CREATE TABLE score_classroom_students (
      id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, display_name TEXT NOT NULL,
      contact_email TEXT, user_id TEXT, status TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE files (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, original_name TEXT NOT NULL, stored_name TEXT NOT NULL,
      storage_path TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
      file_kind TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE score_classroom_resource_folders (
      id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, parent_id TEXT, name TEXT NOT NULL,
      normalized_name TEXT NOT NULL, created_by_user_id TEXT NOT NULL, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, archived_at TEXT
    );
    CREATE TABLE score_classroom_resources (
      id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, folder_id TEXT, file_id TEXT, source_type TEXT NOT NULL DEFAULT 'external', title TEXT NOT NULL,
      resource_type TEXT NOT NULL, url TEXT NOT NULL, folder_path TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]', visibility TEXT NOT NULL DEFAULT 'classroom',
      version_group_id TEXT NOT NULL, version_number INTEGER NOT NULL DEFAULT 1,
      previous_version_id TEXT, restored_from_id TEXT, reused_from_resource_id TEXT,
      retention_hold INTEGER NOT NULL DEFAULT 0, content_purged_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      archived_at TEXT
    );
    CREATE TABLE score_classroom_resource_student_grants (
      id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, version_group_id TEXT NOT NULL,
      student_id TEXT NOT NULL, created_by_user_id TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(version_group_id, student_id)
    );
    CREATE TABLE score_classroom_notifications (
      id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, title TEXT NOT NULL,
      body TEXT NOT NULL, scheduled_at TEXT, published_at TEXT NOT NULL,
      archived_at TEXT
    );
    CREATE TABLE score_classroom_notification_receipts (
      id TEXT PRIMARY KEY, notification_id TEXT NOT NULL, student_id TEXT NOT NULL,
      read_at TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(notification_id, student_id)
    );
    CREATE TABLE score_student_guardians (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL, user_id TEXT, invited_email TEXT NOT NULL,
      display_name TEXT NOT NULL, relationship TEXT, status TEXT NOT NULL, invited_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, accepted_at TEXT, removed_at TEXT,
      UNIQUE(student_id, invited_email)
    );
    CREATE TABLE score_student_exit_requests (
      id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, student_id TEXT NOT NULL,
      requested_by_user_id TEXT, status TEXT NOT NULL, reason TEXT,
      requested_at TEXT NOT NULL, updated_at TEXT NOT NULL, decided_by_guardian_id TEXT,
      decided_at TEXT, cancelled_at TEXT
    );
    CREATE TABLE score_guardian_notification_receipts (
      id TEXT PRIMARY KEY, notification_id TEXT NOT NULL, guardian_id TEXT NOT NULL,
      read_at TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(notification_id, guardian_id)
    );
    CREATE TABLE score_documents (id TEXT PRIMARY KEY, title TEXT NOT NULL);
    CREATE TABLE score_shares (
      id TEXT PRIMARY KEY, share_token TEXT NOT NULL, revoked_at TEXT
    );
    CREATE TABLE score_assignments (
      id TEXT PRIMARY KEY, classroom_id TEXT, document_id TEXT NOT NULL, share_id TEXT,
      title TEXT NOT NULL, instructions TEXT, due_at TEXT, status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE score_assignment_submissions (
      id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL, student_id TEXT,
      status TEXT NOT NULL, teacher_feedback TEXT, grade_score INTEGER,
      grade_max INTEGER, submitted_at TEXT NOT NULL
    );
  `);
  return db;
}

function seedStudentHome(db: DatabaseSync) {
  db.prepare("INSERT INTO score_classrooms VALUES (?, ?, ?, NULL)").run("class-1", "teacher-1", "合唱一班");
  db.prepare("INSERT INTO score_classroom_students VALUES (?, ?, ?, ?, NULL, 'active', ?)")
    .run("student-1", "class-1", "小林", "STUDENT@example.com", "2026-07-01T00:00:00.000Z");
  db.prepare(`
    INSERT INTO score_classroom_resources (
      id, classroom_id, file_id, source_type, title, resource_type, url, folder_path, tags_json,
      visibility, version_group_id, version_number, previous_version_id, created_at, updated_at, archived_at
    ) VALUES (?, ?, NULL, 'external', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)
  `).run("resource-1", "class-1", "练习伴奏", "audio", "https://example.com/practice.mp3", "伴奏", "[\"女高音\"]", "classroom", "resource-1", 1, "2026-07-10T00:00:00.000Z", "2026-07-10T00:00:00.000Z");
  db.prepare("INSERT INTO score_classroom_notifications VALUES (?, ?, ?, ?, NULL, ?, NULL)")
    .run("notice-1", "class-1", "排练提醒", "周五提前十分钟到场。", "2026-07-11T00:00:00.000Z");
  db.prepare("INSERT INTO score_documents VALUES (?, ?)").run("doc-1", "茉莉花");
  db.prepare("INSERT INTO score_shares VALUES (?, ?, NULL)").run("share-1", "share-token-1");
  db.prepare("INSERT INTO score_assignments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("assignment-1", "class-1", "doc-1", "share-1", "第一声部练习", "练习第 1-16 小节", "2026-07-20T10:00:00.000Z", "published", "2026-07-12T00:00:00.000Z");
  db.prepare("INSERT INTO score_assignment_submissions VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run("submission-1", "assignment-1", "student-1", "reviewed", "节奏稳定，注意换气。", 92, 100, "2026-07-13T00:00:00.000Z");
}

test("student roster memberships link by normalized email and expose assignments, resources, and feedback", () => {
  const db = createEducationDb();
  seedStudentHome(db);

  assert.equal(linkStudentMembershipsByEmail(db, "user-1", "student@EXAMPLE.com"), 1);
  const home = getStudentEducationHome(db, "user-1");

  assert.equal(home.classrooms.length, 1);
  assert.equal(home.classrooms[0].studentId, "student-1");
  assert.equal((home.classrooms[0].resources[0] as { title: string }).title, "练习伴奏");
  assert.equal((home.classrooms[0].notifications[0] as { readAt: string | null }).readAt, null);
  assert.deepEqual({ ...home.classrooms[0].assignments[0] }, {
    id: "assignment-1",
    title: "第一声部练习",
    instructions: "练习第 1-16 小节",
    dueAt: "2026-07-20T10:00:00.000Z",
    status: "published",
    scoreTitle: "茉莉花",
    shareToken: "share-token-1",
    submissionId: "submission-1",
    submissionStatus: "reviewed",
    teacherFeedback: "节奏稳定，注意换气。",
    gradeScore: 92,
    gradeMax: 100,
    submittedAt: "2026-07-13T00:00:00.000Z",
  });

  db.close();
});

test("notification read receipts are authorized by active membership and remain idempotent", () => {
  const db = createEducationDb();
  seedStudentHome(db);
  linkStudentMembershipsByEmail(db, "user-1", "student@example.com");

  assert.equal(markStudentNotificationRead(db, "other-user", "notice-1"), null);
  const first = markStudentNotificationRead(db, "user-1", "notice-1");
  const second = markStudentNotificationRead(db, "user-1", "notice-1");
  assert.ok(first?.readAt);
  assert.ok(second?.readAt);
  assert.equal(
    (db.prepare("SELECT count(*) AS count FROM score_classroom_notification_receipts").get() as { count: number }).count,
    1,
  );
  assert.ok((getStudentEducationHome(db, "user-1").classrooms[0].notifications[0] as { readAt: string | null }).readAt);

  db.close();
});

test("guardian invitations activate by email and keep notification receipts independent from students", () => {
  const db = createEducationDb();
  seedStudentHome(db);
  db.prepare("INSERT INTO users VALUES (?, ?, 'active')").run("teacher-1", "teacher@example.com");

  const invited = inviteStudentGuardian(db, {
    studentId: "student-1",
    invitedByUserId: "teacher-1",
    email: "guardian@example.com",
    displayName: "Student guardian",
    relationship: "Parent",
  }) as { status: string };
  assert.equal(invited.status, "invited");
  db.prepare("INSERT INTO users VALUES (?, ?, 'active')").run("guardian-user", "guardian@example.com");
  assert.equal(linkGuardianMembershipsByEmail(db, "guardian-user", "GUARDIAN@example.com"), 1);
  assert.equal((listStudentGuardians(db, "student-1")[0] as { status: string }).status, "active");

  const guardianHome = getStudentEducationHome(db, "guardian-user");
  assert.equal(guardianHome.classrooms.length, 1);
  assert.equal(guardianHome.classrooms[0].role, "guardian");
  assert.equal(guardianHome.classrooms[0].subjectStudentName, "小林");
  assert.equal((guardianHome.classrooms[0].assignments[0] as { gradeScore: number }).gradeScore, 92);
  assert.equal(markStudentNotificationRead(db, "guardian-user", "notice-1")?.role, "guardian");
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_guardian_notification_receipts").get() as { count: number }).count, 1);
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_classroom_notification_receipts").get() as { count: number }).count, 0);

  linkStudentMembershipsByEmail(db, "student-user", "student@example.com");
  assert.equal(markStudentNotificationRead(db, "student-user", "notice-1")?.role, "student");
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_classroom_notification_receipts").get() as { count: number }).count, 1);

  const guardian = listStudentGuardians(db, "student-1")[0] as { id: string };
  assert.equal(removeStudentGuardian(db, { studentId: "student-1", guardianId: guardian.id }), true);
  assert.equal(getStudentEducationHome(db, "guardian-user").classrooms.length, 0);
  assert.equal(markStudentNotificationRead(db, "guardian-user", "notice-1"), null);
  db.close();
});

test("student exit requests require the linked guardian and archive membership atomically", () => {
  const db = createEducationDb();
  seedStudentHome(db);
  db.prepare("INSERT INTO users VALUES (?, ?, 'active')").run("student-user", "student@example.com");
  db.prepare("INSERT INTO users VALUES (?, ?, 'active')").run("guardian-user", "guardian@example.com");
  db.prepare("INSERT INTO users VALUES (?, ?, 'active')").run("outsider-user", "outsider@example.com");
  linkStudentMembershipsByEmail(db, "student-user", "student@example.com");
  inviteStudentGuardian(db, { studentId: "student-1", invitedByUserId: "teacher-1", email: "guardian@example.com", displayName: "Guardian" });

  const first = createStudentExitRequest(db, { classroomId: "class-1", userId: "student-user", reason: "Changing ensembles" });
  assert.equal(first.status, "pending_guardian");
  assert.equal(getStudentEducationHome(db, "student-user").classrooms[0].exitRequest?.id, first.id);
  assert.equal(getStudentEducationHome(db, "guardian-user").classrooms[0].exitRequest?.id, first.id);
  assert.equal(decideStudentExitRequest(db, { requestId: first.id, guardianUserId: "outsider-user", decision: "approve" }), null);
  assert.equal(cancelStudentExitRequest(db, { requestId: first.id, userId: "outsider-user" }), null);
  assert.equal(cancelStudentExitRequest(db, { requestId: first.id, userId: "student-user" })?.status, "cancelled");

  const rejected = createStudentExitRequest(db, { classroomId: "class-1", userId: "student-user" });
  assert.equal(decideStudentExitRequest(db, { requestId: rejected.id, guardianUserId: "guardian-user", decision: "reject" })?.status, "rejected");
  assert.equal((db.prepare("SELECT status FROM score_classroom_students WHERE id = 'student-1'").get() as { status: string }).status, "active");

  const approved = createStudentExitRequest(db, { classroomId: "class-1", userId: "student-user" });
  assert.equal(decideStudentExitRequest(db, { requestId: approved.id, guardianUserId: "guardian-user", decision: "approve" })?.status, "approved");
  assert.equal((db.prepare("SELECT status FROM score_classroom_students WHERE id = 'student-1'").get() as { status: string }).status, "archived");
  assert.equal(getStudentEducationHome(db, "student-user").classrooms.length, 0);
  assert.equal(getStudentEducationHome(db, "guardian-user").classrooms.length, 0);

  db.prepare("INSERT INTO users VALUES (?, ?, 'active')").run("adult-user", "adult@example.com");
  db.prepare("INSERT INTO score_classroom_students VALUES (?, ?, ?, ?, ?, 'active', ?)")
    .run("student-2", "class-1", "Adult student", "adult@example.com", "adult-user", "2026-07-16T00:00:00.000Z");
  assert.equal(createStudentExitRequest(db, { classroomId: "class-1", userId: "adult-user" }).status, "approved");
  assert.equal((db.prepare("SELECT status FROM score_classroom_students WHERE id = 'student-2'").get() as { status: string }).status, "archived");
  db.close();
});

test("resource library searches folders and tags while hiding staff resources from students", () => {
  const db = createEducationDb();
  seedStudentHome(db);
  createClassroomResource(db, {
    classroomId: "class-1",
    title: "教师排练计划",
    resourceType: "document",
    url: "https://example.com/teacher-plan.pdf",
    folderPath: "教案/第一学期",
    tags: ["排练", "内部"],
    visibility: "staff",
  });
  const selectedResource = createClassroomResource(db, {
    classroomId: "class-1",
    title: "Section rehearsal",
    resourceType: "audio",
    url: "https://example.com/section.mp3",
    visibility: "selected",
    selectedStudentIds: ["student-1", "student-1"],
    createdByUserId: "teacher-1",
  });
  assert.deepEqual(selectedResource.selectedStudentIds, ["student-1"]);
  assert.equal(listClassroomResources(db, { classroomId: "class-1", audience: "student", studentId: "student-1" }).some((resource) => resource.id === selectedResource.id), true);
  assert.equal(listClassroomResources(db, { classroomId: "class-1", audience: "student", studentId: "student-missing" }).some((resource) => resource.id === selectedResource.id), false);
  assert.throws(() => createClassroomResource(db, {
    classroomId: "class-1", title: "Invalid restriction", resourceType: "score", url: "https://example.com/invalid.xml",
    visibility: "selected", selectedStudentIds: [], createdByUserId: "teacher-1",
  }), /Select at least one student/u);
  assert.throws(() => createClassroomResource(db, {
    classroomId: "class-1", title: "Invalid student", resourceType: "score", url: "https://example.com/invalid-student.xml",
    visibility: "selected", selectedStudentIds: ["student-missing"], createdByUserId: "teacher-1",
  }), /active in this classroom/u);

  const publicResource = createClassroomResource(db, {
    classroomId: "class-1",
    title: "女高音分声部",
    resourceType: "audio",
    url: "https://example.com/soprano-v1.mp3",
    folderPath: "伴奏/第一单元",
    tags: ["女高音", "慢速"],
  });
  const folder = createClassroomResourceFolder(db, { classroomId: "class-1", name: "第一单元", createdByUserId: "teacher-1" });
  const childFolder = createClassroomResourceFolder(db, { classroomId: "class-1", parentId: folder.id, name: "女高音", createdByUserId: "teacher-1" });
  assert.equal(childFolder.path, "第一单元/女高音");
  assert.throws(() => createClassroomResourceFolder(db, { classroomId: "class-1", name: "第一单元", createdByUserId: "teacher-1" }), /already exists/u);

  assert.equal(listClassroomResources(db, { classroomId: "class-1", query: "内部" }).length, 1);
  assert.equal(listClassroomResources(db, { classroomId: "class-1", folderPath: "伴奏/第一单元" }).length, 1);
  assert.equal(listClassroomResources(db, { classroomId: "class-1", audience: "student" }).some((resource) => resource.visibility === "staff"), false);

  db.prepare("INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("file-1", "teacher-1", "lesson.musicxml", "lesson.musicxml", "/safe/lesson.musicxml", "application/vnd.recordare.musicxml+xml", 128, "classroom_resource", "2026-07-10T00:00:00.000Z");
  db.prepare("INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("file-2", "teacher-1", "lesson-v2.musicxml", "lesson-v2.musicxml", "/safe/lesson-v2.musicxml", "application/vnd.recordare.musicxml+xml", 144, "classroom_resource", "2026-07-11T00:00:00.000Z");
  const uploaded = createClassroomResource(db, {
    classroomId: "class-1", title: "课堂乐谱", resourceType: "score", sourceType: "file", fileId: "file-1",
  });
  assert.equal(uploaded.url, null);
  assert.equal(uploaded.downloadPath, `/api/education/resources/${uploaded.id}/download`);
  assert.equal(uploaded.originalName, "lesson.musicxml");
  const uploadedV2 = createClassroomResourceVersion(db, {
    classroomId: "class-1", resourceId: uploaded.id, title: uploaded.title, resourceType: "score", sourceType: "file", fileId: "file-2",
  });
  assert.equal(uploadedV2?.versionNumber, 2);
  assert.equal(listClassroomResources(db, { classroomId: "class-1", includeArchived: true }).filter((resource) => resource.versionGroupId === uploaded.versionGroupId).length, 2);
  const restoredUpload = restoreClassroomResourceVersion(db, { classroomId: "class-1", resourceId: uploaded.id });
  assert.equal(restoredUpload?.versionNumber, 3);
  assert.equal(restoredUpload?.restoredFromId, uploaded.id);
  assert.equal(restoredUpload?.previousVersionId, uploadedV2?.id);
  assert.equal(restoredUpload?.fileId, "file-1");
  assert.deepEqual(listClassroomResourceVersions(db, { classroomId: "class-1", resourceId: restoredUpload!.id })?.map((resource) => resource.versionNumber), [3, 2, 1]);
  assert.throws(() => restoreClassroomResourceVersion(db, { classroomId: "class-1", resourceId: restoredUpload!.id }), /current resource version/u);
  const moved = moveClassroomResourceToFolder(db, { classroomId: "class-1", resourceId: restoredUpload!.id, folderId: childFolder.id, folderPath: childFolder.path });
  assert.equal(moved?.versionNumber, 4);
  assert.equal(moved?.folderId, childFolder.id);
  assert.equal(moved?.folderPath, childFolder.path);
  assert.throws(() => archiveClassroomResourceFolder(db, { classroomId: "class-1", folderId: childFolder.id }), /contents first/u);
  const renamed = updateClassroomResourceFolder(db, { classroomId: "class-1", folderId: folder.id, name: "第二单元" });
  assert.equal(renamed?.folder.path, "第二单元");
  assert.equal(renamed?.resources.length, 1);
  assert.equal(renamed?.resources[0].versionNumber, 5);
  assert.equal(renamed?.resources[0].folderPath, "第二单元/女高音");
  const libraryFolder = createClassroomResourceFolder(db, { classroomId: "class-1", name: "教材", createdByUserId: "teacher-1" });
  const relocated = updateClassroomResourceFolder(db, { classroomId: "class-1", folderId: folder.id, parentId: libraryFolder.id, name: "第二单元" });
  assert.equal(relocated?.folder.path, "教材/第二单元");
  assert.equal(relocated?.resources[0].versionNumber, 6);
  assert.equal(relocated?.resources[0].folderPath, "教材/第二单元/女高音");
  assert.throws(
    () => updateClassroomResourceFolder(db, { classroomId: "class-1", folderId: libraryFolder.id, parentId: childFolder.id, name: "教材" }),
    /descendants/u,
  );
  assert.equal(listClassroomResourceFolders(db, "class-1").find((candidate) => candidate.id === libraryFolder.id)?.path, "教材");
  const duplicateFolder = createClassroomResourceFolder(db, { classroomId: "class-1", name: "冲突", createdByUserId: "teacher-1" });
  assert.throws(
    () => updateClassroomResourceFolder(db, { classroomId: "class-1", folderId: libraryFolder.id, name: duplicateFolder.name }),
    /already exists/u,
  );
  let deepParent = createClassroomResourceFolder(db, { classroomId: "class-1", name: "深度1", createdByUserId: "teacher-1" });
  for (let depth = 2; depth <= 6; depth += 1) {
    deepParent = createClassroomResourceFolder(db, { classroomId: "class-1", parentId: deepParent.id, name: `深度${depth}`, createdByUserId: "teacher-1" });
  }
  assert.throws(
    () => updateClassroomResourceFolder(db, { classroomId: "class-1", folderId: libraryFolder.id, parentId: deepParent.id, name: "教材" }),
    /at most 8 levels/u,
  );
  const noChange = updateClassroomResourceFolder(db, { classroomId: "class-1", folderId: folder.id, parentId: libraryFolder.id, name: "第二单元" });
  assert.deepEqual(noChange?.resources, []);
  db.prepare("INSERT INTO score_classrooms VALUES (?, ?, ?, NULL)").run("class-2", "teacher-1", "合唱二班");
  const latestMoved = relocated!.resources[0];
  const reused = reuseClassroomResource(db, { sourceClassroomId: "class-1", sourceResourceId: latestMoved.id, targetClassroomId: "class-2" });
  assert.equal(reused?.fileId, latestMoved.fileId);
  assert.equal(reused?.reusedFromResourceId, latestMoved.id);
  assert.equal(reused?.versionNumber, 1);
  const restrictedReuse = reuseClassroomResource(db, { sourceClassroomId: "class-1", sourceResourceId: selectedResource.id, targetClassroomId: "class-2", createdByUserId: "teacher-1" });
  assert.equal(restrictedReuse?.visibility, "staff");
  assert.deepEqual(restrictedReuse?.selectedStudentIds, []);
  assert.ok(listClassroomResourceFolders(db, "class-1").length >= 10);

  const next = createClassroomResourceVersion(db, {
    classroomId: "class-1",
    resourceId: publicResource.id,
    title: publicResource.title,
    resourceType: publicResource.resourceType,
    url: "https://example.com/soprano-v2.mp3",
    folderPath: publicResource.folderPath,
    tags: publicResource.tags,
  });
  assert.equal(next?.versionNumber, 2);
  assert.equal(next?.previousVersionId, publicResource.id);
  assert.equal(listClassroomResources(db, { classroomId: "class-1" }).some((resource) => resource.id === publicResource.id), false);
  assert.equal(listClassroomResources(db, { classroomId: "class-1", includeArchived: true }).filter((resource) => resource.versionGroupId === publicResource.versionGroupId).length, 2);
  assert.equal(archiveClassroomResource(db, { classroomId: "class-1", resourceId: next!.id }), true);
  assert.equal(archiveClassroomResource(db, { classroomId: "class-1", resourceId: next!.id }), false);
  db.close();
});

test("scheduled and cancelled notifications stay unavailable to students", () => {
  const db = createEducationDb();
  seedStudentHome(db);
  linkStudentMembershipsByEmail(db, "user-1", "student@example.com");
  db.prepare("INSERT INTO score_classroom_notifications VALUES (?, ?, ?, ?, ?, ?, NULL)")
    .run("notice-future", "class-1", "下月提醒", "尚未发布", "2099-01-01T00:00:00.000Z", "2099-01-01T00:00:00.000Z");
  db.prepare("INSERT INTO score_classroom_notifications VALUES (?, ?, ?, ?, NULL, ?, ?)")
    .run("notice-cancelled", "class-1", "取消通知", "不应展示", "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z");

  const notifications = getStudentEducationHome(db, "user-1").classrooms[0].notifications as Array<{ id: string }>;
  assert.deepEqual(notifications.map((notification) => notification.id), ["notice-1"]);
  assert.equal(markStudentNotificationRead(db, "user-1", "notice-future"), null);
  assert.equal(markStudentNotificationRead(db, "user-1", "notice-cancelled"), null);
  db.close();
});
