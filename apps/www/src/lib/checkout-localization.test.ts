import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { CHECKOUT_MESSAGE_CATALOGS, getCheckoutMessages } from "./checkout-localization/index.js";
import { getAppActivateUrl, getAppHomeUrl, getAppLoginUrl, getAppScoreProjectsUrl, getAppScoreUrl, getSupportUrl } from "./site.js";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return [prefix];
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(stringLeaves);
}

test("checkout catalogs are complete and non-empty for all nine locales", () => {
  assert.deepEqual(Object.keys(CHECKOUT_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(CHECKOUT_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const messages = getCheckoutMessages(locale);
    assert.deepEqual(leafKeys(messages).sort(), englishKeys, `${locale} checkout keys`);
    for (const value of stringLeaves(messages)) {
      if (locale === "en" && value === messages.translationNotice) continue;
      assert.ok(value.trim().length > 0, `${locale} contains an empty checkout message`);
    }
    assert.deepEqual(Object.keys(messages.status.statuses).sort(), ["cancelled", "failed", "paid", "pending"]);
    assert.equal(messages.status.paidSteps.length, 3);
    assert.equal(messages.status.pendingSteps.length, 3);
  }
});

test("every non-English payment flow has distinct copy and a professional-review notice", () => {
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const messages = getCheckoutMessages(locale);
    assert.notEqual(messages.status.pendingTitle, CHECKOUT_MESSAGE_CATALOGS.en.status.pendingTitle, locale);
    assert.notEqual(messages.cancel.title, CHECKOUT_MESSAGE_CATALOGS.en.cancel.title, locale);
    assert.ok(messages.translationNotice.length >= 35, `${locale} review notice`);
  }
  assert.equal(CHECKOUT_MESSAGE_CATALOGS.en.translationNotice, "");
});

test("checkout clients receive only current copy and preserve raw provider or API diagnostics", async () => {
  const sources = await Promise.all([
    "../components/CheckoutClient.tsx",
    "../components/CheckoutStatusClient.tsx",
    "../components/CheckoutCancelClient.tsx",
    "../components/PaddlePaymentLinkPage.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

  for (const source of sources) {
    assert.doesNotMatch(source, /locale\s*===\s*["']zh-CN["']/u);
    assert.doesNotMatch(source, /getCheckoutMessages|CHECKOUT_MESSAGE_CATALOGS/u);
  }
  assert.match(sources[0], /setStatus\(result\.error\)/u);
  assert.match(sources[1], /setError\(result\.error\)/u);
  assert.match(sources[1], /role="alert">\{error\}/u);
  assert.match(sources[3], /checkoutError instanceof Error \? checkoutError\.message/u);
});

test("checkout actions retain locale across public and product-app boundaries", async () => {
  const [statusSource, cancelSource, successPage] = await Promise.all([
    readFile(new URL("../components/CheckoutStatusClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/CheckoutCancelClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/checkout/success/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(statusSource, /getAppActivateUrl\(locale\)/u);
  assert.match(statusSource, /getAppScoreProjectsUrl\(locale\)/u);
  assert.match(statusSource, /getAppRegisterUrl\(locale\)/u);
  assert.match(statusSource, /localizePublicHref\("\/", locale\)/u);
  assert.match(cancelSource, /getAppActivateUrl\(locale\)/u);
  assert.match(cancelSource, /localizePublicHref\("\/", locale\)/u);
  assert.match(successPage, /copy=\{messages\.status\}/u);
});

test("product-app handoff URLs set the shared locale before opening the semantic destination", () => {
  const activate = new URL(getAppActivateUrl("de"));
  assert.equal(activate.pathname, "/api/locale");
  assert.equal(activate.searchParams.get("locale"), "de");
  assert.equal(activate.searchParams.get("next"), "/activate");

  const scores = new URL(getAppScoreProjectsUrl("zh-TW"));
  assert.equal(scores.pathname, "/api/locale");
  assert.equal(scores.searchParams.get("locale"), "zh-TW");
  assert.equal(scores.searchParams.get("next"), "/scores");
  assert.equal(getAppHomeUrl("zh-TW"), getAppScoreProjectsUrl("zh-TW"));

  const score = new URL(getAppScoreUrl("score/unsafe", "fr"));
  assert.equal(score.pathname, "/api/locale");
  assert.equal(score.searchParams.get("locale"), "fr");
  assert.equal(score.searchParams.get("next"), "/scores/score%2Funsafe");

  const login = new URL(getAppLoginUrl("/scores?source=library", "ja"));
  assert.equal(login.searchParams.get("locale"), "ja");
  assert.equal(login.searchParams.get("next"), "/login?next=%2Fscores%3Fsource%3Dlibrary");

  assert.equal(getSupportUrl("payment", "checkout", "fr"), "/fr/support?category=payment&source=checkout");
});
