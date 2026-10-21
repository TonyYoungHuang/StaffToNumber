import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { activeLifetimeEntitlement } from "@score/runtime-database";
import { config } from "../config.js";
import { assertStripeEventMode, stripeRequest } from "../lib/payments.js";

export type AnnualUpgradeQuote = {
  customerId: string; subscriptionId: string; invoiceId: string; paidMinor: number;
  periodStart: number; periodEnd: number; quotedAt: number; creditMinor: number;
};
export type UpgradeRow = {
  order_id: string; customer_id: string; subscription_id: string; invoice_id: string;
  credit_minor: number; expires_at: number; coupon_id: string | null; promotion_code_id: string | null;
  state: "reserved" | "paid" | "expired"; renewal_stopped_at: string | null;
};
const idOf = (value: string | { id: string } | null | undefined) => typeof value === "string" ? value : value?.id;

export function proratedAnnualCredit(paid: number, start: number, end: number, now: number) {
  if (![paid, start, end, now].every(Number.isSafeInteger) || paid <= 0 || end <= start) return 0;
  return Math.min(9899, Math.max(0, Number(BigInt(paid) * BigInt(Math.max(0, Math.min(end - start, end - now))) / BigInt(end - start))));
}

/** Only a verified, single-seat annual period with a real successful payment is credited.
 * Never infer ownership from an email or use the catalogue price as amount paid. */
export async function quoteAnnualUpgrade(db: RuntimeDatabaseLike, userId: string, request: typeof stripeRequest = stripeRequest): Promise<AnnualUpgradeQuote | null> {
  if (activeLifetimeEntitlement(db, userId)) throw new Error("This account already has lifetime access.");
  const candidates = db.prepare(`SELECT s.provider_subscription_id, c.provider_customer_id
    FROM billing_subscriptions s JOIN billing_customers c ON c.id = s.customer_id
    WHERE s.user_id = ? AND c.user_id = ? AND s.provider = 'stripe' AND c.provider = 'stripe'
      AND s.organization_id IS NULL AND s.seat_quantity = 1 AND s.status = 'active'
      AND s.plan_ref IN (?, ?)`)
    .all(userId, userId, config.stripeConverterProAnnualPriceId, config.stripeStarterAnnualPriceId) as Array<{ provider_subscription_id: string; provider_customer_id: string }>;
  if (!candidates.length) return null;
  if (candidates.length !== 1) throw new Error("Multiple annual subscriptions require support review before upgrading.");
  const candidate = candidates[0];
  const subscription = await request(s => s.subscriptions.retrieve(candidate.provider_subscription_id));
  assertStripeEventMode(subscription, config.stripeSecretKey);
  const item = subscription.items.data[0];
  if (idOf(subscription.customer) !== candidate.provider_customer_id || (subscription.metadata.userId && subscription.metadata.userId !== userId)) throw new Error("Annual subscription ownership mismatch.");
  if (subscription.status !== "active" || subscription.items.has_more || subscription.items.data.length !== 1 || item.quantity !== 1
    || item.price.recurring?.interval !== "year" || item.price.recurring.interval_count !== 1
    || ![config.stripeConverterProAnnualPriceId, config.stripeStarterAnnualPriceId].includes(item.price.id)
    || subscription.schedule || subscription.pending_update) throw new Error("Annual subscription needs support review before upgrading.");
  const now = Math.floor(Date.now() / 1000);
  if (item.current_period_end <= now) return null;
  const invoiceId = idOf(subscription.latest_invoice);
  if (!invoiceId) throw new Error("The current annual period has no paid invoice.");
  if (db.prepare("SELECT order_id FROM lifetime_upgrade_orders WHERE invoice_id = ? AND state = 'paid'").get(invoiceId)) throw new Error("This annual period has already funded a lifetime upgrade.");
  const invoice = await request(s => s.invoices.retrieve(invoiceId));
  assertStripeEventMode(invoice, config.stripeSecretKey);
  const line = invoice.lines.data[0];
  if (invoice.status !== "paid" || invoice.currency !== "usd" || invoice.amount_paid <= 0 || invoice.amount_remaining !== 0
    || idOf(invoice.customer) !== candidate.provider_customer_id || idOf(invoice.parent?.subscription_details?.subscription) !== subscription.id
    || invoice.lines.has_more || invoice.lines.data.length !== 1 || line.period.start !== item.current_period_start
    || line.period.end !== item.current_period_end || line.parent?.subscription_item_details?.proration
    || invoice.pre_payment_credit_notes_amount || invoice.post_payment_credit_notes_amount) throw new Error("The current annual invoice cannot be credited automatically.");
  const payments = await request(s => s.invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 100 }));
  if (payments.has_more || !payments.data.length) throw new Error("Annual payment evidence is unavailable.");
  let received = 0;
  for (const payment of payments.data) {
    assertStripeEventMode(payment, config.stripeSecretKey);
    let chargeId = idOf(payment.payment.charge);
    if (payment.payment.payment_intent) {
      const intent = await request(s => s.paymentIntents.retrieve(idOf(payment.payment.payment_intent)!));
      assertStripeEventMode(intent, config.stripeSecretKey);
      chargeId = idOf(intent.latest_charge);
    }
    if (!chargeId) throw new Error("Annual payment needs support review.");
    const charge = await request(s => s.charges.retrieve(chargeId));
    assertStripeEventMode(charge, config.stripeSecretKey);
    if (!charge.paid || charge.disputed || charge.amount_refunded || charge.currency !== "usd" || idOf(charge.customer) !== candidate.provider_customer_id) throw new Error("Refunded or disputed annual payments cannot be credited automatically.");
    received += payment.amount_paid ?? 0;
  }
  if (received !== invoice.amount_paid) throw new Error("Annual paid amount could not be verified.");
  return { customerId: candidate.provider_customer_id, subscriptionId: subscription.id, invoiceId: invoice.id,
    paidMinor: invoice.amount_paid, periodStart: item.current_period_start, periodEnd: item.current_period_end, quotedAt: now,
    creditMinor: proratedAnnualCredit(invoice.amount_paid, item.current_period_start, item.current_period_end, now) };
}

export async function prepareLifetimeUpgrade(db: RuntimeDatabaseLike, userId: string, orderId: string) {
  let row = db.prepare("SELECT * FROM lifetime_upgrade_orders WHERE order_id = ?").get(orderId) as UpgradeRow | undefined;
  if (!row) {
    const quote = await quoteAnnualUpgrade(db, userId);
    if (!quote) return undefined;
    const expiresAt = Math.min(quote.quotedAt + 3600, quote.periodEnd);
    if (expiresAt <= quote.quotedAt + 1800) throw new Error("Your annual period is about to renew. Please retry after renewal or contact support.");
    // A period can fund only one checkout. Reuse its original order or let the
    // provider confirm expiry before releasing the reservation.
    const previous = db.prepare("SELECT * FROM lifetime_upgrade_orders WHERE invoice_id = ? AND state != 'expired'").get(quote.invoiceId) as UpgradeRow | undefined;
    if (previous) {
      const order = db.prepare("SELECT checkout_session_id FROM payment_orders WHERE id = ?").get(previous.order_id) as { checkout_session_id: string | null };
      if (previous.state === "paid" || !order.checkout_session_id) throw new Error("Restore the existing annual upgrade checkout before starting another purchase.");
      const session = await stripeRequest(s => s.checkout.sessions.retrieve(order.checkout_session_id!));
      assertStripeEventMode(session, config.stripeSecretKey);
      if (session.status !== "expired") throw new Error("The previous annual upgrade must finish processing first.");
      db.prepare("UPDATE lifetime_upgrade_orders SET state = 'expired' WHERE order_id = ? AND state = 'reserved'").run(previous.order_id);
    }
    db.prepare(`INSERT INTO lifetime_upgrade_orders (order_id, user_id, customer_id, subscription_id, invoice_id,
      paid_minor, period_start, period_end, quoted_at, credit_minor, expires_at, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved') ON CONFLICT(order_id) DO NOTHING`)
      .run(orderId, userId, quote.customerId, quote.subscriptionId, quote.invoiceId, quote.paidMinor, quote.periodStart, quote.periodEnd, quote.quotedAt, quote.creditMinor, expiresAt);
    row = db.prepare("SELECT * FROM lifetime_upgrade_orders WHERE order_id = ?").get(orderId) as UpgradeRow;
  }
  if (row.state !== "reserved" || row.expires_at <= Math.floor(Date.now() / 1000) + 1800) throw new Error("Restore or wait for expiry of the existing annual upgrade checkout.");
  if (row.credit_minor > 0 && !row.coupon_id) {
    const price = await stripeRequest(s => s.prices.retrieve(config.stripeLifetimePriceId));
    assertStripeEventMode(price, config.stripeSecretKey);
    const coupon = await stripeRequest(s => s.coupons.create({ duration: "once", amount_off: row!.credit_minor, currency: "usd",
      max_redemptions: 1, redeem_by: row!.expires_at, applies_to: { products: [idOf(price.product)!] },
      name: "Annual plan upgrade credit", metadata: { orderId, customerId: row!.customer_id } }, { idempotencyKey: `lifetime-coupon-${orderId}` }));
    assertStripeEventMode(coupon, config.stripeSecretKey);
    db.prepare("UPDATE lifetime_upgrade_orders SET coupon_id = ? WHERE order_id = ?").run(coupon.id, orderId);
    row.coupon_id = coupon.id;
  }
  if (row.coupon_id && !row.promotion_code_id) {
    const promotion = await stripeRequest(s => s.promotionCodes.create({ promotion: { type: "coupon", coupon: row!.coupon_id! },
      customer: row!.customer_id, max_redemptions: 1, expires_at: row!.expires_at, metadata: { orderId } }, { idempotencyKey: `lifetime-promotion-${orderId}` }));
    assertStripeEventMode(promotion, config.stripeSecretKey);
    db.prepare("UPDATE lifetime_upgrade_orders SET promotion_code_id = ? WHERE order_id = ?").run(promotion.id, orderId);
    row.promotion_code_id = promotion.id;
  }
  return { customerId: row.customer_id, promotionCodeId: row.promotion_code_id, creditMinor: row.credit_minor,
    subscriptionId: row.subscription_id, expiresAt: row.expires_at };
}

/** Durable retry: called after the paid transaction commits, including duplicate
 * webhook deliveries. No cancellation on checkout creation, expiry or failure. */
export async function stopAnnualRenewalAfterLifetimePayment(db: RuntimeDatabaseLike, orderId: string, request: typeof stripeRequest = stripeRequest) {
  const row = db.prepare("SELECT * FROM lifetime_upgrade_orders WHERE order_id = ? AND state = 'paid'").get(orderId) as UpgradeRow | undefined;
  if (!row || row.renewal_stopped_at) return;
  try {
    const subscription = await request(s => s.subscriptions.retrieve(row.subscription_id));
    assertStripeEventMode(subscription, config.stripeSecretKey);
    if (idOf(subscription.customer) !== row.customer_id) throw new Error("Annual customer mismatch.");
    if (subscription.status !== "canceled" && !subscription.cancel_at_period_end) {
      const stopped = await request(s => s.subscriptions.update(row.subscription_id, { cancel_at_period_end: true }, { idempotencyKey: `lifetime-stop-renewal-${orderId}` }));
      if (!stopped.cancel_at_period_end) throw new Error("Annual renewal was not stopped.");
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE lifetime_upgrade_orders SET renewal_stopped_at = ?, renewal_error = NULL WHERE order_id = ?").run(now, orderId);
    db.prepare("UPDATE billing_subscriptions SET cancel_at_period_end = 1, updated_at = ? WHERE provider = 'stripe' AND provider_subscription_id = ?").run(now, row.subscription_id);
  } catch (error) {
    db.prepare("UPDATE lifetime_upgrade_orders SET renewal_error = 'provider_retry_required' WHERE order_id = ?").run(orderId);
    throw error;
  }
}
