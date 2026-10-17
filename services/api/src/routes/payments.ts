import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { isPurchasePlanCode, isCheckoutBillingKind, type CheckoutBillingKind, type PurchasePlanCode, type PaymentProvider } from "@score/shared";
import { findOneTimePurchase, fulfillOneTimePurchase, hasRenewingSubscription, prepareOneTimePurchase } from "../repositories/one-time-purchase-repository.js";
import { config } from "../config.js";
import { getPlanQuotaUsage } from "../lib/plan-quotas.js";
import { CheckoutContinuationError, normalizeCheckoutContinuation } from "../lib/checkout-continuation.js";
import { assertScorePassPurchaseTarget, scorePassForDocument, ScorePassError } from "../lib/score-passes.js";
import { findUserByEmail, getUserProfile } from "../repositories/auth-repository.js";
import {
  cancelPaddleSubscription,
  cancelStripeSubscription,
  buildPaddleCheckoutRedirectUrl,
  buildLocalizedAppReturnUrl,
  buildLocalizedPublicCheckoutUrl,
  localizePublicPaddleCheckoutPageUrl,
  createPaddleTransaction,
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  buildStripeCheckoutSessionParams,
  buildStripeCheckoutRequestOptions,
  expireStripeCheckoutSession,
  getCheckoutPriceId,
  isPaymentProviderEnabled,
  retrievePaddleTransaction,
  retrieveStripeCheckoutSession,
  retrieveStripeSubscription,
  stripeSessionMatchesPaymentOrder,
} from "../lib/payments.js";
import {
  cancelDurablePaymentOrder,
  completeDurablePaymentOrder,
  findDurablePaymentOrderForPublic,
  findDurablePaymentOrderById,
  consumeDurableCheckoutReturnToken,
  saveDurablePaymentOrder,
} from "../lib/payment-order-durable-store.js";
import { db } from "../db.js";
import {
  assignBillingSeat,
  listBillingForUser,
  markBillingSubscriptionCancellation,
  revokeBillingSeat,
  processBillingWebhookEvent,
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
import { buildCheckoutIntentNotificationEmail, sendTransactionalEmail } from "../lib/email.js";
import { retryOperatorNotification } from "../lib/operator-notification.js";
import { normalizeStripeBillingEvent } from "../lib/billing-events.js";
import { readSessionCookie } from "../lib/session-cookie.js";
import { validateCheckoutReturn, issueCheckoutReturnToken, recoverCheckoutReturnToken, consumeCheckoutReturnToken, orderCheckoutReturnContext } from "../lib/checkout-return.js";
import { findPaymentOrderByIntent, listPaymentOrdersForUser, claimPaddleCheckoutCreation, claimStripeCheckoutRequest } from "../repositories/payment-repository.js";
import type { PaymentVerification, PaymentVerificationStatus } from "@score/shared";
import { assertDraftAssessment } from "../lib/recognition-assessment-store.js";
import { RecognitionAdmissionError } from "../lib/recognition-memory-estimate.js";

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
  planCode?: PurchasePlanCode | null;
  billingKind?: CheckoutBillingKind;
  organizationId?: string | null;
  seatQuantity?: number;
  targetDocumentId?: string | null;
  intendedActionJson?: string | null;
  returnContextJson?: string | null;
}) {
  const key = normalizedIdempotencyKey(input.header);
  if (!key) return null;
  return createHash("sha256")
    .update([input.userId, input.provider, input.planCode ?? "legacy-plan", input.organizationId ?? "personal", String(input.seatQuantity ?? 1), ...(input.billingKind === "one_time" ? ["one_time"] : []), ...(input.targetDocumentId ? [input.targetDocumentId, input.intendedActionJson ?? ""] : []), ...(input.returnContextJson ? [input.returnContextJson] : []), key].join(":"))
    .digest("hex");
}

function checkoutResponse(order: PaymentOrderRow, includePrivate = false) {
  return {
    provider: order.provider,
    orderId: order.id,
    token: order.public_token,
    url: order.checkout_url,
    status: order.status,
    reused: true,
    order: mapPaymentOrderForPublic(order, includePrivate),
  };
}

async function sendCheckoutIntentAlert(
  app: FastifyInstance,
  input: {
    order: PaymentOrderRow;
    userId: string;
    providerEnabled: boolean;
    planCode?: PurchasePlanCode | null;
  },
  send = sendTransactionalEmail,
) {
  const email = buildCheckoutIntentNotificationEmail({
    provider: input.order.provider,
    siteEnvironment: config.nodeEnv,
    providerEnabled: input.providerEnabled,
    planCode: input.planCode,
    orderId: input.order.id,
    userId: input.userId,
    customerEmail: input.order.customer_email ?? "unknown",
    locale: input.order.locale,
    billingKind: input.order.billing_kind,
    organizationId: input.order.organization_id,
    seatQuantity: input.order.seat_quantity,
    createdAt: input.order.created_at,
  });
  const delivery = await send({ to: config.paymentNotificationEmail, ...email });
  if (config.nodeEnv === "production" && delivery.mode !== "resend") {
    throw new Error("Production checkout intent email delivery is not configured.");
  }
  app.log.info({
    event: "payment.checkout_intent_notified",
    orderId: input.order.id,
    provider: input.order.provider,
    providerEnabled: input.providerEnabled,
    deliveryMode: delivery.mode,
  });
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

async function findPaymentOrderForPublicDurably(id: string, publicToken: string, lookup = findDurablePaymentOrderForPublic) {
  return findPaymentOrderForPublic(id, publicToken) ?? await lookup(id, publicToken);
}

function mirrorOrderView(order: PaymentOrderRow, includePrivate: boolean) {
  const view = mapPaymentOrderForPublic(order, includePrivate);
  const error = "This order was recovered from its payment record. Its original task cannot be replayed automatically; review the score before starting another task.";
  return { ...view, mirrorOnly: true,
    continuation: view.continuation ? { ...view.continuation, available: false,
      result: view.continuation.consumed ? view.continuation.result : { documentId: order.target_document_id, error, code: "CHECKOUT_RECOVERY_ACTION_UNAVAILABLE", statusCode: 409 },
      recoveryCode: view.continuation.consumed ? null : "CHECKOUT_RECOVERY_ACTION_UNAVAILABLE" } : null };
}

function mirrorOrderVerification(order: PaymentOrderRow, userId: string | undefined): PaymentVerification {
  if (order.status === "cancelled" || order.status === "failed") return { status: order.status, retryable: false };
  const purchase = findOneTimePurchase(db, order.id);
  if (purchase?.status === "refunded") return { status: "refunded", retryable: false };
  if (order.status !== "paid" || !userId || order.user_id !== userId) return { status: "verification_failed", retryable: true };
  const hasAccess = getUserProfile(userId)?.entitlement.status === "active"
    || Boolean(order.target_document_id && scorePassForDocument(db, userId, order.target_document_id))
    || Boolean(purchase?.status === "active" && purchase.paid_at && purchase.plan_code === "single-score");
  return { status: hasAccess ? "ready" : "waiting_fulfillment", retryable: !hasAccess };
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
  // Recover the order first. Fulfillment below owns errors and retry states.
  const seatQuantity = Math.max(1, Math.min(Number(session.metadata?.seatQuantity) || 1, 100_000));
  return {
    id: input.orderId,
    public_token: input.publicToken,
    user_id: session.metadata?.userId ?? null,
    provider: "stripe",
    status: "pending",
    customer_email: session.customer_details?.email ?? session.customer_email ?? null,
    locale: session.locale && session.locale !== "auto" ? session.locale : null,
    entitlement_days: config.entitlementDays,
    billing_kind: billingKind,
    organization_id: session.metadata?.organizationId ?? null,
    seat_quantity: seatQuantity,
    idempotency_key_hash: null,
    checkout_intent_hash: null,
    checkout_plan_code: session.metadata?.planCode ?? null,
    pass_mode: null,
    provider_checkout_started_at: null,
    provider_checkout_params_hash: null,
    return_site: null,
    return_path: null,
    return_state_json: null,
    return_token_hash: null,
    return_token_expires_at: null,
    return_token_consumed_at: null,
    target_document_id: null,
    intended_action_json: null,
    resume_consumed_at: null,
    resume_result_json: null,
    checkout_session_id: session.id,
    transaction_id: null,
    checkout_url: session.url,
    amount_minor: session.amount_total ?? null,
    currency: session.currency ?? null,
    activation_code_id: null,
    paid_at: null,
    cancelled_at: null,
    failure_reason: null,
    created_at: timestamp,
    updated_at: now,
    activation_code: null,
  };
}

export async function paymentRoutes(app: FastifyInstance, options: { durableServices?: Partial<{
  findById: typeof findDurablePaymentOrderById;
  findForPublic: typeof findDurablePaymentOrderForPublic;
  consumeReturnToken: typeof consumeDurableCheckoutReturnToken;
}>; paymentServices?: Partial<{
  createStripeCheckoutSession: typeof createStripeCheckoutSession;
  createPaddleTransaction: typeof createPaddleTransaction;
  retrieveStripeCheckoutSession: typeof retrieveStripeCheckoutSession;
  retrieveStripeSubscription: typeof retrieveStripeSubscription;
  sendTransactionalEmail: typeof sendTransactionalEmail;
}> } = {}) {
  const services = { createStripeCheckoutSession, createPaddleTransaction, retrieveStripeCheckoutSession, retrieveStripeSubscription, sendTransactionalEmail, ...options.paymentServices };
  const durable = { findById: findDurablePaymentOrderById, findForPublic: findDurablePaymentOrderForPublic, consumeReturnToken: consumeDurableCheckoutReturnToken, ...options.durableServices };
  const findOrderForPublicDurably = (id: string, token: string) => findPaymentOrderForPublicDurably(id, token, durable.findForPublic);
  const orderChecks = new Map<string, Promise<PaymentVerification>>();

  const verifyAndFulfill = async (order: PaymentOrderRow, publicToken: string, sessionId?: string, transactionId?: string): Promise<PaymentVerification> => {
    const result = (status: PaymentVerificationStatus, retryable = false) => ({ status, retryable });
    if (order.status === "cancelled") return result("cancelled");
    if (order.status === "failed") return result("failed");
    let paymentConfirmed = order.status === "paid";
    try {
      const purchase = order.billing_kind === "one_time" ? findOneTimePurchase(db, order.id) : undefined;
      if (purchase?.status === "refunded") return result("refunded");
      if (order.status === "paid" && order.billing_kind === "one_time" && (purchase?.paid_at || order.activation_code_id)) {
        try { await saveDurablePaymentOrder(order); return result("ready"); }
        catch (error) {
          app.log.error({ err: error, orderId: order.id }, "Paid order persistence failed; retry preserves fulfilled access.");
          return result("fulfillment_failed", true);
        }
      }
      if (order.provider === "stripe" && (sessionId || order.checkout_session_id)) {
        const session = await services.retrieveStripeCheckoutSession(sessionId ?? order.checkout_session_id!);
        if (!stripeSessionMatchesPaymentOrder(session, { orderId: order.id, publicToken, sessionId: session.id })) {
          throw new Error("Checkout session does not match this order.");
        }
        paymentConfirmed = session.payment_status === "paid" || (session.status === "complete" && session.payment_status === "no_payment_required" && session.amount_total === 0);
        if (!paymentConfirmed && session.status === "expired") {
          markPaymentOrderCancelled(order.id);
          await cancelDurablePaymentOrder(order.id);
          return result("cancelled");
        }
        if (!paymentConfirmed) return result("waiting_payment", true);
        try {
          if (order.billing_kind === "one_time") {
            const fulfilled = fulfillOneTimePurchase(db, session);
            if (purchase && !fulfilled?.paid_at) throw new Error("One-time access could not be activated.");
          } else {
            const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
            if (!subscriptionId || !order.user_id) throw new Error("Paid subscription identity is unavailable.");
            {
              // Read the current subscription, never replay an old "paid" event
              // that could restore cancelled/refunded access. Original webhook
              // event IDs and their processed records remain untouched.
              const subscription = await services.retrieveStripeSubscription(subscriptionId);
              const sessionCustomer = typeof session.customer === "string" ? session.customer : session.customer?.id;
              const subscriptionCustomer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
              if (!sessionCustomer || sessionCustomer !== subscriptionCustomer || (subscription.metadata.userId && subscription.metadata.userId !== order.user_id)) {
                throw new Error("Subscription does not match the paid account.");
              }
              const snapshot = { ...subscription, metadata: { ...session.metadata, ...subscription.metadata, userId: order.user_id } };
              const rawPayload = Buffer.from(JSON.stringify(snapshot));
              const event = normalizeStripeBillingEvent({
                id: `order-recovery-${order.id}-${createHash("sha256").update(rawPayload).digest("hex")}`,
                type: "customer.subscription.updated",
                data: { object: snapshot },
              }, rawPayload);
              if (!event?.subscription) throw new Error("Subscription cannot be fulfilled safely.");
              processBillingWebhookEvent(db, event);
              if (!["active", "trialing"].includes(subscription.status)) throw new Error("The current subscription is not active. Contact support.");
              const fulfilled = db.prepare(`SELECT status, current_period_end AS endsAt FROM billing_subscriptions
                WHERE provider = 'stripe' AND provider_subscription_id = ? AND user_id = ?`)
                .get(subscriptionId, order.user_id) as { status: string; endsAt: string | null } | undefined;
              if (!fulfilled || !["active", "trialing"].includes(fulfilled.status) || (fulfilled.endsAt && Date.parse(fulfilled.endsAt) <= Date.now())) {
                throw new Error("Subscription access is not ready after recovery.");
              }
              if (getUserProfile(order.user_id)?.entitlement.status !== "active") throw new Error("Paid account access is not active after recovery.");
            }
          }
          const completed = await completePaymentOrderEverywhere(order, { amountMinor: session.amount_total, currency: session.currency, codePrefix: "STR", createdBy: "stripe-order-recovery" });
          if (!completed) throw new Error("Unable to complete the paid order.");
          return result("ready");
        } catch (error) {
          app.log.error({ err: error, orderId: order.id }, "Payment confirmed but fulfillment failed; original order can be retried.");
          return result("fulfillment_failed", true);
        }
      }
      if (order.provider === "paddle" && (transactionId || order.transaction_id)) {
        const transaction = await retrievePaddleTransaction(transactionId ?? order.transaction_id!);
        if (transaction.id !== order.transaction_id) throw new Error("Transaction does not match this order.");
        paymentConfirmed = transaction.status === "completed" || transaction.status === "paid";
        if (!paymentConfirmed) return result("waiting_payment", true);
        try {
          const completed = await completePaymentOrderEverywhere(order, {
            amountMinor: transaction.details?.totals?.grand_total ? Number(transaction.details.totals.grand_total) : null,
            currency: transaction.details?.totals?.currency_code ?? null, codePrefix: "PDL", createdBy: "paddle-order-recovery",
          });
          if (!completed) throw new Error("Unable to complete the paid order.");
          const profile = order.user_id ? getUserProfile(order.user_id) : null;
          if (order.billing_kind === "subscription" && profile?.entitlement.status !== "active") {
            return result(Date.now() - Date.parse(completed.updated_at) < 120_000 ? "waiting_fulfillment" : "fulfillment_failed", true);
          }
          return result("ready");
        } catch (error) {
          app.log.error({ err: error, orderId: order.id }, "Payment confirmed but fulfillment failed.");
          return result("fulfillment_failed", true);
        }
      }
      return result(paymentConfirmed ? "fulfillment_failed" : "waiting_payment", true);
    } catch (error) {
      app.log.error({ err: error, orderId: order.id }, "Payment verification failed; original order can be retried.");
      return result("verification_failed", true);
    }
  };
  app.post(
    "/payments/checkout/authenticated",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { provider?: PaymentProvider; locale?: string; planCode?: unknown; passMode?: unknown; billingKind?: unknown; organizationId?: string; seatQuantity?: number; returnTo?: unknown; returnSite?: unknown; returnPath?: unknown; returnState?: unknown; targetDocumentId?: unknown; intendedAction?: unknown };

      if (!isProvider(body.provider)) {
        return reply.code(400).send({ error: "Payment provider is required." });
      }
      if (!isPurchasePlanCode(body.planCode)) {
        return reply.code(400).send({ error: "A valid checkout plan is required." });
      }
      const planCode = body.planCode;
      const billingKind = body.billingKind ?? "subscription";
      if (!isCheckoutBillingKind(billingKind) || (planCode === "single-score" && billingKind !== "one_time") || (billingKind === "one_time" && body.provider !== "stripe")) {
        return reply.code(400).send({ error: "Invalid purchase type or payment provider." });
      }

      const profile = request.authUserId ? getUserProfile(request.authUserId) : null;
      const customerEmail = profile?.email ?? null;
      if (!customerEmail) {
        return reply.code(400).send({ error: "A registered account is required before payment." });
      }

      let targetDocumentId: string | null = null;
      let intendedActionJson: string | null = null;
      try {
        if (body.targetDocumentId !== undefined && body.targetDocumentId !== null) {
          if (typeof body.targetDocumentId !== "string" || !body.targetDocumentId.trim()) return reply.code(400).send({ error: "A valid target score is required." });
          targetDocumentId = body.targetDocumentId.trim();
        }
        if (body.intendedAction && !targetDocumentId) return reply.code(400).send({ error: "An intended action requires a target score." });
        if (targetDocumentId && db.prepare("SELECT id FROM score_upload_drafts WHERE document_id = ? AND user_id = ?").get(targetDocumentId, request.authUserId!)) assertDraftAssessment(targetDocumentId, request.authUserId!);
        const action = normalizeCheckoutContinuation(request.authUserId!, targetDocumentId, body.intendedAction);
        if (targetDocumentId && planCode === "single-score") assertScorePassPurchaseTarget(db, request.authUserId!, targetDocumentId);
        intendedActionJson = action ? JSON.stringify(action) : null;
      } catch (error) {
        const typed = error instanceof ScorePassError || error instanceof CheckoutContinuationError || error instanceof RecognitionAdmissionError;
        return reply.code(typed ? error.statusCode : 400).send({ error: error instanceof Error ? error.message : "Invalid checkout continuation.", code: typed ? error.code : "CHECKOUT_CONTINUATION_INVALID" });
      }

      let returnContext;
      try {
        returnContext = validateCheckoutReturn(body, targetDocumentId, Boolean(intendedActionJson));
        delete returnContext.state.uploadDraftId;
        delete returnContext.state.confirmation;
        const draft = targetDocumentId ? db.prepare("SELECT id FROM score_upload_drafts WHERE document_id = ? AND user_id = ? AND status <> 'expired'").get(targetDocumentId, request.authUserId!) as { id: string } | undefined : undefined;
        if (draft && intendedActionJson && JSON.parse(intendedActionJson).kind === "recognition") {
          returnContext.state.uploadDraftId = draft.id;
          returnContext.state.confirmation = "required";
          returnContext = validateCheckoutReturn({ returnSite: returnContext.site, returnPath: returnContext.path, returnState: returnContext.state }, targetDocumentId, true);
        }
        else returnContext = validateCheckoutReturn({ returnSite: returnContext.site, returnPath: returnContext.path, returnState: returnContext.state }, targetDocumentId, Boolean(intendedActionJson));
      } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid return context.", code: "CHECKOUT_RETURN_INVALID" }); }

      const organizationId = typeof body.organizationId === "string" && body.organizationId.trim() ? body.organizationId.trim() : null;
      const seatQuantity = organizationId ? Math.max(2, Math.min(Number(body.seatQuantity) || 2, 100_000)) : 1;
      if (billingKind === "one_time" && (organizationId || (planCode !== "single-score" && hasRenewingSubscription(db, request.authUserId!)))) {
        return reply.code(409).send({ error: "Cancel future subscription renewals in Billing before buying a one-time personal plan.", code: "ACTIVE_RECURRING_SUBSCRIPTION" });
      }
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
          planCode,
          billingKind,
          organizationId,
          seatQuantity,
          targetDocumentId,
          intendedActionJson,
          returnContextJson: JSON.stringify(returnContext),
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid idempotency key." });
      }
      const intentKey = normalizedIdempotencyKey(request.headers["idempotency-key"]);
      const checkoutIntentHash = intentKey ? createHash("sha256").update(intentKey).digest("hex") : null;
      const byIntent = checkoutIntentHash ? findPaymentOrderByIntent(request.authUserId!, body.provider, checkoutIntentHash) : undefined;
      if (byIntent && byIntent.idempotency_key_hash !== idempotencyKeyHash) return reply.code(409).send({ error: "This purchase intent already belongs to a different checkout. Restore the original order or explicitly start a new purchase.", code: "CHECKOUT_INTENT_CONFLICT", ...checkoutResponse(byIntent, true) });
      if (byIntent && !["pending", "paid"].includes(byIntent.status)) return reply.code(409).send({ error: "This checkout is closed. Start a new purchase explicitly.", code: "CHECKOUT_INTENT_CLOSED", ...checkoutResponse(byIntent, true) });
      const reusable = idempotencyKeyHash ? findReusablePaymentOrder({
        userId: request.authUserId!,
        provider: body.provider,
        idempotencyKeyHash,
      }) : undefined;
      if (reusable?.checkout_url || reusable?.status === "paid") return reply.send(checkoutResponse(reusable, true));

      const checkoutOrderId = reusable?.id ?? randomUUID();
      const providerSecret = body.provider === "stripe" ? config.stripeSecretKey : config.paddleApiKey;
      const proposedCredential = issueCheckoutReturnToken({ secret: providerSecret, orderId: checkoutOrderId });

      const order = reusable ?? createPaymentOrder({
        orderId: checkoutOrderId,
        userId: request.authUserId!,
        provider: body.provider,
        customerEmail,
        locale: body.locale?.trim() || null,
        entitlementDays: config.entitlementDays,
        billingKind,
        organizationId,
        seatQuantity,
        idempotencyKeyHash,
        targetDocumentId,
        intendedActionJson,
        checkoutIntentHash,
        checkoutPlanCode: planCode,
        passMode: body.passMode === "top_up" && planCode === "single-score" && targetDocumentId ? "top_up" : null,
        returnSite: returnContext.site,
        returnPath: returnContext.path,
        returnStateJson: JSON.stringify(returnContext.state),
        returnTokenHash: proposedCredential.hash,
        returnTokenExpiresAt: proposedCredential.expiresAt,
      });

      if (!order) {
        return reply.code(500).send({ error: "Unable to create payment order." });
      }
      if (order.checkout_url || order.status === "paid") return reply.send(checkoutResponse(order, true));
      let returnCredential = recoverCheckoutReturnToken({ secret: providerSecret, orderId: order.id, hash: order.return_token_hash, expiresAt: order.return_token_expires_at });
      if (order.return_token_hash && !returnCredential) {
        if (order.provider_checkout_started_at || order.checkout_session_id || order.transaction_id) return reply.code(503).send({ error: "The original checkout must be recovered before retrying. Do not pay again.", code: "CHECKOUT_PREPARATION_PENDING", orderId: order.id, token: order.public_token });
        // No provider request has started. A previously disabled provider may
        // now be configured, so initialize its reconstructable credential.
        returnCredential = issueCheckoutReturnToken({ secret: providerSecret, orderId: order.id });
        db.prepare("UPDATE payment_orders SET return_token_hash = ?, return_token_expires_at = ? WHERE id = ? AND provider_checkout_started_at IS NULL").run(returnCredential.hash, returnCredential.expiresAt, order.id);
        order.return_token_hash = returnCredential.hash; order.return_token_expires_at = returnCredential.expiresAt;
      }

      try {
        await saveDurablePaymentOrder(order);
      } catch (error) {
        app.log.error(error);
        return reply.code(503).send({ error: "Unable to persist the payment order safely." });
      }

      const priceId = getCheckoutPriceId(body.provider, planCode, billingKind);
      const providerEnabled = isPaymentProviderEnabled(body.provider, planCode, billingKind) && (body.provider === "stripe" ? Boolean(config.stripeSecretKey) : Boolean(config.paddleApiKey && config.paddleDefaultPaymentLink));
      if (!reusable) {
        void retryOperatorNotification({
          orderId: order.id,
          log: app.log,
          send: () => sendCheckoutIntentAlert(app, {
            order,
            userId: request.authUserId!,
            providerEnabled,
            planCode,
          }, services.sendTransactionalEmail),
        });
      }

      if (!providerEnabled) {
        return reply.code(409).send({
          error: `${body.provider === "stripe" ? "Stripe" : "Paddle"} production checkout is being prepared. Please choose another payment method or try later.`,
          code: "PAYMENT_PROVIDER_BUILDING",
          provider: body.provider,
          orderId: order.id,
        });
      }

      const returnParams = { provider: body.provider, order_id: order.id, token: order.public_token, ...(returnCredential ? { return_token: returnCredential.token } : {}) };
      const successBase = buildLocalizedPublicCheckoutUrl({
        baseUrl: config.publicSiteUrl,
        pathname: "/checkout/success",
        locale: order.locale,
        searchParams: returnParams,
      });
      const cancelBase = buildLocalizedPublicCheckoutUrl({
        baseUrl: config.publicSiteUrl, pathname: "/checkout/cancel", locale: order.locale, searchParams: returnParams,
      });

      try {
        if (body.provider === "stripe") {
          if (billingKind === "one_time") prepareOneTimePurchase(db, { orderId: order.id, userId: request.authUserId!, planCode, priceId: priceId!, targetDocumentId });
          const stripeInput = {
            locale: order.locale,
            billingKind, planCode,
            orderId: order.id,
            publicToken: order.public_token,
            customerEmail: order.customer_email,
            successUrl: `${successBase}&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: cancelBase,
            userId: request.authUserId,
            organizationId,
            seatQuantity,
            priceId: priceId!,
          };
          const paramsHash = createHash("sha256").update(JSON.stringify({ params: buildStripeCheckoutSessionParams(stripeInput), options: buildStripeCheckoutRequestOptions(order.id) })).digest("hex");
          if (!claimStripeCheckoutRequest(order.id, paramsHash)) return reply.code(503).send({ error: "The original checkout parameters must be recovered before retrying. Do not pay again.", code: "CHECKOUT_PREPARATION_PENDING", orderId: order.id, token: order.public_token });
          await persistLocalPaymentOrder(order.id);
          const session = await services.createStripeCheckoutSession(stripeInput);
          attachStripeCheckoutSession(order.id, session.id, session.url ?? null);
          await persistLocalPaymentOrder(order.id);

          return reply.code(201).send({
            provider: "stripe",
            orderId: order.id,
            token: order.public_token,
            returnToken: returnCredential?.token,
            url: session.url,
          });
        }

        if (!claimPaddleCheckoutCreation(order.id)) return reply.code(503).send({ error: "This checkout creation is still being recovered. Check the original order; do not start another payment.", code: "CHECKOUT_PREPARATION_PENDING", ...checkoutResponse(findPaymentOrderById(order.id) ?? order, true) });
        await persistLocalPaymentOrder(order.id);
        const transaction = await services.createPaddleTransaction({
          orderId: order.id,
          publicToken: order.public_token,
          customerEmail: order.customer_email,
          userId: request.authUserId,
          organizationId,
          seatQuantity,
          priceId: priceId!,
        });
        const checkoutUrl = buildPaddleCheckoutRedirectUrl({
          checkoutUrl: localizePublicPaddleCheckoutPageUrl({
            checkoutUrl: transaction.checkout?.url ?? `${config.paddleDefaultPaymentLink}?_ptxn=${transaction.id}`,
            publicSiteUrl: config.publicSiteUrl,
            locale: order.locale,
          }),
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
          returnToken: returnCredential?.token,
          url: checkoutUrl,
        });
      } catch (error) {
        app.log.error({ err: error, orderId: order.id }, "Checkout preparation failed.");
        return reply.code(500).send({
          error: "Unable to prepare payment. Retry this checkout to reuse the original order.",
          code: "CHECKOUT_PREPARATION_FAILED",
        });
      }
    },
  );

  app.post("/payments/checkout", async (request, reply) => {
    const body = (request.body ?? {}) as { provider?: PaymentProvider; email?: string; locale?: string; planCode?: unknown; billingKind?: unknown; returnSite?: unknown; returnPath?: unknown; returnState?: unknown; targetDocumentId?: unknown; intendedAction?: unknown };
    if (body.targetDocumentId || body.intendedAction) return reply.code(401).send({ error: "Sign in before purchasing for an existing score.", code: "AUTH_REQUIRED" });

    if (!isProvider(body.provider)) {
      return reply.code(400).send({ error: "Payment provider is required." });
    }
    if (!isPurchasePlanCode(body.planCode)) {
      return reply.code(400).send({ error: "A valid checkout plan is required." });
    }
    const planCode = body.planCode;
    const billingKind = body.billingKind ?? "subscription";
    if (!isCheckoutBillingKind(billingKind) || (planCode === "single-score" && billingKind !== "one_time") || (billingKind === "one_time" && body.provider !== "stripe")) {
      return reply.code(400).send({ error: "Invalid purchase type or payment provider." });
    }

    const priceId = getCheckoutPriceId(body.provider, planCode, billingKind);
    if (!isPaymentProviderEnabled(body.provider, planCode, billingKind) || !priceId || body.provider === "stripe" && !config.stripeSecretKey || body.provider === "paddle" && (!config.paddleApiKey || !config.paddleDefaultPaymentLink)) {
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
    if (billingKind === "one_time" && planCode !== "single-score" && hasRenewingSubscription(db, account.id)) {
      return reply.code(409).send({ error: "Cancel future subscription renewals in Billing before buying a one-time plan.", code: "ACTIVE_RECURRING_SUBSCRIPTION" });
    }
    let returnContext;
    try { returnContext = validateCheckoutReturn({ ...body, returnSite: body.returnSite ?? "www" }, null, false); }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid return context.", code: "CHECKOUT_RETURN_INVALID" }); }
    delete returnContext.state.uploadDraftId;
    delete returnContext.state.confirmation;
    let idempotencyKeyHash: string | null;
    try {
      idempotencyKeyHash = checkoutIdempotencyHash({
        header: request.headers["idempotency-key"],
        userId: account.id,
        provider: body.provider,
        planCode,
        billingKind,
        returnContextJson: JSON.stringify(returnContext),
      });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid idempotency key." });
    }
    const intentKey = normalizedIdempotencyKey(request.headers["idempotency-key"]);
    const checkoutIntentHash = intentKey ? createHash("sha256").update(intentKey).digest("hex") : null;
    const byIntent = checkoutIntentHash ? findPaymentOrderByIntent(account.id, body.provider, checkoutIntentHash) : undefined;
    if (byIntent && byIntent.idempotency_key_hash !== idempotencyKeyHash) return reply.code(409).send({ error: "Restore the original checkout or explicitly start a new purchase.", code: "CHECKOUT_INTENT_CONFLICT" });
    if (byIntent && !["pending", "paid"].includes(byIntent.status)) return reply.code(409).send({ error: "This checkout is closed. Start a new purchase explicitly.", code: "CHECKOUT_INTENT_CLOSED" });
    const reusable = idempotencyKeyHash ? findReusablePaymentOrder({
      userId: account.id,
      provider: body.provider,
      idempotencyKeyHash,
    }) : undefined;
    if (reusable?.checkout_url || reusable?.status === "paid") return reply.send(checkoutResponse(reusable));

    const checkoutOrderId = reusable?.id ?? randomUUID();
    const providerSecret = body.provider === "stripe" ? config.stripeSecretKey : config.paddleApiKey;
    const proposedCredential = issueCheckoutReturnToken({ secret: providerSecret, orderId: checkoutOrderId });

    const order = reusable ?? createPaymentOrder({
      orderId: checkoutOrderId,
      userId: account.id,
      provider: body.provider,
      customerEmail: account.email,
      locale: body.locale?.trim() || null,
      entitlementDays: config.entitlementDays,
      billingKind,
      idempotencyKeyHash,
      checkoutIntentHash,
      checkoutPlanCode: planCode,
      returnSite: returnContext.site,
      returnPath: returnContext.path,
      returnStateJson: JSON.stringify(returnContext.state),
      returnTokenHash: proposedCredential.hash,
      returnTokenExpiresAt: proposedCredential.expiresAt,
    });

    if (!order) {
      return reply.code(500).send({ error: "Unable to create payment order." });
    }
    if (order.checkout_url || order.status === "paid") return reply.send(checkoutResponse(order));
    let returnCredential = recoverCheckoutReturnToken({ secret: providerSecret, orderId: order.id, hash: order.return_token_hash, expiresAt: order.return_token_expires_at });
    if (order.return_token_hash && !returnCredential) {
      if (order.provider_checkout_started_at || order.checkout_session_id || order.transaction_id) return reply.code(503).send({ error: "The original checkout must be recovered before retrying. Do not pay again.", code: "CHECKOUT_PREPARATION_PENDING", orderId: order.id, token: order.public_token });
      returnCredential = issueCheckoutReturnToken({ secret: providerSecret, orderId: order.id });
      db.prepare("UPDATE payment_orders SET return_token_hash = ?, return_token_expires_at = ? WHERE id = ? AND provider_checkout_started_at IS NULL").run(returnCredential.hash, returnCredential.expiresAt, order.id);
      order.return_token_hash = returnCredential.hash; order.return_token_expires_at = returnCredential.expiresAt;
    }

    try {
      await saveDurablePaymentOrder(order);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: "Unable to persist the payment order safely." });
    }

    const returnParams = { provider: body.provider, order_id: order.id, token: order.public_token, ...(returnCredential ? { return_token: returnCredential.token } : {}) };
    const successBase = buildLocalizedPublicCheckoutUrl({
      baseUrl: config.publicSiteUrl,
      pathname: "/checkout/success",
      locale: order.locale,
      searchParams: returnParams,
    });
    const cancelBase = buildLocalizedPublicCheckoutUrl({
      baseUrl: config.publicSiteUrl,
      pathname: "/checkout/cancel",
      locale: order.locale,
      searchParams: returnParams,
    });

    try {
      if (body.provider === "stripe") {
        if (billingKind === "one_time") prepareOneTimePurchase(db, { orderId: order.id, userId: account.id, planCode, priceId });
        const stripeInput = {
          locale: order.locale,
          billingKind, planCode,
          orderId: order.id,
          publicToken: order.public_token,
          customerEmail: order.customer_email,
          userId: account.id,
          priceId,
          successUrl: `${successBase}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: cancelBase,
        };
        const paramsHash = createHash("sha256").update(JSON.stringify({ params: buildStripeCheckoutSessionParams(stripeInput), options: buildStripeCheckoutRequestOptions(order.id) })).digest("hex");
        if (!claimStripeCheckoutRequest(order.id, paramsHash)) return reply.code(503).send({ error: "The original checkout parameters must be recovered before retrying. Do not pay again.", code: "CHECKOUT_PREPARATION_PENDING", orderId: order.id, token: order.public_token });
        await persistLocalPaymentOrder(order.id);
        const session = await services.createStripeCheckoutSession(stripeInput);
        attachStripeCheckoutSession(order.id, session.id, session.url ?? null);
        await persistLocalPaymentOrder(order.id);

        return reply.code(201).send({
          provider: "stripe",
          orderId: order.id,
          token: order.public_token,
          returnToken: returnCredential?.token,
          url: session.url,
        });
      }

      if (!claimPaddleCheckoutCreation(order.id)) return reply.code(503).send({ error: "This checkout creation is still being recovered. Check the original order; do not start another payment.", code: "CHECKOUT_PREPARATION_PENDING", ...checkoutResponse(findPaymentOrderById(order.id) ?? order) });
      await persistLocalPaymentOrder(order.id);
      const transaction = await services.createPaddleTransaction({
        orderId: order.id,
        publicToken: order.public_token,
        customerEmail: order.customer_email,
        userId: account.id,
        priceId,
      });
      const checkoutUrl = buildPaddleCheckoutRedirectUrl({
        checkoutUrl: localizePublicPaddleCheckoutPageUrl({
          checkoutUrl: transaction.checkout?.url ?? `${config.paddleDefaultPaymentLink}?_ptxn=${transaction.id}`,
          publicSiteUrl: config.publicSiteUrl,
          locale: order.locale,
        }),
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
        returnToken: returnCredential?.token,
        url: checkoutUrl,
      });
    } catch (error) {
      app.log.error({ err: error, orderId: order.id }, "Checkout preparation failed.");
      return reply.code(500).send({
        error: "Unable to prepare payment. Retry this checkout to reuse the original order.",
        code: "CHECKOUT_PREPARATION_FAILED",
      });
    }
  });

  app.get("/payments/orders/by-intent", { preHandler: app.requireAuth }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const query = request.query as { provider?: PaymentProvider; intent_id?: string };
    if (!isProvider(query.provider)) return reply.code(400).send({ error: "Invalid provider." });
    let key;
    try { key = normalizedIdempotencyKey(query.intent_id); } catch { return reply.code(400).send({ error: "Invalid purchase intent." }); }
    if (!key) return reply.code(400).send({ error: "Purchase intent is required." });
    const order = findPaymentOrderByIntent(request.authUserId!, query.provider, createHash("sha256").update(key).digest("hex"));
    if (!order) return reply.code(404).send({ error: "Purchase intent not found." });
    return reply.send(checkoutResponse(order, true));
  });
  app.get("/payments/orders", { preHandler: app.requireAuth }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const query = request.query as { pending?: string };
    return reply.send({ orders: listPaymentOrdersForUser(request.authUserId!, query.pending === "1").map(order => ({ ...mapPaymentOrderForPublic(order, true), token: order.public_token })) });
  });
  app.post("/payments/orders/:id/return", { preHandler: app.requireAuth }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { returnToken?: unknown };
    const localOrder = findPaymentOrderById(id);
    const order = localOrder ?? await durable.findById(id);
    if (!order || order.user_id !== request.authUserId) return reply.code(404).send({ error: "Payment order not found." });
    const returnContext = orderCheckoutReturnContext(order);
    if (body.returnToken !== undefined) {
      const consumed = typeof body.returnToken === "string" && (localOrder ? consumeCheckoutReturnToken(db, id, request.authUserId!, body.returnToken)
        : await durable.consumeReturnToken({ orderId: id, userId: request.authUserId!, token: body.returnToken }));
      if (!consumed) return reply.code(409).send({ error: "Return link expired or already used. Restore this order from your account.", code: "CHECKOUT_RETURN_TOKEN_INVALID" });
    }
    if (localOrder) await persistLocalPaymentOrder(id);
    return reply.send({ returnContext, mirrorOnly: !localOrder });
  });
  app.get("/payments/orders/:id/owned", { preHandler: app.requireAuth }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const id = (request.params as { id: string }).id;
    const localOrder = findPaymentOrderById(id);
    const order = localOrder ?? await durable.findById(id);
    if (!order || order.user_id !== request.authUserId) return reply.code(404).send({ error: "Payment order not found." });
    if (!localOrder) return reply.send({ order: { ...mirrorOrderView(order, true), token: null }, token: null, verification: mirrorOrderVerification(order, request.authUserId) });
    let check = orderChecks.get(order.id);
    if (!check) {
      check = verifyAndFulfill(order, order.public_token);
      orderChecks.set(order.id, check);
      const cleanup = () => { if (orderChecks.get(order.id) === check) orderChecks.delete(order.id); };
      void check.then(cleanup, cleanup);
    }
    const verification = await check;
    const refreshed = findPaymentOrderById(order.id) ?? order;
    return reply.send({ order: { ...mapPaymentOrderForPublic(refreshed, true), token: refreshed.public_token }, token: refreshed.public_token, verification });
  });
  app.get("/payments/orders/:id", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (request.headers.authorization || readSessionCookie(request, config.publicApiUrl)) {
      await app.requireAuth(request, reply);
      if (reply.sent) return;
    }
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

    let order = await findOrderForPublicDurably(params.id, query.token);

    if (!order && query.provider === "stripe" && query.sessionId) {
      try {
        const session = await services.retrieveStripeCheckoutSession(query.sessionId);
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
        return reply.code(503).send({ error: "Payment verification is temporarily unavailable. Retry this order; do not pay again.", code: "PAYMENT_VERIFICATION_FAILED" });
      }
    }

    if (!order) return reply.code(404).send({ error: "Payment order not found." });
    if (!findPaymentOrderById(order.id)) return reply.send({ order: mirrorOrderView(order, Boolean(request.authUserId && request.authUserId === order.user_id)), verification: mirrorOrderVerification(order, request.authUserId) });

    // Coalesce concurrent browser polls/retries for the same token-verified order.
    let check = orderChecks.get(order.id);
    if (!check) {
      check = verifyAndFulfill(order, query.token, query.sessionId, query.transactionId);
      orderChecks.set(order.id, check);
      const cleanup = () => { if (orderChecks.get(order!.id) === check) orderChecks.delete(order!.id); };
      void check.then(cleanup, cleanup);
    }
    const verification = await check;

    const refreshed = await findOrderForPublicDurably(params.id, query.token);
    const current = refreshed ?? order;
    return reply.send({ order: mapPaymentOrderForPublic(current, Boolean(request.authUserId && request.authUserId === current.user_id)), verification });
  });

  app.post("/payments/orders/:id/cancel", async (request, reply) => {
    const params = request.params as { id: string };
    const body = (request.body ?? {}) as { token?: string };

    if (!body.token) {
      return reply.code(400).send({ error: "Order token is required." });
    }

    const order = await findOrderForPublicDurably(params.id, body.token);
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
    const body = (request.body ?? {}) as { provider?: PaymentProvider; locale?: string };
    if (body.provider !== "stripe") {
      return reply.code(400).send({ error: "A Stripe subscription is required for this billing portal." });
    }
    const customer = db.prepare(`
      SELECT provider_customer_id AS providerCustomerId FROM billing_customers
      WHERE provider = 'stripe' AND user_id = ? ORDER BY datetime(updated_at) DESC LIMIT 1
    `).get(request.authUserId!) as { providerCustomerId: string } | undefined;
    if (!customer) return reply.code(404).send({ error: "Stripe billing customer not found." });
    try {
      const returnUrl = buildLocalizedAppReturnUrl({
        baseUrl: config.publicAppUrl,
        locale: body.locale,
        nextPath: "/billing",
      });
      const session = await createStripeBillingPortalSession(customer.providerCustomerId, returnUrl);
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
