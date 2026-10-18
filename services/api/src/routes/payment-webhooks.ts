import type { FastifyInstance } from "fastify";
import { timingSafeEqual } from "node:crypto";
import type { PaymentOrderRow } from "../repositories/payment-repository.js";
import { findPaymentOrderById, findPaymentOrderByCheckoutSessionId, findPaymentOrderByTransactionId, completePaymentOrder, attachPaddleTransaction } from "../repositories/payment-repository.js";
import { buildLocalizedPublicCheckoutUrl, buildPaddleCheckoutRedirectUrl, localizePublicPaddleCheckoutPageUrl, cancelPaddleSubscription, cancelStripeSubscription, stripeCredentialMode, verifyPaddleWebhook, verifyStripeWebhook } from "../lib/payments.js";
import { normalizePaddleBillingEvent, normalizeStripeBillingEvent } from "../lib/billing-events.js";
import { processReconciledBillingWebhook } from "../lib/billing-reconciliation.js";
import { billingRefundCanCancelSubscription, findBillingSubscriptionForRefund } from "../repositories/billing-repository.js";
import { db } from "../db.js";
import { applyOneTimeRefund, fulfillOneTimePurchase } from "../repositories/one-time-purchase-repository.js";
import { buildPaymentNotificationEmail, sendTransactionalEmail } from "../lib/email.js";
import { config } from "../config.js";
import { retryOperatorNotification } from "../lib/operator-notification.js";
import { hashPaymentOrderToken, stripeSessionMatchesPaymentOrder } from "../lib/payments.js";
import {
  completeDurablePaymentOrder,
  findDurablePaymentOrderByCheckoutSessionId,
  findDurablePaymentOrderById,
  findDurablePaymentOrderByTransactionId,
  saveDurablePaymentOrder,
} from "../lib/payment-order-durable-store.js";

type RawBodyRequest = {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

async function sendPaymentAlert(order: PaymentOrderRow, providerReference: string | null) {
    const email = buildPaymentNotificationEmail({
      provider: order.provider,
      environment: order.provider === "paddle"
        ? config.paddleEnvironment
        : stripeCredentialMode(config.stripeSecretKey) === "live" ? "live" : "test",
      orderId: order.id,
      providerReference,
      customerEmail: order.customer_email,
      amountMinor: order.amount_minor,
      currency: order.currency,
      billingKind: order.billing_kind,
      paidAt: order.paid_at,
    });
    await sendTransactionalEmail({ to: config.paymentNotificationEmail, ...email });
}

export async function paymentWebhookRoutes(app: FastifyInstance) {
  app.post(
    "/webhooks/stripe",
    {
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      const rawRequest = request as typeof request & RawBodyRequest;
      const signatureHeader = rawRequest.headers["stripe-signature"];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

      if (!signature || !rawRequest.rawBody) {
        return reply.code(400).send({ error: "Stripe signature is required." });
      }

      try {
        const event = verifyStripeWebhook(rawRequest.rawBody, signature);
        if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
          const session = event.data.object;
          const order = findPaymentOrderByCheckoutSessionId(session.id);
          if (order && session.payment_status !== "paid" && stripeSessionMatchesPaymentOrder(session, { orderId: order.id, publicToken: order.public_token, sessionId: session.id })) {
            const timestamp = new Date().toISOString();
            const changed = db.prepare("UPDATE payment_orders SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND status = 'pending' AND paid_at IS NULL")
              .run(timestamp, timestamp, order.id);
            if (changed.changes === 1) await saveDurablePaymentOrder(findPaymentOrderById(order.id)!);
          }
        }
        if (event.type === "charge.refunded") applyOneTimeRefund(db, event.data.object);

        const billingEvent = normalizeStripeBillingEvent(event, rawRequest.rawBody);
        if (billingEvent?.refund?.fullyRefunded) {
          const subscription = findBillingSubscriptionForRefund(db, "stripe", billingEvent.refund.providerInvoiceId);
          if (subscription && subscription.status !== "cancelled" && billingRefundCanCancelSubscription(db, billingEvent, subscription.providerSubscriptionId)) {
            await cancelStripeSubscription(subscription.providerSubscriptionId, false);
          }
        }
        const billingProcessingResult = billingEvent ? await processReconciledBillingWebhook(db, billingEvent) : null;

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
          const session = event.data.object;
          const orderId = session.metadata?.orderId;
          const localOrder = (session.id ? findPaymentOrderByCheckoutSessionId(session.id) : undefined)
            ?? (orderId ? findPaymentOrderById(orderId) : undefined);
          const order = localOrder
            ?? (session.id ? await findDurablePaymentOrderByCheckoutSessionId(session.id) : undefined)
            ?? (orderId ? await findDurablePaymentOrderById(orderId) : undefined);

          const purchase = fulfillOneTimePurchase(db, session);
          if (order && (session.payment_status === "paid" || purchase)) {
            const shouldNotify = order.status !== "paid" && !billingProcessingResult?.duplicate;
            let completedOrder: PaymentOrderRow | undefined;
            if (localOrder) {
              completedOrder = completePaymentOrder({
                orderId: order.id,
                amountMinor: session.amount_total ?? null,
                currency: session.currency ?? null,
                codePrefix: "STR",
                createdBy: "stripe-webhook",
              });
              if (completedOrder) await saveDurablePaymentOrder(completedOrder);
            } else {
              completedOrder = await completeDurablePaymentOrder({
                orderId: order.id,
                amountMinor: session.amount_total ?? null,
                currency: session.currency ?? null,
              });
            }
            if (shouldNotify && completedOrder) void retryOperatorNotification({
              orderId: completedOrder.id, log: app.log,
              send: () => sendPaymentAlert(completedOrder!, session.id ?? null),
            });
          }
        }

        return reply.send({ received: true });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid Stripe webhook." });
      }
    },
  );

  app.post(
    "/webhooks/paddle",
    {
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      const rawRequest = request as typeof request & RawBodyRequest;
      const signatureHeader = rawRequest.headers["paddle-signature"];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

      if (!signature || !rawRequest.rawBody) {
        return reply.code(400).send({ error: "Paddle signature is required." });
      }

      try {
        verifyPaddleWebhook(rawRequest.rawBody, signature);
        const payload = request.body as {
          event_id?: string;
          event_type?: string;
          data?: {
            id?: string;
            status?: string;
            custom_data?: {
              orderId?: string;
              userId?: string;
              orderTokenHash?: string;
            };
            details?: {
              totals?: {
                grand_total?: string;
                currency_code?: string;
              };
            };
          };
        };

        // Paddle transaction creation has no provider idempotency key. A signed
        // lifecycle event recovers the original response after a lost POST;
        // it never creates another transaction or accepts a supplied redirect.
        if (["transaction.created", "transaction.ready", "transaction.updated"].includes(payload.event_type ?? "")) {
          const orderId = payload.data?.custom_data?.orderId;
          const transactionId = payload.data?.id;
          const proof = payload.data?.custom_data;
          const order = orderId ? findPaymentOrderById(orderId) : undefined;
          if (order && transactionId && order.provider === "paddle" && order.status === "pending"
            && order.provider_checkout_started_at && order.user_id && proof?.userId === order.user_id
            && (!order.transaction_id || order.transaction_id === transactionId)
            && typeof proof.orderTokenHash === "string" && /^[a-f0-9]{64}$/u.test(proof.orderTokenHash)
            && timingSafeEqual(Buffer.from(hashPaymentOrderToken(order.public_token), "hex"), Buffer.from(proof.orderTokenHash, "hex"))) {
            const successUrl = buildLocalizedPublicCheckoutUrl({ baseUrl: config.publicSiteUrl, pathname: "/checkout/success", locale: order.locale,
              searchParams: { provider: "paddle", order_id: order.id, token: order.public_token } });
            const checkoutUrl = buildPaddleCheckoutRedirectUrl({
              checkoutUrl: localizePublicPaddleCheckoutPageUrl({ checkoutUrl: config.paddleDefaultPaymentLink, publicSiteUrl: config.publicSiteUrl, locale: order.locale }),
              transactionId, orderId: order.id, publicToken: order.public_token, successUrl,
            });
            const attached = attachPaddleTransaction(order.id, transactionId, checkoutUrl);
            if (attached?.transaction_id === transactionId) await saveDurablePaymentOrder(attached);
          }
        }

        const billingEvent = normalizePaddleBillingEvent(payload, rawRequest.rawBody);
        if (billingEvent?.refund?.fullyRefunded) {
          const subscription = findBillingSubscriptionForRefund(db, "paddle", billingEvent.refund.providerInvoiceId);
          if (subscription && subscription.status !== "cancelled" && billingRefundCanCancelSubscription(db, billingEvent, subscription.providerSubscriptionId)) {
            await cancelPaddleSubscription(subscription.providerSubscriptionId, false);
          }
        }
        const billingProcessingResult = billingEvent ? await processReconciledBillingWebhook(db, billingEvent) : null;

        if (payload.event_type === "transaction.completed" || payload.event_type === "transaction.paid") {
          const transactionId = payload.data?.id;
          const orderId = payload.data?.custom_data?.orderId;
          const localOrder = (transactionId ? findPaymentOrderByTransactionId(transactionId) : undefined)
            ?? (orderId ? findPaymentOrderById(orderId) : undefined);
          const order = localOrder
            ?? (transactionId ? await findDurablePaymentOrderByTransactionId(transactionId) : undefined)
            ?? (orderId ? await findDurablePaymentOrderById(orderId) : undefined);

          if (order) {
            const shouldNotify = order.status !== "paid" && !billingProcessingResult?.duplicate;
            const amountMinor = payload.data?.details?.totals?.grand_total
              ? Number(payload.data.details.totals.grand_total)
              : null;
            const currency = payload.data?.details?.totals?.currency_code ?? null;
            let completedOrder: PaymentOrderRow | undefined;
            if (localOrder) {
              completedOrder = completePaymentOrder({
                orderId: order.id,
                amountMinor,
                currency,
                codePrefix: "PDL",
                createdBy: "paddle-webhook",
              });
              if (completedOrder) await saveDurablePaymentOrder(completedOrder);
            } else {
              completedOrder = await completeDurablePaymentOrder({ orderId: order.id, amountMinor, currency });
            }
            if (shouldNotify && completedOrder) void retryOperatorNotification({
              orderId: completedOrder.id, log: app.log,
              send: () => sendPaymentAlert(completedOrder!, transactionId ?? null),
            });
          }
        }

        return reply.send({ received: true });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid Paddle webhook." });
      }
    },
  );
}
