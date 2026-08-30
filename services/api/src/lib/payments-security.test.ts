import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPaddleTransactionEndpoint,
  buildPaddleCheckoutRedirectUrl,
  buildLocalizedAppReturnUrl,
  buildLocalizedPublicCheckoutUrl,
  buildStripeCheckoutSessionParams,
  hashPaymentOrderToken,
  normalizeStripeCredential,
  normalizeWebhookSigningSecret,
  localizePublicPaddleCheckoutPageUrl,
  resolveCheckoutPriceId,
  stripeSessionMatchesPaymentOrder,
} from "./payments.js";

test("payment providers return to the locale-prefixed public checkout route", () => {
  const params = { provider: "stripe", order_id: "order-1", token: "public-token" };
  assert.equal(
    buildLocalizedPublicCheckoutUrl({
      baseUrl: "https://scoretransposer.com/",
      pathname: "/checkout/success",
      locale: "de",
      searchParams: params,
    }),
    "https://scoretransposer.com/de/checkout/success?provider=stripe&order_id=order-1&token=public-token",
  );
  assert.equal(
    buildLocalizedPublicCheckoutUrl({
      baseUrl: "https://scoretransposer.com",
      pathname: "/checkout/cancel",
      locale: "zh-TW",
      searchParams: params,
    }),
    "https://scoretransposer.com/zh-tw/checkout/cancel?provider=stripe&order_id=order-1&token=public-token",
  );
  assert.match(buildLocalizedPublicCheckoutUrl({
    baseUrl: "https://scoretransposer.com",
    pathname: "/checkout/success",
    locale: "unsupported",
    searchParams: params,
  }), /^https:\/\/scoretransposer\.com\/checkout\/success\?/u);
});

test("Stripe billing portal returns through the product locale handoff", () => {
  assert.equal(
    buildLocalizedAppReturnUrl({
      baseUrl: "https://app.scoretransposer.com/",
      locale: "ja",
      nextPath: "/billing",
    }),
    "https://app.scoretransposer.com/api/locale?locale=ja&next=%2Fbilling",
  );
  assert.equal(
    buildLocalizedAppReturnUrl({
      baseUrl: "https://app.scoretransposer.com",
      locale: "unsupported",
      nextPath: "billing",
    }),
    "https://app.scoretransposer.com/api/locale?locale=en&next=%2Fbilling",
  );
});

test("the first-party Paddle launcher keeps the selected locale without rewriting provider URLs", () => {
  assert.equal(localizePublicPaddleCheckoutPageUrl({
    checkoutUrl: "https://scoretransposer.com/checkout/paddle?_ptxn=txn_1",
    publicSiteUrl: "https://scoretransposer.com",
    locale: "fr",
  }), "https://scoretransposer.com/fr/checkout/paddle?_ptxn=txn_1");
  assert.equal(localizePublicPaddleCheckoutPageUrl({
    checkoutUrl: "https://pay.paddle.io/checkout/txn_1",
    publicSiteUrl: "https://scoretransposer.com",
    locale: "fr",
  }), "https://pay.paddle.io/checkout/txn_1");
});

test("each paid plan resolves only its own provider Price ID and missing IDs fail closed", () => {
  const priceIds = {
    "starter-monthly": "price_starter_monthly",
    "starter-annual": "price_starter_annual",
    "converter-pro-monthly": "price_converter_pro_monthly",
    "converter-pro-annual": "price_converter_pro_annual",
  };
  assert.equal(resolveCheckoutPriceId("starter-monthly", priceIds), "price_starter_monthly");
  assert.equal(resolveCheckoutPriceId("starter-annual", priceIds), "price_starter_annual");
  assert.equal(resolveCheckoutPriceId("converter-pro-monthly", priceIds), "price_converter_pro_monthly");
  assert.equal(resolveCheckoutPriceId("converter-pro-annual", priceIds), "price_converter_pro_annual");
  assert.equal(resolveCheckoutPriceId("starter-monthly", { ...priceIds, "starter-monthly": "  " }), null);
});

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
