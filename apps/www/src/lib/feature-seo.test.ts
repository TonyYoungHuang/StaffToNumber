import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildFeatureExampleFile } from "./feature-example-files.js";
import { getFeaturePageUi, localizeFeaturePage } from "./feature-page-localization.js";
import { auditFeatureSeo, buildFeatureSeoManifest, buildSeoSuggestions, featureSeoRecords } from "./feature-seo.js";
import { platformFeaturePages } from "./platform-feature-pages.js";

test("current feature inventory has unique routes and no blocking SEO errors", () => {
  const report = auditFeatureSeo(platformFeaturePages, featureSeoRecords, "2026-07-15T00:00:00.000Z");

  assert.equal(report.metrics.pages, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueTitles, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueDescriptions, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueCanonicals, platformFeaturePages.length);
  assert.deepEqual(report.issues.filter((issue) => issue.severity === "error"), []);
  assert.equal(report.metrics.approved, 0);
  assert.equal(report.publishReady, false, "AI evidence prechecks must not replace explicit product-owner approval");
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.status === "in_review"));
  assert.ok(Object.values(featureSeoRecords).every((record) => record.review.approvalBasis?.includes("AI evidence precheck completed")));
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
});

test("every public feature page has complete Chinese content with an English fallback", () => {
  for (const page of platformFeaturePages) {
    const chinese = localizeFeaturePage(page, "zh-CN");
    assert.match(chinese.title, /[\u3400-\u9fff]/u, `${page.slug} needs a Chinese title`);
    assert.match(chinese.description, /[\u3400-\u9fff]/u, `${page.slug} needs a Chinese description`);
    assert.equal(chinese.canonical, page.canonical);
    assert.equal(chinese.workflow.length, page.workflow.length);
    assert.equal(chinese.details.length, page.details.length);
    assert.ok(chinese.modules.some((module) => /[\u3400-\u9fff]/u.test(module)));
    assert.strictEqual(localizeFeaturePage(page, "en"), page);
  }

  assert.equal(getFeaturePageUi("zh-CN").actions.scores, "打开我的乐谱");
  assert.equal(getFeaturePageUi("en").actions.scores, "Open score projects");
});
