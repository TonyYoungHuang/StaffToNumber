import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { SCORE_ENTRY_MESSAGE_CATALOGS, getScoreEntryMessages } from "./index";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) =>
    leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(leafStrings);
}

test("score entry catalogs have identical non-empty keys for every supported locale", () => {
  assert.deepEqual(Object.keys(SCORE_ENTRY_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(SCORE_ENTRY_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getScoreEntryMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} message keys`);
    for (const message of leafStrings(catalog)) {
      assert.ok(message.trim().length > 0, `${locale} has an empty score-entry message`);
    }
    assert.match(catalog.candidate.freeDescription, /\{revision\}/u, `${locale} revision template`);
    assert.match(catalog.omr.pageTemplate, /\{page\}/u, `${locale} page template`);
    assert.match(catalog.omr.measureTemplate, /\{measure\}/u, `${locale} measure template`);
    assert.match(catalog.omr.scanAltTemplate, /\{name\}/u, `${locale} scan alt template`);
    for (const template of [catalog.trial.previewEventLabel, catalog.candidate.notationEventLabel]) {
      for (const placeholder of ["part", "measure", "type", "number"]) {
        assert.match(template, new RegExp(`\\{${placeholder}\\}`, "u"), `${locale} preview ${placeholder}`);
      }
    }
  }
});

test("representative library, candidate, status, validation, and ARIA text uses all nine languages", () => {
  assert.equal(getScoreEntryMessages("zh-TW").library.scan.button, "開始辨識");
  assert.equal(getScoreEntryMessages("ja").candidate.zoomIn, "拡大");
  assert.equal(getScoreEntryMessages("ko").library.statuses.ready, "사용 가능");
  assert.equal(getScoreEntryMessages("fr").pages.newScore.recommended, "Recommandé");
  assert.equal(getScoreEntryMessages("es").omr.issueNavigation, "Navegación por problemas");
  assert.equal(getScoreEntryMessages("es").omr.sources["omr-engine"], "Motor de reconocimiento");
  assert.equal(getScoreEntryMessages("de").library.musicxml.chooseFile, "Wählen Sie eine .musicxml-, .xml- oder .mxl-Datei.");
  assert.equal(getScoreEntryMessages("ru").trial.statuses.processing, "Распознаём");

  const english = getScoreEntryMessages("en");
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getScoreEntryMessages(locale);
    assert.notEqual(catalog.pages.library.title, english.pages.library.title, `${locale} library title`);
    assert.notEqual(catalog.library.signInFirst, english.library.signInFirst, `${locale} validation`);
    assert.notEqual(catalog.candidate.viewportLabel, english.candidate.viewportLabel, `${locale} ARIA`);
    assert.notEqual(catalog.omr.loadingSource, english.omr.loadingSource, `${locale} loading state`);
    assert.notEqual(catalog.omr.sources.structural, english.omr.sources.structural, `${locale} structural diagnostic source`);
  }
});

test("fixed OMR diagnostic sources have complete typed labels", () => {
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(Object.keys(getScoreEntryMessages(locale).omr.sources).sort(), ["omr-engine", "structural"]);
  }
});

test("client score entry components avoid binary branches and the nine-locale value catalog", () => {
  const clientFiles = [
    "../../components/ScoreLibraryManager.tsx",
    "../../components/TrialScorePreview.tsx",
    "../../components/ScoreAccessWorkspace.tsx",
    "../../components/ScoreCandidateReviewWorkspace.tsx",
    "../../components/ScoreOmrReviewPanel.tsx",
  ];

  for (const file of clientFiles) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /locale\s*[!=]==?\s*["']zh-CN["']/u, file);
    assert.doesNotMatch(source, /isChinese/u, file);
    assert.doesNotMatch(source, /from\s+["']\.\.\/lib\/score-entry-messages["']/u, `${file} imports the full catalog`);
  }

  const library = readFileSync(new URL("../../components/ScoreLibraryManager.tsx", import.meta.url), "utf8");
  const access = readFileSync(new URL("../../components/ScoreAccessWorkspace.tsx", import.meta.url), "utf8");
  const trial = readFileSync(new URL("../../components/TrialScorePreview.tsx", import.meta.url), "utf8");
  const omr = readFileSync(new URL("../../components/ScoreOmrReviewPanel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(library, /userFacingError/u);
  assert.match(library, /setStatus\(result\.error\)/u);
  assert.match(access, /setAccessError\(result\.error\)/u);
  assert.match(trial, /setError\(scoreResult\.error\)/u);
  assert.match(trial, /\{job\.errorMessage\}/u);
  assert.match(trial, /eventLabelTemplate=\{copy\.previewEventLabel\}/u);
  assert.match(trial, /<ScoreEditorMessagesProvider locale=\{locale\} messages=\{editorMessages\}>/u);
  assert.match(omr, /typeof payload\?\.error === "string" \? payload\.error/u);
  assert.match(omr, /copy\.sources\[item\.source\]/u);
  assert.doesNotMatch(omr, /<small>\{item\.source\}/u);
  assert.match(omr, /item\.issues\[0\]/u);

  const candidate = readFileSync(new URL("../../components/ScoreCandidateReviewWorkspace.tsx", import.meta.url), "utf8");
  for (const prop of ["retryLabel", "technicalDetailsLabel", "deferredLabel", "renderLabel", "eventLabelTemplate", "noteLabel", "restLabel"]) {
    assert.match(candidate, new RegExp(`\\b${prop}=`, "u"), `candidate preview ${prop}`);
    assert.match(trial, new RegExp(`\\b${prop}=`, "u"), `trial preview ${prop}`);
  }
});

test("score entry formatting uses shared Intl helpers and source-local build artifacts are absent", () => {
  const formattedFiles = [
    "../../components/ScoreLibraryManager.tsx",
    "../../components/TrialScorePreview.tsx",
    "../../components/ScoreCandidateReviewWorkspace.tsx",
    "../../components/ScoreOmrReviewPanel.tsx",
  ].map((file) => readFileSync(new URL(file, import.meta.url), "utf8")).join("\n");
  assert.match(formattedFiles, /formatDateTime/u);
  assert.match(formattedFiles, /formatNumber/u);
  assert.doesNotMatch(formattedFiles, /toLocaleString/u);

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
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /from\s+["'][^"']+\.js["']/u, file.pathname);
  }
});
