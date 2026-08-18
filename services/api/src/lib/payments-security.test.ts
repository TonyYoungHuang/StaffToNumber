import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPaddleTransactionEndpoint,
  buildPaddleCheckoutRedirectUrl,
  buildStripeCheckoutSessionParams,
  hashPaymentOrderToken,
  normalizeStripeCredential,
  normalizeWebhookSigningSecret,
  stripeSessionMatchesPaymentOrder,
} from "./payments.js";

test("Paddle checkout links carry the order return context without changing the transaction", () => {
  const checkoutUrl = buildPaddleCheckoutRedirectUrl({
    checkoutUrl: "https://scoretransposer.com/checkout/paddle?_ptxn=txn_01abcDEF234",
    transactionId: "txn_01abcDEF234",
    orderId: "order-1",
    publicToken: "public-token",
    successUrl: "https://app.scoretransposer.com/checkout/success?provider=paddle&order_id=order-1&token=public-token",
  });
  const parsed = new URL(checkoutUrl);
  assert.equal(parsed.searchParams.get("_ptxn"), "txn_01abcDEF234");
  assert.equal(parsed.searchParams.get("order_id"), "order-1");
  assert.equal(parsed.searchParams.get("token"), "public-token");
  assert.equal(
    parsed.searchParams.get("success_url"),
    "https://app.scoretransposer.com/checkout/success?provider=paddle&order_id=order-1&token=public-token",
  );
});

test("Paddle transaction lookup stays on an approved host and rejects path injection", () => {
  const endpoint = buildPaddleTransactionEndpoint("txn_01abcDEF234");
  assert.ok(["api.paddle.com", "sandbox-api.paddle.com"].includes(endpoint.hostname));
  assert.equal(endpoint.pathname, "/transactions/txn_01abcDEF234");

  for (const candidate of [
    "https://attacker.example/",
    "txn_../prices",
    "txn_%2f%2fattacker.example",
    "txn_01abc?redirect=https://attacker.example",
  ]) {
    assert.throws(() => buildPaddleTransactionEndpoint(candidate), /Invalid Paddle transaction id/u);
  }
});

test("Stripe Checkout enables Managed Payments only when configured", () => {
  const input = {
    orderId: "order-1",
    publicToken: "public-token",
    priceId: "price_test",
    seatQuantity: 12,
    organizationId: "school-1",
  };

  const managed = buildStripeCheckoutSessionParams(input, { managedPaymentsEnabled: true });
  assert.deepEqual(managed.managed_payments, { enabled: true });
  assert.equal(managed.line_items?.[0]?.quantity, 12);
  assert.equal(managed.metadata?.seatQuantity, "12");
  assert.equal(managed.metadata?.orderTokenHash, hashPaymentOrderToken("public-token"));

  const standard = buildStripeCheckoutSessionParams(input, { managedPaymentsEnabled: false });
  assert.equal(standard.managed_payments, undefined);
});

test("Stripe return recovery requires the order, session, and public token to match", () => {
  const session = {
    id: "cs_test_recovery",
    metadata: { orderId: "order-recovery" },
    success_url: "https://staging.scoretransposer.com/checkout/success?provider=stripe&order_id=order-recovery&token=secret-token&session_id=%7BCHECKOUT_SESSION_ID%7D",
  };

  assert.equal(stripeSessionMatchesPaymentOrder(session, {
    orderId: "order-recovery",
    publicToken: "secret-token",
    sessionId: "cs_test_recovery",
  }), true);
  assert.equal(stripeSessionMatchesPaymentOrder(session, {
    orderId: "order-recovery",
    publicToken: "wrong-token",
    sessionId: "cs_test_recovery",
  }), false);

  assert.equal(stripeSessionMatchesPaymentOrder({
    ...session,
    success_url: "https://staging.scoretransposer.com/checkout/success?provider=stripe&order_id=order-recovery&token=secret-token&session_id=cs_test_recovery",
  }, {
    orderId: "order-recovery",
    publicToken: "secret-token",
    sessionId: "cs_test_recovery",
  }), true);
});

test("webhook signing secrets ignore accidental surrounding whitespace", () => {
  assert.equal(normalizeWebhookSigningSecret("  whsec_test-value\r\n"), "whsec_test-value");
  assert.equal(normalizeWebhookSigningSecret("whsec_test-\r\n value"), "whsec_test-value");
  assert.equal(normalizeWebhookSigningSecret("\t pdl_ntfset_test \n"), "pdl_ntfset_test");
});

test("Stripe API credentials ignore clipboard whitespace", () => {
  assert.equal(normalizeStripeCredential("  sk_test_example\r\n"), "sk_test_example");
  assert.equal(normalizeStripeCredential("sk_test_\r\n example"), "sk_test_example");
});

test("Stripe price identifiers ignore clipboard BOM and whitespace", () => {
  const params = buildStripeCheckoutSessionParams({
    orderId: "order_price_whitespace",
    publicToken: "token_price_whitespace",
    priceId: "\uFEFF price_test_123\r\n",
  });

  assert.equal(params.line_items?.[0]?.price, "price_test_123");
});
