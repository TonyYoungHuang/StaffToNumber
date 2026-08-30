import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { LOCALE_ROUTE_PREFIXES, SUPPORTED_LOCALES } from "@score/i18n";
import { getFeatureAnswerContent, getFeatureAnswerUi, priorityAnswerPageSlugs } from "./feature-answer-content.js";
import { buildFeatureExampleFile } from "./feature-example-files.js";
import {
  FEATURE_OPEN_GRAPH_LOCALES,
  getFeatureIndexCatalog,
  getFeaturePageTranslationCatalog,
  getFeaturePageUi,
  getFeaturePracticeCopy,
  localizeFeatureEvidence,
  localizeFeaturePage,
} from "./feature-page-localization.js";
import { BETA_FEATURE_IDS, FEATURE_TRANSLATION_SLUGS, FORMAL_FEATURE_IDS } from "./feature-localization/types.js";
import { localizePublicHref } from "./locale-routing.js";
import { getFeatureProductMedia, type FeatureProductMediaSlug } from "./product-media/index.js";
import { auditFeatureSeo, buildFeatureSeoManifest, buildSeoSuggestions, featureSeoRecords } from "./feature-seo.js";
import { platformFeaturePages } from "./platform-feature-pages.js";

test("current feature inventory is product-owner approved and has no blocking SEO errors", () => {
  const report = auditFeatureSeo(platformFeaturePages, featureSeoRecords, "2026-07-15T00:00:00.000Z");

  assert.equal(report.metrics.pages, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueTitles, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueDescriptions, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueCanonicals, platformFeaturePages.length);
  assert.deepEqual(report.issues.filter((issue) => issue.severity === "error"), []);
  assert.equal(report.metrics.approved, platformFeaturePages.length);
  assert.equal(report.publishReady, true);
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.status === "approved"));
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.factsReviewedAt === "2026-08-28"));
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.approvedBy === "ScoreTransposer product owner"));
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.reviewerRole === "product_owner"));
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.approvalBasis?.includes("2026-08-25 AI evidence precheck")));
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.approvalBasis?.includes("2026-08-28")));
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.generatedWithAi));
});

test("audit detects duplicate metadata, broken internal links, and missing schema", () => {
  const duplicatePages = [
    platformFeaturePages[0],
    { ...platformFeaturePages[1], title: platformFeaturePages[0].title, canonical: platformFeaturePages[0].canonical },
  ];
  const records = {
    [duplicatePages[0].slug]: {
      ...featureSeoRecords[duplicatePages[0].slug],
      schemas: ["BreadcrumbList" as const],
      relatedSlugs: ["route-that-does-not-exist"],
    },
    [duplicatePages[1].slug]: featureSeoRecords[duplicatePages[1].slug],
  };

  const report = auditFeatureSeo(duplicatePages, records, "2026-07-15T00:00:00.000Z");

  assert.ok(report.issues.some((issue) => issue.field === "title" && issue.severity === "error"));
  assert.ok(report.issues.some((issue) => issue.field === "canonical" && issue.severity === "error"));
  assert.ok(report.issues.some((issue) => issue.field === "structuredData" && issue.severity === "error"));
  assert.ok(report.issues.some((issue) => issue.field === "internalLinks" && issue.severity === "error"));
});

test("audit does not count an approved label without complete human sign-off metadata", () => {
  const slug = platformFeaturePages[0].slug;
  const records = {
    ...featureSeoRecords,
    [slug]: {
      ...featureSeoRecords[slug],
      review: { ...featureSeoRecords[slug].review, approvedBy: null },
    },
  };

  const report = auditFeatureSeo(platformFeaturePages, records, "2026-08-28T00:00:00.000Z");

  assert.equal(report.metrics.approved, platformFeaturePages.length - 1);
  assert.equal(report.publishReady, false);
  assert.ok(report.issues.some((issue) => issue.slug === slug && issue.field === "review" && issue.severity === "warning"));
});

test("suggestions preserve the page intent and related workflow links", () => {
  const page = platformFeaturePages.find((item) => item.slug === "transpose-score");
  assert.ok(page);
  const record = featureSeoRecords[page.slug];
  const suggestions = buildSeoSuggestions(page, record);

  assert.match(suggestions.title, /Transpose Sheet Music/);
  assert.match(suggestions.description, /Transpose sheet music online/);
  assert.deepEqual(suggestions.internalLinks, record.relatedSlugs.map((slug) => `/${slug}`));
});

test("commercial keyword clusters have one intentional feature-page owner", () => {
  const expectedKeywords: Record<string, string[]> = {
    "score-editor": ["sheet music maker", "sheet music editor", "music score maker", "online music notation editor", "extract parts from score", "split score into parts", "collaborative sheet music editor", "collaborative music notation software"],
    "pdf-score-scanner": ["sheet music scanner", "scan sheet music", "sheet music scanner online free"],
    "pdf-to-musicxml": ["pdf to musicxml", "pdf to musicxml converter", "image to musicxml"],
    "transpose-score": ["transpose sheet music", "transpose sheet music online", "change sheet music key"],
    "musicxml-midi": ["musicxml editor", "musicxml editor online", "edit musicxml", "sheet music to midi", "musicxml to midi", "midi to sheet music", "musicxml to pdf", "export sheet music to pdf", "sheet music svg", "sheet music png"],
    "score-to-audio": ["sheet music to mp3", "sheet music to mp3 converter", "musicxml to mp3", "sheet music to audio converter", "sheet music player", "scan sheet music and play", "music practice recording app"],
    "audio-to-score": ["audio to sheet music", "mp3 to midi", "audio to sheet music AI"],
    "staff-to-jianpu": ["staff to jianpu"],
    "jianpu-to-staff": ["jianpu to staff notation"],
    teaching: ["music notation software for students", "music education software", "music education platform", "music teacher software"],
  };

  for (const [slug, terms] of Object.entries(expectedKeywords)) {
    const page = platformFeaturePages.find((item) => item.slug === slug);
    assert.ok(page, `${slug} must have a public feature page`);
    const pageKeywords = new Set(page.keywords.map((keyword) => keyword.toLocaleLowerCase()));
    for (const term of terms) {
      assert.equal(pageKeywords.has(term.toLocaleLowerCase()), true, `${slug} must own ${term}`);
      const otherOwners = platformFeaturePages.filter((item) => item.slug !== slug && item.keywords.some((keyword) => keyword.toLocaleLowerCase() === term.toLocaleLowerCase()));
      assert.deepEqual(otherOwners.map((item) => item.slug), [], `${term} must not be assigned to competing feature pages`);
    }
  }
});

test("content review manifest has deterministic unique hashes tied to reviewable content", () => {
  const first = buildFeatureSeoManifest(platformFeaturePages, featureSeoRecords, "2026-07-15T00:00:00.000Z");
  const second = buildFeatureSeoManifest(platformFeaturePages, featureSeoRecords, "2026-07-15T00:00:00.000Z");
  assert.deepEqual(first, second);
  assert.equal(first.pages.length, platformFeaturePages.length);
  assert.equal(new Set(first.pages.map((page) => page.contentHash)).size, first.pages.length);
  assert.ok(first.pages.every((page) => /^[a-f0-9]{64}$/.test(page.contentHash)));
});

test("content review manifest hashes do not change when only approval metadata changes", () => {
  const slug = platformFeaturePages[0].slug;
  const recordsWithDifferentReview = {
    ...featureSeoRecords,
    [slug]: {
      ...featureSeoRecords[slug],
      review: {
        ...featureSeoRecords[slug].review,
        status: "in_review" as const,
        factsReviewedAt: null,
        approvedBy: null,
        reviewerRole: null,
        approvalBasis: "Review metadata changed without changing the reviewable page content.",
      },
    },
  };
  const approved = buildFeatureSeoManifest(platformFeaturePages, featureSeoRecords, "2026-07-15T00:00:00.000Z");
  const pending = buildFeatureSeoManifest(platformFeaturePages, recordsWithDifferentReview, "2026-07-15T00:00:00.000Z");

  assert.deepEqual(
    pending.pages.map((page) => ({ slug: page.slug, contentHash: page.contentHash })),
    approved.pages.map((page) => ({ slug: page.slug, contentHash: page.contentHash })),
  );
});

test("each feature owns a real, non-empty, binary-unique product screenshot", () => {
  const hashes = new Map<string, string>();
  for (const page of platformFeaturePages) {
    const screenshot = featureSeoRecords[page.slug].screenshot;
    const filePath = path.join(process.cwd(), "public", screenshot.src.replace(/^\//, ""));
    assert.ok(fs.existsSync(filePath), `${page.slug} screenshot must exist`);
    const bytes = fs.readFileSync(filePath);
    assert.ok(bytes.length > 40_000, `${page.slug} screenshot must contain a full product capture`);
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.equal(hashes.has(hash), false, `${page.slug} must not reuse the same screenshot bytes as ${hashes.get(hash)}`);
    hashes.set(hash, page.slug);
  }
});

test("each feature publishes parseable native-format input and output examples", () => {
  for (const page of platformFeaturePages) {
    for (const side of ["input", "output"] as const) {
      const file = buildFeatureExampleFile(page.slug, side);
      assert.ok(file, `${page.slug} ${side} example must exist`);
      assert.ok(file.bytes.length > 20, `${page.slug} ${side} example must not be a placeholder`);
      assert.notEqual(file.contentType, "application/octet-stream");
      if (file.extension === "musicxml") assert.match(new TextDecoder().decode(file.bytes), /<score-partwise/);
      if (file.extension === "mid") assert.equal(new TextDecoder().decode(file.bytes.slice(0, 4)), "MThd");
      if (file.extension === "wav") assert.equal(new TextDecoder().decode(file.bytes.slice(0, 4)), "RIFF");
      if (file.extension === "png") assert.deepEqual([...file.bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    }
  }
  const transposed = buildFeatureExampleFile("transpose-score", "output");
  assert.ok(transposed);
  const transposedXml = new TextDecoder().decode(transposed.bytes);
  assert.match(transposedXml, /<fifths>2<\/fifths>/);
  assert.deepEqual([...transposedXml.matchAll(/<step>([A-G])<\/step>/g)].map((match) => match[1]), ["D", "E", "F", "A"]);
  assert.match(transposedXml, /<step>F<\/step><alter>1<\/alter>/);

  const sourceWav = buildFeatureExampleFile("score-to-audio", "output", { semitones: 0 });
  const shiftedWav = buildFeatureExampleFile("score-to-audio", "output", { semitones: 2 });
  assert.ok(sourceWav && shiftedWav);
  assert.equal(sourceWav.bytes.length, 102_444, "the four-note WAV should remain a 3.2-second deterministic sample");
  assert.equal(shiftedWav.bytes.length, sourceWav.bytes.length);
  assert.notDeepEqual(sourceWav.bytes, shiftedWav.bytes, "transposed audio must not reuse the source waveform");

  const midi = buildFeatureExampleFile("musicxml-midi", "output");
  assert.ok(midi);
  const noteOnEvents = [...midi.bytes].reduce((count, byte, index, bytes) => count + (byte === 0x90 && (bytes[index + 2] ?? 0) > 0 ? 1 : 0), 0);
  assert.equal(noteOnEvents, 4, "the MIDI reference must contain the same C-D-E-G four-note phrase as the MusicXML source");
});

test("priority answer pages publish complete evidence, limits, comparisons, and native sample files", () => {
  for (const slug of priorityAnswerPageSlugs) {
    const page = platformFeaturePages.find((item) => item.slug === slug);
    assert.ok(page, `${slug} must remain a public feature page`);
    assert.equal(page.updatedAt, "2026-08-29");

    for (const locale of ["en", "zh-CN"] as const) {
      const content = getFeatureAnswerContent(slug, locale);
      assert.ok(content, `${slug} needs ${locale} answer content`);
      const conciseContentMinimum = locale === "zh-CN" ? 18 : 25;
      assert.ok(content.promise.length > (locale === "zh-CN" ? 30 : 40));
      assert.ok(content.before.length > conciseContentMinimum);
      assert.ok(content.after.length > conciseContentMinimum);
      assert.ok(content.checkpoints.length >= 3);
      assert.ok(content.commonErrors.length >= 3);
      const errorDetailMinimum = locale === "zh-CN" ? 14 : 20;
      assert.ok(content.commonErrors.every((error) => error.title && error.symptom.length > errorDetailMinimum && error.fix.length > errorDetailMinimum));
      assert.ok(content.accuracySummary.length > (locale === "zh-CN" ? 55 : 120));
      assert.ok(content.accuracyChecks.length >= 3);
      assert.ok(content.comparisonRows.length >= 3);
      const comparisonDetailMinimum = locale === "zh-CN" ? 9 : 20;
      assert.ok(content.comparisonRows.every((row) => row.workflow && row.bestFor.length > comparisonDetailMinimum && row.tradeoff.length > comparisonDetailMinimum));
      if (content.video) {
        for (const asset of [content.video.src, content.video.poster]) {
          assert.ok(fs.existsSync(path.join(process.cwd(), "public", asset.replace(/^\//, ""))), `${slug} media ${asset} must exist`);
        }
      }
      if (content.screenshot) {
        assert.ok(fs.existsSync(path.join(process.cwd(), "public", content.screenshot.src.replace(/^\//, ""))), `${slug} screenshot override must exist`);
        assert.ok(content.screenshot.width > 1000 && content.screenshot.height > 600);
      }
    }
  }

  const sampleUi = getFeatureAnswerUi("en");
  assert.equal(sampleUi.samples.length, 3);
  const pdf = fs.readFileSync(path.join(process.cwd(), "public", "examples", "scoretransposer-reference-score.pdf"));
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.deepEqual(sampleUi.samples.map((sample) => sample.href), [
    "/examples/score-editor/input",
    "/examples/scoretransposer-reference-score.pdf",
    "/examples/musicxml-midi/output",
  ]);
});

test("feature-page catalogs cover the exact approved inventory in every translated locale", () => {
  const expectedSlugs = [...FEATURE_TRANSLATION_SLUGS].sort();
  assert.deepEqual(platformFeaturePages.map((page) => page.slug).sort(), expectedSlugs);
  assert.equal(getFeaturePageTranslationCatalog("en"), null);

  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getFeaturePageTranslationCatalog(locale);
    assert.ok(catalog, `${locale} must have a feature-page catalog`);
    assert.deepEqual(Object.keys(catalog).sort(), expectedSlugs, `${locale} must translate every approved feature slug`);
  }
});

test("every feature page has complete nine-locale content without changing route or product truth", () => {
  for (const page of platformFeaturePages) {
    assert.strictEqual(localizeFeaturePage(page, "en"), page);

    for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
      const localized = localizeFeaturePage(page, locale);
      assert.notEqual(localized.title, page.title, `${locale}/${page.slug} must not fall back to the English title`);
      assert.notEqual(localized.description, page.description, `${locale}/${page.slug} must not fall back to the English description`);
      assert.notDeepEqual(localized.keywords, page.keywords, `${locale}/${page.slug} needs localized metadata keywords`);
      assert.equal(localized.slug, page.slug);
      assert.equal(localized.canonical, page.canonical);
      assert.equal(localized.status, page.status);
      assert.equal(localized.releaseRequirement, page.releaseRequirement);
      assert.equal(localized.primaryAction, page.primaryAction);
      assert.equal(localized.updatedAt, page.updatedAt);
      assert.equal(localized.modules.length, page.modules.length);
      assert.equal(localized.workflow.length, page.workflow.length);
      assert.equal(localized.details.length, page.details.length);
      assert.ok(localized.modules.every((module) => module.trim().length > 0));
      assert.ok(localized.workflow.every((step) => step.title.trim() && step.body.trim()));
      assert.ok(localized.details.every((detail) => detail.title.trim() && detail.body.trim()));
      assert.ok(localized.guardrail.trim());
    }
  }
});

test("feature index, shell UI, practice controls, and Open Graph locale maps cover all nine locales", () => {
  const englishIndex = getFeatureIndexCatalog("en");
  const englishUi = getFeaturePageUi("en");
  const englishPractice = getFeaturePracticeCopy("en");

  assert.deepEqual(Object.keys(FEATURE_OPEN_GRAPH_LOCALES), [...SUPPORTED_LOCALES]);
  assert.equal(new Set(Object.values(FEATURE_OPEN_GRAPH_LOCALES)).size, SUPPORTED_LOCALES.length);

  for (const locale of SUPPORTED_LOCALES) {
    const index = getFeatureIndexCatalog(locale);
    const ui = getFeaturePageUi(locale);
    const practice = getFeaturePracticeCopy(locale);
    assert.deepEqual(Object.keys(index.formal).sort(), [...FORMAL_FEATURE_IDS].sort());
    assert.deepEqual(Object.keys(index.betaFeatures).sort(), [...BETA_FEATURE_IDS].sort());
    assert.ok(Object.values(index.formal).every((item) => item.title.trim() && item.body.trim()));
    assert.ok(Object.values(index.betaFeatures).every((item) => item.title.trim() && item.body.trim()));
    assert.ok(Object.values(practice).every((value) => typeof value === "string" && value.trim().length > 0));
    assert.ok(ui.faqEyebrow.trim());

    if (locale !== "en") {
      assert.notEqual(index.metadata.title, englishIndex.metadata.title, `${locale} feature-index metadata must be localized`);
      assert.notEqual(index.page.title, englishIndex.page.title, `${locale} feature-index heading must be localized`);
      assert.notEqual(ui.actions.scores, englishUi.actions.scores, `${locale} feature action must be localized`);
      assert.notEqual(practice.title, englishPractice.title, `${locale} practice demo must be localized`);
      assert.notEqual(practice.readyDetail, englishPractice.readyDetail, `${locale} practice state detail must be localized`);
    }
  }
});

test("localized feature evidence renders exact-locale media or an explicit pending placeholder", () => {
  for (const page of platformFeaturePages) {
    const source = featureSeoRecords[page.slug];
    for (const locale of SUPPORTED_LOCALES) {
      const localizedPage = localizeFeaturePage(page, locale);
      const slug = page.slug as FeatureProductMediaSlug;
      const expectedMedia = getFeatureProductMedia(slug, locale);
      const localized = localizeFeatureEvidence(source, locale, localizedPage.title, slug);
      if (expectedMedia) {
        assert.ok(localized.screenshot, `${locale}/${page.slug} ready media`);
        assert.equal(localized.pendingMedia, null);
        assert.equal(localized.screenshot.src, expectedMedia.src);
        assert.equal(localized.screenshot.width, expectedMedia.width);
        assert.equal(localized.screenshot.height, expectedMedia.height);
        assert.equal(localized.screenshot.capturedAt, expectedMedia.capturedAt);
        assert.equal(localized.screenshot.sourceLocale, locale);
      } else {
        assert.equal(localized.screenshot, null, `${locale}/${page.slug} must not display another locale`);
        assert.ok(localized.pendingMedia?.title.trim());
        assert.ok(localized.pendingMedia?.body.trim());
        assert.ok(localized.pendingMedia?.ariaLabel.trim());
      }
      assert.equal(localized.example.input, source.example.input);
      assert.equal(localized.example.output, source.example.output);
      if (locale !== "en") assert.notEqual(localized.example.notes, source.example.notes);
    }
  }
});

test("feature pages use the localized homepage pricing anchor and escape localized JSON-LD", () => {
  const detailSource = fs.readFileSync(path.join(process.cwd(), "src", "app", "[featureSlug]", "page.tsx"), "utf8");
  const indexSource = fs.readFileSync(path.join(process.cwd(), "src", "app", "features", "page.tsx"), "utf8");
  const openGraphSource = fs.readFileSync(path.join(process.cwd(), "src", "app", "[featureSlug]", "opengraph-image.tsx"), "utf8");
  const escapedJsonLd = 'JSON.stringify(structuredData).replaceAll("<", "\\\\u003c")';

  assert.ok(detailSource.includes('localizePublicHref("/#pricing", locale)'), "pricing CTA must use the real homepage section");
  assert.equal(detailSource.includes('localizePublicHref("/pricing", locale)'), false, "pricing CTA must not target a missing route");
  assert.ok(detailSource.includes('/opengraph-image/default'), "feature metadata must target the generated Open Graph image id");
  assert.ok(openGraphSource.includes('export const dynamic = "force-dynamic"'), "localized Open Graph images must be able to read the route locale header");
  assert.ok(detailSource.includes(escapedJsonLd), "feature detail JSON-LD must neutralize a translated < character");
  assert.ok(indexSource.includes(escapedJsonLd), "feature index JSON-LD must neutralize a translated < character");

  for (const locale of SUPPORTED_LOCALES) {
    const pricingHref = localizePublicHref("/#pricing", locale);
    assert.equal(pricingHref, `${LOCALE_ROUTE_PREFIXES[locale] || "/"}#pricing`);
  }
});
