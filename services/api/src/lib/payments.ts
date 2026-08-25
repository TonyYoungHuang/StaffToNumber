import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import type { CheckoutPlanCode, PaymentProvider } from "@score/shared";
import { config } from "../config.js";

type PaddleTransactionResponse = {
  data: {
    id: string;
    status: string;
    checkout?: {
      url?: string | null;
    } | null;
    details?: {
      totals?: {
        grand_total?: string;
        currency_code?: string;
      } | null;
    } | null;
    payments?: Array<{
      amount?: string;
      status?: string;
    }>;
  };
};

const stripeClient = config.stripeSecretKey
  ? new Stripe(normalizeStripeCredential(config.stripeSecretKey))
  : null;
const paddleApiBase = config.paddleEnvironment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
const stripeManagedPaymentsApiVersion = "2026-03-04.preview";

type StripeCheckoutSessionInput = {
  orderId: string;
  publicToken: string;
  customerEmail?: string | null;
  successUrl?: string;
  cancelUrl?: string;
  userId?: string | null;
  organizationId?: string | null;
  seatQuantity?: number;
  priceId: string;
};

type ManagedPaymentsCheckoutParams = Stripe.Checkout.SessionCreateParams & {
  managed_payments?: { enabled: true };
};

function normalizePaddleTransactionId(value: string) {
  const transactionId = value.trim();
  if (!transactionId.startsWith("txn_") || transactionId.length < 5 || transactionId.length > 80) {
    throw new Error("Invalid Paddle transaction id.");
  }
  for (const character of transactionId.slice(4)) {
    const code = character.charCodeAt(0);
    const allowed = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    if (!allowed) throw new Error("Invalid Paddle transaction id.");
  }
  return transactionId;
}

export function buildPaddleTransactionEndpoint(transactionId: string) {
  const safeTransactionId = normalizePaddleTransactionId(transactionId);
  return new URL(`/transactions/${encodeURIComponent(safeTransactionId)}`, paddleApiBase);
}

export function buildPaddleCheckoutRedirectUrl(input: {
  checkoutUrl: string;
  transactionId: string;
  orderId: string;
  publicToken: string;
  successUrl: string;
}) {
  const transactionId = normalizePaddleTransactionId(input.transactionId);
  const checkoutUrl = new URL(input.checkoutUrl);
  if (checkoutUrl.protocol !== "https:" && checkoutUrl.protocol !== "http:") {
    throw new Error("Invalid Paddle checkout URL.");
  }
  checkoutUrl.searchParams.set("_ptxn", transactionId);
  checkoutUrl.searchParams.set("order_id", input.orderId);
  checkoutUrl.searchParams.set("token", input.publicToken);
  checkoutUrl.searchParams.set("success_url", input.successUrl);
  return checkoutUrl.toString();
}

export function listEnabledPaymentProviders() {
  return config.paymentProviders.filter((provider): provider is PaymentProvider => provider === "stripe" || provider === "paddle");
}

export type CheckoutPlanPriceIds = Record<CheckoutPlanCode, string>;

export function resolveCheckoutPriceId(planCode: CheckoutPlanCode, priceIds: CheckoutPlanPriceIds) {
  const priceId = priceIds[planCode]?.trim() ?? "";
  return priceId || null;
}

function configuredCheckoutPriceIds(provider: PaymentProvider): CheckoutPlanPriceIds {
  return provider === "stripe"
    ? {
        "starter-monthly": config.stripeStarterMonthlyPriceId,
        "starter-annual": config.stripeStarterAnnualPriceId,
        "converter-pro-monthly": config.stripeConverterProMonthlyPriceId,
        "converter-pro-annual": config.stripeConverterProAnnualPriceId,
      }
    : {
        "starter-monthly": config.paddleStarterMonthlyPriceId,
        "starter-annual": config.paddleStarterAnnualPriceId,
        "converter-pro-monthly": config.paddleConverterProMonthlyPriceId,
        "converter-pro-annual": config.paddleConverterProAnnualPriceId,
      };
}

export function getCheckoutPriceId(provider: PaymentProvider, planCode: CheckoutPlanCode) {
  return resolveCheckoutPriceId(planCode, configuredCheckoutPriceIds(provider));
}

export function isPaymentProviderEnabled(provider: PaymentProvider, planCode: CheckoutPlanCode) {
  return listEnabledPaymentProviders().includes(provider) && Boolean(getCheckoutPriceId(provider, planCode));
}

export function getPaddleClientEnvironment() {
  return config.paddleEnvironment === "production" ? "production" : "sandbox";
}

export function buildStripeCheckoutSessionParams(
  input: StripeCheckoutSessionInput,
  options: { managedPaymentsEnabled?: boolean } = {},
) {
  const priceId = normalizeStripeCredential(input.priceId);
  if (!priceId) {
    throw new Error("Stripe is not configured.");
  }

  const metadata = {
    orderId: input.orderId,
    orderTokenHash: hashPaymentOrderToken(input.publicToken),
    priceId,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    seatQuantity: String(Math.max(1, input.seatQuantity ?? 1)),
  };
  const params: ManagedPaymentsCheckoutParams = {
    mode: config.paymentBillingMode,
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    line_items: [
      {
        price: priceId,
        quantity: Math.max(1, input.seatQuantity ?? 1),
      },
    ],
    customer_email: input.customerEmail ?? undefined,
    metadata,
    success_url:
      input.successUrl ??
      `${config.publicSiteUrl}/checkout/success?provider=stripe&order_id=${input.orderId}&token=${input.publicToken}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      input.cancelUrl ?? `${config.publicSiteUrl}/checkout/cancel?provider=stripe&order_id=${input.orderId}&token=${input.publicToken}`,
    ...((options.managedPaymentsEnabled ?? config.stripeManagedPaymentsEnabled)
      ? { managed_payments: { enabled: true as const } }
      : {}),
  };
  if (config.paymentBillingMode === "subscription") params.subscription_data = { metadata };
  return params;
}

export function hashPaymentOrderToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function stripeSessionMatchesPaymentOrder(
  session: Pick<Stripe.Checkout.Session, "id" | "metadata" | "success_url">,
  input: { orderId: string; publicToken: string; sessionId: string },
) {
  if (session.id !== input.sessionId || session.metadata?.orderId !== input.orderId) return false;
  const expectedHash = hashPaymentOrderToken(input.publicToken);
  const metadataHash = session.metadata?.orderTokenHash;
  if (metadataHash) {
    const expected = Buffer.from(expectedHash, "hex");
    const provided = Buffer.from(metadataHash, "hex");
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  }

  if (!session.success_url) return false;
  try {
    const successUrl = new URL(session.success_url);
    const returnSessionId = successUrl.searchParams.get("session_id");
    return successUrl.searchParams.get("order_id") === input.orderId
      && successUrl.searchParams.get("token") === input.publicToken
      && (returnSessionId === "{CHECKOUT_SESSION_ID}" || returnSessionId === input.sessionId);
  } catch {
    return false;
  }
}

export function normalizeStripeCredential(value: string) {
  return value.replace(/\s+/gu, "");
}

export const normalizeWebhookSigningSecret = normalizeStripeCredential;

export function buildStripeCheckoutRequestOptions(orderId: string, managedPaymentsEnabled = config.stripeManagedPaymentsEnabled) {
  const requestOptions: Stripe.RequestOptions = {
    idempotencyKey: `scoretransposer-checkout-${orderId}`,
  };
  if (managedPaymentsEnabled) requestOptions.apiVersion = stripeManagedPaymentsApiVersion;
  return requestOptions;
}

export async function createStripeCheckoutSession(input: StripeCheckoutSessionInput) {
  if (!stripeClient) {
    throw new Error("Stripe is not configured.");
  }

  const params = buildStripeCheckoutSessionParams(input);
  const session = await stripeClient.checkout.sessions.create(
    params,
    buildStripeCheckoutRequestOptions(input.orderId),
  );

  return session;
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  if (!stripeClient) {
    throw new Error("Stripe is not configured.");
  }

  return stripeClient.checkout.sessions.retrieve(sessionId);
}

export function verifyStripeWebhook(rawBody: Buffer, signature: string) {
  const webhookSecret = normalizeWebhookSigningSecret(config.stripeWebhookSecret);
  if (!stripeClient || !webhookSecret) {
    throw new Error("Stripe webhook is not configured.");
  }

  return stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function expireStripeCheckoutSession(sessionId: string) {
  if (!stripeClient) throw new Error("Stripe is not configured.");
  return stripeClient.checkout.sessions.expire(sessionId);
}

export async function cancelStripeSubscription(subscriptionId: string, atPeriodEnd: boolean) {
  if (!stripeClient) throw new Error("Stripe is not configured.");
  const current = await stripeClient.subscriptions.retrieve(subscriptionId);
  if (current.status === "canceled" || (atPeriodEnd && current.cancel_at_period_end)) return current;
  return atPeriodEnd
    ? stripeClient.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
    : stripeClient.subscriptions.cancel(subscriptionId);
}

export async function createPaddleTransaction(input: {
  orderId: string;
  publicToken: string;
  customerEmail?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  seatQuantity?: number;
  priceId: string;
}) {
  const priceId = input.priceId.trim();
  if (!config.paddleApiKey || !priceId || !config.paddleDefaultPaymentLink) {
    throw new Error("Paddle is not configured.");
  }

  const response = await fetch(`${paddleApiBase}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.paddleApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: Math.max(1, input.seatQuantity ?? 1) }],
      collection_mode: "automatic",
      custom_data: {
        orderId: input.orderId,
        userId: input.userId ?? undefined,
        organizationId: input.organizationId ?? undefined,
        seatQuantity: Math.max(1, input.seatQuantity ?? 1),
      },
      checkout: {
        url: config.paddleDefaultPaymentLink,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as PaddleTransactionResponse | { error?: { detail?: string } } | null;
  if (!response.ok || !payload || !("data" in payload)) {
    const message = payload && "error" in payload ? payload.error?.detail : undefined;
    throw new Error(message ?? "Unable to create Paddle transaction.");
  }

  return payload.data;
}

export async function retrievePaddleTransaction(transactionId: string) {
  if (!config.paddleApiKey) {
    throw new Error("Paddle is not configured.");
  }

  const endpoint = buildPaddleTransactionEndpoint(transactionId);
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${config.paddleApiKey}`,
      "Content-Type": "application/json",
    },
  });

  const payload = (await response.json().catch(() => null)) as PaddleTransactionResponse | { error?: { detail?: string } } | null;
  if (!response.ok || !payload || !("data" in payload)) {
    const message = payload && "error" in payload ? payload.error?.detail : undefined;
    throw new Error(message ?? "Unable to retrieve Paddle transaction.");
  }

  return payload.data;
}

export async function cancelPaddleSubscription(subscriptionId: string, atPeriodEnd: boolean) {
  if (!config.paddleApiKey) throw new Error("Paddle is not configured.");
  const normalized = subscriptionId.trim();
  if (!/^sub_[A-Za-z0-9]+$/u.test(normalized)) throw new Error("Invalid Paddle subscription id.");
  const subscriptionResponse = await fetch(`${paddleApiBase}/subscriptions/${encodeURIComponent(normalized)}`, {
    headers: {
      Authorization: `Bearer ${config.paddleApiKey}`,
      "Content-Type": "application/json",
    },
  });
  const current = await subscriptionResponse.json().catch(() => null) as {
    data?: { status?: string; scheduled_change?: { action?: string } | null };
    error?: { detail?: string };
  } | null;
  if (!subscriptionResponse.ok) throw new Error(current?.error?.detail ?? "Unable to retrieve Paddle subscription.");
  if (current?.data?.status === "canceled" || (atPeriodEnd && current?.data?.scheduled_change?.action === "cancel")) {
    return current.data;
  }
  const response = await fetch(`${paddleApiBase}/subscriptions/${encodeURIComponent(normalized)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.paddleApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ effective_from: atPeriodEnd ? "next_billing_period" : "immediately" }),
  });
  const payload = await response.json().catch(() => null) as { data?: unknown; error?: { detail?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.detail ?? "Unable to cancel Paddle subscription.");
  return payload?.data;
}

export function verifyPaddleWebhook(rawBody: Buffer, signatureHeader: string) {
  const webhookSecret = normalizeWebhookSigningSecret(config.paddleWebhookSecret);
  if (!webhookSecret) {
    throw new Error("Paddle webhook is not configured.");
  }

  const parts = signatureHeader.split(";").reduce<Record<string, string>>((accumulator, item) => {
    const [key, value] = item.split("=");
    if (key && value) {
      accumulator[key.trim()] = value.trim();
    }
    return accumulator;
  }, {});

  const timestamp = parts.ts;
  const signature = parts.h1;
  if (!timestamp || !signature) {
    throw new Error("Invalid Paddle signature header.");
  }
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    throw new Error("Paddle webhook timestamp is outside the allowed tolerance.");
  }

  const signedPayload = `${timestamp}:${rawBody.toString("utf8")}`;
  const expectedSignature = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new Error("Invalid Paddle webhook signature.");
  }
}

export async function createStripeBillingPortalSession(customerId: string, returnUrl: string) {
  if (!stripeClient) throw new Error("Stripe is not configured.");
  return stripeClient.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}
