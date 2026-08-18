import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { PaymentProvider } from "@score/shared";
import { config } from "../config.js";
import { getPlanQuotaUsage } from "../lib/plan-quotas.js";
import { findUserByEmail, getUserProfile } from "../repositories/auth-repository.js";
import {
  cancelPaddleSubscription,
  cancelStripeSubscription,
  buildPaddleCheckoutRedirectUrl,
  createPaddleTransaction,
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  expireStripeCheckoutSession,
  isPaymentProviderEnabled,
  retrievePaddleTransaction,
  retrieveStripeCheckoutSession,
  stripeSessionMatchesPaymentOrder,
} from "../lib/payments.js";
import {
  cancelDurablePaymentOrder,
  completeDurablePaymentOrder,
  findDurablePaymentOrderForPublic,
  saveDurablePaymentOrder,
} from "../lib/payment-order-durable-store.js";
import { db } from "../db.js";
import {
  assignBillingSeat,
  listBillingForUser,
  markBillingSubscriptionCancellation,
  revokeBillingSeat,
} from "../repositories/billing-repository.js";
import {
  attachPaddleTransaction,
  attachStripeCheckoutSession,
  completePaymentOrder,
  createPaymentOrder,
  findPaymentOrderById,
  findPaymentOrderForPublic,
  findReusablePaymentOrder,
  mapPaymentOrderForPublic,
  markPaymentOrderCancelled,
} from "../repositories/payment-repository.js";
import type { PaymentOrderRow } from "../repositories/payment-repository.js";

function isProvider(value: unknown): value is PaymentProvider {
  return value === "stripe" || value === "paddle";
}

function normalizedIdempotencyKey(header: string | string[] | undefined) {
  const value = (Array.isArray(header) ? header[0] : header)?.trim();
  if (!value) return null;
  if (value.length < 8 || value.length > 200 || !/^[\x21-\x7e]+$/u.test(value)) {
    throw new Error("Idempotency-Key must contain 8 to 200 visible ASCII characters.");
  }
  return value;
}

function checkoutIdempotencyHash(input: {
  header: string | string[] | undefined;
  userId: string;
  provider: PaymentProvider;
  organizationId?: string | null;
  seatQuantity?: number;
}) {
  const key = normalizedIdempotencyKey(input.header);
  if (!key) return null;
  return createHash("sha256")
    .update([input.userId, input.provider, input.organizationId ?? "personal", String(input.seatQuantity ?? 1), key].join(":"))
    .digest("hex");
}

function checkoutResponse(order: PaymentOrderRow) {
  return {
    provider: order.provider,
    orderId: order.id,
    token: order.public_token,
    url: order.checkout_url,
    status: order.status,
    reused: true,
  };
}

function isSeatEmail(value: string) {
  if (value.length < 3 || value.length > 254) return false;
  const separator = value.indexOf("@");
  if (separator < 1 || separator !== value.lastIndexOf("@") || separator > 64) return false;
  const domain = value.slice(separator + 1);
  if (domain.length < 3 || domain.startsWith(".") || domain.endsWith(".") || !domain.includes(".")) return false;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 32 || code === 127) return false;
  }
  return true;
}

async function findPaymentOrderForPublicDurably(id: string, publicToken: string) {
  return findPaymentOrderForPublic(id, publicToken) ?? await findDurablePaymentOrderForPublic(id, publicToken);
}

async function persistLocalPaymentOrder(orderId: string) {
  const order = findPaymentOrderById(orderId);
  if (order) await saveDurablePaymentOrder(order);
  return order;
}

async function completePaymentOrderEverywhere(
  order: PaymentOrderRow,
  input: { amountMinor?: number | null; currency?: string | null; codePrefix: string; createdBy: string },
) {
  const localOrder = findPaymentOrderById(order.id);
  if (localOrder) {
    const completed = completePaymentOrder({ orderId: order.id, ...input });
    if (completed) await saveDurablePaymentOrder(completed);
    return completed;
  }
  return completeDurablePaymentOrder({
    orderId: order.id,
    amountMinor: input.amountMinor,
    currency: input.currency,
  });
}

function recoverStripePaymentOrder(
  session: Awaited<ReturnType<typeof retrieveStripeCheckoutSession>>,
  input: { orderId: string; publicToken: string },
): PaymentOrderRow {
  const timestamp = new Date(session.created * 1_000).toISOString();
  const now = new Date().toISOString();
  const billingKind = session.mode === "subscription" ? "subscription" : "one_time";
  const paymentConfirmed = session.payment_status === "paid" && billingKind === "subscription";
  const seatQuantity = Math.max(1, Math.min(Number(session.metadata?.seatQuantity) || 1, 100_000));
  return {
    id: input.orderId,
    public_token: input.publicToken,
    user_id: session.metadata?.userId ?? null,
    provider: "stripe",
    status: paymentConfirmed ? "paid" : "pending",
    customer_email: session.customer_details?.email ?? session.customer_email ?? null,
    locale: session.locale && session.locale !== "auto" ? session.locale : null,
    entitlement_days: config.entitlementDays,
    billing_kind: billingKind,
    organization_id: session.metadata?.organizationId ?? null,
    seat_quantity: seatQuantity,
    idempotency_key_hash: null,
    checkout_session_id: session.id,
    transaction_id: null,
    checkout_url: session.url,
    amount_minor: session.amount_total ?? null,
    currency: session.currency ?? null,
    activation_code_id: null,
    paid_at: paymentConfirmed ? now : null,
    cancelled_at: null,
    failure_reason: session.payment_status === "paid" && billingKind === "one_time"
      ? "Recovered one-time payment requires activation-code review."
      : null,
    created_at: timestamp,
    updated_at: now,
    activation_code: null,
  };
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

      let idempotencyKeyHash: string | null;
      try {
        idempotencyKeyHash = checkoutIdempotencyHash({
          header: request.headers["idempotency-key"],
          userId: request.authUserId!,
          provider: body.provider,
          organizationId,
          seatQuantity,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid idempotency key." });
      }
      const reusable = idempotencyKeyHash ? findReusablePaymentOrder({
        userId: request.authUserId!,
        provider: body.provider,
        idempotencyKeyHash,
      }) : undefined;
      if (reusable?.checkout_url || reusable?.status === "paid") return reply.send(checkoutResponse(reusable));

      const order = reusable ?? createPaymentOrder({
        userId: request.authUserId!,
        provider: body.provider,
        customerEmail,
        locale: body.locale?.trim() || null,
        entitlementDays: config.entitlementDays,
        billingKind: config.paymentBillingMode === "subscription" ? "subscription" : "one_time",
        organizationId,
        seatQuantity,
        idempotencyKeyHash,
      });

      if (!order) {
        return reply.code(500).send({ error: "Unable to create payment order." });
      }

      try {
        await saveDurablePaymentOrder(order);
      } catch (error) {
        app.log.error(error);
        return reply.code(503).send({ error: "Unable to persist the payment order safely." });
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
          await persistLocalPaymentOrder(order.id);

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
          userId: request.authUserId,
          organizationId,
          seatQuantity,
          priceId: organizationId ? config.paddleSchoolPriceId || config.paddlePriceId : config.paddlePriceId,
        });
        const checkoutUrl = buildPaddleCheckoutRedirectUrl({
          checkoutUrl: transaction.checkout?.url ?? `${config.paddleDefaultPaymentLink}?_ptxn=${transaction.id}`,
          transactionId: transaction.id,
          orderId: order.id,
          publicToken: order.public_token,
          successUrl: successBase,
        });
        attachPaddleTransaction(order.id, transaction.id, checkoutUrl);
        await persistLocalPaymentOrder(order.id);

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

    const normalizedEmail = body.email?.trim().toLocaleLowerCase() ?? "";
    if (!normalizedEmail || !isSeatEmail(normalizedEmail)) {
      return reply.code(400).send({ error: "A valid registered account email is required." });
    }
    const account = findUserByEmail(normalizedEmail);
    if (!account) {
      return reply.code(409).send({
        error: "Create an account before starting checkout so the subscription can be assigned safely.",
        code: "ACCOUNT_REQUIRED",
      });
    }
    let idempotencyKeyHash: string | null;
    try {
      idempotencyKeyHash = checkoutIdempotencyHash({
        header: request.headers["idempotency-key"],
        userId: account.id,
        provider: body.provider,
      });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid idempotency key." });
    }
    const reusable = idempotencyKeyHash ? findReusablePaymentOrder({
      userId: account.id,
      provider: body.provider,
      idempotencyKeyHash,
    }) : undefined;
    if (reusable?.checkout_url || reusable?.status === "paid") return reply.send(checkoutResponse(reusable));

    const order = reusable ?? createPaymentOrder({
      userId: account.id,
      provider: body.provider,
      customerEmail: account.email,
      locale: body.locale?.trim() || null,
      entitlementDays: config.entitlementDays,
      billingKind: config.paymentBillingMode === "subscription" ? "subscription" : "one_time",
      idempotencyKeyHash,
    });

    if (!order) {
      return reply.code(500).send({ error: "Unable to create payment order." });
    }

    try {
      await saveDurablePaymentOrder(order);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: "Unable to persist the payment order safely." });
    }

    try {
      if (body.provider === "stripe") {
        const session = await createStripeCheckoutSession({
          orderId: order.id,
          publicToken: order.public_token,
          customerEmail: account.email,
          userId: account.id,
        });
        attachStripeCheckoutSession(order.id, session.id, session.url ?? null);
        await persistLocalPaymentOrder(order.id);

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
        customerEmail: account.email,
        userId: account.id,
      });
      const checkoutUrl = buildPaddleCheckoutRedirectUrl({
        checkoutUrl: transaction.checkout?.url ?? `${config.paddleDefaultPaymentLink}?_ptxn=${transaction.id}`,
        transactionId: transaction.id,
        orderId: order.id,
        publicToken: order.public_token,
        successUrl: `${config.publicSiteUrl}/checkout/success?provider=paddle&order_id=${order.id}&token=${order.public_token}`,
      });
      attachPaddleTransaction(order.id, transaction.id, checkoutUrl);
      await persistLocalPaymentOrder(order.id);

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

    let order = await findPaymentOrderForPublicDurably(params.id, query.token);

    if (!order && query.provider === "stripe" && query.sessionId) {
      try {
        const session = await retrieveStripeCheckoutSession(query.sessionId);
        if (!stripeSessionMatchesPaymentOrder(session, {
          orderId: params.id,
          publicToken: query.token,
          sessionId: query.sessionId,
        })) {
          return reply.code(404).send({ error: "Payment order not found." });
        }
        order = recoverStripePaymentOrder(session, { orderId: params.id, publicToken: query.token });
        await saveDurablePaymentOrder(order);
      } catch (error) {
        app.log.error(error);
        return reply.code(404).send({ error: "Payment order not found." });
      }
    }

    if (!order) return reply.code(404).send({ error: "Payment order not found." });

    try {
      if (order.status === "pending" && order.provider === "stripe" && (query.sessionId || order.checkout_session_id)) {
        const session = await retrieveStripeCheckoutSession(query.sessionId ?? order.checkout_session_id!);
        if (session.payment_status === "paid") {
          await completePaymentOrderEverywhere(order, {
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
          await completePaymentOrderEverywhere(order, {
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

    const refreshed = await findPaymentOrderForPublicDurably(params.id, query.token);
    return reply.send({ order: refreshed ? mapPaymentOrderForPublic(refreshed) : null });
  });

  app.post("/payments/orders/:id/cancel", async (request, reply) => {
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as { token?: string };

    if (!body.token) {
      return reply.code(400).send({ error: "Order token is required." });
    }

    const order = await findPaymentOrderForPublicDurably(params.id, body.token);
    if (!order) {
      return reply.code(404).send({ error: "Payment order not found." });
    }

    if (order.status !== "pending") {
      return reply.code(409).send({ error: "Only pending payment orders can be cancelled." });
    }

    if (order.provider === "stripe" && order.checkout_session_id) {
      try {
        await expireStripeCheckoutSession(order.checkout_session_id);
      } catch (error) {
        app.log.error({ error, orderId: order.id }, "Unable to expire Stripe Checkout Session.");
        return reply.code(502).send({ error: "The remote checkout could not be cancelled safely." });
      }
    }

    const cancelled = markPaymentOrderCancelled(order.id);
    await cancelDurablePaymentOrder(order.id);
    const refreshed = cancelled ?? await findDurablePaymentOrderForPublic(order.id, body.token);
    return reply.send({ order: refreshed ? mapPaymentOrderForPublic(refreshed) : null });
  });

  app.get("/payments/billing", { preHandler: app.requireAuth }, async (request) => {
    return listBillingForUser(db, request.authUserId!);
  });

  app.get("/payments/billing/usage", { preHandler: app.requireAuth }, async (request) => {
    return { usage: getPlanQuotaUsage(request.authUserId!) };
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

  app.post("/payments/billing/subscriptions/:subscriptionId/cancel", { preHandler: app.requireAuth }, async (request, reply) => {
    const { subscriptionId } = request.params as { subscriptionId: string };
    const body = (request.body ?? {}) as { atPeriodEnd?: boolean };
    const atPeriodEnd = body.atPeriodEnd !== false;
    const subscription = db.prepare(`
      SELECT subscriptions.id, subscriptions.provider,
             subscriptions.provider_subscription_id AS providerSubscriptionId
      FROM billing_subscriptions subscriptions
      LEFT JOIN score_organizations organizations ON organizations.id = subscriptions.organization_id
      LEFT JOIN score_organization_members members
        ON members.organization_id = subscriptions.organization_id AND members.user_id = ?
          AND members.status = 'active' AND members.removed_at IS NULL AND members.role IN ('owner', 'admin')
      WHERE subscriptions.id = ?
        AND subscriptions.status IN ('trialing', 'active', 'past_due', 'paused', 'unpaid')
        AND (
          subscriptions.user_id = ? OR organizations.owner_user_id = ? OR members.id IS NOT NULL
        )
      LIMIT 1
    `).get(request.authUserId!, subscriptionId, request.authUserId!, request.authUserId!) as {
      id: string;
      provider: PaymentProvider;
      providerSubscriptionId: string;
    } | undefined;
    if (!subscription) return reply.code(404).send({ error: "Active subscription not found." });

    try {
      if (subscription.provider === "stripe") {
        await cancelStripeSubscription(subscription.providerSubscriptionId, atPeriodEnd);
      } else {
        await cancelPaddleSubscription(subscription.providerSubscriptionId, atPeriodEnd);
      }
      markBillingSubscriptionCancellation(db, subscription.id, atPeriodEnd);
      return reply.send({ subscriptionId: subscription.id, cancelAtPeriodEnd: atPeriodEnd });
    } catch (error) {
      app.log.error({ error, subscriptionId }, "Unable to cancel remote subscription.");
      return reply.code(502).send({ error: error instanceof Error ? error.message : "Unable to cancel subscription." });
    }
  });

  app.post("/payments/billing/subscriptions/:subscriptionId/seats", { preHandler: app.requireAuth }, async (request, reply) => {
    const { subscriptionId } = request.params as { subscriptionId: string };
    const body = (request.body ?? {}) as { email?: string };
    const email = body.email?.trim().toLocaleLowerCase();
    if (!email || !isSeatEmail(email)) return reply.code(400).send({ error: "A valid seat email is required." });
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
