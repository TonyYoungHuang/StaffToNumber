import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { isPurchasePlanCode, type PurchasePlanCode } from "@score/shared";

export type OneTimePurchase = {
  id: string; user_id: string | null; plan_code: PurchasePlanCode; plan_ref: string;
  status: "pending" | "active" | "refunded";
  checkout_session_id: string | null; payment_intent_id: string | null;
  starts_at: string | null; ends_at: string | null; paid_at: string | null;
  amount_minor: number | null; currency: string | null; amount_refunded_minor: number;
};

export function addPurchaseMonths(start: string, months: number) {
  const value = new Date(start);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(day, lastDay));
  return value.toISOString();
}

export function findOneTimePurchase(db: RuntimeDatabaseLike, orderId: string) {
  return db.prepare("SELECT * FROM billing_one_time_purchases WHERE id = ?").get(orderId) as OneTimePurchase | undefined;
}

export function prepareOneTimePurchase(db: RuntimeDatabaseLike, input: { orderId: string; userId: string; planCode: PurchasePlanCode; priceId: string }) {
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO billing_one_time_purchases
    (id, user_id, plan_code, plan_ref, status, amount_refunded_minor, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', 0, ?, ?) ON CONFLICT(id) DO NOTHING`)
    .run(input.orderId, input.userId, input.planCode, input.priceId, now, now);
  const purchase = findOneTimePurchase(db, input.orderId)!;
  if (purchase.user_id !== input.userId || purchase.plan_code !== input.planCode || purchase.plan_ref !== input.priceId) {
    throw new Error("One-time order does not match its original purchase.");
  }
  return purchase;
}

export function hasRenewingSubscription(db: RuntimeDatabaseLike, userId: string) {
  return Boolean(db.prepare(`SELECT id FROM billing_subscriptions
    WHERE user_id = ? AND status IN ('trialing', 'active', 'past_due', 'unpaid', 'paused')
    AND cancel_at_period_end = 0 LIMIT 1`).get(userId));
}

type PaidSession = {
  id: string; mode: string | null; status: string | null; payment_status: string;
  amount_total: number | null; currency: string | null;
  payment_intent?: string | { id: string } | null;
  metadata: Record<string, string> | null;
};

export function fulfillOneTimePurchase(db: RuntimeDatabaseLike, session: PaidSession, now = new Date().toISOString()) {
  if (session.mode !== "payment" || session.metadata?.billingKind !== "one_time") return null;
  if (session.status !== "complete" || (session.payment_status !== "paid"
    && !(session.payment_status === "no_payment_required" && session.amount_total === 0))) return null;
  const orderId = session.metadata.orderId;
  const planCode = session.metadata.planCode;
  const userId = session.metadata.userId;
  if (!orderId || !userId || !isPurchasePlanCode(planCode)) throw new Error("Missing one-time purchase identity.");
  const purchase = findOneTimePurchase(db, orderId);
  if (!purchase || purchase.user_id !== userId || purchase.plan_code !== planCode || purchase.plan_ref !== session.metadata.priceId
    || (purchase.checkout_session_id && purchase.checkout_session_id !== session.id)
    || !Number.isSafeInteger(session.amount_total) || session.amount_total! < 0 || session.currency !== "usd") {
    throw new Error("Paid session does not match the one-time purchase.");
  }
  db.exec("BEGIN IMMEDIATE");
  try {
    // Serialize extensions per account, including across PostgreSQL connections.
    db.prepare("UPDATE users SET updated_at = updated_at WHERE id = ?").run(userId);
    const locked = findOneTimePurchase(db, orderId)!;
    if (locked.paid_at) { db.exec("COMMIT"); return locked; }
    const tier = planCode.startsWith("converter-pro-") ? "converter-pro" : "starter";
    const previous = db.prepare(`SELECT MAX(ends_at) AS endsAt FROM billing_one_time_purchases
      WHERE user_id = ? AND status = 'active' AND plan_code IN (?, ?)`)
      .get(userId, `${tier}-monthly`, `${tier}-annual`) as { endsAt: string | null };
    const subscription = db.prepare(`SELECT MAX(current_period_end) AS endsAt FROM billing_subscriptions
      WHERE user_id = ? AND status IN ('active', 'trialing') AND cancel_at_period_end = 1`).get(userId) as { endsAt: string | null };
    const startsAt = planCode === "single-score" ? now : [now, previous.endsAt ?? now, subscription.endsAt ?? now].sort().at(-1)!;
    const endsAt = planCode === "single-score" ? null : addPurchaseMonths(startsAt, planCode.endsWith("annual") ? 12 : 1);
    const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    db.prepare(`UPDATE billing_one_time_purchases SET
      status = CASE WHEN status = 'refunded' THEN 'refunded' ELSE 'active' END,
      checkout_session_id = ?, payment_intent_id = ?, starts_at = ?, ends_at = ?, paid_at = ?,
      amount_minor = ?, currency = ?, updated_at = ? WHERE id = ?`)
      .run(session.id, intentId, startsAt, endsAt, now, session.amount_total, session.currency, now, orderId);
    if (planCode === "single-score") {
      db.prepare(`INSERT INTO score_passes (purchase_id, document_id, credit_limit, max_pages, created_at)
        VALUES (?, NULL, 10, 5, ?) ON CONFLICT(purchase_id) DO NOTHING`).run(orderId, now);
    }
    db.exec("COMMIT");
    return findOneTimePurchase(db, orderId)!;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function applyOneTimeRefund(db: RuntimeDatabaseLike, charge: {
  payment_intent: string | { id: string } | null; amount: number; amount_refunded: number;
  metadata: Record<string, string>;
}) {
  if (charge.metadata.billingKind !== "one_time" || !charge.metadata.orderId) return;
  const purchase = findOneTimePurchase(db, charge.metadata.orderId);
  const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!purchase || purchase.user_id !== charge.metadata.userId || purchase.plan_ref !== charge.metadata.priceId
    || purchase.plan_code !== charge.metadata.planCode
    || (purchase.payment_intent_id && purchase.payment_intent_id !== intentId)) {
    throw new Error("Refund does not match the one-time purchase.");
  }
  if (!Number.isSafeInteger(charge.amount) || charge.amount <= 0 || !Number.isSafeInteger(charge.amount_refunded)
    || charge.amount_refunded < 0 || charge.amount_refunded > charge.amount) throw new Error("Invalid refund amount.");
  db.prepare(`UPDATE billing_one_time_purchases SET
    amount_refunded_minor = CASE WHEN amount_refunded_minor > ? THEN amount_refunded_minor ELSE ? END,
    status = CASE WHEN ? >= ? THEN 'refunded' ELSE status END, updated_at = ? WHERE id = ?`)
    .run(charge.amount_refunded, charge.amount_refunded, charge.amount_refunded, charge.amount, new Date().toISOString(), purchase.id);
}

export function findActiveOneTimePurchase(db: RuntimeDatabaseLike, userId: string) {
  return db.prepare(`SELECT * FROM billing_one_time_purchases WHERE user_id = ? AND status = 'active'
    AND datetime(starts_at) <= datetime('now') AND datetime(ends_at) > datetime('now')
    ORDER BY ends_at DESC LIMIT 1`).get(userId) as OneTimePurchase | undefined;
}

export function listOneTimePurchases(db: RuntimeDatabaseLike, userId: string) {
  return db.prepare(`SELECT id, plan_code AS planCode, status, starts_at AS startsAt, ends_at AS endsAt,
    amount_minor AS amountMinor, currency, amount_refunded_minor AS amountRefundedMinor, paid_at AS paidAt
    FROM billing_one_time_purchases WHERE user_id = ? AND paid_at IS NOT NULL ORDER BY paid_at DESC LIMIT 100`).all(userId);
}
