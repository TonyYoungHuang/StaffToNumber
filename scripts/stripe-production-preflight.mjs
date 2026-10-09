import { pathToFileURL } from "node:url";
import Stripe from "stripe";
import { getCheckoutPlanCatalog } from "@score/shared";

export const requiredStripeEvents = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.voided",
  "charge.refunded",
];

const priceVariables = {
  "starter-monthly": "STRIPE_STARTER_MONTHLY_PRICE_ID",
  "starter-annual": "STRIPE_STARTER_ANNUAL_PRICE_ID",
  "converter-pro-monthly": "STRIPE_CONVERTER_PRO_MONTHLY_PRICE_ID",
  "converter-pro-annual": "STRIPE_CONVERTER_PRO_ANNUAL_PRICE_ID",
};

// Read-only: this command never creates a checkout, changes a Stripe resource,
// opens payment providers, or writes credentials to disk.
export async function checkStripeProduction(env, clientFactory = (key) => new Stripe(key, { timeout: 15_000, maxNetworkRetries: 0 })) {
  const checks = [];
  const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
  const secret = (env.STRIPE_SECRET_KEY ?? "").replace(/\s+/gu, "");
  const isLive = /^(?:sk|rk)_live_[A-Za-z0-9]+$/u.test(secret);
  check("live_api_key", isLive, isLive ? "Live server credential supplied." : "A Live server credential is required; Sandbox credentials cannot enable production payments.");
  check("webhook_secret", /^whsec_[A-Za-z0-9]+$/u.test((env.STRIPE_WEBHOOK_SECRET ?? "").trim()), "A separately configured production webhook signing secret is required; its value is never printed.");
  check("subscription_mode", !env.PAYMENT_BILLING_MODE || env.PAYMENT_BILLING_MODE === "subscription", "The published monthly and annual plans require subscription billing.");
  check("managed_payments", env.STRIPE_MANAGED_PAYMENTS_ENABLED !== "true", "This configuration uses standard Stripe Payments; Managed Payments requires separate onboarding.");

  let webhookUrl;
  for (const name of ["PUBLIC_SITE_URL", "PUBLIC_APP_URL", "PUBLIC_API_URL"]) {
    try {
      const url = new URL(env[name]);
      const valid = url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
        && !/(^|[.-])(staging|localhost)([.-]|$)/iu.test(url.hostname) && url.hostname !== "127.0.0.1";
      check(name, valid, "A public HTTPS production URL without embedded credentials is required.");
      // The native production API registers paymentWebhookRoutes under /api.
      if (name === "PUBLIC_API_URL" && valid) webhookUrl = new URL("/api/webhooks/stripe", url).href;
    } catch {
      check(name, false, "Missing or invalid public production URL.");
    }
  }

  const prices = Object.values(priceVariables).map((name) => (env[name] ?? "").trim());
  for (const [index, name] of Object.values(priceVariables).entries()) {
    check(name, /^price_[A-Za-z0-9]+$/u.test(prices[index]), "Each published plan requires its own Live Price ID.");
  }
  check("distinct_prices", prices.every(Boolean) && new Set(prices).size === 4, "The four plans must not share Price IDs.");

  if (isLive) {
    const client = clientFactory(secret);
    const read = async (name, action) => {
      try { await action(); } catch (error) {
        // Do not print provider error messages: they may echo request credentials
        // or customer fields. The operation name and status are sufficient here.
        check(name, false, `Stripe read failed (HTTP ${Number(error?.statusCode) || "unknown"}). Check key validity and read permissions.`);
      }
    };
    await Promise.all([
      read("account_read", async () => {
        const account = await client.accounts.retrieve();
        const expected = env.STRIPE_ACCOUNT_COUNTRY?.trim().toUpperCase();
        check("charges_enabled", account.charges_enabled === true, "Stripe must enable real payments on this account.");
        check("payouts_enabled", account.payouts_enabled === true, "Stripe must enable payouts; this does not independently verify a particular bank account.");
        check("details_submitted", account.details_submitted === true, "The account must have submitted its onboarding details.");
        if (expected) check("account_country", account.country === expected, `Account country: ${account.country ?? "unknown"}; required: ${expected}.`);
        check("account_requirements", !(account.requirements?.currently_due?.length || account.requirements?.past_due?.length || account.requirements?.disabled_reason), "Outstanding account requirements must be resolved in the Dashboard.");
      }),
      ...getCheckoutPlanCatalog("en").map((plan) => read(`price_${plan.code}`, async () => {
        const priceId = env[priceVariables[plan.code]]?.trim();
        if (!priceId || !/^price_[A-Za-z0-9]+$/u.test(priceId)) return;
        const price = await client.prices.retrieve(priceId, { expand: ["product"] });
        const expectedAmount = Math.round(Number(plan.price.replace(/^\$/u, "")) * 100);
        const interval = plan.code.endsWith("annual") ? "year" : "month";
        check(`price_${plan.code}`, price.livemode === true && price.active === true
          && price.currency === "usd" && price.unit_amount === expectedAmount && price.billing_scheme === "per_unit"
          && price.recurring?.interval === interval && price.recurring?.interval_count === 1
          && price.recurring?.usage_type === "licensed" && typeof price.product === "object"
          && !price.product.deleted && price.product.active === true,
        `Must match the published plan: USD ${(expectedAmount / 100).toFixed(2)} per ${interval}, active Live product and recurring price.`);
      })),
      read("webhooks_read", async () => {
        if (!webhookUrl) return;
        const endpoints = await client.webhookEndpoints.list({ limit: 100 }).autoPagingToArray({ limit: 1000 });
        const endpoint = endpoints.find((item) => item.url === webhookUrl && item.livemode === true && item.status === "enabled");
        check("production_webhook", Boolean(endpoint), `An enabled Live endpoint must target ${webhookUrl}.`);
        if (endpoint) {
          const missing = requiredStripeEvents.filter((event) => !endpoint.enabled_events.includes("*") && !endpoint.enabled_events.includes(event));
          check("webhook_events", missing.length === 0, missing.length ? `Missing events: ${missing.join(", ")}.` : "Required subscription, payment, and refund events are enabled.");
        }
      }),
      read("portal_read", async () => {
        const portals = await client.billingPortal.configurations.list({ active: true, limit: 100 });
        check("billing_portal", portals.data.some((portal) => portal.is_default && portal.livemode
          && portal.features.subscription_cancel.enabled && portal.features.payment_method_update.enabled),
        "The default Live customer portal must support cancellation and payment method updates.");
      }),
    ]);
  }
  return {
    readyForAcceptance: checks.every((item) => item.passed),
    checkedAt: new Date().toISOString(),
    checks,
    remainingAcceptance: ["Public HTTPS and signed webhook delivery", "Payment to membership entitlement", "Cancellation and refund synchronization", "Bank account and actual payout verification"],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await checkStripeProduction(process.env);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readyForAcceptance) process.exitCode = 1;
}
