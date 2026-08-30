import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { SCORE_CORRECTION_MESSAGE_CATALOGS, getScoreCorrectionMessages } from "./index";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(leafStrings);
}

test("score correction catalogs cover identical non-empty keys in all nine locales", () => {
  assert.deepEqual(Object.keys(SCORE_CORRECTION_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(SCORE_CORRECTION_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getScoreCorrectionMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} correction keys`);
    for (const message of leafStrings(catalog)) {
      assert.ok(message.trim().length > 0, `${locale} has an empty correction message`);
    }
    assert.match(catalog.note.fingering, /\{number\}/u, `${locale} fingering template`);
    assert.match(catalog.previews.entity, /\{part\}/u, `${locale} entity part template`);
    assert.match(catalog.previews.entity, /\{measure\}/u, `${locale} entity measure template`);
    assert.match(catalog.previews.entity, /\{preview\}/u, `${locale} entity preview template`);
    assert.match(catalog.previews.program, /\{name\}/u, `${locale} MIDI name template`);
    assert.match(catalog.previews.program, /\{number\}/u, `${locale} MIDI number template`);
  }
});

test("representative correction, validation, enum, dynamic, and ARIA copy is localized", () => {
  assert.equal(getScoreCorrectionMessages("zh-CN").enums.ornamentType["trill-mark"], "颤音");
  assert.equal(getScoreCorrectionMessages("zh-TW").aria.panel, "樂譜校對編輯器");
  assert.equal(getScoreCorrectionMessages("ja").actions.addTuplet, "連符を追加");
  assert.equal(getScoreCorrectionMessages("ko").empty.measures, "이 리비전에는 편집할 수 있는 마디가 없습니다.");
  assert.equal(getScoreCorrectionMessages("fr").enums.clef.G, "Sol / clé de sol");
  assert.equal(getScoreCorrectionMessages("es").part.noPreset, "Sin preajuste");
  assert.equal(getScoreCorrectionMessages("de").status.failed, "Die Korrektur konnte nicht gespeichert werden.");
  assert.equal(getScoreCorrectionMessages("ru").previews.noProgram, "Без программы MIDI");

  const english = getScoreCorrectionMessages("en");
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getScoreCorrectionMessages(locale);
    assert.notEqual(catalog.intro.title, english.intro.title, `${locale} title`);
    assert.notEqual(catalog.status.saving, english.status.saving, `${locale} loading state`);
    assert.notEqual(catalog.empty.events, english.empty.events, `${locale} empty state`);
    assert.notEqual(catalog.aria.status, english.aria.status, `${locale} ARIA text`);
    assert.notEqual(catalog.enums.eventType.rest, english.enums.eventType.rest, `${locale} event enum`);
    assert.notEqual(catalog.midiPresets[1], english.midiPresets[1], `${locale} MIDI preset`);
  }
});

test("fixed correction enums and MIDI registry have complete safe mappings", () => {
  const enums = getScoreCorrectionMessages("en").enums;
  assert.deepEqual(Object.keys(enums.eventType), ["note", "rest"]);
  assert.deepEqual(Object.keys(enums.durationType), ["whole", "half", "quarter", "eighth", "16th", "32nd", "64th"]);
  assert.deepEqual(Object.keys(enums.syllabic), ["single", "begin", "middle", "end"]);
  assert.deepEqual(Object.keys(enums.articulation), ["accent", "staccato", "tenuto", "breath-mark", "caesura"]);
  assert.deepEqual(Object.keys(enums.beamType), ["begin", "continue", "end", "forward-hook", "backward-hook"]);
  assert.deepEqual(Object.keys(enums.ornamentType), ["trill-mark", "turn", "delayed-turn", "inverted-turn", "mordent", "inverted-mordent", "tremolo"]);
  assert.deepEqual(Object.keys(enums.placement), ["above", "below"]);
  assert.deepEqual(Object.keys(enums.fermataType), ["upright", "inverted"]);
  assert.deepEqual(Object.keys(enums.tupletBoundary), ["start", "stop"]);
  assert.deepEqual(Object.keys(enums.tupletShowNumber), ["actual", "both", "none"]);
  assert.deepEqual(Object.keys(enums.keyMode), ["major", "minor"]);
  assert.deepEqual(Object.keys(enums.clef), ["G", "F", "C", "percussion", "TAB"]);
  assert.deepEqual(Object.keys(enums.harmonyKind), ["major", "minor", "dominant", "major-seventh", "minor-seventh", "diminished", "augmented", "suspended-fourth", "suspended-second", "none"]);
  assert.deepEqual(Object.keys(enums.tempoBeatUnit), ["whole", "half", "quarter", "eighth", "16th", "32nd"]);
  assert.deepEqual(Object.keys(enums.wedgeType), ["crescendo", "diminuendo", "stop"]);
  assert.deepEqual(Object.keys(enums.barlineLocation), ["left", "right", "middle"]);
  assert.deepEqual(Object.keys(enums.barlineStyle), ["regular", "dotted", "dashed", "heavy", "light-light", "light-heavy", "heavy-light", "heavy-heavy", "tick", "short", "none"]);
  assert.deepEqual(Object.keys(enums.repeatDirection), ["none", "forward", "backward"]);
  assert.deepEqual(Object.keys(enums.endingType), ["start", "stop", "discontinue"]);
  assert.deepEqual(Object.keys(getScoreCorrectionMessages("en").midiPresets).map(Number), [1, 7, 20, 25, 33, 41, 42, 43, 44, 49, 53, 54, 57, 58, 61, 66, 69, 70, 71, 72, 74, 75, 79, 80]);
});

test("ScoreCorrectionPanel receives only current server copy and preserves raw backend errors", () => {
  const source = readFileSync(new URL("../../components/ScoreCorrectionPanel.tsx", import.meta.url), "utf8");
  const context = readFileSync(new URL("../score-entry-messages/client.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../../app/scores/[id]/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /locale\s*[!=]==?\s*["']zh-CN["']/u);
  assert.match(source, /useScoreReviewMessages\(\)\.correction/u);
  assert.doesNotMatch(source, /from\s+["']\.\.\/lib\/score-correction-messages["']/u);
  assert.match(context, /import type \{ ScoreCorrectionMessages \}/u);
  assert.doesNotMatch(context, /from\s+["']\.\.\/score-correction-messages["']/u);
  assert.match(page, /getScoreCorrectionMessages\(locale\)/u);
  assert.match(page, /correction: correctionMessages/u);

  assert.equal(source.match(/setStatus\(result\.error\)/gu)?.length, 8);
  assert.doesNotMatch(source, /result\.error\s*\|\|/u);
  assert.doesNotMatch(source, /formatMessage\([^\n]*result\.error/u);
  assert.doesNotMatch(source, /translate[^\n]*result\.error/iu);
});

test("correction endpoints, payloads, revision callbacks, and structured-score commands remain intact", () => {
  const source = readFileSync(new URL("../../components/ScoreCorrectionPanel.tsx", import.meta.url), "utf8");
  for (const endpoint of [
    "/api/scores/${scoreId}/edit/note",
    "/api/scores/${scoreId}/edit/part",
    "/api/scores/${scoreId}/edit/measure-attributes",
    "/api/scores/${scoreId}/edit/harmony",
    "/api/scores/${scoreId}/edit/dynamics",
    "/api/scores/${scoreId}/edit/tempo",
    "/api/scores/${scoreId}/edit/wedge",
    "/api/scores/${scoreId}/edit/barline",
  ]) {
    assert.ok(source.includes(endpoint), `missing unchanged endpoint ${endpoint}`);
  }
  assert.equal(source.match(/method: "POST"/gu)?.length, 8);
  assert.equal(source.match(/await onUpdated\(result\.data\)/gu)?.length, 8);
  assert.match(source, /eventId: selectedEvent\.id,[\s\S]*eventType,[\s\S]*timeModification:[\s\S]*beams: beamDrafts,[\s\S]*tuplets: tupletDrafts,[\s\S]*ornaments:/u);
  assert.match(source, /partId: selectedPart\.id,[\s\S]*name: partName,[\s\S]*abbreviation: partAbbreviation,[\s\S]*midiProgram:/u);
  assert.match(source, /measureId: selectedMeasure\.id,[\s\S]*divisions,[\s\S]*keyFifths,[\s\S]*keyMode,[\s\S]*timeBeats,[\s\S]*timeBeatType,[\s\S]*clefSign,[\s\S]*newSystem:[\s\S]*staffDistance:/u);
  assert.match(source, /selectedTempoId !== "__new__" \? \{ tempoId: selectedTempoId \} : \{\}/u);
  assert.match(source, /repeatTimes: repeatDirection === "backward" \? repeatTimes : undefined/u);
  assert.match(source, /\? \{\s*measureId: selectedMeasure\.id,\s*clear: true,/u);
  assert.match(source, /event"\}-beam-\$\{number\}-manual/u);
  assert.match(source, /event"\}-tuplet-\$\{current\.length \+ 1\}-manual/u);
  assert.match(source, /event"\}-ornament-\$\{current\.length \+ 1\}-manual/u);
  assert.match(source, /musicxmlFileId: string \| null/u);
  assert.match(source, /scoreJson: ScoreJson/u);
  assert.match(source, /revisionNumber: number/u);
  assert.match(source, /formatNumber/u);
  assert.match(source, /formatMessage/u);
  assert.doesNotMatch(source, /toLocaleString/u);
  assert.match(source, /min=\{1\}\s+max=\{128\}/u);
  assert.match(source, /min=\{-7\}\s+max=\{7\}/u);
  assert.match(source, /ornamentDrafts\.length >= 8/u);
  assert.match(source, /Math\.max\(2, Math\.min\(16, Number\(event\.target\.value\)\)\)/u);
});

test("candidate and current-revision correction reuse paths retain undo, redo, refresh, and Jianpu behavior", () => {
  const candidate = readFileSync(new URL("../../components/ScoreCandidateReviewWorkspace.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../../components/ScoreDetailClient.tsx", import.meta.url), "utf8");
  assert.match(candidate, /<ScoreCorrectionPanel[\s\S]*scoreJson=\{revision\.scoreJson\}[\s\S]*onCandidateUpdated/u);
  assert.match(candidate, /onUndo: \(\) => void/u);
  assert.match(candidate, /onRedo: \(\) => void/u);
  assert.match(detail, /<ScoreCandidateReviewWorkspace[\s\S]*onUndo=\{\(\) => void handleUndoRevision\(\)\}[\s\S]*onRedo=\{\(\) => void handleRedoRevision\(\)\}/u);
  assert.match(detail, /<ScoreCorrectionPanel[\s\S]*scoreJson=\{currentScoreJson\}[\s\S]*setPayload\(nextPayload\);[\s\S]*await refreshJianpu\(\)/u);
});

test("correction source files remain TypeScript-only and extensionless", () => {
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
