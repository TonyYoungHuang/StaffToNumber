import assert from "node:assert/strict";
import test from "node:test";
import { checkStripeProduction, requiredStripeEvents } from "./stripe-production-preflight.mjs";

const env = {
  STRIPE_SECRET_KEY: "rk_live_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  STRIPE_ACCOUNT_COUNTRY: "HK",
  STRIPE_STARTER_MONTHLY_PRICE_ID: "price_one",
  STRIPE_STARTER_ANNUAL_PRICE_ID: "price_two",
  STRIPE_CONVERTER_PRO_MONTHLY_PRICE_ID: "price_three",
  STRIPE_CONVERTER_PRO_ANNUAL_PRICE_ID: "price_four",
  PUBLIC_SITE_URL: "https://scoretransposer.com",
  PUBLIC_APP_URL: "https://app.scoretransposer.com",
  PUBLIC_API_URL: "https://api.scoretransposer.com",
};

function fixtureClient() {
  const prices = {
    price_one: [799, "month"], price_two: [4900, "year"],
    price_three: [1499, "month"], price_four: [9900, "year"],
  };
  return {
    accounts: { retrieve: async () => ({ country: "HK", charges_enabled: true, payouts_enabled: true, details_submitted: true }) },
    prices: { retrieve: async (id) => ({
      livemode: true, active: true, currency: "usd", unit_amount: prices[id][0], billing_scheme: "per_unit",
      recurring: { interval: prices[id][1], interval_count: 1, usage_type: "licensed" },
      product: { active: true },
    }) },
    webhookEndpoints: { list: () => ({ autoPagingToArray: async () => [{
      url: "https://api.scoretransposer.com/api/webhooks/stripe", livemode: true, status: "enabled", enabled_events: requiredStripeEvents,
    }] }) },
    billingPortal: { configurations: { list: async () => ({ data: [{
      is_default: true, livemode: true,
      features: { subscription_cancel: { enabled: true }, payment_method_update: { enabled: true } },
    }] }) } },
  };
}

test("production preflight refuses Sandbox credentials without making API calls or exposing secrets", async () => {
  const report = await checkStripeProduction({ ...env, STRIPE_SECRET_KEY: "sk_test_fixture" }, () => { throw new Error("Must not connect"); });
  assert.equal(report.readyForAcceptance, false);
  assert.equal(report.checks.find((item) => item.name === "live_api_key").passed, false);
  assert.equal(JSON.stringify(report).includes("sk_test_fixture"), false);
});

test("production preflight verifies exact price mappings and requires both payments and payouts", async () => {
  const client = fixtureClient();
  client.accounts.retrieve = async () => ({ country: "US", charges_enabled: true, payouts_enabled: false, details_submitted: true });
  const report = await checkStripeProduction({ ...env,
    STRIPE_STARTER_MONTHLY_PRICE_ID: "price_two", STRIPE_STARTER_ANNUAL_PRICE_ID: "price_one",
  }, () => client);
  for (const name of ["payouts_enabled", "account_country", "price_starter-monthly", "price_starter-annual"]) {
    assert.equal(report.checks.find((item) => item.name === name).passed, false, name);
  }
  assert.equal(report.readyForAcceptance, false);
});

test("production preflight does not report configuration ready without a Live webhook and cancellation portal", async () => {
  const client = fixtureClient();
  client.webhookEndpoints.list = () => ({ autoPagingToArray: async () => [] });
  client.billingPortal.configurations.list = async () => ({ data: [] });
  const report = await checkStripeProduction(env, () => client);
  assert.equal(report.checks.find((item) => item.name === "production_webhook").passed, false);
  assert.equal(report.checks.find((item) => item.name === "billing_portal").passed, false);
  const ready = await checkStripeProduction(env, fixtureClient);
  assert.equal(ready.readyForAcceptance, true);
  assert.ok(ready.remainingAcceptance.includes("Payment to membership entitlement"));
  assert.equal(JSON.stringify(ready).includes(env.STRIPE_SECRET_KEY), false);
});

test("production preflight rejects the old gateway webhook path for the native production API", async () => {
  const client = fixtureClient();
  client.webhookEndpoints.list = () => ({ autoPagingToArray: async () => [{
    url: "https://api.scoretransposer.com/webhooks/stripe", livemode: true, status: "enabled", enabled_events: requiredStripeEvents,
  }] });
  const report = await checkStripeProduction(env, () => client);
  assert.equal(report.readyForAcceptance, false);
  const webhook = report.checks.find((item) => item.name === "production_webhook");
  assert.equal(webhook.passed, false);
  assert.ok(webhook.detail.includes("https://api.scoretransposer.com/api/webhooks/stripe"));
});
