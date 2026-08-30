import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { getPricingPlanCatalog } from "@score/shared";
import {
  HOMEPAGE_LOCALIZATIONS,
  HOMEPAGE_MEDIA_SOURCE_LOCALES,
  getHomepageLocalization,
  localizeHomepagePlans,
} from "./homepage-localization/index";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pageSource = readFileSync(path.join(appRoot, "src", "app", "page.tsx"), "utf8");
const workbenchSource = readFileSync(
  path.join(appRoot, "src", "components", "HomeHeroWorkbench.tsx"),
  "utf8",
);
const layoutSource = readFileSync(path.join(appRoot, "src", "app", "layout.tsx"), "utf8");

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

test("homepage catalogs are complete for every supported locale", () => {
  assert.deepEqual(Object.keys(HOMEPAGE_LOCALIZATIONS), [...SUPPORTED_LOCALES]);
  const englishPaths = stringLeafPaths(HOMEPAGE_LOCALIZATIONS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const localization = getHomepageLocalization(locale);
    assert.deepEqual(
      stringLeafPaths(localization).sort(),
      englishPaths,
      `${locale} must contain exactly the English catalog's string leaves`,
    );
    assert.equal(localization.media.caseAlts.length, 3);
    assert.equal(localization.media.demoAlts.length, 4);
    assert.equal(localization.media.scoreSamples.length, 5);
    assert.equal(localization.workbench.tools.length, 6);
  }
});

test("non-English homepage catalogs localize representative visible copy", () => {
  const english = HOMEPAGE_LOCALIZATIONS.en;
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const localization = HOMEPAGE_LOCALIZATIONS[locale];
    assert.notEqual(localization.page.heroTitle.join(" "), english.page.heroTitle.join(" "), locale);
    assert.notEqual(localization.page.pricingTitle, english.page.pricingTitle, locale);
    assert.notEqual(localization.workbench.authTitle, english.workbench.authTitle, locale);
    assert.notEqual(localization.plans.free.cta, english.plans.free.cta, locale);
    assert.notEqual(localization.plans["starter-monthly"].audience, english.plans["starter-monthly"].audience, locale);
  }
});

test("homepage media availability never maps a locale to another language", () => {
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(
      HOMEPAGE_MEDIA_SOURCE_LOCALES[locale] === null || HOMEPAGE_MEDIA_SOURCE_LOCALES[locale] === locale,
      locale,
    );
  }
  assert.equal(HOMEPAGE_MEDIA_SOURCE_LOCALES.en, "en");
  assert.equal(HOMEPAGE_MEDIA_SOURCE_LOCALES["zh-CN"], "zh-CN");
});

test("localized plan displays preserve checkout and entitlement invariants", () => {
  const basePlans = getPricingPlanCatalog("en");
  const invariantFields = basePlans.map(({ code, price, featured }) => ({ code, price, featured }));

  for (const locale of SUPPORTED_LOCALES) {
    const localizedPlans = localizeHomepagePlans(locale, basePlans);
    assert.deepEqual(
      localizedPlans.map(({ code, price, featured }) => ({ code, price, featured })),
      invariantFields,
      locale,
    );
    assert.deepEqual(localizedPlans.slice(1).map((plan) => plan.name), ["Starter", "Starter", "Converter Pro", "Converter Pro"]);
    assert.deepEqual(localizedPlans.map((plan) => plan.price), ["$0", "$7.99", "$49", "$14.99", "$99"]);
    assert.deepEqual(localizedPlans.map((plan) => plan.featured), [false, false, true, false, false]);
    assert.deepEqual(localizedPlans.map((plan) => plan.benefits.length), [5, 5, 5, 5, 5]);
    assert.deepEqual(localizedPlans.map((plan) => plan.resources.length), [4, 4, 4, 4, 4]);
    assert.match(localizedPlans[0]?.credits ?? "", /25/u);
    assert.ok(localizedPlans.slice(1, 3).every((plan) => /50/u.test(plan.credits)));
    assert.ok(localizedPlans.slice(3).every((plan) => /200/u.test(plan.credits)));
    assert.match(localizedPlans[2]?.resources.join(" ") ?? "", /46[.,]88/u);
    assert.match(localizedPlans[4]?.resources.join(" ") ?? "", /80[.,]88/u);
  }
});

test("homepage catalogs keep current product boundaries and stable tool routes", () => {
  const englishRoutes = HOMEPAGE_LOCALIZATIONS.en.page.capabilities.map(([, , href]) => href);
  for (const locale of SUPPORTED_LOCALES) {
    const localization = HOMEPAGE_LOCALIZATIONS[locale];
    assert.deepEqual(localization.page.capabilities.map(([, , href]) => href), englishRoutes, locale);
    assert.doesNotMatch(
      JSON.stringify(localization),
      /(?:one|single)[ -]page[^.]{0,80}(?:free|trial)|(?:free|trial)[^.]{0,80}(?:one|single)[ -]page/iu,
      `${locale} must not regress to the retired one-page-free claim`,
    );
  }
});

test("homepage renders localized schema, media alternatives, plan labels, and client copy", () => {
  assert.match(pageSource, /inLanguage: getLocaleConfig\(locale\)\.htmlLang/u);
  assert.match(pageSource, /description: copy\.schemaDescription/u);
  assert.match(pageSource, /JSON\.stringify\(softwareSchema\)\.replaceAll\("<", "\\\\u003c"\)/u);
  assert.match(pageSource, /alt=\{mediaPresentation\?\.alt \?\? title\}/u);
  assert.match(pageSource, /aria-label=\{mediaPresentation\?\.alt\}/u);
  assert.match(pageSource, /getPendingProductMediaPresentation\(locale, title\)/u);
  assert.match(pageSource, /labels=\{copy\.creditPlanCardLabels\}/u);
  assert.match(pageSource, /copy=\{localization\.workbench\}/u);
  assert.match(workbenchSource, /copy: HomepageWorkbenchCopy/u);
  assert.match(workbenchSource, /getAppScoreUrl\(scoreId, locale\)/u);
  assert.match(layoutSource, /keywords: \[\.\.\.catalog\.keywords\]/u);
  assert.doesNotMatch(layoutSource, /\.\.\.siteConfig\.keywords/u);
  assert.doesNotMatch(pageSource, /const copy\s*=\s*(?:locale === "zh-CN"|isChinese)\s*\?/u);
});

test("API errors remain verbatim while browser-owned failures use localized fallback copy", () => {
  assert.match(
    workbenchSource,
    /function apiErrorOrFallback\(error: string \| undefined, fallback: string\) \{\s*return error\?\.trim\(\) \? error : fallback;\s*\}/u,
  );
  assert.doesNotMatch(workbenchSource, /localizedApiError|invalid email or password|email already registered/iu);
  assert.match(workbenchSource, /xhr\.onerror = \(\) => \{[^}]*setRecognitionError\(copy\.uploadFailed\)/u);
  assert.match(workbenchSource, /setRecognitionError\(copy\.invalidFile\)/u);
  assert.match(workbenchSource, /apiErrorOrFallback\(latestJob\.errorMessage \?\? undefined, copy\.uploadFailed\)/u);
});
