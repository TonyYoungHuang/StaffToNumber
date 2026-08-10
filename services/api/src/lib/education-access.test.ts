import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { canAdminOrganization, linkEducationInvitationsByEmail, listAccessibleClassroomIds, resolveClassroomAccess, resolveClassroomAudience, resolveOrganizationRole } from "./education-access.js";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE score_organizations (id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, archived_at TEXT);
    CREATE TABLE score_organization_members (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT, invited_email TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, accepted_at TEXT, updated_at TEXT NOT NULL, removed_at TEXT);
    CREATE TABLE score_classrooms (id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, organization_id TEXT, name TEXT NOT NULL, archived_at TEXT);
    CREATE TABLE score_classroom_staff (id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, user_id TEXT, invited_email TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, accepted_at TEXT, updated_at TEXT NOT NULL, removed_at TEXT);
    CREATE TABLE score_classroom_students (id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, user_id TEXT, status TEXT NOT NULL);
    CREATE TABLE score_student_guardians (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, user_id TEXT, status TEXT NOT NULL, removed_at TEXT);
    INSERT INTO score_organizations VALUES ('org-1', 'org-owner', NULL);
    INSERT INTO score_classrooms VALUES ('class-1', 'class-owner', 'org-1', 'Choir', NULL);
    INSERT INTO score_classrooms VALUES ('class-2', 'another-owner', NULL, 'Piano', NULL);
  `);
  return db;
}

test("resolves owner, organization admin, classroom staff, observer, and denied access", () => {
  const db = database();
  db.prepare("INSERT INTO score_organization_members VALUES (?, 'org-1', ?, ?, ?, 'active', ?, ?, NULL)")
    .run("member-admin", "admin-user", "admin@example.test", "admin", new Date().toISOString(), new Date().toISOString());
  const insertStaff = db.prepare("INSERT INTO score_classroom_staff VALUES (?, 'class-1', ?, ?, ?, 'active', ?, ?, NULL)");
  insertStaff.run("staff-teacher", "teacher-user", "teacher@example.test", "teacher", new Date().toISOString(), new Date().toISOString());
  insertStaff.run("staff-observer", "observer-user", "observer@example.test", "observer", new Date().toISOString(), new Date().toISOString());

  assert.deepEqual(resolveClassroomAccess(db, "class-1", "class-owner")?.role, "owner");
  assert.deepEqual(resolveClassroomAccess(db, "class-1", "org-owner")?.role, "organization_admin");
  assert.deepEqual(resolveClassroomAccess(db, "class-1", "admin-user")?.role, "organization_admin");
  assert.equal(resolveClassroomAccess(db, "class-1", "teacher-user")?.canOperate, true);
  assert.equal(resolveClassroomAccess(db, "class-1", "teacher-user")?.canAdmin, false);
  assert.equal(resolveClassroomAccess(db, "class-1", "observer-user")?.canOperate, false);
  assert.equal(resolveClassroomAccess(db, "class-1", "unknown"), null);
  db.prepare("INSERT INTO score_classroom_students VALUES ('student-1', 'class-1', 'student-user', 'active')").run();
  db.prepare("INSERT INTO score_student_guardians VALUES ('guardian-1', 'student-1', 'guardian-user', 'active', NULL)").run();
  assert.equal(resolveClassroomAudience(db, "class-1", "teacher-user"), "staff");
  assert.equal(resolveClassroomAudience(db, "class-1", "student-user"), "student");
  assert.equal(resolveClassroomAudience(db, "class-1", "guardian-user"), "guardian");
  assert.equal(resolveClassroomAudience(db, "class-1", "unknown"), null);
  assert.deepEqual(listAccessibleClassroomIds(db, "teacher-user"), ["class-1"]);
  db.close();
});

test("links email invitations once and retains explicit organization authority", () => {
  const db = database();
  db.prepare("INSERT INTO score_organization_members VALUES ('invite-org', 'org-1', NULL, 'person@example.test', 'teacher', 'invited', NULL, '2026-01-01', NULL)").run();
  db.prepare("INSERT INTO score_classroom_staff VALUES ('invite-class', 'class-1', NULL, 'person@example.test', 'assistant', 'invited', NULL, '2026-01-01', NULL)").run();
  assert.deepEqual(linkEducationInvitationsByEmail(db, "person-user", "PERSON@example.test"), { organizationMemberships: 1, classroomStaff: 1 });
  assert.deepEqual(linkEducationInvitationsByEmail(db, "other-user", "person@example.test"), { organizationMemberships: 0, classroomStaff: 0 });
  assert.equal(resolveOrganizationRole(db, "org-1", "person-user"), "teacher");
  assert.equal(canAdminOrganization(resolveOrganizationRole(db, "org-1", "person-user")), false);
  assert.equal(resolveClassroomAccess(db, "class-1", "person-user")?.role, "assistant");
  db.close();
});
