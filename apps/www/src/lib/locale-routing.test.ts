import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@score/i18n";
import { GET as localeHandoff } from "../app/api/locale/route.js";
import sitemap from "../app/sitemap.js";
import { middleware } from "../middleware.js";
import { publicLocalePrefixes, publicLocaleRewrites } from "../../next.config.js";
import {
  getLocalizedAlternates,
  localeFromPublicPath,
  localizePublicHref,
  localizePublicPath,
  stripPublicLocalePrefix,
} from "./locale-routing.js";
import { getSiteLocaleCatalog } from "./site-shell-localization.js";

const expectedPrefixes = {
  en: "",
  "zh-CN": "/zh-cn",
  "zh-TW": "/zh-tw",
  ja: "/ja",
  ko: "/ko",
  fr: "/fr",
  es: "/es",
  de: "/de",
  ru: "/ru",
} as const satisfies Record<SupportedLocale, string>;

test("public locale paths have one stable form for all nine locales", () => {
  assert.deepEqual(SUPPORTED_LOCALES, Object.keys(expectedPrefixes));
  for (const locale of SUPPORTED_LOCALES) {
    const prefix = expectedPrefixes[locale];
    assert.equal(localizePublicPath("/", locale), prefix || "/");
    assert.equal(localizePublicPath("/about", locale), `${prefix}/about`);
    assert.equal(localizePublicPath("/zh-cn/about/", locale), `${prefix}/about`);
    assert.equal(stripPublicLocalePrefix(`${prefix || ""}/library/bach`), "/library/bach");
    assert.equal(localeFromPublicPath(`${prefix || ""}/teaching`), locale);
  }
});

test("localized hrefs preserve query strings and fragments without rewriting assets or external URLs", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const prefix = expectedPrefixes[locale];
    assert.equal(localizePublicHref("/library?q=bach#scores", locale), `${prefix}/library?q=bach#scores`);
    assert.equal(localizePublicHref("/#pricing", locale), `${prefix || "/"}#pricing`);
    assert.equal(localizePublicHref("/product/score.png", locale), "/product/score.png");
    assert.equal(localizePublicHref("https://app.scoretransposer.com/login", locale), "https://app.scoretransposer.com/login");
  }
});

test("metadata alternates are self-canonical, complete and bidirectional", () => {
  const expectedLanguages = {
    ...Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, `${expectedPrefixes[locale]}/score-editor`])),
    "x-default": "/score-editor",
  };

  for (const locale of SUPPORTED_LOCALES) {
    const alternates = getLocalizedAlternates("/score-editor", locale);
    assert.equal(alternates.canonical, `${expectedPrefixes[locale]}/score-editor`);
    assert.deepEqual(alternates.languages, expectedLanguages);
  }
});

test("the request URL, not a locale cookie, selects public HTML language", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const prefix = expectedPrefixes[locale];
    const conflictingCookie = locale === "en" ? "zh-CN" : "en";
    const response = middleware(new NextRequest(`https://scoretransposer.com${prefix}/about?source=search`, {
      headers: { cookie: `${LOCALE_COOKIE_NAME}=${conflictingCookie}` },
    }));

    assert.equal(response.headers.get("x-middleware-request-x-score-route-locale"), locale);
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
  }
});

test("relative beforeFiles rewrites strip every non-English prefix without creating an absolute self-proxy URL", () => {
  assert.deepEqual(
    Object.fromEntries([["en", ""], ...publicLocalePrefixes]),
    expectedPrefixes,
  );
  assert.equal(publicLocaleRewrites.length, (SUPPORTED_LOCALES.length - 1) * 2);
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const prefix = expectedPrefixes[locale];
    assert.deepEqual(
      publicLocaleRewrites.filter((rewrite) => rewrite.has[0]?.value === locale),
      [
        {
          source: prefix,
          destination: "/",
          has: [{ type: "header", key: "x-score-route-locale", value: locale }],
        },
        {
          source: `${prefix}/:path*`,
          destination: "/:path*",
          has: [{ type: "header", key: "x-score-route-locale", value: locale }],
        },
      ],
    );
  }
});

test("Edge middleware permanently redirects every legacy public origin before locale routing", () => {
  for (const source of [
    "http://scoretransposer.com/library/bach?instrument=piano",
    "http://www.scoretransposer.com/library/bach?instrument=piano",
    "https://www.scoretransposer.com/library/bach?instrument=piano",
  ]) {
    const response = middleware(new NextRequest(source));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), "https://scoretransposer.com/library/bach?instrument=piano");
  }
});

test("Edge middleware reads the public origin from trusted proxy headers", () => {
  const response = middleware(new NextRequest("http://127.0.0.1:3101/faq?source=redirect", {
    headers: {
      host: "www.scoretransposer.com",
      "x-forwarded-proto": "https",
    },
  }));

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://scoretransposer.com/faq?source=redirect");
});

test("Edge middleware normalizes every locale prefix to its lowercase canonical URL", () => {
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const uppercasePrefix = expectedPrefixes[locale].toUpperCase();
    const response = middleware(new NextRequest(`https://scoretransposer.com${uppercasePrefix}/about?source=search`));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), `https://scoretransposer.com${expectedPrefixes[locale]}/about?source=search`);
  }

  const prefixedEnglish = middleware(new NextRequest("https://scoretransposer.com/EN/about?source=search"));
  assert.equal(prefixedEnglish.status, 308);
  assert.equal(prefixedEnglish.headers.get("location"), "https://scoretransposer.com/about?source=search");
});

test("locale handoff localizes the semantic path, preserves query and hash, and sets the shared cookie", async () => {
  for (const locale of SUPPORTED_LOCALES) {
    const handoffUrl = new URL("https://scoretransposer.com/api/locale");
    handoffUrl.searchParams.set("locale", locale);
    handoffUrl.searchParams.set("next", "/about?source=app#plans");
    const response = await localeHandoff(new NextRequest(handoffUrl));

    assert.equal(response.headers.get("location"), `https://scoretransposer.com${expectedPrefixes[locale]}/about?source=app#plans`);
    assert.ok((response.headers.get("set-cookie") ?? "").includes(`${LOCALE_COOKIE_NAME}=${locale}`));
  }
});

test("locale handoff replaces an existing prefix and accepts only same-origin next URLs", async () => {
  const sameOrigin = new URL("https://scoretransposer.com/api/locale");
  sameOrigin.searchParams.set("locale", "fr");
  sameOrigin.searchParams.set("next", "https://scoretransposer.com/zh-cn/library?q=bach#scores");
  const response = await localeHandoff(new NextRequest(sameOrigin));
  assert.equal(response.headers.get("location"), "https://scoretransposer.com/fr/library?q=bach#scores");

  for (const unsafeNext of [
    "https://evil.example/phish",
    "//evil.example/phish",
    "/\\\\evil.example/phish",
    "/%255c%255cevil.example/phish",
    "/%25255c%25255cevil.example/phish",
    "/%25252f%25252fevil.example/phish",
    "/about%0d%0aLocation:https://evil.example",
    "/api/private",
    "/%61pi/private",
    "/api%2fprivate",
    "/%255fnext/static/chunk.js",
    "about",
  ]) {
    const handoffUrl = new URL("https://scoretransposer.com/api/locale");
    handoffUrl.searchParams.set("locale", "ja");
    handoffUrl.searchParams.set("next", unsafeNext);
    const unsafeResponse = await localeHandoff(new NextRequest(handoffUrl));
    assert.equal(unsafeResponse.headers.get("location"), "https://scoretransposer.com/ja");
  }
});

test("every locale has complete localized root metadata and shell copy", () => {
  const titles = new Set<string>();
  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getSiteLocaleCatalog(locale);
    titles.add(catalog.metadata.title);
    assert.ok(catalog.metadata.description.length >= 60);
    assert.ok(catalog.metadata.keywords.length >= 5);
    assert.match(catalog.metadata.openGraphLocale, /^[a-z]{2}_[A-Z]{2}$/u);
    for (const value of Object.values(catalog.shell)) assert.ok(value.trim());
  }
  assert.equal(titles.size, SUPPORTED_LOCALES.length);
});

test("sitemap publishes every indexable route in nine linked locale entries", () => {
  const entries = sitemap();
  assert.ok(entries.length > 0);
  assert.equal(entries.length % SUPPORTED_LOCALES.length, 0);

  const urls = new Set(entries.map((entry) => entry.url));
  assert.equal(urls.size, entries.length);
  for (const entry of entries) {
    const languages = entry.alternates?.languages;
    assert.ok(languages);
    for (const locale of SUPPORTED_LOCALES) assert.ok(urls.has(String(languages[locale])));
    assert.equal(languages["x-default"], languages.en);
  }
});
