import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { getScoreEditorMessages, SCORE_EDITOR_MESSAGE_CATALOGS } from "./index";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(leafStrings);
}

test("score editor catalogs cover identical non-empty keys in all nine locales", () => {
  assert.deepEqual(Object.keys(SCORE_EDITOR_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(SCORE_EDITOR_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getScoreEditorMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} editor keys`);
    for (const message of leafStrings(catalog)) {
      assert.ok(message.trim().length > 0, `${locale} has an empty score-editor message`);
    }
    assert.match(catalog.editor.selectedCount, /\{count\}/u, `${locale} selected-count template`);
    assert.match(catalog.editor.queuedOffline, /\{count\}/u, `${locale} offline-count template`);
    assert.match(catalog.editor.offlineTitleWithCount, /\{count\}/u, `${locale} offline-title template`);
    for (const placeholder of ["part", "measure", "pitch", "duration"]) {
      assert.match(catalog.editor.draftLabel, new RegExp(`\\{${placeholder}\\}`, "u"), `${locale} draft ${placeholder}`);
    }
    assert.match(catalog.vexFlow.rhythmWarning, /\{count\}/u, `${locale} rhythm warning template`);
    for (const placeholder of ["title", "page", "system"]) {
      assert.match(catalog.vexFlow.systemAria, new RegExp(`\\{${placeholder}\\}`, "u"), `${locale} system ${placeholder}`);
    }
  }
});

test("editor controls, conflict states, offline history, durations, and ARIA are localized", () => {
  assert.equal(getScoreEditorMessages("zh-TW").editor.copy, "複製");
  assert.equal(getScoreEditorMessages("ja").editor.conflictTitle, "同時編集の競合");
  assert.equal(getScoreEditorMessages("ko").editor.queueSynced, "오프라인 편집을 서버와 동기화했습니다.");
  assert.equal(getScoreEditorMessages("fr").durations.quarter, "Noire");
  assert.equal(getScoreEditorMessages("es").editor.historyTitle, "Deshacer y rehacer compartidos");
  assert.equal(getScoreEditorMessages("de").vexFlow.hitLayerAria, "Interaktive Ziele für Partiturnoten");
  assert.equal(getScoreEditorMessages("ru").editor.durationToolbarAria, "Инструменты длительности нот");

  const english = getScoreEditorMessages("en");
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getScoreEditorMessages(locale);
    assert.notEqual(catalog.editor.saving, english.editor.saving, `${locale} saving state`);
    assert.notEqual(catalog.editor.conflictBody, english.editor.conflictBody, `${locale} conflict guidance`);
    assert.notEqual(catalog.editor.offlineBody, english.editor.offlineBody, `${locale} offline guidance`);
    assert.notEqual(catalog.editor.panelAria, english.editor.panelAria, `${locale} panel ARIA`);
  }

  assert.deepEqual(Object.keys(english.durations), ["whole", "half", "quarter", "eighth", "16th", "32nd", "64th"]);
  assert.deepEqual(Object.keys(english.conflictReasons), ["target-overlap", "revision-history-diverged", "command-no-longer-applicable", "unknown"]);
  assert.deepEqual(Object.keys(english.collaborationStatuses), ["applied", "merged", "duplicate", "conflict"]);
});

test("editor clients receive only the current server-selected catalog", () => {
  const editor = readFileSync(new URL("../../components/ScoreVisualEditorPanel.tsx", import.meta.url), "utf8");
  const vexFlow = readFileSync(new URL("../../components/VexFlowNotationSurface.tsx", import.meta.url), "utf8");
  const client = readFileSync(new URL("./client.tsx", import.meta.url), "utf8");
  const detailPage = readFileSync(new URL("../../app/scores/[id]/page.tsx", import.meta.url), "utf8");
  const sharedPage = readFileSync(new URL("../../app/scores/shared/[token]/page.tsx", import.meta.url), "utf8");
  const trial = readFileSync(new URL("../../components/TrialScorePreview.tsx", import.meta.url), "utf8");

  for (const [name, source] of [["editor", editor], ["VexFlow", vexFlow], ["context", client]] as const) {
    assert.doesNotMatch(source, /SCORE_EDITOR_MESSAGE_CATALOGS/u, `${name} must not import every locale`);
    assert.doesNotMatch(source, /from\s+["'][^"']*score-editor-messages["']/u, `${name} must use the typed client context`);
    assert.doesNotMatch(source, /locale\s*[!=]==?\s*["']zh-CN["']/u, `${name} binary locale branch`);
  }
  assert.match(editor, /useScoreEditorMessages\(\)/u);
  assert.match(vexFlow, /useScoreEditorMessages\(\)/u);
  assert.match(client, /import type \{ ScoreEditorMessages \}/u);
  assert.match(detailPage, /getScoreEditorMessages\(locale\)/u);
  assert.match(detailPage, /<ScoreEditorMessagesProvider locale=\{locale\} messages=\{getScoreEditorMessages\(locale\)\}>/u);
  assert.match(sharedPage, /<ScoreEditorMessagesProvider locale=\{locale\} messages=\{getScoreEditorMessages\(locale\)\}>/u);
  assert.match(trial, /<ScoreEditorMessagesProvider locale=\{locale\} messages=\{editorMessages\}>/u);
});

test("editor endpoints, payloads, collaboration commands, queue, clipboard, and VexFlow layout semantics stay intact", () => {
  const editor = readFileSync(new URL("../../components/ScoreVisualEditorPanel.tsx", import.meta.url), "utf8");
  const vexFlow = readFileSync(new URL("../../components/VexFlowNotationSurface.tsx", import.meta.url), "utf8");

  for (const endpoint of [
    "/edit/note",
    "/edit/note/insert",
    "/edit/event/delete",
    "/edit/events/batch",
    "/edit/event/reorder",
    "/api/scores/${scoreId}/collaboration/commands",
    "/api/scores/${scoreId}/collaboration/history",
    "/api/scores/shared/${encodeURIComponent(shareToken)}/collaboration/commands",
    "/api/scores/shared/${encodeURIComponent(shareToken)}/collaboration/history",
  ]) assert.ok(editor.includes(endpoint), `missing unchanged editor endpoint ${endpoint}`);

  for (const payloadKey of ["eventId", "eventType", "step", "alter", "octave", "duration", "durationType", "dots", "voice", "staff", "chord"]) {
    assert.match(editor, new RegExp(`\\b${payloadKey}(?:,|:)`, "u"), `missing unchanged note payload key ${payloadKey}`);
  }
  assert.match(editor, /JSON\.stringify\(operationId \? \{ operationId, baseRevisionId, command: canonicalCommand \} : body\)/u);
  assert.match(editor, /JSON\.stringify\(\{ operationId, baseRevisionId, action, targetOperationId: target\.id \}\)/u);
  assert.match(editor, /version: 1,[\s\S]*scope,[\s\S]*scoreId,[\s\S]*createdAt:/u);
  assert.match(editor, /serializeScoreEditorClipboard\(scoreId, next\)/u);
  assert.match(editor, /queuedScoreCollaborationRequest\(item, requestBaseRevisionId\)/u);
  assert.match(editor, /setStatus\(result\.error \|\| copy\.failed\)/u);
  assert.match(editor, /setStatus\(result\.error\)/u);

  assert.match(vexFlow, /buildVexFlowScoreLayout\(scoreJson, viewportWidth\)/u);
  assert.match(vexFlow, /buildVexFlowPageInvalidations\(scoreJson, layout, selectedEventIds\)/u);
  assert.match(vexFlow, /Math\.min\(48, Math\.max\(-48, Math\.round\(-dy \/ 5\)\)\)/u);
  assert.match(vexFlow, /targetMeasure!\.eventCount/u);
  assert.match(vexFlow, /new Formatter\(\)\.joinVoices/u);
  assert.match(vexFlow, /findVexFlowChordDurationConflicts\(scoreJson\.measures\)/u);
});

test("MusicXML preview has no hidden English fallback and every caller supplies localized states and event ARIA", () => {
  const preview = readFileSync(new URL("../../components/ScoreMusicXmlPreview.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(preview, /retryLabel\s*=|technicalDetailsLabel\s*=|deferredLabel\s*=|renderLabel\s*=/u);
  for (const requiredProp of ["retryLabel", "technicalDetailsLabel", "deferredLabel", "renderLabel", "eventLabelTemplate", "noteLabel", "restLabel"]) {
    assert.match(preview, new RegExp(`${requiredProp}: string`, "u"), `${requiredProp} must remain required`);
  }
  assert.match(preview, /formatMessage\(labels\.eventLabelTemplate/u);
  assert.doesNotMatch(preview, /m\.\$\{event\.measureNumber\}/u);

  for (const file of ["ScoreCandidateReviewWorkspace.tsx", "ScoreDetailClient.tsx", "SharedScoreViewer.tsx", "TrialScorePreview.tsx"]) {
    const source = readFileSync(new URL(`../../components/${file}`, import.meta.url), "utf8");
    const call = source.match(/<ScoreMusicXmlPreview[\s\S]*?\/>/u)?.[0];
    assert.ok(call, `${file} MusicXML preview call`);
    for (const prop of ["retryLabel", "technicalDetailsLabel", "deferredLabel", "renderLabel", "eventLabelTemplate", "noteLabel", "restLabel"]) {
      assert.match(call, new RegExp(`\\b${prop}=`, "u"), `${file} missing ${prop}`);
    }
  }
});

test("score editor localization remains TypeScript-only with extensionless local imports", () => {
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
