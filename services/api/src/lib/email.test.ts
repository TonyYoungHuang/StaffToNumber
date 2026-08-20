import assert from "node:assert/strict";
import test from "node:test";
import { buildCheckoutIntentNotificationEmail, buildPaymentNotificationEmail } from "./email.js";

test("payment notification email contains demand-validation details without secrets", () => {
  const email = buildPaymentNotificationEmail({
    provider: "paddle",
    environment: "sandbox",
    orderId: "order-123",
    providerReference: "txn_123",
    customerEmail: "buyer@example.com",
    amountMinor: 999,
    currency: "usd",
    billingKind: "subscription",
    paidAt: "2026-08-18T12:00:00.000Z",
  });

  assert.match(email.subject, /\[Payment TEST\]\[Paddle\] USD 9\.99/u);
  assert.match(email.text, /Order: order-123/u);
  assert.match(email.text, /Customer email: buyer@example\.com/u);
  assert.match(email.html, /txn_123/u);
  assert.doesNotMatch(email.text, /public_token|webhook secret|api key/iu);
  assert.match(email.text, /not evidence of customer demand/u);
});

test("checkout intent email distinguishes purchase interest from a completed payment", () => {
  const email = buildCheckoutIntentNotificationEmail({
    provider: "stripe",
    siteEnvironment: "production",
    providerEnabled: false,
    orderId: "order-intent-123",
    userId: "user-123",
    customerEmail: "buyer@example.com",
    locale: "zh-CN",
    billingKind: "subscription",
    organizationId: null,
    seatQuantity: 1,
    createdAt: "2026-08-20T10:00:00.000Z",
  });

  assert.match(email.subject, /\[Checkout intent\]\[PRODUCTION SITE\]\[Stripe\]/u);
  assert.match(email.text, /purchase-intent evidence, not a confirmed payment/u);
  assert.match(email.text, /Provider status: not yet enabled/u);
  assert.match(email.text, /Customer email: buyer@example\.com/u);
  assert.match(email.html, /construction notice/u);
  assert.doesNotMatch(email.text, /public_token|webhook secret|api key/iu);
});
