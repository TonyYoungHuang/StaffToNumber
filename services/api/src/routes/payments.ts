import type { FastifyInstance } from "fastify";
import type { PaymentProvider } from "@score/shared";
import { config } from "../config.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import {
  createPaddleTransaction,
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  isPaymentProviderEnabled,
  retrievePaddleTransaction,
  retrieveStripeCheckoutSession,
} from "../lib/payments.js";
import { db } from "../db.js";
import { assignBillingSeat, listBillingForUser, revokeBillingSeat } from "../repositories/billing-repository.js";
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
      const body = (request.body ?? {}) as { provider?: PaymentProvider; locale?: string; organizationId?: string; seatQuantity?: number };

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

      const organizationId = typeof body.organizationId === "string" && body.organizationId.trim() ? body.organizationId.trim() : null;
      const seatQuantity = organizationId ? Math.max(2, Math.min(Number(body.seatQuantity) || 2, 100_000)) : 1;
      if (organizationId) {
        const access = db.prepare(`
          SELECT organizations.id
          FROM score_organizations organizations
          LEFT JOIN score_organization_members members
            ON members.organization_id = organizations.id AND members.user_id = ?
              AND members.status = 'active' AND members.removed_at IS NULL AND members.role IN ('owner', 'admin')
          WHERE organizations.id = ? AND organizations.archived_at IS NULL
            AND (organizations.owner_user_id = ? OR members.id IS NOT NULL)
        `).get(request.authUserId!, organizationId, request.authUserId!);
        if (!access) return reply.code(403).send({ error: "Organization billing access is required." });
      }

      const order = createPaymentOrder({
        userId: request.authUserId!,
        provider: body.provider,
        customerEmail,
        locale: body.locale?.trim() || null,
        entitlementDays: config.entitlementDays,
        billingKind: config.paymentBillingMode === "subscription" ? "subscription" : "one_time",
        organizationId,
        seatQuantity,
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
            userId: request.authUserId,
            organizationId,
            seatQuantity,
            priceId: organizationId ? config.stripeSchoolPriceId || config.stripePriceId : config.stripePriceId,
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
          userId: request.authUserId,
          organizationId,
          seatQuantity,
          priceId: organizationId ? config.paddleSchoolPriceId || config.paddlePriceId : config.paddlePriceId,
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
      billingKind: config.paymentBillingMode === "subscription" ? "subscription" : "one_time",
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

  app.get("/payments/billing", { preHandler: app.requireAuth }, async (request) => {
    return listBillingForUser(db, request.authUserId!);
  });

  app.post("/payments/billing/portal", { preHandler: app.requireAuth }, async (request, reply) => {
    const body = (request.body ?? {}) as { provider?: PaymentProvider };
    if (body.provider !== "stripe") {
      return reply.code(400).send({ error: "A Stripe subscription is required for this billing portal." });
    }
    const customer = db.prepare(`
      SELECT provider_customer_id AS providerCustomerId FROM billing_customers
      WHERE provider = 'stripe' AND user_id = ? ORDER BY datetime(updated_at) DESC LIMIT 1
    `).get(request.authUserId!) as { providerCustomerId: string } | undefined;
    if (!customer) return reply.code(404).send({ error: "Stripe billing customer not found." });
    try {
      const session = await createStripeBillingPortalSession(customer.providerCustomerId, `${config.publicAppUrl}/dashboard`);
      return reply.send({ url: session.url });
    } catch (error) {
      return reply.code(502).send({ error: error instanceof Error ? error.message : "Unable to open billing portal." });
    }
  });

  app.post("/payments/billing/subscriptions/:subscriptionId/seats", { preHandler: app.requireAuth }, async (request, reply) => {
    const { subscriptionId } = request.params as { subscriptionId: string };
    const body = (request.body ?? {}) as { email?: string };
    const email = body.email?.trim().toLocaleLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/u.test(email)) return reply.code(400).send({ error: "A valid seat email is required." });
    const subscription = db.prepare(`
      SELECT subscriptions.organization_id AS organizationId
      FROM billing_subscriptions subscriptions
      JOIN score_organizations organizations ON organizations.id = subscriptions.organization_id
      LEFT JOIN score_organization_members members
        ON members.organization_id = organizations.id AND members.user_id = ? AND members.status = 'active'
          AND members.removed_at IS NULL AND members.role IN ('owner', 'admin')
      WHERE subscriptions.id = ? AND (organizations.owner_user_id = ? OR members.id IS NOT NULL)
    `).get(request.authUserId!, subscriptionId, request.authUserId!) as { organizationId: string } | undefined;
    if (!subscription) return reply.code(404).send({ error: "Organization subscription not found." });
    const user = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email) as { id: string } | undefined;
    try {
      assignBillingSeat(db, { subscriptionId, organizationId: subscription.organizationId, email, userId: user?.id });
      return reply.code(201).send({ assigned: true });
    } catch (error) {
      return reply.code(409).send({ error: error instanceof Error ? error.message : "Unable to assign seat." });
    }
  });

  app.delete("/payments/billing/subscriptions/:subscriptionId/seats/:email", { preHandler: app.requireAuth }, async (request, reply) => {
    const { subscriptionId, email } = request.params as { subscriptionId: string; email: string };
    const subscription = db.prepare(`
      SELECT subscriptions.organization_id AS organizationId
      FROM billing_subscriptions subscriptions
      JOIN score_organizations organizations ON organizations.id = subscriptions.organization_id
      LEFT JOIN score_organization_members members
        ON members.organization_id = organizations.id AND members.user_id = ? AND members.status = 'active'
          AND members.removed_at IS NULL AND members.role IN ('owner', 'admin')
      WHERE subscriptions.id = ? AND (organizations.owner_user_id = ? OR members.id IS NOT NULL)
    `).get(request.authUserId!, subscriptionId, request.authUserId!) as { organizationId: string } | undefined;
    if (!subscription) return reply.code(404).send({ error: "Organization subscription not found." });
    const revoked = revokeBillingSeat(db, { subscriptionId, organizationId: subscription.organizationId, email: decodeURIComponent(email) });
    return revoked ? reply.code(204).send() : reply.code(404).send({ error: "Active seat not found." });
  });
}
