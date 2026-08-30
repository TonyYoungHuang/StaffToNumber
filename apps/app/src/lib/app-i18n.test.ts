import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocaleCookie,
  ANALYTICS_CONSENT_MESSAGE_CATALOGS,
  getAnalyticsConsentMessages,
  getLocaleConfig,
  SUPPORTED_LOCALES,
} from "@score/i18n";
import { APP_MESSAGE_CATALOGS, getAppMessages } from "./app-messages.js";
import { defaultAppLocale, localeLabel, resolveAppLocale } from "./locale.js";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return [prefix];
  if (!value || typeof value !== "object") return [prefix];

  return Object.entries(value).flatMap(([key, nested]) =>
    leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

test("the app shell has a structurally complete catalog for every supported locale", () => {
  assert.deepEqual(Object.keys(APP_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(APP_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getAppMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} message keys`);
    assert.ok(catalog.metadata.title.startsWith("ScoreTransposer"));
    assert.ok(catalog.metadata.description.length > 40);
    assert.ok(catalog.metadata.keywords.length >= 5);
    assert.ok(catalog.shell.localeSwitcherLabel.length > 0);
    assert.ok(catalog.openGraph.title.length > 0);
  }
});

test("representative shell messages are localized instead of falling back to English", () => {
  assert.equal(getAppMessages("zh-TW").shell.scores, "我的樂譜");
  assert.equal(getAppMessages("ja").shell.editor, "オンライン編集");
  assert.equal(getAppMessages("ko").shell.transpose, "조옮김");
  assert.equal(getAppMessages("fr").shell.pricing, "Tarifs");
  assert.equal(getAppMessages("es").shell.contact, "Contacto");
  assert.equal(getAppMessages("de").shell.library, "Notenbibliothek");
  assert.equal(getAppMessages("ru").shell.upgrade, "Улучшить тариф");
});

test("analytics consent is complete and localized for every supported locale", () => {
  assert.deepEqual(Object.keys(ANALYTICS_CONSENT_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(ANALYTICS_CONSENT_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const copy = getAnalyticsConsentMessages(locale);
    assert.deepEqual(leafKeys(copy).sort(), englishKeys, `${locale} analytics consent keys`);
    for (const value of Object.values(copy)) assert.ok(value.trim().length > 0, `${locale} analytics consent copy`);
  }

  assert.notEqual(getAnalyticsConsentMessages("ja").accept, getAnalyticsConsentMessages("en").accept);
  assert.notEqual(getAnalyticsConsentMessages("de").privacy, getAnalyticsConsentMessages("en").privacy);
});

test("app locale resolution reads the shared cookie and safely defaults to English", () => {
  assert.equal(defaultAppLocale, "en");
  assert.equal(resolveAppLocale(buildLocaleCookie("ja")), "ja");
  assert.equal(resolveAppLocale("session=abc; score_locale=zh-TW; theme=light"), "zh-TW");
  assert.equal(resolveAppLocale("score_locale=unsupported"), "en");
  assert.equal(resolveAppLocale(null), "en");

  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(localeLabel(locale), getLocaleConfig(locale).label);
  }
});
