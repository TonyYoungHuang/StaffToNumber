import type { ActivationCodeStatus, EntitlementStatus } from "@score/shared";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { addDays, nowIso } from "../lib/time.js";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
};

type ActivationCodeRow = {
  id: string;
  code: string;
  status: ActivationCodeStatus;
  entitlement_days: number;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
};

type EntitlementRow = {
  id: string;
  user_id: string;
  activation_code_id: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export function createUser(email: string, passwordHash: string, passwordSalt: string) {
  const timestamp = nowIso();
  const id = createId();

  db.prepare(
    `
      INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(id, email, passwordHash, passwordSalt, timestamp, timestamp);

  return findUserById(id);
}

export function findUserByEmail(email: string) {
  return db
    .prepare("SELECT id, email, password_hash, password_salt, created_at, updated_at FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;
}

export function findUserById(id: string) {
  return db
    .prepare("SELECT id, email, password_hash, password_salt, created_at, updated_at FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
}

export function createSession(userId: string, token: string, sessionDays: number) {
  const timestamp = nowIso();
  const id = createId();
  const expiresAt = addDays(new Date(), sessionDays).toISOString();

  db.prepare(
    `
      INSERT INTO sessions (id, user_id, token, expires_at, created_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, NULL)
    `,
  ).run(id, userId, token, expiresAt, timestamp);

  return db.prepare("SELECT id, user_id, token, expires_at, created_at, revoked_at FROM sessions WHERE id = ?").get(id) as
    | SessionRow
    | undefined;
}

export function revokeSession(token: string) {
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE token = ? AND revoked_at IS NULL").run(nowIso(), token);
}

export function findActiveSessionByToken(token: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, token, expires_at, created_at, revoked_at
        FROM sessions
        WHERE token = ?
          AND revoked_at IS NULL
      `,
    )
    .get(token) as SessionRow | undefined;
}

export function createActivationCode(code: string, entitlementDays: number) {
  const timestamp = nowIso();
  const id = createId();

  db.prepare(
    `
      INSERT INTO activation_codes (id, code, status, entitlement_days, created_at, redeemed_at, redeemed_by_user_id)
      VALUES (?, ?, 'available', ?, ?, NULL, NULL)
    `,
  ).run(id, code, entitlementDays, timestamp);
}

export function findActivationCodeByCode(code: string) {
  return db
    .prepare(
      `
        SELECT id, code, status, entitlement_days, created_at, redeemed_at, redeemed_by_user_id
        FROM activation_codes
        WHERE code = ?
      `,
    )
    .get(code) as ActivationCodeRow | undefined;
}

export function ensureActivationCode(code: string, entitlementDays: number) {
  const existing = findActivationCodeByCode(code);
  if (!existing) {
    createActivationCode(code, entitlementDays);
  }
}

export function findLatestEntitlementByUserId(userId: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, activation_code_id, starts_at, ends_at, created_at
        FROM user_entitlements
        WHERE user_id = ?
        ORDER BY datetime(ends_at) DESC
        LIMIT 1
      `,
    )
    .get(userId) as EntitlementRow | undefined;
}

export function redeemActivationCode(userId: string, code: string) {
  const timestamp = nowIso();
  const codeRow = findActivationCodeByCode(code);

  if (!codeRow) {
    return { ok: false as const, reason: "not_found" };
  }

  if (codeRow.status !== "available") {
    return { ok: false as const, reason: "unavailable" };
  }

  const latestEntitlement = findLatestEntitlementByUserId(userId);
  const now = new Date();
  const startsAt =
    latestEntitlement && new Date(latestEntitlement.ends_at) > now ? new Date(latestEntitlement.ends_at) : now;
  const endsAt = addDays(startsAt, codeRow.entitlement_days).toISOString();
  const entitlementId = createId();

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        UPDATE activation_codes
        SET status = 'redeemed',
            redeemed_at = ?,
            redeemed_by_user_id = ?
        WHERE id = ?
      `,
    ).run(timestamp, userId, codeRow.id);

    db.prepare(
      `
        INSERT INTO user_entitlements (id, user_id, activation_code_id, starts_at, ends_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(entitlementId, userId, codeRow.id, startsAt.toISOString(), endsAt, timestamp);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    ok: true as const,
    entitlement: findLatestEntitlementByUserId(userId),
  };
}

export function getUserProfile(userId: string) {
  const user = findUserById(userId);
  if (!user) {
    return undefined;
  }

  const entitlement = findLatestEntitlementByUserId(userId);
  const now = new Date();
  let entitlementStatus: EntitlementStatus = "inactive";

  if (entitlement) {
    entitlementStatus = new Date(entitlement.ends_at) > now ? "active" : "expired";
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    entitlement: entitlement
      ? {
          status: entitlementStatus,
          startsAt: entitlement.starts_at,
          endsAt: entitlement.ends_at,
        }
      : {
          status: entitlementStatus,
          startsAt: null,
          endsAt: null,
        },
  };
}
