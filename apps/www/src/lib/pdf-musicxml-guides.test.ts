import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getPdfMusicXmlGuide, listPdfMusicXmlGuides, pdfMusicXmlGuideSlugs } from "./pdf-musicxml-guides.js";

test("PDF-to-MusicXML content cluster is complete, localized, and internally distinct", () => {
  assert.equal(pdfMusicXmlGuideSlugs.length, 6);
  assert.equal(new Set(pdfMusicXmlGuideSlugs).size, pdfMusicXmlGuideSlugs.length);

  for (const locale of ["en", "zh-CN"] as const) {
    const guides = listPdfMusicXmlGuides(locale);
    assert.equal(guides.length, pdfMusicXmlGuideSlugs.length);
    assert.equal(new Set(guides.map((guide) => guide.title.toLocaleLowerCase())).size, guides.length);
    assert.equal(new Set(guides.map((guide) => guide.primaryKeyword.toLocaleLowerCase())).size, guides.length);

    for (const guide of guides) {
      assert.equal(guide.updatedAt, "2026-08-29");
      assert.ok(guide.description.length > (locale === "zh-CN" ? 35 : 80));
      assert.ok(guide.intro.length > (locale === "zh-CN" ? 45 : 120));
      assert.ok(guide.takeaways.length >= 3);
      assert.ok(guide.sections.length >= 3);
      assert.ok(guide.steps.length >= 4);
      assert.ok(guide.faqs.length >= 3);
      assert.ok(guide.sources.length >= 2);
      const sourceNoteMinimum = locale === "zh-CN" ? 8 : 20;
      assert.ok(guide.sources.every((source) => source.href.startsWith("https://") && source.note.length > sourceNoteMinimum));
      assert.ok(guide.relatedPaths.length >= 3);
      assert.ok(guide.relatedPaths.every((relatedPath) => relatedPath.startsWith("/")));
      assert.equal(guide.relatedPaths.includes(`/guides/${guide.slug}`), false);
    }
  }
});

test("guide lookup rejects unknown slugs and preserves the requested locale", () => {
  assert.equal(getPdfMusicXmlGuide("missing-guide", "en"), null);
  const english = getPdfMusicXmlGuide("convert-pdf-sheet-music-to-musicxml", "en");
  const chinese = getPdfMusicXmlGuide("convert-pdf-sheet-music-to-musicxml", "zh-CN");
  assert.ok(english && chinese);
  assert.match(english.title, /PDF.+MusicXML/i);
  assert.match(chinese.title, /[\u3400-\u9fff]/u);
  assert.notEqual(english.title, chinese.title);
});

test("public recognition evidence separates workflow routing from musical accuracy", () => {
  const evidencePath = path.join(process.cwd(), "public", "research", "pdf-to-musicxml-evidence-2026-08-29.json");
  const report = JSON.parse(fs.readFileSync(evidencePath, "utf8")) as {
    evidence: { candidateRoutingRegression: { total: number; matchedExpectedOutcome: number; doesNotMean: string } };
    musicalAccuracy: Record<string, { status: string; reason: string }>;
    publicReferenceAssets: { assetBoundary: string };
    nonClaims: string[];
  };

  assert.equal(report.evidence.candidateRoutingRegression.total, 20);
  assert.equal(report.evidence.candidateRoutingRegression.matchedExpectedOutcome, 20);
  assert.match(report.evidence.candidateRoutingRegression.doesNotMean, /not note/i);
  assert.deepEqual(Object.keys(report.musicalAccuracy).sort(), [
    "keyAndTimeSignatureRetention",
    "lyricRetention",
    "notePitchPrecisionRecall",
    "rhythmErrorRate",
  ]);
  assert.ok(Object.values(report.musicalAccuracy).every((metric) => metric.status === "not-published" && metric.reason.length > 40));
  assert.match(report.publicReferenceAssets.assetBoundary, /deterministic reference assets/i);
  assert.ok(report.nonClaims.some((claim) => /No universal recognition percentage/i.test(claim)));
});
