import type { RuntimeDatabaseLike } from "@score/runtime-database";

export type ClassroomAccessRole = "owner" | "organization_admin" | "teacher" | "assistant" | "observer";
export type OrganizationRole = "owner" | "admin" | "teacher" | "assistant" | "observer";

export type ClassroomAccess = {
  classroomId: string;
  role: ClassroomAccessRole;
  canRead: true;
  canOperate: boolean;
  canAdmin: boolean;
};

export function linkEducationInvitationsByEmail(db: RuntimeDatabaseLike, userId: string, email: string) {
  const normalized = email.trim().toLocaleLowerCase();
  const now = new Date().toISOString();
  const organizationMemberships = db.prepare(`
    UPDATE score_organization_members
    SET user_id = ?, status = 'active', accepted_at = coalesce(accepted_at, ?), updated_at = ?
    WHERE lower(invited_email) = ? AND status = 'invited' AND (user_id IS NULL OR user_id = ?)
  `).run(userId, now, now, normalized, userId).changes;
  const classroomStaff = db.prepare(`
    UPDATE score_classroom_staff
    SET user_id = ?, status = 'active', accepted_at = coalesce(accepted_at, ?), updated_at = ?
    WHERE lower(invited_email) = ? AND status = 'invited' AND (user_id IS NULL OR user_id = ?)
  `).run(userId, now, now, normalized, userId).changes;
  return { organizationMemberships, classroomStaff };
}

export function resolveOrganizationRole(db: RuntimeDatabaseLike, organizationId: string, userId: string): OrganizationRole | null {
  const organization = db.prepare("SELECT owner_user_id FROM score_organizations WHERE id = ? AND archived_at IS NULL").get(organizationId) as { owner_user_id: string } | undefined;
  if (!organization) return null;
  if (organization.owner_user_id === userId) return "owner";
  const membership = db.prepare(`
    SELECT role FROM score_organization_members
    WHERE organization_id = ? AND user_id = ? AND status = 'active' AND removed_at IS NULL
  `).get(organizationId, userId) as { role: OrganizationRole } | undefined;
  return membership?.role ?? null;
}

export function canAdminOrganization(role: OrganizationRole | null) {
  return role === "owner" || role === "admin";
}

export function resolveClassroomAccess(db: RuntimeDatabaseLike, classroomId: string, userId: string): ClassroomAccess | null {
  const classroom = db.prepare(`
    SELECT owner_user_id, organization_id FROM score_classrooms
    WHERE id = ? AND archived_at IS NULL
  `).get(classroomId) as { owner_user_id: string; organization_id: string | null } | undefined;
  if (!classroom) return null;
  if (classroom.owner_user_id === userId) return access(classroomId, "owner");
  if (classroom.organization_id && canAdminOrganization(resolveOrganizationRole(db, classroom.organization_id, userId))) {
    return access(classroomId, "organization_admin");
  }
  const staff = db.prepare(`
    SELECT role FROM score_classroom_staff
    WHERE classroom_id = ? AND user_id = ? AND status = 'active' AND removed_at IS NULL
  `).get(classroomId, userId) as { role: "teacher" | "assistant" | "observer" } | undefined;
  return staff ? access(classroomId, staff.role) : null;
}

export function listAccessibleClassroomIds(db: RuntimeDatabaseLike, userId: string) {
  return (db.prepare(`
    SELECT DISTINCT classrooms.id
    FROM score_classrooms classrooms
    LEFT JOIN score_classroom_staff staff
      ON staff.classroom_id = classrooms.id AND staff.user_id = ? AND staff.status = 'active' AND staff.removed_at IS NULL
    LEFT JOIN score_organizations organizations
      ON organizations.id = classrooms.organization_id AND organizations.archived_at IS NULL
    LEFT JOIN score_organization_members members
      ON members.organization_id = classrooms.organization_id AND members.user_id = ?
      AND members.status = 'active' AND members.removed_at IS NULL AND members.role = 'admin'
    WHERE classrooms.archived_at IS NULL
      AND (classrooms.owner_user_id = ? OR staff.id IS NOT NULL OR organizations.owner_user_id = ? OR members.id IS NOT NULL)
    ORDER BY lower(classrooms.name), classrooms.id
  `).all(userId, userId, userId, userId) as Array<{ id: string }>).map((row) => row.id);
}

export function resolveClassroomAudience(db: RuntimeDatabaseLike, classroomId: string, userId: string) {
  if (resolveClassroomAccess(db, classroomId, userId)) return "staff" as const;
  const student = db.prepare(`
    SELECT id FROM score_classroom_students
    WHERE classroom_id = ? AND user_id = ? AND status = 'active'
  `).get(classroomId, userId) as { id: string } | undefined;
  if (student) return "student" as const;
  const guardian = db.prepare(`
    SELECT guardians.id
    FROM score_student_guardians guardians
    JOIN score_classroom_students students ON students.id = guardians.student_id
    WHERE students.classroom_id = ? AND students.status = 'active'
      AND guardians.user_id = ? AND guardians.status = 'active' AND guardians.removed_at IS NULL
  `).get(classroomId, userId) as { id: string } | undefined;
  return guardian ? "guardian" as const : null;
}

function access(classroomId: string, role: ClassroomAccessRole): ClassroomAccess {
  return {
    classroomId,
    role,
    canRead: true,
    canOperate: role !== "observer",
    canAdmin: role === "owner" || role === "organization_admin",
  };
}
