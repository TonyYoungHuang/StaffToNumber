import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUPPORTED_LOCALES } from "@score/i18n";
import {
  STATIC_MARKETING_LOCALIZATIONS,
  STATIC_MARKETING_MEDIA_SOURCE_LOCALES,
  getStaticMarketingLocalization,
  getStaticMarketingMedia,
  resolveFaqGroups,
} from "./static-marketing-localization/index";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pagePaths = {
  about: "src/app/about/page.tsx",
  faq: "src/app/faq/page.tsx",
  readingGuide: "src/app/how-to-read-sheet-music/page.tsx",
  numberedNotation: "src/app/numbered-notation-converter/page.tsx",
} as const;
const pageSources = Object.fromEntries(
  Object.entries(pagePaths).map(([key, file]) => [key, readFileSync(path.join(appRoot, file), "utf8")]),
) as Record<keyof typeof pagePaths, string>;

function stringLeafPaths(value: unknown, currentPath = "$", paths: string[] = []): string[] {
  if (typeof value === "string") {
    assert.ok(value.trim().length > 0, `${currentPath} must not be empty`);
    paths.push(currentPath);
    return paths;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => stringLeafPaths(item, `${currentPath}[${index}]`, paths));
    return paths;
  }

  assert.ok(value && typeof value === "object", `${currentPath} must contain strings, arrays, or objects`);
  for (const [key, item] of Object.entries(value)) {
    stringLeafPaths(item, `${currentPath}.${key}`, paths);
  }
  return paths;
}

test("static marketing catalogs are complete and nonempty for all supported locales", () => {
  assert.deepEqual(Object.keys(STATIC_MARKETING_LOCALIZATIONS), [...SUPPORTED_LOCALES]);
  const englishPaths = stringLeafPaths(STATIC_MARKETING_LOCALIZATIONS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getStaticMarketingLocalization(locale);
    assert.deepEqual(
      stringLeafPaths(catalog).sort(),
      englishPaths,
      `${locale} must contain exactly the English catalog's string leaves`,
    );
    assert.equal(catalog.about.position.steps.length, 3, locale);
    assert.equal(catalog.faq.groups.length, 3, locale);
    assert.equal(catalog.readingGuide.faqs.length, 3, locale);
    assert.equal(catalog.numberedNotation.faqs.length, 2, locale);
  }
});

test("representative static-page copy is translated outside English", () => {
  const english = STATIC_MARKETING_LOCALIZATIONS.en;
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = STATIC_MARKETING_LOCALIZATIONS[locale];
    assert.notEqual(catalog.about.hero.title, english.about.hero.title, locale);
    assert.notEqual(catalog.faq.hero.title, english.faq.hero.title, locale);
    assert.notEqual(catalog.readingGuide.title, english.readingGuide.title, locale);
    assert.notEqual(catalog.numberedNotation.title, english.numberedNotation.title, locale);
  }
});

test("FAQ availability branches remain localized, complete, and limited to checkout state", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const available = resolveFaqGroups(locale, true);
    const pending = resolveFaqGroups(locale, false);
    assert.equal(available.length, 3, locale);
    assert.equal(available.flatMap((group) => group.items).length, 9, locale);
    assert.deepEqual(available.map((group) => group.title), pending.map((group) => group.title), locale);
    assert.equal(available[0]?.items[0]?.answer, pending[0]?.items[0]?.answer, locale);
    assert.notEqual(available[0]?.items[1]?.answer, pending[0]?.items[1]?.answer, locale);
    assert.notEqual(available[0]?.items[2]?.answer, pending[0]?.items[2]?.answer, locale);
    assert.deepEqual(available.slice(1), pending.slice(1), locale);
  }
});

test("static pages expose only exact-locale media and otherwise omit the social image", () => {
  for (const page of Object.keys(pagePaths) as Array<keyof typeof pagePaths>) {
    for (const locale of SUPPORTED_LOCALES) {
      const media = getStaticMarketingMedia(page, locale);
      assert.equal(STATIC_MARKETING_MEDIA_SOURCE_LOCALES[page][locale], media?.sourceLocale ?? null);
      if (media) assert.equal(media.sourceLocale, locale, `${page}/${locale}`);
    }
  }
});

test("catalogs retain current product claims and stable external technical names", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const serialized = JSON.stringify(getStaticMarketingLocalization(locale));
    assert.doesNotMatch(
      serialized,
      /(?:one|single)[ -]page[^.]{0,80}(?:free|trial)|(?:free|trial)[^.]{0,80}(?:one|single)[ -]page|单页[^。]{0,50}免费|一页[^。]{0,50}免费|1ページ[^。]{0,50}無料/iu,
      `${locale} must not regress to the retired one-page-free claim`,
    );
    for (const technicalName of ["MusicXML", "Score JSON", "Starter", "Converter Pro", "Paddle"]) {
      assert.match(serialized, new RegExp(technicalName, "u"), `${locale} must preserve ${technicalName}`);
    }
  }
});

test("four pages consume catalogs, localize routes and schemas, and keep release flags", () => {
  const allSources = Object.values(pageSources).join("\n");
  for (const [page, source] of Object.entries(pageSources)) {
    assert.match(source, /getStaticMarketingLocalization\(locale\)/u, page);
    assert.match(source, /getStaticMarketingMedia\(/u, page);
    assert.match(source, /locale: localization\.openGraphLocale/u, page);
    assert.match(source, /media && mediaPresentation \? \{ images:/u, page);
    assert.match(source, /alt: mediaPresentation\.alt/u, page);
    assert.match(source, /inLanguage: getLocaleConfig\(locale\)\.htmlLang/u, page);
    assert.match(source, /JSON\.stringify\(structuredData\)\.replaceAll\("<", "\\\\u003c"\)/u, page);
    assert.doesNotMatch(source, /locale === "zh-CN"|\bisChinese\b|\bchinese\b/u, page);
    assert.doesNotMatch(source, /feature-(?:score-editor|staff-to-jianpu)-real\.png/u, page);
  }

  for (const route of [
    "/about",
    "/faq",
    "/how-to-read-sheet-music",
    "/numbered-notation-converter",
    "/staff-to-jianpu",
    "/jianpu-to-staff",
    "/score-editor",
    "/pdf-score-scanner",
    "/score-to-audio",
  ]) {
    assert.match(allSources, new RegExp(route.replaceAll("/", "\\/"), "u"), route);
  }

  assert.match(pageSources.about, /siteConfig\.release\.checkoutAvailable/u);
  assert.match(pageSources.about, /getSafeAppUrl\("about", locale\)/u);
  assert.match(pageSources.about, /getAppRegisterUrl\(locale\)/u);
  assert.match(pageSources.faq, /resolveFaqGroups\(locale, siteConfig\.release\.checkoutAvailable\)/u);
  assert.match(pageSources.readingGuide, /siteConfig\.release\.publicLaunchReady/u);
  assert.match(pageSources.numberedNotation, /siteConfig\.release\.publicLaunchReady/u);
});
