import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_CONSENT_MESSAGE_CATALOGS,
  DEFAULT_LOCALE,
  LOCALE_CONFIGS,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_ROUTE_PREFIXES,
  SUPPORTED_LOCALES,
  buildLocaleCookie,
  detectLocale,
  formatCurrency,
  formatMessage,
  formatNumber,
  formatPlural,
  getAnalyticsConsentMessages,
  getLocaleConfig,
  getLocaleFromPathname,
  getLocalizedValue,
  isSupportedLocale,
  localizePathname,
  normalizeLocale,
  parseAcceptLanguage,
  readLocaleCookie,
  resolveLocale,
  stripLocalePrefix,
} from "./index.ts";
import {
  assertMessageCatalogComplete,
  createTranslator,
  enMessages,
  getMessageCatalogIssues,
  hasMessageCatalog,
  isMessageCatalogComplete,
  loadMessageCatalog,
  MESSAGE_CATALOG_LOCALES,
  resolveMessageLocale,
} from "./messages/index.ts";
import { zhCNMessages } from "./messages/zh-CN.ts";

test("registers the nine P0 locales once with LTR and English fallback metadata", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["en", "zh-CN", "zh-TW", "ja", "ko", "fr", "es", "de", "ru"]);
  assert.equal(new Set(SUPPORTED_LOCALES).size, 9);
  assert.equal(LOCALE_CONFIGS.length, SUPPORTED_LOCALES.length);
  assert.equal(LOCALE_CONFIGS.every((config) => config.direction === "ltr"), true);
  assert.equal(LOCALE_CONFIGS.every((config) => config.fallbackLocale === DEFAULT_LOCALE), true);
  assert.equal(getLocaleConfig("zh-TW").fontGroup, "hant");
  assert.equal(getLocaleConfig("ru").fontGroup, "cyrillic");
  assert.equal(getLocaleConfig("fr").dateLocale, "fr-FR");
});

test("keeps analytics consent complete and localized in every supported locale", () => {
  assert.deepEqual(Object.keys(ANALYTICS_CONSENT_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const keys = Object.keys(ANALYTICS_CONSENT_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const copy = getAnalyticsConsentMessages(locale);
    assert.deepEqual(Object.keys(copy).sort(), keys, locale);
    assert.equal(Object.values(copy).every((value) => value.trim().length > 0), true, locale);
  }

  assert.notEqual(getAnalyticsConsentMessages("fr").privacy, getAnalyticsConsentMessages("en").privacy);
  assert.notEqual(getAnalyticsConsentMessages("ru").accept, getAnalyticsConsentMessages("en").accept);
});

test("publishes stable public route prefixes and localizes paths without losing query or hash", () => {
  assert.deepEqual(LOCALE_ROUTE_PREFIXES, {
    en: "",
    "zh-CN": "/zh-cn",
    "zh-TW": "/zh-tw",
    ja: "/ja",
    ko: "/ko",
    fr: "/fr",
    es: "/es",
    de: "/de",
    ru: "/ru",
  });
  assert.equal(getLocaleFromPathname("/ZH-TW/score-editor"), "zh-TW");
  assert.equal(getLocaleFromPathname("/features"), undefined);
  assert.deepEqual(stripLocalePrefix("/zh-cn/features?tab=all#examples"), {
    locale: "zh-CN",
    pathname: "/features?tab=all#examples",
  });
  assert.equal(localizePathname("/zh-cn/features?tab=all#examples", "de"), "/de/features?tab=all#examples");
  assert.equal(localizePathname("/de", "en"), "/");
  assert.equal(localizePathname("/", "ja"), "/ja");
});

test("normalizes common browser tags and detects locale in explicit, path, cookie, header order", () => {
  assert.equal(isSupportedLocale("zh-CN"), true);
  assert.equal(isSupportedLocale("zh-cn"), false);
  assert.equal(normalizeLocale("zh_Hant_HK"), "zh-TW");
  assert.equal(normalizeLocale("zh-Hans-SG"), "zh-CN");
  assert.equal(normalizeLocale("fr-CA"), "fr");
  assert.equal(normalizeLocale("ar"), undefined);
  assert.equal(resolveLocale("unknown"), "en");
  assert.deepEqual(parseAcceptLanguage("es-MX;q=0.7, de-DE;q=0.9, *;q=1"), [
    { tag: "de-DE", quality: 0.9 },
    { tag: "es-MX", quality: 0.7 },
  ]);
  assert.equal(detectLocale({ explicitLocale: "ko-KR", pathname: "/fr", cookieLocale: "de" }), "ko");
  assert.equal(detectLocale({ pathname: "/fr/features", cookieLocale: "de" }), "fr");
  assert.equal(detectLocale({ cookieLocale: "ru-RU", acceptLanguage: "ja-JP" }), "ru");
  assert.equal(detectLocale({ acceptLanguage: "ar;q=1, ja-JP;q=.8" }), "ja");
});

test("builds and reads the shared cross-subdomain locale cookie safely", () => {
  assert.equal(LOCALE_COOKIE_MAX_AGE_SECONDS, 31_536_000);
  assert.equal(
    buildLocaleCookie("zh-CN"),
    "score_locale=zh-CN; Path=/; Max-Age=31536000; SameSite=Lax",
  );
  assert.match(
    buildLocaleCookie("fr", { domain: ".scoretransposer.com", secure: true }),
    /Domain=\.scoretransposer\.com; Secure$/u,
  );
  assert.equal(readLocaleCookie("session=abc; score_locale=zh-TW; theme=dark"), "zh-TW");
  assert.equal(readLocaleCookie("score_locale=fr-CA"), "fr");
  assert.equal(readLocaleCookie("score_locale=ar"), undefined);
  assert.throws(() => buildLocaleCookie("en", { domain: ".example.com; Secure" }), TypeError);
});

test("formats numbers, currency, interpolation, and plurals with locale-aware Intl metadata", () => {
  assert.equal(formatNumber(1234.5, "de"), "1.234,5");
  assert.match(formatCurrency(25, "USD", "en"), /\$25\.00/u);
  assert.equal(formatMessage("Hello, {name}.", { name: "Ada" }), "Hello, Ada.");
  assert.equal(formatMessage("Hello, {name}."), "Hello, {name}.");
  assert.equal(formatPlural("en", 1, { one: "{count} page", other: "{count} pages" }), "1 page");
  assert.equal(formatPlural("en", 2, { one: "{count} page", other: "{count} pages" }), "2 pages");
});

test("returns localized values and uses the required English value as fallback", () => {
  const title = { en: "Score", "zh-CN": "乐谱" } as const;
  assert.equal(getLocalizedValue(title, "zh-CN"), "乐谱");
  assert.equal(getLocalizedValue(title, "ja"), "Score");
});

test("keeps complete flat message catalogs for every supported locale", async () => {
  assert.deepEqual(MESSAGE_CATALOG_LOCALES, SUPPORTED_LOCALES);
  const englishKeys = Object.keys(enMessages).sort();

  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(hasMessageCatalog(locale), true, locale);
    assert.equal(resolveMessageLocale(locale), locale);

    const catalog = await loadMessageCatalog(locale);
    assert.deepEqual(Object.keys(catalog).sort(), englishKeys, locale);
    assert.equal(Object.values(catalog).every((value) => value.trim().length > 0), true, locale);

    const issues = getMessageCatalogIssues(catalog);
    assert.equal(isMessageCatalogComplete(issues), true, locale);
    assert.doesNotThrow(() => assertMessageCatalogComplete(catalog, locale));
  }
});

test("ships representative localized copy in every non-English message catalog", async () => {
  const representativeCopy = {
    "zh-CN": ["siteChrome.scanner", "扫描识谱"],
    "zh-TW": ["siteChrome.scanner", "掃描識譜"],
    ja: ["siteChrome.scanner", "楽譜スキャン"],
    ko: ["siteChrome.scanner", "악보 스캔"],
    fr: ["siteChrome.scanner", "Numérisation"],
    es: ["siteChrome.scanner", "Escáner"],
    de: ["siteChrome.scanner", "Scanner"],
    ru: ["siteChrome.scanner", "Сканер"],
  } as const;

  for (const [locale, [key, expected]] of Object.entries(representativeCopy)) {
    const catalog = await loadMessageCatalog(locale as Exclude<(typeof SUPPORTED_LOCALES)[number], "en">);
    assert.equal(catalog[key], expected, locale);
    assert.notEqual(catalog["appChrome.metadata.description"], enMessages["appChrome.metadata.description"], locale);
  }
});

test("catalog completeness validation reports missing keys and placeholder drift", () => {
  const incomplete: Record<string, string> = { ...zhCNMessages };
  delete incomplete["siteChrome.scanner"];
  incomplete["common.languageSwitcher.current"] = "当前语言";

  const issues = getMessageCatalogIssues(incomplete);
  assert.deepEqual(issues.missingKeys, ["siteChrome.scanner"]);
  assert.deepEqual(issues.placeholderMismatches.map(({ key }) => key), ["common.languageSwitcher.current"]);
  assert.throws(() => assertMessageCatalogComplete(incomplete, "broken"), /broken is incomplete/u);
});

test("uses a key-safe translator with interpolation and English catalog fallback", async () => {
  const translateChinese = createTranslator(zhCNMessages);
  assert.equal(translateChinese("siteChrome.scanner"), "扫描识谱");
  assert.equal(
    translateChinese("common.languageSwitcher.switchTo", { language: "日本語" }),
    "切换到日本語",
  );

  assert.equal(resolveMessageLocale("ja"), "ja");
  assert.equal((await loadMessageCatalog("ja"))["siteChrome.scanner"], "楽譜スキャン");
  assert.equal(createTranslator({})("siteChrome.scanner"), "Scanner");
});
