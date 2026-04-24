import { randomBytes } from "node:crypto";
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
  batch_id: string | null;
  note: string | null;
  expires_at: string | null;
  created_by: string | null;
  disabled_at: string | null;
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

type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  requested_email: string;
  token: string;
  expires_at: string;
  created_at: string;
  consumed_at: string | null;
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

export function revokeSessionsByUserId(userId: string) {
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(nowIso(), userId);
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

export function createActivationCode(input: {
  code: string;
  entitlementDays: number;
  batchId?: string | null;
  note?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
}) {
  const timestamp = nowIso();
  const id = createId();

  db.prepare(
    `
      INSERT INTO activation_codes (
        id, code, status, entitlement_days, created_at, batch_id, note, expires_at, created_by, disabled_at, redeemed_at, redeemed_by_user_id
      )
      VALUES (?, ?, 'available', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
    `,
  ).run(id, input.code, input.entitlementDays, timestamp, input.batchId ?? null, input.note ?? null, input.expiresAt ?? null, input.createdBy ?? null);
}

export function findActivationCodeByCode(code: string) {
  return db
    .prepare(
      `
        SELECT id, code, status, entitlement_days, created_at, redeemed_at, redeemed_by_user_id
               , batch_id, note, expires_at, created_by, disabled_at
        FROM activation_codes
        WHERE code = ?
      `,
    )
    .get(code) as ActivationCodeRow | undefined;
}

export function findActivationCodeById(id: string) {
  return db
    .prepare(
      `
        SELECT id, code, status, entitlement_days, created_at, redeemed_at, redeemed_by_user_id
               , batch_id, note, expires_at, created_by, disabled_at
        FROM activation_codes
        WHERE id = ?
      `,
    )
    .get(id) as ActivationCodeRow | undefined;
}

export function ensureActivationCode(code: string, entitlementDays: number) {
  const existing = findActivationCodeByCode(code);
  if (!existing) {
    createActivationCode({ code, entitlementDays });
  }
}

export function generateActivationCodes(input: {
  quantity: number;
  entitlementDays: number;
  prefix?: string;
  note?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
}) {
  const quantity = Math.max(1, Math.min(input.quantity, 200));
  const batchId = createId();
  const codes: ActivationCodeRow[] = [];

  for (let index = 0; index < quantity; index += 1) {
    const code = createUniqueActivationCode(input.prefix);
    createActivationCode({
      code,
      entitlementDays: input.entitlementDays,
      batchId,
      note: input.note,
      expiresAt: input.expiresAt ?? null,
      createdBy: input.createdBy ?? null,
    });

    const created = findActivationCodeByCode(code);
    if (created) {
      codes.push(created);
    }
  }

  return {
    batchId,
    codes,
  };
}

export function issueActivationCode(input: {
  entitlementDays: number;
  prefix?: string;
  note?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
}) {
  const code = createUniqueActivationCode(input.prefix);

  createActivationCode({
    code,
    entitlementDays: input.entitlementDays,
    note: input.note ?? null,
    expiresAt: input.expiresAt ?? null,
    createdBy: input.createdBy ?? null,
  });

  return findActivationCodeByCode(code);
}

export function listActivationCodes(limit = 100) {
  return db
    .prepare(
      `
        SELECT id, code, status, entitlement_days, created_at, batch_id, note, expires_at, created_by, disabled_at, redeemed_at, redeemed_by_user_id
        FROM activation_codes
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `,
    )
    .all(Math.max(1, Math.min(limit, 200))) as ActivationCodeRow[];
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

  if (codeRow.expires_at && new Date(codeRow.expires_at) <= new Date()) {
    return { ok: false as const, reason: "expired" };
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

export function createPasswordResetToken(input: {
  userId: string;
  requestedEmail: string;
  expiresAt: string;
}) {
  const timestamp = nowIso();
  const id = createId();
  const token = createId().replace(/-/g, "") + createId().replace(/-/g, "");

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        UPDATE password_reset_tokens
        SET consumed_at = ?
        WHERE user_id = ?
          AND consumed_at IS NULL
      `,
    ).run(timestamp, input.userId);

    db.prepare(
      `
        INSERT INTO password_reset_tokens (id, user_id, requested_email, token, expires_at, created_at, consumed_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
      `,
    ).run(id, input.userId, input.requestedEmail, token, input.expiresAt, timestamp);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findActivePasswordResetToken(token);
}

export function findActivePasswordResetToken(token: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, requested_email, token, expires_at, created_at, consumed_at
        FROM password_reset_tokens
        WHERE token = ?
          AND consumed_at IS NULL
          AND datetime(expires_at) > datetime('now')
      `,
    )
    .get(token) as PasswordResetTokenRow | undefined;
}

export function completePasswordReset(input: {
  tokenId: string;
  userId: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  const timestamp = nowIso();

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        UPDATE users
        SET password_hash = ?,
            password_salt = ?,
            updated_at = ?
        WHERE id = ?
      `,
    ).run(input.passwordHash, input.passwordSalt, timestamp, input.userId);

    db.prepare(
      `
        UPDATE password_reset_tokens
        SET consumed_at = ?
        WHERE id = ?
          AND consumed_at IS NULL
      `,
    ).run(timestamp, input.tokenId);

    db.prepare(
      `
        UPDATE sessions
        SET revoked_at = ?
        WHERE user_id = ?
          AND revoked_at IS NULL
      `,
    ).run(timestamp, input.userId);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function mapActivationCodeForAdmin(codeRow: ActivationCodeRow) {
  return {
    id: codeRow.id,
    code: codeRow.code,
    status: codeRow.status,
    entitlementDays: codeRow.entitlement_days,
    createdAt: codeRow.created_at,
    batchId: codeRow.batch_id,
    note: codeRow.note,
    expiresAt: codeRow.expires_at,
    createdBy: codeRow.created_by,
    disabledAt: codeRow.disabled_at,
    redeemedAt: codeRow.redeemed_at,
    redeemedByUserId: codeRow.redeemed_by_user_id,
  };
}

function createUniqueActivationCode(prefix?: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = buildActivationCode(prefix);
    if (!findActivationCodeByCode(code)) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique activation code.");
}

function buildActivationCode(prefix?: string) {
  const sanitizedPrefix = prefix
    ?.trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);

  const random = randomBytes(5).toString("hex").toUpperCase();
  const segments = [random.slice(0, 4), random.slice(4, 8), random.slice(8, 10)];

  return sanitizedPrefix ? `${sanitizedPrefix}-${segments.join("-")}` : segments.join("-");
}
