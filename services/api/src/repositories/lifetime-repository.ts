import { randomUUID } from "node:crypto";
import type { RuntimeDatabaseLike, LifetimeEntitlement } from "@score/runtime-database";
import type Stripe from "stripe";
import { hashPaymentOrderToken } from "../lib/payments.js";

export function lifetimeForOrder(db: RuntimeDatabaseLike, orderId: string): LifetimeEntitlement | undefined {
  return db.prepare("SELECT * FROM lifetime_entitlements WHERE source_order_id = ?").get(orderId);
}

/** Called only after Stripe signature and environment verification. All writes are atomic.
 * Revocation tombstones survive out-of-order delivery and never reactivate a purchase. */
export function processLifetimeWebhook(db: RuntimeDatabaseLike, event: Stripe.Event) {
  const completed = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded";
  const refunded = event.type === "charge.refunded";
  const disputed = event.type === "charge.dispute.created" || event.type === "charge.dispute.funds_withdrawn";
  if (!completed && !refunded && !disputed) return { handled: false };
  const object = event.data.object as unknown as {
    id: string; mode?: string; status?: string; payment_status?: string; currency?: string;
    amount_total?: number; amount?: number; amount_refunded?: number;
    payment_intent?: string | { id: string } | null; metadata?: Record<string, string> | null;
  };
  if (completed && object.metadata?.planCode !== "converter-pro-lifetime") return { handled: false };
  const intentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
  // Legacy Charges may have no PaymentIntent; lifetime Checkout always has one.
  if (!completed && !intentId) return { handled: false };
  const now = new Date().toISOString();
  const occurredAt = Number.isFinite(event.created) ? new Date(event.created * 1000).toISOString() : now;
  db.exec("BEGIN IMMEDIATE");
  try {
    // PostgreSQL advisory lock also serializes refund-before-grant on an absent row.
    if (db.primary === "postgres" && intentId) db.prepare("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))").get(intentId);
    if (db.prepare("SELECT event_id FROM lifetime_webhook_events WHERE event_id = ?").get(event.id)) {
      db.exec("COMMIT"); return { handled: completed, duplicate: true };
    }
    let outcome = "ignored_unpaid";
    let orderId: string | undefined;
    if (completed && object.payment_status === "paid") {
      const metadata = object.metadata!;
      orderId = metadata.orderId;
      const purchase = db.prepare(`SELECT p.*, o.public_token, o.checkout_session_id AS expected_session,
        o.user_id AS owner_id, o.provider, o.billing_kind, o.checkout_plan_code
        FROM billing_one_time_purchases p JOIN payment_orders o ON o.id = p.id WHERE p.id = ?`).get(orderId) as {
          user_id: string; owner_id: string; plan_code: string; plan_ref: string; public_token: string;
          expected_session: string | null; checkout_session_id: string | null; payment_intent_id: string | null;
          provider: string; billing_kind: string; checkout_plan_code: string;
        } | undefined;
      if (!purchase || object.mode !== "payment" || object.status !== "complete" || object.currency !== "usd"
        || object.amount_total !== 9900 || !intentId || !object.id || !metadata.userId
        || purchase.provider !== "stripe" || purchase.billing_kind !== "one_time"
        || purchase.checkout_plan_code !== "converter-pro-lifetime" || purchase.plan_code !== "converter-pro-lifetime"
        || purchase.user_id !== metadata.userId || purchase.owner_id !== metadata.userId
        || metadata.billingKind !== "one_time" || metadata.priceId !== purchase.plan_ref
        || metadata.orderTokenHash !== hashPaymentOrderToken(purchase.public_token)
        || (purchase.expected_session && purchase.expected_session !== object.id)
        || (purchase.checkout_session_id && purchase.checkout_session_id !== object.id)
        || (purchase.payment_intent_id && purchase.payment_intent_id !== intentId)) throw new Error("Lifetime payment does not match the original $99 USD account order.");
      db.prepare("UPDATE users SET updated_at = updated_at WHERE id = ?").run(purchase.user_id);
      const revoked = db.prepare(`SELECT outcome, occurred_at FROM lifetime_webhook_events
        WHERE payment_intent_id = ? AND outcome IN ('full_refund', 'dispute') ORDER BY occurred_at LIMIT 1`).get(intentId) as { outcome: string; occurred_at: string } | undefined;
      db.prepare(`INSERT INTO lifetime_entitlements (id, user_id, product_code, source_order_id, checkout_session_id,
        payment_intent_id, lifetime, expires_at, status, granted_at, revoked_at, reason)
        VALUES (?, ?, 'converter-pro-lifetime', ?, ?, ?, 1, NULL, ?, ?, ?, ?)
        ON CONFLICT(source_order_id) DO NOTHING`).run(randomUUID(), purchase.user_id, orderId, object.id, intentId,
        revoked ? "revoked" : "active", now, revoked?.occurred_at ?? null, revoked?.outcome ?? "paid_checkout");
      const entitlement = lifetimeForOrder(db, orderId!);
      if (!entitlement || entitlement.checkout_session_id !== object.id || entitlement.payment_intent_id !== intentId) throw new Error("Lifetime purchase identity conflict.");
      db.prepare(`UPDATE billing_one_time_purchases SET status = ?, checkout_session_id = ?, payment_intent_id = ?,
        starts_at = COALESCE(starts_at, ?), ends_at = NULL, paid_at = COALESCE(paid_at, ?), amount_minor = 9900,
        currency = 'usd', updated_at = ? WHERE id = ?`).run(entitlement.status === "active" ? "active" : "refunded", object.id, intentId, now, now, now, orderId);
      db.prepare(`UPDATE payment_orders SET status = 'paid', amount_minor = 9900, currency = 'usd',
        checkout_session_id = ?, paid_at = COALESCE(paid_at, ?), failure_reason = NULL, updated_at = ? WHERE id = ?`).run(object.id, now, now, orderId);
      outcome = entitlement.status === "active" ? "granted" : "kept_revoked";
    } else if (refunded || disputed) {
      if (refunded && (!Number.isSafeInteger(object.amount) || object.amount! <= 0 || !Number.isSafeInteger(object.amount_refunded)
        || object.amount_refunded! < 0 || object.amount_refunded! > object.amount!)) throw new Error("Invalid refund amount.");
      outcome = disputed ? "dispute" : object.amount_refunded === object.amount ? "full_refund" : "partial_refund_kept";
      if (outcome !== "partial_refund_kept") {
        db.prepare(`UPDATE lifetime_entitlements SET status = 'revoked', revoked_at = COALESCE(revoked_at, ?), reason = ?
          WHERE payment_intent_id = ?`).run(occurredAt, outcome, intentId);
        db.prepare(`UPDATE billing_one_time_purchases SET status = 'refunded', updated_at = ?
          WHERE plan_code = 'converter-pro-lifetime' AND payment_intent_id = ?`).run(now, intentId);
      }
      if (refunded) db.prepare(`UPDATE billing_one_time_purchases SET amount_refunded_minor = CASE WHEN amount_refunded_minor > ?
        THEN amount_refunded_minor ELSE ? END, updated_at = ? WHERE plan_code = 'converter-pro-lifetime' AND payment_intent_id = ?`)
        .run(object.amount_refunded, object.amount_refunded, now, intentId);
    }
    db.prepare(`INSERT INTO lifetime_webhook_events (event_id, event_type, payment_intent_id, checkout_session_id, outcome, occurred_at, processed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(event.id, event.type, intentId ?? null, completed ? object.id : null, outcome, occurredAt, now);
    db.exec("COMMIT");
    return { handled: completed, outcome, orderId };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}
