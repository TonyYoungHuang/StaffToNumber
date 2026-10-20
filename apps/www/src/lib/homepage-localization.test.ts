import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { getPricingPlanCatalog } from "@score/shared";
import { getPricingCardCopy, withMobilePricingCopy } from "./pricing-card-copy";
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

test("localized display keeps billing identity while presenting lifetime access and monthly order", () => {
  const base = getPricingPlanCatalog("en");
  for (const locale of SUPPORTED_LOCALES) {
    const plans = localizeHomepagePlans(locale, base);
    assert.deepEqual(plans.map(p => p.code), ["free", "starter-monthly", "converter-pro-monthly", "starter-annual", "converter-pro-annual"]);
    for (const plan of plans) {
      const original = base.find(p => p.code === plan.code)!;
      assert.equal(plan.featured, original.featured);
      if (plan.code === "converter-pro-annual") {
        assert.match(plan.price, /99/);
        assert.doesNotMatch([plan.cycle, plan.credits, plan.unitPrice, ...plan.resources].join(" "), /200|UTC|0[.,]041|80[.,]88|annual|年付/i);
        assert.equal(plan.benefits.length, 4);
        assert.equal(plan.resources.length, 2);
      } else if (plan.code !== "free") {
        assert.match(plan.credits, plan.code.startsWith("starter") ? /50/ : /200/);
        assert.match(plan.resources.join(" "), /UTC/);
      }
    }
    assert.doesNotMatch(JSON.stringify(plans), /Score JSON/);
  }
  // Presentation must never rewrite the backend catalog or annual price code.
  assert.equal(base.find(p => p.code === "converter-pro-annual")!.cycle, "Annual");
  assert.match(base.find(p => p.code === "converter-pro-annual")!.credits, /200/);
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

test("mobile paid cards add localized compact copy while preserving full and free plans", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const plans = localizeHomepagePlans(locale, getPricingPlanCatalog("en"));
    assert.equal(withMobilePricingCopy(locale, plans[0]), plans[0], `${locale}: free stays unchanged`);
    const copy = getPricingCardCopy(locale);
    assert.equal(copy.benefits.length, 3);
    for (const plan of plans.slice(1)) {
      if (plan.code === "converter-pro-annual") { assert.equal(withMobilePricingCopy(locale, plan), plan); continue; }
      const mobile = withMobilePricingCopy(locale, plan);
      assert.ok("benefitsShort" in mobile && "resourcesShort" in mobile && "audienceShort" in mobile);
      const { benefitsShort, resourcesShort, audienceShort, ...full } = mobile;
      assert.deepEqual(full, plan, `${locale} ${plan.code}: detailed data unchanged`);
      assert.equal(benefitsShort.length, 3);
      assert.equal(resourcesShort.length, 2);
      assert.match(resourcesShort[0], plan.code.startsWith("starter-") ? /250/u : /500/u);
      assert.equal(resourcesShort[1], copy.reset);
      assert.match(resourcesShort[1], /UTC/u);
      assert.ok(audienceShort.length > 0);
      if (locale !== "en") {
        assert.notEqual(audienceShort, getPricingCardCopy("en").starter);
        assert.notEqual(audienceShort, getPricingCardCopy("en").pro);
        assert.notEqual(copy.pass, getPricingCardCopy("en").pass);
        assert.notEqual(copy.passTerms, getPricingCardCopy("en").passTerms);
        for (const [index, benefit] of benefitsShort.entries()) {
          assert.notEqual(benefit, getPricingCardCopy("en").benefits[index]);
        }
      }
    }
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
  assert.match(workbenchSource, /getAppScoreUrl\(scoreId, locale, submittedMode\)/u);
  assert.doesNotMatch(layoutSource, /\bkeywords\s*:/u);
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
