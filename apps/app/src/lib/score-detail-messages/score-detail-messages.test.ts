import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { SCORE_DETAIL_MESSAGE_CATALOGS, getScoreDetailMessages } from "./index";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(leafStrings);
}

test("score detail catalogs cover identical non-empty keys in all nine locales", () => {
  assert.deepEqual(Object.keys(SCORE_DETAIL_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(SCORE_DETAIL_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getScoreDetailMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} detail keys`);
    for (const message of leafStrings(catalog)) {
      assert.ok(message.trim().length > 0, `${locale} has an empty score-detail message`);
    }
    assert.match(catalog.exports.queued, /\{format\}/u, `${locale} export queue template`);
    assert.match(catalog.transposeRange.suggestionTitle, /\{value\}/u, `${locale} signed semitone template`);
    assert.match(catalog.transposeRange.suggestionTitle, /\{target\}/u, `${locale} target-key template`);
    for (const placeholder of ["part", "measure", "type", "number"]) {
      assert.match(catalog.preview.eventLabel, new RegExp(`\\{${placeholder}\\}`, "u"), `${locale} preview ${placeholder}`);
    }
  }
});

test("representative detail, validation, status, metadata, and ARIA copy is localized", () => {
  assert.equal(getScoreDetailMessages("zh-TW").revision.undoRedoAria, "版本復原與重做");
  assert.equal(getScoreDetailMessages("ja").assignments.analysisTitle, "ブラウザー音符別分析");
  assert.equal(getScoreDetailMessages("ja").alignmentSources.automatic, "自動");
  assert.equal(getScoreDetailMessages("ko").jobs.statuses.processing, "처리 중");
  assert.equal(getScoreDetailMessages("fr").profiles.ranges.violin, "Violon");
  assert.equal(getScoreDetailMessages("es").candidateMissing, "No hay una revisión candidata que procesar.");
  assert.equal(getScoreDetailMessages("de").revision.sources.manual_edit, "Manuelle Bearbeitung");
  assert.equal(getScoreDetailMessages("ru").preview.loading, "Отрисовка нотного стана…");
  assert.equal(getScoreDetailMessages("zh-TW").transposeTarget.minor, "小調");

  const english = getScoreDetailMessages("en");
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getScoreDetailMessages(locale);
    assert.notEqual(catalog.project.loading, english.project.loading, `${locale} loading state`);
    assert.notEqual(catalog.project.missing, english.project.missing, `${locale} empty state`);
    assert.notEqual(catalog.jobs.progressAria, english.jobs.progressAria, `${locale} ARIA text`);
    assert.notEqual(catalog.exports.musicXml.failed, english.exports.musicXml.failed, `${locale} frontend error`);
    assert.notEqual(catalog.revision.sources.omr_import, english.revision.sources.omr_import, `${locale} revision source`);
    assert.notEqual(catalog.alignmentSources.automatic, english.alignmentSources.automatic, `${locale} automatic alignment source`);
    assert.notEqual(catalog.transposeTarget.major, english.transposeTarget.major, `${locale} Jianpu mode`);
  }
});

test("fixed detail enums and profile registries have localized safe mappings", () => {
  const english = getScoreDetailMessages("en");
  assert.deepEqual(Object.keys(english.status.score).sort(), ["archived", "candidate", "imported", "needs_review", "ready"]);
  assert.deepEqual(Object.keys(english.jobs.statuses).sort(), ["cancelled", "completed", "failed", "processing", "queued"]);
  assert.deepEqual(Object.keys(english.diagnostics.statuses).sort(), ["cancelled", "completed", "diagnostic", "failed", "processing"]);
  assert.deepEqual(Object.keys(english.alignmentSources).sort(), ["automatic", "manual"]);
  for (const mode of ["major", "minor"] as const) assert.ok(english.transposeTarget[mode].length > 0, `missing Jianpu ${mode} label`);
  assert.deepEqual(Object.keys(english.revision.sources).sort(), [
    "audio_transcribe", "candidate_accept", "jianpu_import", "manual_edit", "midi_import", "musicxml_import", "omr_import",
    "part_extract", "restore", "score_json_import", "system", "transpose",
  ]);
  assert.equal(Object.keys(english.profiles.ranges).length, 8);
  assert.equal(Object.keys(english.profiles.instruments).length, 12);
});

test("ScoreDetailClient consumes only server-selected copy and preserves raw backend failures", () => {
  const source = readFileSync(new URL("../../components/ScoreDetailClient.tsx", import.meta.url), "utf8");
  const context = readFileSync(new URL("../score-entry-messages/client.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../../app/scores/[id]/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /locale\s*[!=]==?\s*["']zh-CN["']/u);
  assert.doesNotMatch(source, /from\s+["']\.\.\/lib\/score-detail-messages["']/u);
  assert.match(source, /useScoreReviewMessages\(\)\.detail/u);
  assert.match(context, /import type \{ ScoreDetailMessages \}/u);
  assert.doesNotMatch(context, /from\s+["']\.\.\/score-detail-messages["']/u);
  assert.match(page, /getScoreDetailMessages\(locale\)/u);
  assert.match(page, /detail: detailMessages/u);
  for (const prop of ["retryLabel", "technicalDetailsLabel", "deferredLabel", "renderLabel", "eventLabelTemplate", "noteLabel", "restLabel"]) {
    assert.match(source, new RegExp(`\\b${prop}=`, "u"), `detail preview ${prop}`);
  }

  assert.doesNotMatch(source, /\.error\s*\|\|/u);
  assert.match(source, /setTransposeStatus\(result\.error\)/u);
  assert.match(source, /setCandidateActionError\(result\.error\)/u);
  assert.match(source, /typeof payload\?\.error === "string" \? payload\.error/u);
  assert.match(source, /\{job\.errorMessage\}/u);
  assert.match(source, /\{summary\.message\}/u);
  assert.doesNotMatch(source, /\{revision\.createdFrom\}/u);
  assert.doesNotMatch(source, /suggestion\.directionLabel/u);
  assert.match(source, /detailCopy\.alignmentSources\[submission\.performanceAnalysis\.alignment\.source\]/u);
  assert.doesNotMatch(source, /\{submission\.performanceAnalysis\.alignment\.source\}/u);
  assert.match(source, /transposeTargetCopy\[jianpu\.key\.mode\]/u);
  assert.doesNotMatch(source, /\(\{jianpu\.key\.mode\}\)/u);
});

test("detail formatting, endpoint invariants, and source-only imports remain intact", () => {
  const source = readFileSync(new URL("../../components/ScoreDetailClient.tsx", import.meta.url), "utf8");
  assert.match(source, /formatDateTime/u);
  assert.match(source, /formatNumber/u);
  assert.match(source, /formatSize\([^,]+, locale\)/u);
  assert.doesNotMatch(source, /toLocaleString/u);
  assert.doesNotMatch(source, /\.toFixed\(/u);

  for (const endpoint of [
    "/api/scores/${scoreId}/transpose",
    "/api/scores/${scoreId}/exports",
    "/api/scores/${scoreId}/comments",
    "/api/scores/${scoreId}/revisions/${revisionId}/restore",
    "/api/scores/${scoreId}/candidate/${action}",
  ]) {
    assert.ok(source.includes(endpoint), `missing unchanged endpoint ${endpoint}`);
  }
  assert.match(source, /body: JSON\.stringify\(\{ format, options \}\)/u);
  assert.match(source, /body: JSON\.stringify\(\{ pendingRevisionId \}\)/u);

  const sourceFiles = [
    ...readdirSync(new URL(".", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(entry.name, import.meta.url)),
    ...readdirSync(new URL("./locales/", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(`./locales/${entry.name}`, import.meta.url)),
  ];
  for (const file of sourceFiles) {
    assert.doesNotMatch(file.pathname, /\.(?:js|d\.ts)$/u, file.pathname);
    assert.doesNotMatch(readFileSync(file, "utf8"), /from\s+["'][^"']+\.js["']/u, file.pathname);
  }
});
