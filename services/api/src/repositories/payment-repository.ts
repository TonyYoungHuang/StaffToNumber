import { randomBytes } from "node:crypto";
import type { PaymentOrderStatus, PaymentProvider } from "@score/shared";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { nowIso } from "../lib/time.js";
import { findActivationCodeById, findUserByEmail, issueActivationCode, redeemActivationCode } from "./auth-repository.js";

type PaymentOrderRow = {
  id: string;
  public_token: string;
  user_id: string | null;
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  customer_email: string | null;
  locale: string | null;
  entitlement_days: number;
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
         po.checkout_session_id, po.transaction_id, po.checkout_url, po.amount_minor, po.currency,
         po.activation_code_id, po.paid_at, po.cancelled_at, po.failure_reason, po.created_at, po.updated_at,
         ac.code AS activation_code
  FROM payment_orders po
  LEFT JOIN activation_codes ac ON ac.id = po.activation_code_id
`;

export function createPaymentOrder(input: {
  userId?: string | null;
  provider: PaymentProvider;
  customerEmail?: string | null;
  locale?: string | null;
  entitlementDays: number;
}) {
  const id = createId();
  const publicToken = randomBytes(18).toString("hex");
  const timestamp = nowIso();

  db.prepare(
    `
      INSERT INTO payment_orders (
        id, public_token, user_id, provider, status, customer_email, locale, entitlement_days,
        checkout_session_id, transaction_id, checkout_url, amount_minor, currency,
        activation_code_id, paid_at, cancelled_at, failure_reason, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)
    `,
  ).run(
    id,
    publicToken,
    input.userId ?? null,
    input.provider,
    input.customerEmail ?? null,
    input.locale ?? null,
    input.entitlementDays,
    timestamp,
    timestamp,
  );

  return findPaymentOrderById(id);
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
  db.prepare(
    `
      UPDATE payment_orders
      SET transaction_id = ?, checkout_url = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(transactionId, checkoutUrl, nowIso(), orderId);

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

  if (existing.status === "paid" && existing.activation_code_id) {
    return existing;
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

export function mapPaymentOrderForPublic(order: PaymentOrderRow) {
  return {
    id: order.id,
    provider: order.provider,
    status: order.status,
      customerEmail: order.customer_email,
      locale: order.locale,
      entitlementDays: order.entitlement_days,
      userId: order.user_id,
      checkoutSessionId: order.checkout_session_id,
      transactionId: order.transaction_id,
      checkoutUrl: order.checkout_url,
      amountMinor: order.amount_minor,
      currency: order.currency,
      activationCode: order.user_id ? null : order.activation_code,
    paidAt: order.paid_at,
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
