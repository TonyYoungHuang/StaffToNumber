import type { FastifyInstance } from "fastify";
import { findPaymentOrderById, findPaymentOrderByCheckoutSessionId, findPaymentOrderByTransactionId, completePaymentOrder } from "../repositories/payment-repository.js";
import { verifyPaddleWebhook, verifyStripeWebhook } from "../lib/payments.js";

type RawBodyRequest = {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

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

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
          const session = event.data.object;
          const orderId = session.metadata?.orderId;
          const order = (session.id ? findPaymentOrderByCheckoutSessionId(session.id) : undefined) ?? (orderId ? findPaymentOrderById(orderId) : undefined);

          if (order && session.payment_status === "paid") {
            completePaymentOrder({
              orderId: order.id,
              amountMinor: session.amount_total ?? null,
              currency: session.currency ?? null,
              codePrefix: "STR",
              createdBy: "stripe-webhook",
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

        if (payload.event_type === "transaction.completed" || payload.event_type === "transaction.paid") {
          const transactionId = payload.data?.id;
          const orderId = payload.data?.custom_data?.orderId;
          const order = (transactionId ? findPaymentOrderByTransactionId(transactionId) : undefined) ?? (orderId ? findPaymentOrderById(orderId) : undefined);

          if (order) {
            completePaymentOrder({
              orderId: order.id,
              amountMinor: payload.data?.details?.totals?.grand_total ? Number(payload.data.details.totals.grand_total) : null,
              currency: payload.data?.details?.totals?.currency_code ?? null,
              codePrefix: "PDL",
              createdBy: "paddle-webhook",
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
