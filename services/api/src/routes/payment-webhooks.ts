import type { FastifyInstance } from "fastify";
import type { PaymentOrderRow } from "../repositories/payment-repository.js";
import { findPaymentOrderById, findPaymentOrderByCheckoutSessionId, findPaymentOrderByTransactionId, completePaymentOrder } from "../repositories/payment-repository.js";
import { cancelPaddleSubscription, cancelStripeSubscription, verifyPaddleWebhook, verifyStripeWebhook } from "../lib/payments.js";
import { normalizePaddleBillingEvent, normalizeStripeBillingEvent } from "../lib/billing-events.js";
import { findBillingSubscriptionForRefund, processBillingWebhookEvent } from "../repositories/billing-repository.js";
import { db } from "../db.js";
import { buildPaymentNotificationEmail, sendTransactionalEmail } from "../lib/email.js";
import { config } from "../config.js";
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

async function sendPaymentAlert(app: FastifyInstance, order: PaymentOrderRow, providerReference: string | null) {
  try {
    const email = buildPaymentNotificationEmail({
      provider: order.provider,
      environment: order.provider === "paddle"
        ? config.paddleEnvironment
        : config.stripeSecretKey.trim().startsWith("sk_live_") ? "live" : "test",
      orderId: order.id,
      providerReference,
      customerEmail: order.customer_email,
      amountMinor: order.amount_minor,
      currency: order.currency,
      billingKind: order.billing_kind,
      paidAt: order.paid_at,
    });
    await sendTransactionalEmail({ to: config.paymentNotificationEmail, ...email });
  } catch (error) {
    app.log.error({ err: error, orderId: order.id }, "Payment succeeded but the operator notification email failed.");
  }
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

        const billingEvent = normalizeStripeBillingEvent(event, rawRequest.rawBody);
        if (billingEvent?.refund?.fullyRefunded) {
          const subscription = findBillingSubscriptionForRefund(db, "stripe", billingEvent.refund.providerInvoiceId);
          if (subscription && subscription.status !== "cancelled") {
            await cancelStripeSubscription(subscription.providerSubscriptionId, false);
          }
        }
        const billingProcessingResult = billingEvent ? processBillingWebhookEvent(db, billingEvent) : null;

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
          const session = event.data.object;
          const orderId = session.metadata?.orderId;
          const localOrder = (session.id ? findPaymentOrderByCheckoutSessionId(session.id) : undefined)
            ?? (orderId ? findPaymentOrderById(orderId) : undefined);
          const order = localOrder
            ?? (session.id ? await findDurablePaymentOrderByCheckoutSessionId(session.id) : undefined)
            ?? (orderId ? await findDurablePaymentOrderById(orderId) : undefined);

          if (order && session.payment_status === "paid") {
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
            if (shouldNotify && completedOrder) await sendPaymentAlert(app, completedOrder, session.id ?? null);
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
            };
            details?: {
              totals?: {
                grand_total?: string;
                currency_code?: string;
              };
            };
          };
        };

        const billingEvent = normalizePaddleBillingEvent(payload, rawRequest.rawBody);
        if (billingEvent?.refund?.fullyRefunded) {
          const subscription = findBillingSubscriptionForRefund(db, "paddle", billingEvent.refund.providerInvoiceId);
          if (subscription && subscription.status !== "cancelled") {
            await cancelPaddleSubscription(subscription.providerSubscriptionId, false);
          }
        }
        const billingProcessingResult = billingEvent ? processBillingWebhookEvent(db, billingEvent) : null;

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
            if (shouldNotify && completedOrder) await sendPaymentAlert(app, completedOrder, transactionId ?? null);
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
