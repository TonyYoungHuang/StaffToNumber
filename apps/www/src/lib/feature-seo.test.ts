import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildFeatureExampleFile } from "./feature-example-files.js";
import { auditFeatureSeo, buildFeatureSeoManifest, buildSeoSuggestions, featureSeoRecords } from "./feature-seo.js";
import { platformFeaturePages } from "./platform-feature-pages.js";

test("current feature inventory has unique routes and no blocking SEO errors", () => {
  const report = auditFeatureSeo(platformFeaturePages, featureSeoRecords, "2026-07-15T00:00:00.000Z");

  assert.equal(report.metrics.pages, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueTitles, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueDescriptions, platformFeaturePages.length);
  assert.equal(report.metrics.uniqueCanonicals, platformFeaturePages.length);
  assert.deepEqual(report.issues.filter((issue) => issue.severity === "error"), []);
  assert.equal(report.publishReady, false, "human review warnings must keep publication approval explicit");
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
  assert.match(suggestions.description, /Create new score revisions/);
  assert.deepEqual(suggestions.internalLinks, record.relatedSlugs.map((slug) => `/${slug}`));
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
});
