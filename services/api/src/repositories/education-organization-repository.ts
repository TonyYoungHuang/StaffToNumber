import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { createId } from "../lib/auth.js";

export type OrganizationMemberRole = "admin" | "teacher" | "assistant" | "observer";
export type ClassroomStaffRole = "teacher" | "assistant" | "observer";

export function createEducationOrganization(db: RuntimeDatabaseLike, input: { ownerUserId: string; name: string }) {
  const id = createId();
  const now = new Date().toISOString();
  const slugBase = input.name.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 40) || "organization";
  const owner = db.prepare("SELECT email FROM users WHERE id = ?").get(input.ownerUserId) as { email: string } | undefined;
  if (!owner) return null;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO score_organizations (id, owner_user_id, name, slug, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, NULL)")
      .run(id, input.ownerUserId, input.name, `${slugBase}-${id.slice(0, 8)}`, now, now);
    db.prepare(`
      INSERT INTO score_organization_members (
        id, organization_id, user_id, invited_email, display_name, role, status,
        invited_by_user_id, created_at, updated_at, accepted_at, removed_at
      ) VALUES (?, ?, ?, ?, ?, 'owner', 'active', ?, ?, ?, ?, NULL)
    `).run(createId(), id, input.ownerUserId, owner.email.toLocaleLowerCase(), owner.email, input.ownerUserId, now, now, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return findEducationOrganization(db, id);
}
export function findEducationOrganization(db: RuntimeDatabaseLike, organizationId: string) {
  return db.prepare("SELECT id, owner_user_id AS ownerUserId, name, slug, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt FROM score_organizations WHERE id = ?")
    .get(organizationId) as Record<string, unknown> | undefined;
}

export function listEducationOrganizations(db: RuntimeDatabaseLike, userId: string) {
  const organizations = db.prepare(`
    SELECT DISTINCT organizations.id, organizations.owner_user_id AS ownerUserId, organizations.name,
           organizations.slug, organizations.created_at AS createdAt, organizations.updated_at AS updatedAt
    FROM score_organizations organizations
    LEFT JOIN score_organization_members members
      ON members.organization_id = organizations.id AND members.user_id = ? AND members.status = 'active' AND members.removed_at IS NULL
    WHERE organizations.archived_at IS NULL AND (organizations.owner_user_id = ? OR members.id IS NOT NULL)
    ORDER BY lower(organizations.name)
  `).all(userId, userId) as Array<Record<string, unknown> & { id: string }>;
  return organizations.map((organization) => ({
    ...organization,
    campuses: db.prepare(`
      SELECT id, organization_id AS organizationId, name, code, timezone, created_at AS createdAt, updated_at AS updatedAt
      FROM score_organization_campuses WHERE organization_id = ? AND archived_at IS NULL ORDER BY lower(name)
    `).all(organization.id),
    members: db.prepare(`
      SELECT id, organization_id AS organizationId, user_id AS userId, invited_email AS invitedEmail,
             display_name AS displayName, role, status, created_at AS createdAt, accepted_at AS acceptedAt
      FROM score_organization_members WHERE organization_id = ? AND removed_at IS NULL ORDER BY role, lower(display_name)
    `).all(organization.id),
  }));
}

export function createEducationCampus(db: RuntimeDatabaseLike, input: { organizationId: string; name: string; code?: string | null; timezone: string }) {
  const id = createId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO score_organization_campuses (id, organization_id, name, code, timezone, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(id, input.organizationId, input.name, input.code ?? null, input.timezone, now, now);
  return db.prepare("SELECT id, organization_id AS organizationId, name, code, timezone, created_at AS createdAt, updated_at AS updatedAt FROM score_organization_campuses WHERE id = ?").get(id);
}

export function inviteEducationOrganizationMember(db: RuntimeDatabaseLike, input: { organizationId: string; invitedByUserId: string; email: string; displayName: string; role: OrganizationMemberRole }) {
  const email = input.email.trim().toLocaleLowerCase();
  const existing = db.prepare("SELECT role FROM score_organization_members WHERE organization_id = ? AND invited_email = ?")
    .get(input.organizationId, email) as { role: string } | undefined;
  if (existing?.role === "owner") throw new Error("Organization owner role cannot be changed.");
  const user = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email) as { id: string } | undefined;
  const now = new Date().toISOString();
  const id = createId();
  db.prepare(`
    INSERT INTO score_organization_members (
      id, organization_id, user_id, invited_email, display_name, role, status,
      invited_by_user_id, created_at, updated_at, accepted_at, removed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(organization_id, invited_email) DO UPDATE SET
      user_id = excluded.user_id, display_name = excluded.display_name, role = excluded.role,
      status = excluded.status, invited_by_user_id = excluded.invited_by_user_id,
      updated_at = excluded.updated_at, accepted_at = excluded.accepted_at, removed_at = NULL
  `).run(
    id, input.organizationId, user?.id ?? null, email, input.displayName, input.role,
    user ? "active" : "invited", input.invitedByUserId, now, now, user ? now : null,
  );
  return db.prepare("SELECT id, organization_id AS organizationId, user_id AS userId, invited_email AS invitedEmail, display_name AS displayName, role, status, accepted_at AS acceptedAt FROM score_organization_members WHERE organization_id = ? AND invited_email = ?")
    .get(input.organizationId, email);
}

export function removeEducationOrganizationMember(db: RuntimeDatabaseLike, input: { organizationId: string; memberId: string }) {
  const now = new Date().toISOString();
  return db.prepare("UPDATE score_organization_members SET status = 'removed', removed_at = ?, updated_at = ? WHERE id = ? AND organization_id = ? AND role != 'owner' AND removed_at IS NULL")
    .run(now, now, input.memberId, input.organizationId).changes > 0;
}

export function listClassroomStaff(db: RuntimeDatabaseLike, classroomId: string) {
  return db.prepare(`
    SELECT id, classroom_id AS classroomId, user_id AS userId, invited_email AS invitedEmail,
           display_name AS displayName, role, status, created_at AS createdAt, accepted_at AS acceptedAt
    FROM score_classroom_staff WHERE classroom_id = ? AND removed_at IS NULL ORDER BY role, lower(display_name)
  `).all(classroomId);
}

export function inviteClassroomStaff(db: RuntimeDatabaseLike, input: { classroomId: string; invitedByUserId: string; email: string; displayName: string; role: ClassroomStaffRole }) {
  const email = input.email.trim().toLocaleLowerCase();
  const owner = db.prepare(`
    SELECT users.email
    FROM score_classrooms classrooms
    JOIN users ON users.id = classrooms.owner_user_id
    WHERE classrooms.id = ?
  `).get(input.classroomId) as { email: string } | undefined;
  if (owner?.email.toLocaleLowerCase() === email) throw new Error("Classroom owner cannot be assigned a staff role.");
  const user = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email) as { id: string } | undefined;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO score_classroom_staff (
      id, classroom_id, user_id, invited_email, display_name, role, status,
      invited_by_user_id, created_at, updated_at, accepted_at, removed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(classroom_id, invited_email) DO UPDATE SET
      user_id = excluded.user_id, display_name = excluded.display_name, role = excluded.role,
      status = excluded.status, invited_by_user_id = excluded.invited_by_user_id,
      updated_at = excluded.updated_at, accepted_at = excluded.accepted_at, removed_at = NULL
  `).run(
    createId(), input.classroomId, user?.id ?? null, email, input.displayName, input.role,
    user ? "active" : "invited", input.invitedByUserId, now, now, user ? now : null,
  );
  return listClassroomStaff(db, input.classroomId).find((member: unknown) => (member as { invitedEmail: string }).invitedEmail === email)!;
}

export function removeClassroomStaff(db: RuntimeDatabaseLike, input: { classroomId: string; staffId: string }) {
  const now = new Date().toISOString();
  return db.prepare("UPDATE score_classroom_staff SET status = 'removed', removed_at = ?, updated_at = ? WHERE id = ? AND classroom_id = ? AND removed_at IS NULL")
    .run(now, now, input.staffId, input.classroomId).changes > 0;
}
