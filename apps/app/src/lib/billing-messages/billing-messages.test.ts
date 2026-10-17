import { readCheckoutReturn, workReturnPath } from "../flow-return";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { getPricingPlanCatalog, getPaymentRecoveryCopy } from "@score/shared";
import { getOneScoreUpsellCopy } from "../one-score-upsell-copy";
import { getScoreEntryMessages } from "../score-entry-messages";
import { getWorkspaceMessages } from "../workspace-messages";
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

test("all nine locales describe single-score card, Alipay and Link without promising subscription methods", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const body = getBillingMessages(locale).checkout.client.stripeLiveBody;
    const upsell = getOneScoreUpsellCopy(locale);
    for (const text of [body, upsell.passNote]) {
      assert.match(text, /Alipay|支付宝|支付寶/u, locale);
      assert.match(text, /Link/u, locale);
      assert.match(text, /Stripe/u, locale);
    }
    assert.match(upsell.passCta, /US\$2\.99/u, locale);
    assert.doesNotMatch(upsell.subscriptionCta, /Alipay|支付宝|支付寶|Link/u, locale);
  }
});

test("app purchase, library and billing copy preserve the three offers and per-task recognition rule in every locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const billing = getBillingMessages(locale);
    const upsell = getOneScoreUpsellCopy(locale);
    const scan = getScoreEntryMessages(locale).library.scan;
    const dashboard = getWorkspaceMessages(locale).dashboard.metrics;
    for (const value of [upsell.passNote, billing.scorePass.passTarget]) assert.match(value, /10/u, locale);
    assert.match(billing.scorePass.starterBody, /50/u, locale);
    for (const value of [scan.freeBody, dashboard.freeRouteBody]) {
      for (const amount of ["25", "10", "50"]) assert.ok(value.includes(amount), `${locale} ${amount}`);
      assert.match(value, /2[.,]99/u, locale);
      assert.match(value, /7[.,]99/u, locale);
    }
    for (const value of [billing.checkout.page.planNote, billing.billing.manager.quotaNote, scan.body]) {
      assert.match(value, /1/u, locale);
      assert.match(value, /5/u, locale);
      assert.doesNotMatch(value, /(?:1|5) credits? per page|每[页頁].*[15] [积積]分|[15] [积積]分.*每[页頁]/iu, locale);
    }
    assert.doesNotMatch(upsell.passNote, /unlimited pages|页数不限|頁數不限|ページ数無制限|páginas ilimitadas|nombre de pages illimité|unbegrenzte Seitenzahl/u, locale);
    if (locale !== "en") {
      assert.notEqual(upsell.passNote, getOneScoreUpsellCopy("en").passNote, locale);
      assert.notEqual(billing.billing.page.displayBody, getBillingMessages("en").billing.page.displayBody, locale);
    }
  }
});

test("billing corrects visible pass expiry copy while keeping the existing SEO description", () => {
  const page = source("../../app/billing/page.tsx");
  assert.match(page, /description: page\.body/u);
  assert.match(page, /\{copy\.billing\.page\.displayBody\}/u);
  assert.notEqual(getBillingMessages("en").billing.page.body, getBillingMessages("en").billing.page.displayBody);
  assert.match(getBillingMessages("en").billing.page.displayBody, /One Score Pass credits have no expiry/u);
  assert.match(getBillingMessages("zh-CN").billing.page.displayBody, /单谱通行证积分不过期/u);
});

test("checkout supports an explicit One Score Pass and defaults to Starter without activation", () => {
  const upsell = source("../../components/OneScorePassUpsell.tsx");
  const checkout = source("../../components/AppCheckoutClient.tsx");
  const selector = source("../../components/CheckoutPlanSelector.tsx");
  const page = source("../../app/checkout/page.tsx");
  for (const contents of [upsell, checkout, selector]) {
    assert.doesNotMatch(contents, /APP_ROUTES\.activate|activationCta|activationNote|data-plan-type="activation_code"/u);
  }
  assert.match(upsell, /className="button button-primary" data-plan-type="one_score"/u);
  assert.match(upsell, /new URLSearchParams\(\{ next:[^\n]+plan: "single-score", billing: "one_time", continue: "1"/u);
  assert.match(upsell, /plan=starter-monthly&billing=subscription/u);
  assert.match(checkout, /resumeCheckout\.current = true/u);
  assert.match(checkout, /selectedPlan\.code === "single-score" \? getOneScoreUpsellCopy\(locale\)\.passCta/u);
  assert.match(selector, /defaultCheckoutPlan\(initialPlanCode\)/u);
  assert.match(selector, /<details className="flow-details" open=\{plansOpen\}/u);
  assert.match(page, /isPurchasePlanCode\(requestedPlan\)/u);
  for (const locale of SUPPORTED_LOCALES) {
    assert.doesNotMatch(JSON.stringify(getOneScoreUpsellCopy(locale)), /activation|激活码|啟用碼|アクティベーション|활성화 코드|Aktivierungscode|código de activación|code d.activation|код активации/iu, locale);
    assert.doesNotMatch(JSON.stringify(getBillingMessages(locale).checkout), /\bcode\b|código|コード|코드|код|激活码|啟用碼/iu, locale);
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
  const sharedIdentity = sharedPlans.map(({ code, featured }) => ({ code, featured }));

  for (const locale of SUPPORTED_LOCALES) {
    const plans = getLocalizedPricingPlanCatalog(locale);
    assert.deepEqual(plans.map(({ code, featured }) => ({ code, featured })), sharedIdentity, `${locale} plan identity`);
    assert.deepEqual(plans.map(plan => plan.price.replace(/\s/gu, " ")), locale === "fr"
      ? ["0,00 $US", "7,99 $US", "49,00 $US", "14,99 $US", "99,00 $US"]
      : locale === "de" || locale === "ru" || locale === "es" ? ["0,00 USD", "7,99 USD", "49,00 USD", "14,99 USD", "99,00 USD"]
      : sharedPlans.map(plan => plan.price), `${locale} plan amounts and currency`);
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
      const localizedText = ["fr", "de", "ru", "es"].includes(locale) ? JSON.stringify(plan).replace(/(\d),(\d)/gu, "$1.$2") : JSON.stringify(plan);
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
  assert.match(activation, /body: JSON\.stringify\(\{ code: activationCode \}\)/u);
  const checkoutFlow = source("../checkout-flow.ts");
  assert.ok(checkoutFlow.includes("/api/payments/checkout/authenticated"));
  assert.match(checkout, /lookupAndStartCheckout\(/u);
  assert.match(checkoutFlow, /"Idempotency-Key": key/u);
  assert.match(checkoutFlow, /persistedCheckoutIntent\(signature, intentId\)/u);
  assert.match(checkoutFlow, /\/api\/payments\/orders\/by-intent/u);
  assert.match(checkout, /planCode: selectedPlan\.code/u);
  assert.match(checkout, /organizationId: planKind === "school" \? organizationId : undefined/u);
  assert.match(checkout, /seatQuantity: planKind === "school" \? seatQuantity : 1/u);
  assert.match(checkout, /recoveryCopy\.preparingFailed[\s\S]*rawApiErrorOrFallback\(result\.error, copy\.fallbackError\)/u);
  assert.doesNotMatch(checkout, /CHECKOUT_INTENT_NOTIFICATION_FAILED/u);

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

test("payment recovery copy distinguishes confirmed payment activation failure from provider verification failure", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const recovery = getPaymentRecoveryCopy(locale);
    assert.notEqual(recovery.waiting_payment, recovery.waiting_fulfillment);
    assert.notEqual(recovery.verification_failed, recovery.fulfillment_failed);
    assert.notEqual(recovery.accessFailed, recovery.waiting_fulfillment);
    assert.ok(recovery.retry.trim());
  }
  assert.match(getPaymentRecoveryCopy("zh-CN").fulfillment_failed, /付款已确认/u);
  assert.match(getPaymentRecoveryCopy("en").preparingFailed, /original order/u);
});

test("payment completion keeps a safe work destination without a public-app redirect loop", () => {
  assert.equal(workReturnPath("/scores/score-1#export-center"), "/scores/score-1#export-center");
  assert.equal(workReturnPath("/scores/new/musicxml"), "/scores/new/musicxml");
  for (const path of [undefined, "//external.invalid", "https://external.invalid", "/checkout/success?order_id=1", "/activate"]) {
    assert.equal(workReturnPath(path), "/scores");
  }
  const status = source("../../components/AppCheckoutStatusClient.tsx");
  assert.match(status, /result\.data\.user\.id !== order\.userId/u);
  assert.match(status, /entitlement\.status === "active"/u);
  assert.match(status, /order\.planCode === "single-score"[\s\S]*pass\.id === orderId/u);
  assert.match(status, /restored\?\.successPath \?\? \(targetId \?[^;]+readCheckoutReturn\(orderId, returnTo\)\.next\)/u);
  assert.match(status, /router\.replace\(destinationPath\)/u);
  assert.match(status, /authoritative\.returnContext/u);
  assert.equal(readCheckoutReturn("missing-order", "/scores/original#export-center").next, "/scores/original#export-center");
  assert.equal(readCheckoutReturn("missing-order", "https://external.invalid").next, "/scores");
  for (const [file, component] of [["success", "AppCheckoutStatusClient"], ["cancel", "AppCheckoutCancelClient"]]) {
    const contents = source(`../../app/checkout/${file}/page.tsx`);
    assert.ok(contents.includes(component));
    assert.ok(contents.includes("readAppLocale()"));
    assert.doesNotMatch(contents, /redirect\(destination/u);
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
