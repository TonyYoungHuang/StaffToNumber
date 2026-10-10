import { listScorePasses } from "../lib/score-passes.js";
import { randomBytes } from "node:crypto";
import { isShopCreditPackCode, type ActivationCodeStatus, type EntitlementStatus, type ShopActivationPlanCode } from "@score/shared";
import { grantPrepaidCredits, prepaidCreditBalance } from "../lib/prepaid-credits.js";
import { db } from "../db.js";
import { createId, createSalt, createToken, hashPassword } from "../lib/auth.js";
import { addDays, nowIso } from "../lib/time.js";
import { findActiveSubscriptionEntitlement } from "./billing-repository.js";
import { addPurchaseMonths, findActiveOneTimePurchase } from "./one-time-purchase-repository.js";
import { getFreeTrialAccess } from "../lib/free-trial.js";
import { normalizeActivationCode } from "../lib/activation-code.js";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
  account_status: "active" | "deletion_pending";
  deletion_requested_at: string | null;
  scheduled_deletion_at: string | null;
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
  login_enabled_at: string | null;
  plan_code: ShopActivationPlanCode | null;
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
    .prepare("SELECT id, email, password_hash, password_salt, created_at, updated_at, account_status, deletion_requested_at, scheduled_deletion_at FROM users WHERE lower(email) = lower(?)")
    .get(email.trim()) as UserRow | undefined;
}

export function findUserById(id: string) {
  return db
    .prepare("SELECT id, email, password_hash, password_salt, created_at, updated_at, account_status, deletion_requested_at, scheduled_deletion_at FROM users WHERE id = ?")
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
  planCode?: ShopActivationPlanCode | null;
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
        id, code, status, entitlement_days, created_at, batch_id, note, expires_at, created_by, disabled_at, redeemed_at, redeemed_by_user_id, plan_code
      )
      VALUES (?, ?, 'available', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)
    `,
  ).run(id, input.code, input.planCode === "single-score" || isShopCreditPackCode(input.planCode) ? 0 : input.entitlementDays, timestamp, input.batchId ?? null, input.note ?? null, input.expiresAt ?? null, input.createdBy ?? null, input.planCode ?? null);
}

export function findActivationCodeByCode(code: string) {
  return db
    .prepare(
      `
        SELECT id, code, status, entitlement_days, created_at, redeemed_at, redeemed_by_user_id
               , batch_id, note, expires_at, created_by, disabled_at, plan_code, login_enabled_at
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
               , batch_id, note, expires_at, created_by, disabled_at, plan_code, login_enabled_at
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
  planCode?: ShopActivationPlanCode;
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

  db.exec("BEGIN");
  try {
  for (let index = 0; index < quantity; index += 1) {
    const code = createUniqueActivationCode(input.prefix);
    createActivationCode({
      code,
      planCode: input.planCode,
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
  db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }

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

export function listActivationCodes(limit = 100, search = "") {
  return db
    .prepare(
      `
        SELECT id, code, status, entitlement_days, created_at, batch_id, note, expires_at, created_by, disabled_at, redeemed_at, redeemed_by_user_id, plan_code, login_enabled_at
        FROM activation_codes
        WHERE lower(code || ' ' || COALESCE(note, '') || ' ' || COALESCE(batch_id, '')) LIKE lower(?) ESCAPE '!'
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `,
    )
    .all(`%${search.replace(/[!%_]/g, "!$&")}%`, Math.max(1, Math.min(limit, 200))) as ActivationCodeRow[];
}

export function disableUnusedActivationCode(id: string) {
  const result = db.prepare("UPDATE activation_codes SET status = 'disabled', disabled_at = ? WHERE id = ? AND status = 'available'").run(nowIso(), id);
  return Number(result.changes) === 1;
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

// Call only inside a transaction. Lock the code before the account consistently.
function lockActivationCode(code: string) {
  const row = findActivationCodeByCode(code) ?? findActivationCodeByCode(normalizeActivationCode(code));
  if (!row || db.primary !== "postgres") return row;
  db.prepare("SELECT id FROM activation_codes WHERE id = ? FOR UPDATE").get(row.id);
  return findActivationCodeById(row.id);
}

export function hasActivationCodeLogin(userId: string) {
  return Boolean(db.prepare("SELECT id FROM activation_codes WHERE redeemed_by_user_id = ? AND login_enabled_at IS NOT NULL AND status = 'redeemed' LIMIT 1").get(userId));
}

function redeemInTransaction(userId: string, codeRow: ActivationCodeRow | undefined) {
  if (!codeRow) return { ok: false as const, reason: "not_found" };
  if (codeRow.status === "disabled") return { ok: false as const, reason: "disabled" };
  if (codeRow.status === "redeemed" && codeRow.redeemed_by_user_id === userId) {
    if (codeRow.plan_code === "single-score" || isShopCreditPackCode(codeRow.plan_code)) {
      return { ok: true as const, entitlement: shopCreditEntitlement(userId, codeRow), alreadyRedeemed: true };
    }
    const entitlement = db.prepare("SELECT id, user_id, activation_code_id, starts_at, ends_at, created_at FROM user_entitlements WHERE activation_code_id = ? AND user_id = ?").get(codeRow.id, userId) as EntitlementRow | undefined;
    if (entitlement) return { ok: true as const, entitlement, alreadyRedeemed: true };
  }
  if (codeRow.status !== "available") return { ok: false as const, reason: "unavailable" };
  if (codeRow.expires_at && new Date(codeRow.expires_at) <= new Date()) return { ok: false as const, reason: "expired" };
  if (db.primary === "postgres") db.prepare("SELECT id FROM users WHERE id = ? FOR UPDATE").get(userId);
  if (findUserById(userId)?.account_status !== "active") return { ok: false as const, reason: "account_unavailable" };
  const timestamp = nowIso(), entitlementId = createId();
  if (codeRow.plan_code === "single-score" || isShopCreditPackCode(codeRow.plan_code)) {
    const claimed = db.prepare(`UPDATE activation_codes SET status = 'redeemed', redeemed_at = ?, redeemed_by_user_id = ?
      WHERE id = ? AND status = 'available'`).run(timestamp, userId, codeRow.id);
    if (Number(claimed.changes) !== 1) return { ok: false as const, reason: "unavailable" };
    if (isShopCreditPackCode(codeRow.plan_code)) {
      grantPrepaidCredits(userId, codeRow.id, codeRow.plan_code, timestamp);
    } else {
      const purchaseId = `activation:${codeRow.id}`;
      db.prepare(`INSERT INTO billing_one_time_purchases (id, user_id, plan_code, plan_ref, status, starts_at, paid_at, created_at, updated_at)
        VALUES (?, ?, 'single-score', 'shop-activation', 'active', ?, ?, ?, ?)`)
        .run(purchaseId, userId, timestamp, timestamp, timestamp, timestamp);
      db.prepare(`INSERT INTO score_passes (purchase_id, document_id, credit_limit, max_pages, created_at)
        VALUES (?, NULL, 10, 5, ?)`).run(purchaseId, timestamp);
    }
    return { ok: true as const, entitlement: shopCreditEntitlement(userId, { ...codeRow, redeemed_at: timestamp }), alreadyRedeemed: false };
  }
  const tier = codeRow.plan_code?.startsWith("converter-pro") ? "converter-pro" : "starter";
  const latestEntitlement = db.prepare(`SELECT e.ends_at FROM user_entitlements e
    JOIN activation_codes c ON c.id = e.activation_code_id
    WHERE e.user_id = ? AND (CASE WHEN c.plan_code LIKE 'converter-pro-%' THEN 'converter-pro' ELSE 'starter' END) = ?
    ORDER BY datetime(e.ends_at) DESC LIMIT 1`).get(userId, tier) as { ends_at: string } | undefined;
  const now = new Date();
  const startsAt = latestEntitlement && new Date(latestEntitlement.ends_at) > now ? new Date(latestEntitlement.ends_at) : now;
  const endsAt = codeRow.plan_code
    ? addPurchaseMonths(startsAt.toISOString(), codeRow.plan_code.endsWith("annual") ? 12 : 1)
    : addDays(startsAt, codeRow.entitlement_days).toISOString();
  const claimed = db.prepare(`UPDATE activation_codes SET status = 'redeemed', redeemed_at = ?, redeemed_by_user_id = ?
    WHERE id = ? AND status = 'available'`).run(timestamp, userId, codeRow.id);
  if (Number(claimed.changes) !== 1) return { ok: false as const, reason: "unavailable" };
  db.prepare(`INSERT INTO user_entitlements (id, user_id, activation_code_id, starts_at, ends_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run(entitlementId, userId, codeRow.id, startsAt.toISOString(), endsAt, timestamp);
  return { ok: true as const, entitlement: db.prepare("SELECT id, user_id, activation_code_id, starts_at, ends_at, created_at FROM user_entitlements WHERE id = ?").get(entitlementId) as EntitlementRow, alreadyRedeemed: false };
}

function shopCreditEntitlement(userId: string, codeRow: ActivationCodeRow) {
  return { id: codeRow.id, user_id: userId, activation_code_id: codeRow.id, starts_at: codeRow.redeemed_at!, ends_at: null, created_at: codeRow.redeemed_at!, plan_code: codeRow.plan_code };
}

export function redeemActivationCode(userId: string, code: string) {
  db.exec("BEGIN");
  try {
    const row = lockActivationCode(code);
    const result = redeemInTransaction(userId, row);
    // Renewal codes add time to the same account, but do not become additional
    // login credentials automatically. The buyer continues using the original key.
    db.exec("COMMIT");
    return result;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function signInWithActivationCode(code: string) {
  db.exec("BEGIN");
  try {
    const row = lockActivationCode(code);
    if (!row || row.status === "disabled") {
      db.exec("ROLLBACK");
      return { ok: false as const, reason: row ? "disabled" : "not_found" };
    }
    if (row.status === "redeemed") {
      const user = row.redeemed_by_user_id ? findUserById(row.redeemed_by_user_id) : undefined;
      db.exec("COMMIT");
      if (!row.login_enabled_at) return { ok: false as const, reason: "login_not_enabled" };
      if (!user || user.account_status !== "active") return { ok: false as const, reason: "account_unavailable" };
      return { ok: true as const, userId: user.id, isNewUser: false };
    }
    if (row.status !== "available" || (row.expires_at && new Date(row.expires_at) <= new Date())) {
      db.exec("ROLLBACK");
      return { ok: false as const, reason: "expired" };
    }
    // The internal address is never a customer prerequisite or a deliverable mailbox.
    const salt = createSalt();
    const user = createUser(`${createId()}@activation.scoretransposer.invalid`, hashPassword(createToken(), salt), salt)!;
    const result = redeemInTransaction(user.id, row);
    if (!result.ok) { db.exec("ROLLBACK"); return result; }
    db.prepare("UPDATE activation_codes SET login_enabled_at = ? WHERE id = ?").run(nowIso(), row.id);
    db.exec("COMMIT");
    return { ok: true as const, userId: user.id, isNewUser: true };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function enableActivationCodeLogin(userId: string, code: string) {
  db.exec("BEGIN");
  try {
    const row = lockActivationCode(code);
    if (!row || row.status !== "redeemed" || row.redeemed_by_user_id !== userId || findUserById(userId)?.account_status !== "active") {
      db.exec("ROLLBACK");
      return false;
    }
    db.prepare("UPDATE activation_codes SET login_enabled_at = COALESCE(login_enabled_at, ?) WHERE id = ?").run(nowIso(), row.id);
    db.exec("COMMIT");
    return true;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function getUserProfile(userId: string) {
  const user = findUserById(userId);
  if (!user) {
    return undefined;
  }

  const entitlement = findLatestEntitlementByUserId(userId);
  const subscriptionEntitlement = findActiveSubscriptionEntitlement(db, userId);
  const purchase = findActiveOneTimePurchase(db, userId);
  const prepaid = prepaidCreditBalance(userId);
  const now = new Date();
  let entitlementStatus: EntitlementStatus = "inactive";

  if (subscriptionEntitlement || purchase) {
    entitlementStatus = "active";
  } else if (entitlement) {
    entitlementStatus = new Date(entitlement.ends_at) > now ? "active" : "expired";
  }

  const effectiveEntitlement = prepaid.total > 0 && entitlementStatus !== "active"
    ? { status: "active" as const, startsAt: prepaid.startsAt, endsAt: null, source: "prepaid_credits" as const, provider: null, organizationId: null }
    : subscriptionEntitlement
    ? {
        status: entitlementStatus,
        startsAt: subscriptionEntitlement.startsAt,
        endsAt: subscriptionEntitlement.endsAt,
        source: "subscription" as const,
        provider: subscriptionEntitlement.provider,
        organizationId: subscriptionEntitlement.organizationId,
      }
    : purchase
      ? { status: entitlementStatus, startsAt: purchase.starts_at, endsAt: purchase.ends_at, source: "one_time" as const, provider: "stripe" as const, organizationId: null }
    : entitlement
      ? {
          status: entitlementStatus,
          startsAt: entitlement.starts_at,
          endsAt: entitlement.ends_at,
          source: "activation_code" as const,
          provider: null,
          organizationId: null,
        }
      : {
          status: entitlementStatus,
          startsAt: null,
          endsAt: null,
          source: null,
          provider: null,
          organizationId: null,
        };

  return {
    id: user.id,
    email: user.email,
    codeLoginEnabled: hasActivationCodeLogin(user.id),
    createdAt: user.created_at,
    accountStatus: user.account_status,
    deletionRequestedAt: user.deletion_requested_at,
    scheduledDeletionAt: user.scheduled_deletion_at,
    entitlement: effectiveEntitlement,
    freeTrial: getFreeTrialAccess(user.id),
    scorePasses: listScorePasses(db, user.id),
    prepaidCredits: prepaid,
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
    planCode: codeRow.plan_code,
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

  const random = randomBytes(16).toString("hex").toUpperCase();
  const segments = random.match(/.{4}/g)!;

  return sanitizedPrefix ? `${sanitizedPrefix}-${segments.join("-")}` : segments.join("-");
}
