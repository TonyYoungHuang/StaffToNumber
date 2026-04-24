import type { FastifyInstance } from "fastify";
import type { PaymentProvider } from "@score/shared";
import { config } from "../config.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import {
  createPaddleTransaction,
  createStripeCheckoutSession,
  isPaymentProviderEnabled,
  retrievePaddleTransaction,
  retrieveStripeCheckoutSession,
} from "../lib/payments.js";
import {
  attachPaddleTransaction,
  attachStripeCheckoutSession,
  completePaymentOrder,
  createPaymentOrder,
  findPaymentOrderForPublic,
  mapPaymentOrderForPublic,
  markPaymentOrderCancelled,
} from "../repositories/payment-repository.js";

function isProvider(value: unknown): value is PaymentProvider {
  return value === "stripe" || value === "paddle";
}

export async function paymentRoutes(app: FastifyInstance) {
  app.post(
    "/payments/checkout/authenticated",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { provider?: PaymentProvider; locale?: string };

      if (!isProvider(body.provider)) {
        return reply.code(400).send({ error: "Payment provider is required." });
      }

      if (!isPaymentProviderEnabled(body.provider)) {
        return reply.code(400).send({ error: "This payment provider is not enabled." });
      }

      const profile = request.authUserId ? getUserProfile(request.authUserId) : null;
      const customerEmail = profile?.email ?? null;
      if (!customerEmail) {
        return reply.code(400).send({ error: "A registered account is required before payment." });
      }

      const order = createPaymentOrder({
        userId: request.authUserId!,
        provider: body.provider,
        customerEmail,
        locale: body.locale?.trim() || null,
        entitlementDays: config.entitlementDays,
      });

      if (!order) {
        return reply.code(500).send({ error: "Unable to create payment order." });
      }

      const successBase = `${config.publicAppUrl}/checkout/success?provider=${body.provider}&order_id=${order.id}&token=${order.public_token}`;
      const cancelBase = `${config.publicAppUrl}/checkout/cancel?provider=${body.provider}&order_id=${order.id}&token=${order.public_token}`;

      try {
        if (body.provider === "stripe") {
          const session = await createStripeCheckoutSession({
            orderId: order.id,
            publicToken: order.public_token,
            customerEmail,
            successUrl: `${successBase}&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: cancelBase,
          });
          attachStripeCheckoutSession(order.id, session.id, session.url ?? null);

          return reply.code(201).send({
            provider: "stripe",
            orderId: order.id,
            token: order.public_token,
            url: session.url,
          });
        }

        const transaction = await createPaddleTransaction({
          orderId: order.id,
          publicToken: order.public_token,
          customerEmail,
          successUrl: successBase,
        });
        const checkoutUrl = transaction.checkout?.url ?? `${config.publicSiteUrl}/checkout/paddle?_ptxn=${transaction.id}`;
        attachPaddleTransaction(order.id, transaction.id, checkoutUrl);

        return reply.code(201).send({
          provider: "paddle",
          orderId: order.id,
          token: order.public_token,
          url: checkoutUrl,
        });
      } catch (error) {
        return reply.code(500).send({
          error: error instanceof Error ? error.message : "Unable to initialize checkout.",
        });
      }
    },
  );

  app.post("/payments/checkout", async (request, reply) => {
    const body = (request.body ?? {}) as { provider?: PaymentProvider; email?: string; locale?: string };

    if (!isProvider(body.provider)) {
      return reply.code(400).send({ error: "Payment provider is required." });
    }

    if (!isPaymentProviderEnabled(body.provider)) {
      return reply.code(400).send({ error: "This payment provider is not enabled." });
    }

    const order = createPaymentOrder({
      provider: body.provider,
      customerEmail: body.email?.trim() || null,
      locale: body.locale?.trim() || null,
      entitlementDays: config.entitlementDays,
    });

    if (!order) {
      return reply.code(500).send({ error: "Unable to create payment order." });
    }

    try {
      if (body.provider === "stripe") {
        const session = await createStripeCheckoutSession({
          orderId: order.id,
          publicToken: order.public_token,
          customerEmail: body.email?.trim() || null,
        });
        attachStripeCheckoutSession(order.id, session.id, session.url ?? null);

        return reply.code(201).send({
          provider: "stripe",
          orderId: order.id,
          token: order.public_token,
          url: session.url,
        });
      }

      const transaction = await createPaddleTransaction({
        orderId: order.id,
        publicToken: order.public_token,
        customerEmail: body.email?.trim() || null,
      });
      const checkoutUrl = transaction.checkout?.url ?? `${config.publicSiteUrl}/checkout/paddle?_ptxn=${transaction.id}`;
      attachPaddleTransaction(order.id, transaction.id, checkoutUrl);

      return reply.code(201).send({
        provider: "paddle",
        orderId: order.id,
        token: order.public_token,
        url: checkoutUrl,
      });
    } catch (error) {
      return reply.code(500).send({
        error: error instanceof Error ? error.message : "Unable to initialize checkout.",
      });
    }
  });

  app.get("/payments/orders/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const query = (request.query ?? {}) as {
      token?: string;
      provider?: PaymentProvider;
      sessionId?: string;
      transactionId?: string;
    };

    if (!query.token) {
      return reply.code(400).send({ error: "Order token is required." });
    }

    const order = findPaymentOrderForPublic(params.id, query.token);
    if (!order) {
      return reply.code(404).send({ error: "Payment order not found." });
    }

    try {
      if (order.status === "pending" && order.provider === "stripe" && (query.sessionId || order.checkout_session_id)) {
        const session = await retrieveStripeCheckoutSession(query.sessionId ?? order.checkout_session_id!);
        if (session.payment_status === "paid") {
          completePaymentOrder({
            orderId: order.id,
            amountMinor: session.amount_total ?? null,
            currency: session.currency ?? null,
            codePrefix: "STR",
            createdBy: "stripe",
          });
        }
      }

      if (order.status === "pending" && order.provider === "paddle" && (query.transactionId || order.transaction_id)) {
        const transaction = await retrievePaddleTransaction(query.transactionId ?? order.transaction_id!);
        if (transaction.status === "completed" || transaction.status === "paid") {
          completePaymentOrder({
            orderId: order.id,
            amountMinor: transaction.details?.totals?.grand_total ? Number(transaction.details.totals.grand_total) : null,
            currency: transaction.details?.totals?.currency_code ?? null,
            codePrefix: "PDL",
            createdBy: "paddle",
          });
        }
      }
    } catch (error) {
      app.log.error(error);
    }

    const refreshed = findPaymentOrderForPublic(params.id, query.token);
    return reply.send({ order: refreshed ? mapPaymentOrderForPublic(refreshed) : null });
  });

  app.post("/payments/orders/:id/cancel", async (request, reply) => {
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as { token?: string };

    if (!body.token) {
      return reply.code(400).send({ error: "Order token is required." });
    }

    const order = findPaymentOrderForPublic(params.id, body.token);
    if (!order) {
      return reply.code(404).send({ error: "Payment order not found." });
    }

    const cancelled = markPaymentOrderCancelled(order.id);
    return reply.send({ order: cancelled ? mapPaymentOrderForPublic(cancelled) : null });
  });
}
