import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { getPricingPlanCatalog } from "@score/shared";
import {
  formatBillingBytes,
  formatBillingMoney,
  mappedBillingStatus,
  rawApiErrorOrFallback,
} from "./client";
import {
  BILLING_SUPPORTED_LOCALES,
  getBillingMessages,
  getLocalizedPricingPlanCatalog,
} from "./index";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (typeof value === "string") return [{ key: prefix, value }];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => leafStrings(nested, prefix ? `${prefix}.${key}` : key));
}

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("billing catalogs cover identical typed keys in all nine locales", () => {
  assert.deepEqual([...BILLING_SUPPORTED_LOCALES], [...SUPPORTED_LOCALES]);
  const english = getBillingMessages("en");
  const englishKeys = leafKeys(english).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getBillingMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} billing keys`);
    for (const { key, value } of leafStrings(catalog)) {
      if (key === "reviewNotice" && locale === "en") {
        assert.equal(value, "", "English intentionally has no translation-review notice");
      } else {
        assert.ok(value.trim().length > 0, `${locale} has an empty billing message at ${key}`);
      }
    }
  }
});

test("payment review notices and representative page, validation, status, and ARIA copy are localized", () => {
  const english = getBillingMessages("en");
  const englishTerms = /English|英文|英語|영어|anglais|inglés|englisch|англий/iu;

  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getBillingMessages(locale);
    assert.notEqual(catalog.reviewNotice, english.reviewNotice, `${locale} review notice`);
    assert.match(catalog.reviewNotice, englishTerms, `${locale} English/provider precedence`);
    assert.notEqual(catalog.activation.page.title, english.activation.page.title, `${locale} activation metadata`);
    assert.notEqual(catalog.activation.form.required, english.activation.form.required, `${locale} validation`);
    assert.notEqual(catalog.checkout.page.title, english.checkout.page.title, `${locale} checkout metadata`);
    assert.notEqual(catalog.checkout.selector.plansAria, english.checkout.selector.plansAria, `${locale} checkout ARIA`);
    assert.notEqual(catalog.checkout.status.successTitle, english.checkout.status.successTitle, `${locale} payment success`);
    assert.notEqual(catalog.billing.page.title, english.billing.page.title, `${locale} billing metadata`);
    assert.notEqual(catalog.billing.manager.noInvoices, english.billing.manager.noInvoices, `${locale} empty state`);
    assert.notEqual(catalog.billing.manager.subscriptionStatuses.active, english.billing.manager.subscriptionStatuses.active, `${locale} subscription status`);
  }
});

test("localized plans keep shared commercial facts and identifiers immutable", () => {
  const sharedPlans = getPricingPlanCatalog("en");
  const sharedIdentity = sharedPlans.map(({ code, price, featured }) => ({ code, price, featured }));

  for (const locale of SUPPORTED_LOCALES) {
    const plans = getLocalizedPricingPlanCatalog(locale);
    assert.deepEqual(plans.map(({ code, price, featured }) => ({ code, price, featured })), sharedIdentity, `${locale} plan identity`);
    assert.equal(plans.length, 5, `${locale} plan count`);

    for (const [index, plan] of plans.entries()) {
      const shared = sharedPlans[index];
      assert.equal(plan.benefits.length, shared.benefits.length, `${locale} ${plan.code} benefit count`);
      assert.equal(plan.resources.length, shared.resources.length, `${locale} ${plan.code} resource count`);
      for (const { value } of leafStrings(plan)) {
        assert.ok(value.trim().length > 0, `${locale} ${plan.code} non-empty plan copy`);
        assert.doesNotMatch(value, /\{[^}]+\}/u, `${locale} ${plan.code} unresolved template`);
      }

      const sharedNumbers = JSON.stringify(shared).match(/\d+(?:\.\d+)?/gu) ?? [];
      const localizedText = JSON.stringify(plan);
      for (const fact of new Set(sharedNumbers)) {
        assert.ok(localizedText.includes(fact), `${locale} ${plan.code} preserves numeric fact ${fact}`);
      }
    }
  }
});

test("billing helpers preserve non-empty API failures verbatim and localize safe formatting", () => {
  const rawFailure = "  Stripe provider returned an English diagnostic.  ";
  assert.equal(rawApiErrorOrFallback(rawFailure, "localized fallback"), rawFailure);
  assert.equal(rawApiErrorOrFallback("   ", "localized fallback"), "localized fallback");
  assert.equal(rawApiErrorOrFallback(null, "localized fallback"), "localized fallback");
  assert.equal(mappedBillingStatus("provider_custom", { active: "Localized active" }), "provider_custom");
  assert.equal(mappedBillingStatus("active", { active: "Localized active" }), "Localized active");

  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(formatBillingMoney(799, "usd", locale, "pending").length > 0, `${locale} currency`);
    assert.ok(formatBillingBytes(10 * 1024 ** 3, locale).endsWith(" GB"), `${locale} bytes`);
    assert.equal(formatBillingMoney(null, "usd", locale, "pending"), "pending");
  }
});

test("billing clients receive only server-selected current copy and have no binary locale branch", () => {
  const clients = [
    "../../components/ActivationForm.tsx",
    "../../components/AppCheckoutClient.tsx",
    "../../components/AppCheckoutStatusClient.tsx",
    "../../components/CheckoutPlanSelector.tsx",
    "../../components/BillingManager.tsx",
  ];
  const sources = clients.map(source);

  for (const [index, contents] of sources.entries()) {
    assert.match(contents, /^"use client";/u, clients[index]);
    assert.doesNotMatch(contents, /from\s+["'][^"']*billing-messages["']/u, `${clients[index]} imports no catalog index`);
    assert.doesNotMatch(contents, /billing-messages\/locales/u, `${clients[index]} imports no locale catalog`);
    assert.doesNotMatch(contents, /getBillingMessages|getLocalizedPricingPlanCatalog/u, `${clients[index]} has no server catalog loader`);
    assert.doesNotMatch(contents, /locale\s*[!=]==?\s*["']zh-CN["']|isChinese/u, `${clients[index]} has no binary locale branch`);
    assert.doesNotMatch(contents, /userFacingError/u, `${clients[index]} preserves raw API errors`);
  }

  assert.match(sources[0], /copy: ActivationFormCopy/u);
  assert.match(sources[1], /copy: CheckoutClientCopy/u);
  assert.match(sources[2], /copy: CheckoutStatusCopy/u);
  assert.match(sources[3], /copy: CheckoutCopy/u);
  assert.match(sources[4], /copy: BillingManagerCopy/u);
});

test("activation, checkout, and billing pages select locale copy, metadata, and conditional review notices on the server", () => {
  const pages = [
    "../../app/activate/page.tsx",
    "../../app/checkout/page.tsx",
    "../../app/billing/page.tsx",
  ].map(source);

  for (const contents of pages) {
    assert.match(contents, /export async function generateMetadata/u);
    assert.match(contents, /getBillingMessages\(locale\)/u);
    assert.match(contents, /copy\.reviewNotice \?/u);
    assert.doesNotMatch(contents, /locale\s*[!=]==?\s*["']zh-CN["']|isChinese/u);
  }
  assert.match(pages[0], /<ActivationForm copy=\{copy\.activation\.form\}/u);
  assert.match(pages[1], /<CheckoutPlanSelector[\s\S]*copy=\{copy\.checkout\}/u);
  assert.match(pages[2], /<BillingManager locale=\{locale\} copy=\{copy\.billing\.manager\} freePlanCredits=\{freePlanCredits\}/u);
});

test("checkout, activation, seat, portal, cancellation, and idempotency payloads remain unchanged", () => {
  const activation = source("../../components/ActivationForm.tsx");
  const checkout = source("../../components/AppCheckoutClient.tsx");
  const billing = source("../../components/BillingManager.tsx");

  assert.ok(activation.includes("/api/activation/redeem"));
  assert.match(activation, /body: JSON\.stringify\(\{ code \}\)/u);
  assert.ok(checkout.includes("/api/payments/checkout/authenticated"));
  assert.match(checkout, /"Idempotency-Key": checkoutIntent\.current\.key/u);
  assert.match(checkout, /planCode: selectedPlan\.code/u);
  assert.match(checkout, /organizationId: planKind === "school" \? organizationId : undefined/u);
  assert.match(checkout, /seatQuantity: planKind === "school" \? seatQuantity : 1/u);
  assert.match(checkout, /setStatus\(\{ message: result\.error, tone: "error" \}\)/u);

  for (const endpoint of [
    "/api/payments/billing",
    "/api/payments/billing/usage",
    "/api/payments/billing/portal",
    "/api/payments/billing/subscriptions/${subscriptionId}/seats",
    "/api/payments/billing/subscriptions/${subscriptionId}/seats/${encodeURIComponent(email)}",
    "/api/payments/billing/subscriptions/${subscriptionId}/cancel",
  ]) {
    assert.ok(billing.includes(endpoint), `missing unchanged billing endpoint ${endpoint}`);
  }
  assert.match(billing, /body: JSON\.stringify\(\{ provider: "stripe", locale \}\)/u);
  assert.match(billing, /body: JSON\.stringify\(\{ email \}\)/u);
  assert.match(billing, /body: JSON\.stringify\(\{ atPeriodEnd: true \}\)/u);
  assert.match(billing, /rawApiErrorOrFallback\(result\.error, copy\.fallbackError\)/u);
});

test("payment completion and public handoff keep locale and lead back to scores", () => {
  const activation = source("../../components/ActivationForm.tsx");
  const status = source("../../components/AppCheckoutStatusClient.tsx");
  const success = source("../../app/checkout/success/page.tsx");
  const cancel = source("../../app/checkout/cancel/page.tsx");

  assert.match(activation, /router\.push\(APP_ROUTES\.scores\)/u);
  assert.match(status, /<Link href=\{APP_ROUTES\.scores\}/u);
  assert.doesNotMatch(status, /APP_ROUTES\.home|dashboard/u);
  for (const contents of [success, cancel]) {
    assert.match(contents, /const locale = await readAppLocale\(\)/u);
    assert.match(contents, /localizePathname\("\/checkout\/(?:success|cancel)", locale\)/u);
    assert.match(contents, /destination\.searchParams\.(?:set|append)/u);
  }
});

test("billing localization files stay UTF-8 source-only with extensionless app imports", () => {
  const files = [
    ...readdirSync(new URL(".", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(entry.name, import.meta.url)),
    ...readdirSync(new URL("./locales/", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(`./locales/${entry.name}`, import.meta.url)),
  ];

  assert.equal(files.filter((file) => /\/locales\/[^/]+\.ts$/u.test(file.pathname)).length, 9);
  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    assert.doesNotMatch(file.pathname, /\.(?:js|d\.ts)$/u, file.pathname);
    assert.doesNotMatch(contents, /\uFFFD/u, `${file.pathname} encoding`);
    assert.doesNotMatch(contents, /from\s+["'][^"']+\.js["']/u, `${file.pathname} extensionless import`);
  }
});

test("localized payment pages have no remaining two-language implementation branch", () => {
  const ownedFiles = [
    "../../app/activate/page.tsx",
    "../../app/checkout/page.tsx",
    "../../app/billing/page.tsx",
    "../../components/ActivationForm.tsx",
    "../../components/AppCheckoutClient.tsx",
    "../../components/AppCheckoutStatusClient.tsx",
    "../../components/CheckoutPlanSelector.tsx",
    "../../components/BillingManager.tsx",
  ];
  for (const file of ownedFiles) {
    const contents = source(file);
    assert.doesNotMatch(contents, /isChinese|locale\s*[!=]==?\s*["']zh-CN["']/u, file);
  }
});

test("all supported locale labels are represented by the catalog API", () => {
  const titles = Object.fromEntries(SUPPORTED_LOCALES.map((locale: SupportedLocale) => [locale, getBillingMessages(locale).billing.page.title]));
  assert.equal(Object.keys(titles).length, 9);
  assert.equal(new Set(Object.values(titles)).size, 9);
});
