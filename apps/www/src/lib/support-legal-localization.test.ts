import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUPPORTED_LOCALES } from "@score/i18n";
import {
  SUPPORT_LEGAL_LOCALIZATIONS,
  SUPPORT_LEGAL_MEDIA_SOURCE_LOCALES,
  getSupportLegalLocalization,
  getSupportLegalMedia,
} from "./support-legal-localization/index";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pagePaths = {
  support: "src/app/support/page.tsx",
  copyright: "src/app/copyright-complaint/page.tsx",
  privacy: "src/app/privacy/page.tsx",
  terms: "src/app/terms/page.tsx",
} as const;
const componentPaths = {
  support: "src/components/SupportRequestForm.tsx",
  copyright: "src/components/CopyrightComplaintForm.tsx",
} as const;
const pageSources = Object.fromEntries(
  Object.entries(pagePaths).map(([key, file]) => [key, readFileSync(path.join(appRoot, file), "utf8")]),
) as Record<keyof typeof pagePaths, string>;
const componentSources = Object.fromEntries(
  Object.entries(componentPaths).map(([key, file]) => [key, readFileSync(path.join(appRoot, file), "utf8")]),
) as Record<keyof typeof componentPaths, string>;

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
  for (const [key, item] of Object.entries(value)) stringLeafPaths(item, `${currentPath}.${key}`, paths);
  return paths;
}

test("support and legal catalogs are key-complete and nonempty for all nine locales", () => {
  assert.deepEqual(Object.keys(SUPPORT_LEGAL_LOCALIZATIONS), [...SUPPORTED_LOCALES]);
  const englishPaths = stringLeafPaths(SUPPORT_LEGAL_LOCALIZATIONS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getSupportLegalLocalization(locale);
    assert.deepEqual(stringLeafPaths(catalog).sort(), englishPaths, `${locale} catalog leaves`);
    assert.equal(catalog.support.workflows.items.length, 3, locale);
    assert.equal(catalog.support.evidence.points.length, 4, locale);
    assert.equal(catalog.support.boundary.metrics.length, 3, locale);
    assert.equal(catalog.copyright.faqs.length, 3, locale);
    assert.equal(catalog.privacy.sections.length, 6, locale);
    assert.deepEqual(catalog.privacy.sections.map((section) => section.points.length), [3, 3, 4, 3, 4, 3], locale);
    assert.equal(catalog.terms.sections.length, 5, locale);
    assert.deepEqual(catalog.terms.sections.map((section) => section.points.length), [3, 4, 3, 4, 3], locale);
    assert.deepEqual(Object.keys(catalog.support.form.categories), ["payment", "activation", "job", "privacy", "general"], locale);
    assert.deepEqual(Object.keys(catalog.copyright.form.statuses), ["received", "validating", "info_required", "reviewing", "actioned", "rejected", "closed"], locale);
  }
});

test("every non-English locale has distinct support, copyright, privacy, terms, and legal-review copy", () => {
  const english = SUPPORT_LEGAL_LOCALIZATIONS.en;
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getSupportLegalLocalization(locale);
    assert.notEqual(catalog.support.hero.title, english.support.hero.title, locale);
    assert.notEqual(catalog.support.form.submit, english.support.form.submit, locale);
    assert.notEqual(catalog.copyright.hero.title, english.copyright.hero.title, locale);
    assert.notEqual(catalog.copyright.form.lookup, english.copyright.form.lookup, locale);
    assert.notEqual(catalog.privacy.hero.title, english.privacy.hero.title, locale);
    assert.notEqual(catalog.terms.hero.title, english.terms.hero.title, locale);
    assert.notEqual(catalog.legalReviewNotice.body, english.legalReviewNotice.body, locale);
    assert.ok(catalog.legalReviewNotice.body.length >= 30, `${locale} legal review notice`);
  }
});

test("support and legal pages expose only exact-locale media and otherwise omit it", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const expected = getSupportLegalMedia("support", locale);
    assert.equal(SUPPORT_LEGAL_MEDIA_SOURCE_LOCALES[locale], expected?.sourceLocale ?? null);
    for (const page of Object.keys(pagePaths) as Array<keyof typeof pagePaths>) {
      const media = getSupportLegalMedia(page, locale);
      assert.equal(media?.src, expected?.src, `${page}/${locale}`);
      if (media) assert.equal(media.sourceLocale, locale, `${page}/${locale}`);
    }
  }
});

test("server pages select one catalog, localize metadata and links, and sanitize structured data", () => {
  for (const [page, source] of Object.entries(pageSources)) {
    assert.match(source, /getSupportLegalLocalization\(locale\)/u, page);
    assert.match(source, /getSupportLegalMedia\(/u, page);
    assert.match(source, /keywords: \[\.\.\.copy\.metadata\.keywords\]/u, page);
    assert.match(source, /locale: localization\.openGraphLocale/u, page);
    assert.match(source, /media && mediaPresentation \? \{ images:/u, page);
    assert.match(source, /alt: mediaPresentation\.alt/u, page);
    assert.match(source, /inLanguage: getLocaleConfig\(locale\)\.htmlLang/u, page);
    assert.match(source, /JSON\.stringify\(structuredData\)\.replaceAll\("<", "\\\\u003c"\)/u, page);
    assert.doesNotMatch(source, /locale === "zh-CN"|\bisChinese\b|\bchinese\b/u, page);
    assert.doesNotMatch(source, /feature-pricing-real\.png/u, page);
  }

  assert.match(pageSources.support, /localizePublicHref\("\/faq", locale\)/u);
  assert.match(pageSources.support, /getCheckoutUrl\(locale\)/u);
  assert.match(pageSources.privacy, /localizePublicHref\(getSupportUrl\("privacy", "privacy"\), locale\)/u);
  assert.match(pageSources.terms, /localizePublicHref\(getSupportUrl\("general", "terms"\), locale\)/u);
  assert.match(pageSources.privacy, /localizePublicHref\("\/terms", locale\)/u);
  assert.match(pageSources.terms, /localizePublicHref\("\/copyright-complaint", locale\)/u);
  assert.match(pageSources.terms, /getCheckoutUrl\(locale\)/u);
  assert.match(pageSources.privacy, /siteConfig\.release\.checkoutAvailable/u);
  assert.match(pageSources.terms, /siteConfig\.release\.checkoutAvailable/u);
});

test("legal drafts show an accessible professional-review notice only outside English", () => {
  for (const page of ["copyright", "privacy", "terms"] as const) {
    const source = pageSources[page];
    assert.match(source, /locale !== "en" \? \(/u, page);
    assert.match(source, /role="note"/u, page);
    assert.match(source, /aria-label=\{localization\.legalReviewNotice\.ariaLabel\}/u, page);
    assert.match(source, /localization\.legalReviewNotice\.body/u, page);
  }
  assert.doesNotMatch(pageSources.support, /legalReviewNotice|role="note"/u);
});

test("client forms receive only current copy and preserve raw nonempty API diagnostics", () => {
  for (const [component, source] of Object.entries(componentSources)) {
    assert.match(source, /support-legal-localization\/types/u, component);
    assert.doesNotMatch(source, /getSupportLegalLocalization|SUPPORT_LEGAL_LOCALIZATIONS/u, component);
    assert.doesNotMatch(source, /locale === "zh-CN"|\bisChinese\b|\bchinese\b/u, component);
  }
  assert.match(pageSources.support, /copy=\{copy\.form\}/u);
  assert.match(pageSources.copyright, /copy=\{copy\.form\}/u);

  assert.match(componentSources.support, /setStatus\(result\.error\)/u);
  assert.doesNotMatch(componentSources.support, /setStatus\([^)]*(?:localiz|translat)/iu);
  assert.match(componentSources.copyright, /setSubmitError\(result\.error\)/u);
  assert.match(componentSources.copyright, /setLookupError\(result\.error\)/u);
  assert.match(componentSources.copyright, /\{lookup\.actionTaken\}/u);
  assert.match(componentSources.copyright, /\{item\.message\}/u);
  assert.match(componentSources.copyright, /copy\.statuses\[lookup\.status\]/u);
  assert.match(componentSources.copyright, /copy\.statuses\[item\.status\]/u);
  assert.match(componentSources.copyright, /copy\.emptyHistory/u);
});

test("form endpoints, payload fields, enum values, and validation limits remain invariant", () => {
  const support = componentSources.support;
  assert.match(support, /\/api\/support\/requests/u);
  for (const field of ["category", "locale", "contactName", "contactEmail", "accountEmail", "orderReference", "jobReference", "subject", "message", "sourcePage", "sourceContext", "website"]) {
    assert.match(support, new RegExp(`\\b${field}\\b`, "u"), `support payload ${field}`);
  }
  assert.match(support, /\["payment", "activation", "job", "privacy", "general"\]/u);
  assert.match(support, /maxLength=\{4000\}/u);

  const copyright = componentSources.copyright;
  assert.match(copyright, /\/api\/copyright\/complaints"/u);
  assert.match(copyright, /\/api\/copyright\/complaints\/lookup/u);
  for (const field of ["locale", "claimantName", "claimantEmail", "organization", "rightsBasis", "originalWorkDescription", "allegedlyInfringingUrls", "evidenceUrls", "requestedAction", "goodFaithDeclared", "accuracyDeclared", "signature", "website"]) {
    assert.match(copyright, new RegExp(`\\b${field}\\b`, "u"), `copyright payload ${field}`);
  }
  assert.match(copyright, /<option value="owner">/u);
  assert.match(copyright, /<option value="authorized_agent">/u);
  assert.match(copyright, /minLength=\{20\} maxLength=\{6000\}/u);
  assert.match(copyright, /minLength=\{10\} maxLength=\{2000\}/u);
});

test("catalogs retain product, legal, and locale-scope invariants", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["en", "zh-CN", "zh-TW", "ja", "ko", "fr", "es", "de", "ru"]);
  for (const locale of SUPPORTED_LOCALES) {
    const serialized = JSON.stringify(getSupportLegalLocalization(locale));
    assert.doesNotMatch(serialized, /(?:one|single)[ -]page[^.]{0,80}(?:free|trial)|(?:free|trial)[^.]{0,80}(?:one|single)[ -]page|单页[^。]{0,50}免费|一页[^。]{0,50}免费|1ページ[^。]{0,50}無料/iu, locale);
    for (const technicalName of ["MusicXML", "Score JSON", "Starter", "Converter Pro", "GA4", "Microsoft Clarity"]) {
      assert.match(serialized, new RegExp(technicalName, "u"), `${locale} must preserve ${technicalName}`);
    }
  }
  const scopedSource = `${Object.values(pageSources).join("\n")}\n${Object.values(componentSources).join("\n")}`;
  assert.doesNotMatch(scopedSource, /\bar(?:-SA)?\b|العربية|Arabic/u);
});
