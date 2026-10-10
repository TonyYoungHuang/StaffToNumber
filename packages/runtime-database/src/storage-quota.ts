import type { RuntimeDatabaseLike } from "./index.js";

export type StorageQuotaTier = "free" | "starter" | "converter-pro";
export type StorageQuotaPolicy = {
  free: number;
  starter: number;
  converterPro: number;
  starterPlanRefs: string[];
  converterProPlanRefs: string[];
};

export function storageQuotaPolicyFromEnv(env = process.env): StorageQuotaPolicy {
  const bytes = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  };
  const refs = (tier: string) => ["STRIPE", "PADDLE"].flatMap(provider => ["MONTHLY", "ANNUAL"].map(cycle => env[`${provider}_${tier}_${cycle}_PRICE_ID`] ?? "")).filter(Boolean);
  return {
    free: bytes(env.QUOTA_FREE_STORAGE_BYTES ?? env.QUOTA_LEGACY_STORAGE_BYTES, 50 * 1024 * 1024),
    starter: bytes(env.QUOTA_STARTER_STORAGE_BYTES ?? env.QUOTA_PRO_STORAGE_BYTES, 250 * 1024 * 1024),
    converterPro: bytes(env.QUOTA_CONVERTER_PRO_STORAGE_BYTES ?? env.QUOTA_EDUCATION_STORAGE_BYTES, 500 * 1024 * 1024),
    starterPlanRefs: refs("STARTER"),
    converterProPlanRefs: refs("CONVERTER_PRO"),
  };
}

export function resolveStorageQuotaTier(db: RuntimeDatabaseLike, userId: string, policy: StorageQuotaPolicy, includePrepaid = true): StorageQuotaTier {
  const subscriptions = db.prepare(`
    SELECT subscriptions.plan_ref AS planRef, subscriptions.organization_id AS organizationId,
           subscriptions.seat_quantity AS seatQuantity
    FROM billing_subscriptions subscriptions
    LEFT JOIN billing_seat_assignments seats
      ON seats.subscription_id = subscriptions.id AND seats.user_id = ? AND seats.status = 'active'
    WHERE subscriptions.status IN ('trialing', 'active')
      AND (subscriptions.current_period_end IS NULL OR datetime(subscriptions.current_period_end) > datetime('now'))
      AND (subscriptions.user_id = ? OR seats.id IS NOT NULL)
  `).all(userId, userId) as Array<{ planRef: string | null; organizationId: string | null; seatQuantity: number }>;
  const purchases = db.prepare(`SELECT plan_code AS planCode FROM billing_one_time_purchases
    WHERE user_id = ? AND status = 'active' AND datetime(starts_at) <= datetime('now')
      AND datetime(ends_at) > datetime('now')`).all(userId) as Array<{ planCode: string }>;
  const tiers: StorageQuotaTier[] = subscriptions.map(subscription => {
    if (subscription.planRef && policy.converterProPlanRefs.includes(subscription.planRef)) return "converter-pro";
    if (subscription.planRef && policy.starterPlanRefs.includes(subscription.planRef)) return "starter";
    return subscription.organizationId || Number(subscription.seatQuantity) > 1 ? "converter-pro" : "starter";
  });
  tiers.push(...purchases.map(purchase => purchase.planCode.startsWith("converter-pro-") ? "converter-pro" as const : "starter" as const));
  const activations = db.prepare(`SELECT c.plan_code AS planCode FROM user_entitlements e
    JOIN activation_codes c ON c.id = e.activation_code_id
    WHERE e.user_id = ? AND datetime(e.starts_at) <= datetime('now') AND datetime(e.ends_at) > datetime('now')`).all(userId) as Array<{ planCode: string | null }>;
  tiers.push(...activations.map(code => code.planCode?.startsWith("converter-pro-") ? "converter-pro" as const : "starter" as const));
  if (includePrepaid && db.prepare("PRAGMA table_info(prepaid_credit_grants)").all().length > 0) {
    const prepaid = db.prepare("SELECT storage_tier AS tier FROM prepaid_credit_grants WHERE user_id = ?").all(userId) as Array<{ tier: StorageQuotaTier }>;
    tiers.push(...prepaid.map(grant => grant.tier));
  }
  if (tiers.includes("converter-pro")) return "converter-pro";
  if (tiers.includes("starter")) return "starter";
  return "free";
}

export function assertAccountStorageQuota(db: RuntimeDatabaseLike, userId: string, incomingBytes: number, policy = storageQuotaPolicyFromEnv()) {
  const tier = resolveStorageQuotaTier(db, userId, policy);
  const limit = tier === "converter-pro" ? policy.converterPro : policy[tier];
  const row = db.prepare("SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM files WHERE user_id = ?").get(userId) as { bytes: number };
  if (!Number.isSafeInteger(incomingBytes) || incomingBytes < 0 || Number(row.bytes) + incomingBytes > limit) {
    throw Object.assign(new Error("The storage quota for this plan has been reached. Remove unused files before trying again."), { code: "PLAN_STORAGE_QUOTA_EXCEEDED", statusCode: 429 });
  }
}
