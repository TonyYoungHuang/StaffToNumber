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
const paddleApiBase = "https://api.paddle.com";

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
}) {
  if (!stripeClient || !config.stripePriceId) {
    throw new Error("Stripe is not configured.");
  }

  const session = await stripeClient.checkout.sessions.create({
    mode: "payment",
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    line_items: [
      {
        price: config.stripePriceId,
        quantity: 1,
      },
    ],
    customer_email: input.customerEmail ?? undefined,
    metadata: {
      orderId: input.orderId,
    },
    success_url:
      input.successUrl ??
      `${config.publicSiteUrl}/checkout/success?provider=stripe&order_id=${input.orderId}&token=${input.publicToken}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      input.cancelUrl ?? `${config.publicSiteUrl}/checkout/cancel?provider=stripe&order_id=${input.orderId}&token=${input.publicToken}`,
  });

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
}) {
  if (!config.paddleApiKey || !config.paddlePriceId || !config.paddleDefaultPaymentLink) {
    throw new Error("Paddle is not configured.");
  }

  const response = await fetch(`${paddleApiBase}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.paddleApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: config.paddlePriceId, quantity: 1 }],
      collection_mode: "automatic",
      custom_data: {
        orderId: input.orderId,
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

  const response = await fetch(`${paddleApiBase}/transactions/${transactionId}`, {
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

  const signedPayload = `${timestamp}:${rawBody.toString("utf8")}`;
  const expectedSignature = createHmac("sha256", config.paddleWebhookSecret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new Error("Invalid Paddle webhook signature.");
  }
}
