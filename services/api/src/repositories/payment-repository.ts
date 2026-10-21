import { lifetimeForOrder } from "./lifetime-repository.js";
import { randomBytes } from "node:crypto";
import type { PaymentOrderStatus, PaymentProvider } from "@score/shared";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { nowIso } from "../lib/time.js";
import { findActivationCodeById, findUserByEmail, issueActivationCode, redeemActivationCode } from "./auth-repository.js";
import { findOneTimePurchase } from "./one-time-purchase-repository.js";
import { orderCheckoutReturnContext, checkoutUrlWithoutReturnCredential } from "../lib/checkout-return.js";

export type PaymentOrderRow = {
  id: string;
  public_token: string;
  user_id: string | null;
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  customer_email: string | null;
  locale: string | null;
  entitlement_days: number;
  billing_kind: "one_time" | "subscription";
  organization_id: string | null;
  seat_quantity: number;
  idempotency_key_hash: string | null;
  checkout_intent_hash: string | null;
  checkout_plan_code: string | null;
  pass_mode: string | null;
  provider_checkout_started_at: string | null;
  provider_checkout_params_hash: string | null;
  return_site: string | null;
  return_path: string | null;
  return_state_json: string | null;
  return_token_hash: string | null;
  return_token_expires_at: string | null;
  return_token_consumed_at: string | null;
  target_document_id: string | null;
  intended_action_json: string | null;
  resume_consumed_at: string | null;
  resume_result_json: string | null;
  checkout_session_id: string | null;
  transaction_id: string | null;
  checkout_url: string | null;
  amount_minor: number | null;
  currency: string | null;
  activation_code_id: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  activation_code: string | null;
};

const paymentOrderSelect = `
  SELECT po.id, po.public_token, po.user_id, po.provider, po.status, po.customer_email, po.locale, po.entitlement_days,
         po.billing_kind, po.organization_id, po.seat_quantity, po.idempotency_key_hash,
         po.checkout_intent_hash, po.checkout_plan_code, po.pass_mode, po.provider_checkout_started_at, po.provider_checkout_params_hash, po.return_site, po.return_path, po.return_state_json,
         po.return_token_hash, po.return_token_expires_at, po.return_token_consumed_at,
         po.target_document_id, po.intended_action_json, po.resume_consumed_at, po.resume_result_json,
         po.checkout_session_id, po.transaction_id, po.checkout_url, po.amount_minor, po.currency,
         po.activation_code_id, po.paid_at, po.cancelled_at, po.failure_reason, po.created_at, po.updated_at,
         ac.code AS activation_code
  FROM payment_orders po
  LEFT JOIN activation_codes ac ON ac.id = po.activation_code_id
`;

export function createPaymentOrder(input: {
  orderId?: string;
  userId?: string | null;
  provider: PaymentProvider;
  customerEmail?: string | null;
  locale?: string | null;
  entitlementDays: number;
  billingKind?: "one_time" | "subscription";
  organizationId?: string | null;
  seatQuantity?: number;
  idempotencyKeyHash?: string | null;
  targetDocumentId?: string | null;
  intendedActionJson?: string | null;
  checkoutIntentHash?: string | null;
  checkoutPlanCode?: string | null;
  passMode?: string | null;
  returnSite?: string | null;
  returnPath?: string | null;
  returnStateJson?: string | null;
  returnTokenHash?: string | null;
  returnTokenExpiresAt?: string | null;
}) {
  const id = input.orderId ?? createId();
  const publicToken = randomBytes(18).toString("hex");
  const timestamp = nowIso();

  const values = {
    id, public_token: publicToken, user_id: input.userId ?? null,
    provider: input.provider, status: "pending", customer_email: input.customerEmail ?? null,
    locale: input.locale ?? null, entitlement_days: input.entitlementDays,
    billing_kind: input.billingKind ?? "one_time", organization_id: input.organizationId ?? null,
    seat_quantity: Math.max(1, Math.min(input.seatQuantity ?? 1, 100_000)),
    idempotency_key_hash: input.idempotencyKeyHash ?? null,
    target_document_id: input.targetDocumentId ?? null, intended_action_json: input.intendedActionJson ?? null,
    checkout_intent_hash: input.checkoutIntentHash ?? null, checkout_plan_code: input.checkoutPlanCode ?? null,
    pass_mode: input.passMode ?? null, return_site: input.returnSite ?? null, return_path: input.returnPath ?? null,
    return_state_json: input.returnStateJson ?? null, return_token_hash: input.returnTokenHash ?? null,
    return_token_expires_at: input.returnTokenExpiresAt ?? null, created_at: timestamp, updated_at: timestamp,
  };
  try {
    db.prepare(`INSERT INTO payment_orders (${Object.keys(values).join(", ")}) VALUES (${Object.keys(values).map(() => "?").join(", ")})`).run(...Object.values(values));
  } catch (error) {
    const existing = input.userId && input.checkoutIntentHash ? findPaymentOrderByIntent(input.userId, input.provider, input.checkoutIntentHash) : undefined;
    if (existing && existing.idempotency_key_hash === (input.idempotencyKeyHash ?? null)) return existing;
    throw error;
  }

  return findPaymentOrderById(id);
}

export function findPaymentOrderByIntent(userId: string, provider: PaymentProvider, checkoutIntentHash: string) {
  return db.prepare(`${paymentOrderSelect} WHERE po.user_id = ? AND po.provider = ? AND po.checkout_intent_hash = ? ORDER BY po.created_at DESC LIMIT 1`).get(userId, provider, checkoutIntentHash) as PaymentOrderRow | undefined;
}
export function listPaymentOrdersForUser(userId: string, pendingOnly = false) {
  return db.prepare(`${paymentOrderSelect} WHERE po.user_id = ? ${pendingOnly ? "AND po.status = 'pending'" : ""} ORDER BY po.created_at DESC LIMIT 50`).all(userId) as PaymentOrderRow[];
}

/** Paddle lacks provider idempotency. Once a create could have escaped, never
 * blindly create again after a timeout/restart. Signed events recover its ID. */
export function claimPaddleCheckoutCreation(orderId: string) {
  return db.prepare(`UPDATE payment_orders SET provider_checkout_started_at = ?, updated_at = ?
    WHERE id = ? AND provider = 'paddle' AND status = 'pending' AND transaction_id IS NULL AND provider_checkout_started_at IS NULL`)
    .run(nowIso(), nowIso(), orderId).changes === 1;
}
export function claimStripeCheckoutRequest(orderId: string, paramsHash: string) {
  return db.prepare(`UPDATE payment_orders SET provider_checkout_started_at = COALESCE(provider_checkout_started_at, ?),
    provider_checkout_params_hash = COALESCE(provider_checkout_params_hash, ?), updated_at = ?
    WHERE id = ? AND provider = 'stripe' AND status = 'pending' AND checkout_session_id IS NULL
      AND ((provider_checkout_started_at IS NULL AND provider_checkout_params_hash IS NULL)
        OR (provider_checkout_started_at > ? AND provider_checkout_params_hash = ?))`)
    .run(nowIso(), paramsHash, nowIso(), orderId, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), paramsHash).changes === 1;
}

export function findReusablePaymentOrder(input: {
  userId: string;
  provider: PaymentProvider;
  idempotencyKeyHash: string;
}) {
  return db.prepare(`
    ${paymentOrderSelect}
    WHERE po.user_id = ? AND po.provider = ? AND po.idempotency_key_hash = ?
      AND po.status IN ('pending', 'paid')
    ORDER BY datetime(po.created_at) DESC
    LIMIT 1
  `).get(input.userId, input.provider, input.idempotencyKeyHash) as PaymentOrderRow | undefined;
}

export function findPaymentOrderById(id: string) {
  return db.prepare(`${paymentOrderSelect} WHERE po.id = ?`).get(id) as PaymentOrderRow | undefined;
}

export function findPaymentOrderForPublic(id: string, publicToken: string) {
  return db.prepare(`${paymentOrderSelect} WHERE po.id = ? AND po.public_token = ?`).get(id, publicToken) as PaymentOrderRow | undefined;
}

export function findPaymentOrderByCheckoutSessionId(sessionId: string) {
  return db.prepare(`${paymentOrderSelect} WHERE po.checkout_session_id = ?`).get(sessionId) as PaymentOrderRow | undefined;
}

export function findPaymentOrderByTransactionId(transactionId: string) {
  return db.prepare(`${paymentOrderSelect} WHERE po.transaction_id = ?`).get(transactionId) as PaymentOrderRow | undefined;
}

export function attachStripeCheckoutSession(orderId: string, sessionId: string, checkoutUrl: string | null) {
  db.prepare("UPDATE billing_one_time_purchases SET checkout_session_id = ? WHERE id = ? AND checkout_session_id IS NULL").run(sessionId, orderId);
  db.prepare(
    `
      UPDATE payment_orders
      SET checkout_session_id = ?, checkout_url = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(sessionId, checkoutUrl, nowIso(), orderId);

  return findPaymentOrderById(orderId);
}

export function attachPaddleTransaction(orderId: string, transactionId: string, checkoutUrl: string | null) {
  const attached = db.prepare(
    `
      UPDATE payment_orders
      SET transaction_id = ?, checkout_url = ?, updated_at = ?
      WHERE id = ? AND (transaction_id IS NULL OR transaction_id = ?)
    `,
  ).run(transactionId, checkoutUrlWithoutReturnCredential(checkoutUrl), nowIso(), orderId, transactionId);
  if (attached.changes !== 1) throw new Error("This order already belongs to a different Paddle transaction.");

  return findPaymentOrderById(orderId);
}

export function markPaymentOrderCancelled(orderId: string) {
  db.prepare(
    `
      UPDATE payment_orders
      SET status = 'cancelled', cancelled_at = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `,
  ).run(nowIso(), nowIso(), orderId);

  return findPaymentOrderById(orderId);
}

export function markPaymentOrderFailed(orderId: string, failureReason: string) {
  db.prepare(
    `
      UPDATE payment_orders
      SET status = 'failed', failure_reason = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(failureReason, nowIso(), orderId);

  return findPaymentOrderById(orderId);
}

export function completePaymentOrder(input: {
  orderId: string;
  amountMinor?: number | null;
  currency?: string | null;
  codePrefix?: string;
  createdBy: string;
}) {
  const existing = findPaymentOrderById(input.orderId);
  if (!existing) {
    return undefined;
  }

  if (existing.status === "paid") {
    return existing;
  }

  const purchase = existing.billing_kind === "one_time" ? findOneTimePurchase(db, existing.id) : undefined;
  if (purchase && !purchase.paid_at) throw new Error("One-time access must be fulfilled before marking payment complete.");
  if (existing.billing_kind === "subscription" || purchase) {
    const timestamp = nowIso();
    db.prepare(`
      UPDATE payment_orders
      SET status = 'paid', amount_minor = ?, currency = ?, paid_at = ?, failure_reason = NULL, updated_at = ?
      WHERE id = ?
    `).run(input.amountMinor ?? existing.amount_minor, input.currency ?? existing.currency, timestamp, timestamp, existing.id);
    return findPaymentOrderById(existing.id);
  }

  const targetUserId = existing.user_id ?? (existing.customer_email ? findUserByEmail(existing.customer_email)?.id ?? null : null);
  const activationCode = issueActivationCode({
    entitlementDays: existing.entitlement_days,
    prefix: targetUserId ? "AUTO" : input.codePrefix,
    note: `payment-order:${existing.id}`,
    createdBy: input.createdBy,
  });

  if (!activationCode) {
    throw new Error("Unable to issue activation code for the paid order.");
  }

  if (targetUserId) {
    const redemption = redeemActivationCode(targetUserId, activationCode.code);
    if (!redemption.ok) {
      throw new Error("Unable to auto-activate the paid account.");
    }
  }

  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE payment_orders
      SET status = 'paid',
          user_id = ?,
          amount_minor = ?,
          currency = ?,
          activation_code_id = ?,
          paid_at = ?,
          failure_reason = NULL,
          updated_at = ?
      WHERE id = ?
    `,
  ).run(
    targetUserId,
    input.amountMinor ?? existing.amount_minor,
    input.currency ?? existing.currency,
    activationCode.id,
    timestamp,
    timestamp,
    existing.id,
  );

  return findPaymentOrderById(existing.id);
}

export function mapPaymentOrderForPublic(order: PaymentOrderRow, includePrivate = false) {
  const lifetime = order.checkout_plan_code === "converter-pro-lifetime" ? lifetimeForOrder(db, order.id) : undefined;
  const amounts = lifetime ? db.prepare("SELECT subtotal_minor, discount_minor, tax_minor, total_minor FROM lifetime_payment_amounts WHERE order_id = ?").get(order.id) as { subtotal_minor: number; discount_minor: number; tax_minor: number; total_minor: number } | undefined : undefined;
  const purchase = order.billing_kind === "one_time" ? findOneTimePurchase(db, order.id) : undefined;
  return {
    id: order.id,
    provider: order.provider,
    status: order.status,
      customerEmail: includePrivate ? order.customer_email : null,
      locale: order.locale,
      entitlementDays: order.entitlement_days,
      billingKind: order.billing_kind,
      organizationId: includePrivate ? order.organization_id : null,
      seatQuantity: order.seat_quantity,
      userId: order.user_id,
      checkoutSessionId: order.checkout_session_id,
      transactionId: order.transaction_id,
      checkoutUrl: includePrivate ? order.checkout_url : null,
      amountMinor: order.amount_minor,
      currency: order.currency,
      activationCode: order.user_id ? null : order.activation_code,
    paidAt: order.paid_at,
    accessStartsAt: purchase?.starts_at ?? null,
    accessEndsAt: purchase?.ends_at ?? null,
    purchaseStatus: purchase?.status ?? null,
    lifetime: lifetime ? { status: lifetime.status, expiresAt: null, grantedAt: lifetime.granted_at, revokedAt: lifetime.revoked_at, transactionId: lifetime.payment_intent_id,
      ...(amounts ? { subtotalMinor: amounts.subtotal_minor, discountMinor: amounts.discount_minor, taxMinor: amounts.tax_minor } : {}) } : null,
    planCode: order.checkout_plan_code ?? purchase?.plan_code ?? null,
    passMode: order.pass_mode,
    providerCheckoutStartedAt: includePrivate ? order.provider_checkout_started_at : null,
    intendedAction: includePrivate && order.intended_action_json ? JSON.parse(order.intended_action_json) as unknown : null,
    targetDocumentId: includePrivate ? order.target_document_id : null,
    returnContext: includePrivate ? orderCheckoutReturnContext(order) : null,
    continuation: includePrivate && order.target_document_id ? {
      documentId: order.target_document_id,
      available: Boolean(order.intended_action_json),
      consumed: Boolean(order.resume_consumed_at),
      confirmation: orderCheckoutReturnContext(order)?.state.confirmation ?? null,
      result: order.resume_result_json ? JSON.parse(order.resume_result_json) as unknown : null,
    } : null,
    cancelledAt: order.cancelled_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

export function findIssuedActivationCodeByOrderId(orderId: string) {
  const order = findPaymentOrderById(orderId);
  if (!order?.activation_code_id) {
    return undefined;
  }

  return findActivationCodeById(order.activation_code_id);
}
