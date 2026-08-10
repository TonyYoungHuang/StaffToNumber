import { createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import type { PaymentProvider } from "@score/shared";
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

const stripeClient = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;
const paddleApiBase = config.paddleEnvironment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

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

export function listEnabledPaymentProviders() {
  return config.paymentProviders.filter((provider): provider is PaymentProvider => provider === "stripe" || provider === "paddle");
}

export function isPaymentProviderEnabled(provider: PaymentProvider) {
  return listEnabledPaymentProviders().includes(provider);
}

export function getPaddleClientEnvironment() {
  return config.paddleEnvironment === "production" ? "production" : "sandbox";
}

export async function createStripeCheckoutSession(input: {
  orderId: string;
  publicToken: string;
  customerEmail?: string | null;
  successUrl?: string;
  cancelUrl?: string;
  userId?: string | null;
  organizationId?: string | null;
  seatQuantity?: number;
  priceId?: string;
}) {
  const priceId = input.priceId ?? config.stripePriceId;
  if (!stripeClient || !priceId) {
    throw new Error("Stripe is not configured.");
  }

  const metadata = {
    orderId: input.orderId,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    seatQuantity: String(Math.max(1, input.seatQuantity ?? 1)),
  };
  const params: Stripe.Checkout.SessionCreateParams = {
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
  };
  if (config.paymentBillingMode === "subscription") params.subscription_data = { metadata };
  const session = await stripeClient.checkout.sessions.create(params);

  return session;
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  if (!stripeClient) {
    throw new Error("Stripe is not configured.");
  }

  return stripeClient.checkout.sessions.retrieve(sessionId);
}

export function verifyStripeWebhook(rawBody: Buffer, signature: string) {
  if (!stripeClient || !config.stripeWebhookSecret) {
    throw new Error("Stripe webhook is not configured.");
  }

  return stripeClient.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
}

export async function createPaddleTransaction(input: {
  orderId: string;
  publicToken: string;
  customerEmail?: string | null;
  successUrl?: string;
  userId?: string | null;
  organizationId?: string | null;
  seatQuantity?: number;
  priceId?: string;
}) {
  const priceId = input.priceId ?? config.paddlePriceId;
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
        success_url:
          input.successUrl ?? `${config.publicSiteUrl}/checkout/success?provider=paddle&order_id=${input.orderId}&token=${input.publicToken}`,
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

export function verifyPaddleWebhook(rawBody: Buffer, signatureHeader: string) {
  if (!config.paddleWebhookSecret) {
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
  const expectedSignature = createHmac("sha256", config.paddleWebhookSecret).update(signedPayload).digest("hex");
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
