import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import {
  LIBRARY_OPEN_GRAPH_LOCALES,
  LIBRARY_TEXT_FALLBACK_POLICY,
  formatLibraryComposerDates,
  getLibraryCatalog,
} from "./library-localization/index.js";
import {
  LIBRARY_ASSET_STATUSES,
  LIBRARY_DIFFICULTIES,
  LIBRARY_ENSEMBLES,
  LIBRARY_ERAS,
  LIBRARY_FORMATS,
  LIBRARY_INSTRUMENTS,
  LIBRARY_WORK_RIGHTS,
} from "./library-localization/types.js";
import { filterPublicScores, getPublicScoreText, listPublicScoreFacets, publicScoreLibrary } from "./public-score-library.js";

const cc0License = "Original ScoreTransposer QA fixture released as CC0 for product testing and derivative projects.";
const sourceLinkedLicense = "Work-level public domain. The edition and file remain at the named source and must be reviewed under that source's regional and file-level terms before import.";

const expectedRightsSources = {
  "product-workflow-etude": ["ScoreTransposer", "/library/product-workflow-etude.musicxml", "CC0", cc0License, "scoretransposer-cc0", "downloadable", "/library/product-workflow-etude.musicxml"],
  "bach-prelude-c-major-bwv-846": ["Mutopia", "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BachJS", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "bach-air-bwv-1068": ["Mutopia", "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BachJS", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "beethoven-ode-to-joy-theme": ["Mutopia", "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BeethovenLv", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "beethoven-symphony-5-op-67": ["IMSLP", "https://imslp.org/wiki/Symphony_No.5,_Op.67_(Beethoven,_Ludwig_van)", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "mozart-eine-kleine-nachtmusik-k-525": ["IMSLP", "https://imslp.org/wiki/Eine_kleine_Nachtmusik,_K.525_(Mozart,_Wolfgang_Amadeus)", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "pachelbel-canon-d-major": ["Mutopia", "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=PachelbelJ", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "vivaldi-spring-rv-269": ["IMSLP", "https://imslp.org/wiki/Le_quattro_stagioni_(Vivaldi,_Antonio)", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "handel-hallelujah-chorus": ["CPDL", "https://www.cpdl.org/wiki/index.php/George_Frideric_Handel", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "schubert-ave-maria-d-839": ["Mutopia", "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=SchubertF", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "brahms-lullaby-op-49-4": ["Mutopia", "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BrahmsJ", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
  "tallis-if-ye-love-me": ["CPDL", "https://www.cpdl.org/wiki/index.php/Thomas_Tallis", "Public domain", sourceLinkedLicense, "source-linked-review", "source-linked", null],
} as const;

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

test("public library preserves stable slugs, source URLs, rights, licenses, and download conditions", () => {
  assert.equal(getLibraryCatalog("en").values.assetLicenses["scoretransposer-cc0"], cc0License);
  assert.equal(getLibraryCatalog("en").values.assetLicenses["source-linked-review"], sourceLinkedLicense);
  assert.equal(new Set(publicScoreLibrary.map((score) => score.slug)).size, publicScoreLibrary.length);
  assert.deepEqual(
    Object.fromEntries(publicScoreLibrary.map((score) => [
      score.slug,
      [score.sourceProvider, score.sourceUrl, score.workRights, score.assetLicense, score.assetLicenseKey, score.assetStatus, score.localMusicXmlUrl ?? null],
    ])),
    expectedRightsSources,
  );

  for (const score of publicScoreLibrary) {
    assert.match(score.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    assert.ok(score.sourceUrl.startsWith("https://") || score.sourceUrl.startsWith("/library/"));
    if (score.assetStatus === "downloadable") {
      assert.equal(score.workRights, "CC0");
      assert.equal(score.assetLicense, cc0License);
      assert.equal(score.assetLicenseKey, "scoretransposer-cc0");
      assert.ok(score.localMusicXmlUrl?.endsWith(".musicxml"));
    } else {
      assert.equal(score.assetLicense, sourceLinkedLicense);
      assert.equal(score.assetLicenseKey, "source-linked-review");
      assert.equal(score.localMusicXmlUrl, undefined);
    }
  }
});

test("all nine library catalogs are complete, distinct, and keep exact enum keys", () => {
  const english = getLibraryCatalog("en");
  assert.deepEqual(Object.keys(LIBRARY_OPEN_GRAPH_LOCALES), [...SUPPORTED_LOCALES]);
  assert.equal(new Set(Object.values(LIBRARY_OPEN_GRAPH_LOCALES)).size, SUPPORTED_LOCALES.length);

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getLibraryCatalog(locale);
    assert.ok(collectStrings(catalog).every((value) => value.trim().length > 0), `${locale} catalog values must be nonempty`);
    assert.deepEqual(Object.keys(catalog.values.eras), [...LIBRARY_ERAS]);
    assert.deepEqual(Object.keys(catalog.values.instruments), [...LIBRARY_INSTRUMENTS]);
    assert.deepEqual(Object.keys(catalog.values.ensembles), [...LIBRARY_ENSEMBLES]);
    assert.deepEqual(Object.keys(catalog.values.difficulties), [...LIBRARY_DIFFICULTIES]);
    assert.deepEqual(Object.keys(catalog.values.formats), [...LIBRARY_FORMATS]);
    assert.deepEqual(Object.keys(catalog.values.assetStatuses), [...LIBRARY_ASSET_STATUSES]);
    assert.deepEqual(Object.keys(catalog.values.workRights), [...LIBRARY_WORK_RIGHTS]);
    const englishInterfacePattern = locale === "en" ? /English/u : {
      "zh-CN": /英文/u,
      "zh-TW": /英文/u,
      ja: /英語/u,
      ko: /영어/u,
      fr: /anglais/iu,
      es: /inglés/iu,
      de: /englisch/iu,
      ru: /английск/iu,
    }[locale];
    assert.match(catalog.metadata.imageAlt, englishInterfacePattern);
    assert.match(catalog.detail.imageAltTemplate, englishInterfacePattern);

    if (locale !== "en") {
      assert.notEqual(catalog.metadata.title, english.metadata.title);
      assert.notEqual(catalog.index.title, english.index.title);
      assert.notEqual(catalog.detail.notice, english.detail.notice);
      assert.notEqual(catalog.values.assetLicenses["source-linked-review"], english.values.assetLicenses["source-linked-review"]);
    }
  }
});

test("work text uses typed localized values and records the only intentional proper-name fallback", () => {
  assert.deepEqual(Object.keys(LIBRARY_TEXT_FALLBACK_POLICY), ["title", "composer", "description"]);
  assert.ok(Object.values(LIBRARY_TEXT_FALLBACK_POLICY).every((policy) => policy.fallbackLocale === "en" && policy.reason.length > 40));

  for (const score of publicScoreLibrary) {
    assert.deepEqual(Object.keys(score.title), [...SUPPORTED_LOCALES]);
    assert.deepEqual(Object.keys(score.description), [...SUPPORTED_LOCALES]);
    if (score.slug === "product-workflow-etude") {
      assert.deepEqual(Object.keys(score.composer), ["en"]);
      for (const locale of SUPPORTED_LOCALES) assert.equal(getPublicScoreText(score.composer, locale), "ScoreTransposer QA");
    } else {
      assert.deepEqual(Object.keys(score.composer), [...SUPPORTED_LOCALES]);
    }

    for (const locale of SUPPORTED_LOCALES) {
      assert.ok(getPublicScoreText(score.title, locale).trim());
      assert.ok(getPublicScoreText(score.composer, locale).trim());
      assert.ok(getPublicScoreText(score.description, locale).trim());
      if (locale !== "en") assert.notEqual(getPublicScoreText(score.description, locale), score.description.en);
    }
  }
});

test("public library search covers work text and facet labels in every supported language", () => {
  const prelude = publicScoreLibrary.find((score) => score.slug === "bach-prelude-c-major-bwv-846");
  assert.ok(prelude);

  for (const locale of SUPPORTED_LOCALES) {
    const title = getPublicScoreText(prelude.title, locale);
    assert.ok(filterPublicScores({ query: title }).some((score) => score.slug === prelude.slug), `${locale} title must be searchable`);
    const piano = getLibraryCatalog(locale).values.instruments.Piano;
    assert.ok(filterPublicScores({ query: piano }).length >= 3, `${locale} Piano label must be searchable`);
  }

  assert.ok(filterPublicScores({ query: "贝多芬" }).length >= 2);
  assert.ok(filterPublicScores({ query: "фортепиано" }).length >= 3);
  assert.ok(filterPublicScores({ query: "prelude" }).some((score) => score.slug === prelude.slug), "accent-insensitive search must match Prélude");
});

test("raw filter values remain stable while locale only changes labels and sort order", () => {
  assert.ok(filterPublicScores({ instrument: "Piano" }).length >= 3);
  assert.equal(filterPublicScores({ ensemble: "SATB a cappella" }).length, 1);
  assert.ok(filterPublicScores({ era: "Baroque" }).every((score) => score.era === "Baroque"));

  for (const locale of SUPPORTED_LOCALES) {
    const facets = listPublicScoreFacets(locale);
    assert.ok(facets.instruments.includes("Piano"));
    assert.ok(facets.ensembles.includes("SATB a cappella"));
    assert.ok(facets.eras.includes("Renaissance"));
  }
});

test("composer years use locale number formatting without changing the stored rights record", () => {
  assert.equal(formatLibraryComposerDates("1685–1750", "en"), "1685–1750");
  assert.equal(formatLibraryComposerDates("c.1505–1585", "zh-CN"), "约 1505–1585");
  assert.equal(formatLibraryComposerDates("c.1505–1585", "ru"), "ок. 1505–1585");
  assert.equal(formatLibraryComposerDates("unknown", "de"), "unknown");
});

test("library pages localize metadata and links, escape JSON-LD, and contain no bilingual branch", () => {
  const indexSource = fs.readFileSync(path.join(process.cwd(), "src", "app", "library", "page.tsx"), "utf8");
  const detailSource = fs.readFileSync(path.join(process.cwd(), "src", "app", "library", "[scoreSlug]", "page.tsx"), "utf8");
  const escapedJsonLd = 'JSON.stringify(structuredData).replaceAll("<", "\\\\u003c")';

  for (const source of [indexSource, detailSource]) {
    assert.equal(source.includes("isChinese"), false);
    assert.equal(source.includes('locale === "zh-CN"'), false);
    assert.ok(source.includes(escapedJsonLd));
    assert.ok(source.includes("inLanguage"));
    assert.equal(source.includes('"use client"'), false);
  }

  assert.ok(indexSource.includes('action={localizePublicHref("/library", locale)}'));
  assert.ok(indexSource.includes('value={value}'), "localized options must retain raw query values");
  assert.ok(detailSource.includes("getAppScoreProjectsUrl(locale)"));
  assert.ok(detailSource.includes('localizePublicHref("/library", locale)'));
});

test("library locale source files are valid UTF-8 without replacement characters", () => {
  const localeDir = path.join(process.cwd(), "src", "lib", "library-localization", "locales");
  const files = fs.readdirSync(localeDir).filter((file) => file.endsWith(".ts"));
  assert.equal(files.length, SUPPORTED_LOCALES.length);
  for (const file of files) {
    const source = fs.readFileSync(path.join(localeDir, file), "utf8");
    assert.equal(source.includes(String.fromCodePoint(0xfffd)), false, `${file} must remain valid UTF-8`);
  }
});
