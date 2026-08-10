import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  createEducationCampus,
  createEducationOrganization,
  inviteClassroomStaff,
  inviteEducationOrganizationMember,
  listClassroomStaff,
  listEducationOrganizations,
  removeClassroomStaff,
  removeEducationOrganizationMember,
} from "./education-organization-repository.js";

function createOrganizationDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, account_status TEXT NOT NULL DEFAULT 'active');
    CREATE TABLE score_organizations (
      id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT
    );
    CREATE TABLE score_organization_campuses (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL, code TEXT, timezone TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT
    );
    CREATE TABLE score_organization_members (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT, invited_email TEXT NOT NULL,
      display_name TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, invited_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, accepted_at TEXT, removed_at TEXT,
      UNIQUE(organization_id, invited_email)
    );
    CREATE TABLE score_classrooms (
      id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, name TEXT NOT NULL, archived_at TEXT
    );
    CREATE TABLE score_classroom_staff (
      id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, user_id TEXT, invited_email TEXT NOT NULL,
      display_name TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, invited_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, accepted_at TEXT, removed_at TEXT,
      UNIQUE(classroom_id, invited_email)
    );
  `);
  db.prepare("INSERT INTO users VALUES ('owner', 'owner@example.test', 'active')").run();
  db.prepare("INSERT INTO score_classrooms VALUES ('class-1', 'owner', 'Choir', NULL)").run();
  return db;
}

test("organization and classroom invitations preserve owner roles and activate registered members", () => {
  const db = createOrganizationDb();
  const organization = createEducationOrganization(db, { ownerUserId: "owner", name: "Music Academy" }) as { id: string };
  assert.ok(organization.id);
  assert.equal((listEducationOrganizations(db, "owner")[0].members as unknown[]).length, 1);
  assert.throws(
    () => inviteEducationOrganizationMember(db, { organizationId: organization.id, invitedByUserId: "owner", email: "owner@example.test", displayName: "Owner", role: "observer" }),
    /owner role cannot be changed/u,
  );

  const campus = createEducationCampus(db, { organizationId: organization.id, name: "Downtown", code: "DT", timezone: "Asia/Shanghai" }) as { name: string };
  assert.equal(campus.name, "Downtown");
  const invited = inviteEducationOrganizationMember(db, { organizationId: organization.id, invitedByUserId: "owner", email: "admin@example.test", displayName: "Admin", role: "admin" }) as { status: string };
  assert.equal(invited.status, "invited");
  db.prepare("INSERT INTO users VALUES ('admin', 'admin@example.test', 'active')").run();
  const active = inviteEducationOrganizationMember(db, { organizationId: organization.id, invitedByUserId: "owner", email: "admin@example.test", displayName: "Admin", role: "admin" }) as { id: string; status: string };
  assert.equal(active.status, "active");
  assert.equal(removeEducationOrganizationMember(db, { organizationId: organization.id, memberId: active.id }), true);

  assert.throws(
    () => inviteClassroomStaff(db, { classroomId: "class-1", invitedByUserId: "owner", email: "owner@example.test", displayName: "Owner", role: "assistant" }),
    /owner cannot be assigned/u,
  );
  const staff = inviteClassroomStaff(db, { classroomId: "class-1", invitedByUserId: "owner", email: "assistant@example.test", displayName: "Assistant", role: "assistant" }) as { id: string; status: string };
  assert.equal(staff.status, "invited");
  assert.equal(listClassroomStaff(db, "class-1").length, 1);
  assert.equal(removeClassroomStaff(db, { classroomId: "class-1", staffId: staff.id }), true);
  assert.equal(listClassroomStaff(db, "class-1").length, 0);
  db.close();
});
