import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { getScoreSharingMessages, SCORE_SHARING_MESSAGE_CATALOGS } from "./index";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(leafStrings);
}

test("score sharing catalogs cover identical non-empty keys in all nine locales", () => {
  assert.deepEqual(Object.keys(SCORE_SHARING_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(SCORE_SHARING_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getScoreSharingMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} sharing keys`);
    for (const message of leafStrings(catalog)) {
      assert.ok(message.trim().length > 0, `${locale} has an empty sharing message`);
    }
    assert.match(catalog.viewer.assignmentScoreShown, /\{version\}/u, `${locale} assignment version template`);
    assert.match(catalog.practice.tempo, /\{tempo\}/u, `${locale} tempo template`);
    assert.match(catalog.practice.loop, /\{start\}/u, `${locale} loop start template`);
    assert.match(catalog.practice.loop, /\{end\}/u, `${locale} loop end template`);
    assert.match(catalog.collaboration.targets, /\{count\}/u, `${locale} collaboration target template`);
    for (const placeholder of ["part", "measure", "type", "number"]) {
      assert.match(catalog.viewer.previewEventLabel, new RegExp(`\\{${placeholder}\\}`, "u"), `${locale} preview ${placeholder}`);
    }
  }
});

test("sharing, assignments, reviews, annotations, collaboration, validation, and ARIA are localized", () => {
  assert.equal(getScoreSharingMessages("zh-TW").annotations.targetModeAria, "批註目標");
  assert.equal(getScoreSharingMessages("ja").assignments.nameRequired, "提出前に名前を入力してください。");
  assert.equal(getScoreSharingMessages("ko").collaboration.statuses.connected, "연결됨");
  assert.equal(getScoreSharingMessages("fr").reviews.grade, "Note");
  assert.equal(getScoreSharingMessages("es").viewer.shared, "Partitura compartida");
  assert.equal(getScoreSharingMessages("de").collaboration.operationTypes.restore, "Revision wiederherstellen");
  assert.equal(getScoreSharingMessages("ru").modes.major, "Мажор");

  const english = getScoreSharingMessages("en");
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getScoreSharingMessages(locale);
    assert.notEqual(catalog.viewer.loading, english.viewer.loading, `${locale} loading state`);
    assert.notEqual(catalog.assignments.submitFailed, english.assignments.submitFailed, `${locale} validation state`);
    assert.notEqual(catalog.reviews.waiting, english.reviews.waiting, `${locale} review state`);
    assert.notEqual(catalog.annotations.listAria, english.annotations.listAria, `${locale} annotation ARIA`);
    assert.notEqual(catalog.collaboration.statuses.connecting, english.collaboration.statuses.connecting, `${locale} connection state`);
  }
});

test("sharing fixed statuses, identities, roles, operations, permissions, and modes have complete mappings", () => {
  const messages = getScoreSharingMessages("en");
  assert.deepEqual(Object.keys(messages.assignments.statuses), ["open", "archived"]);
  assert.deepEqual(Object.keys(messages.reviews.statuses), ["submitted", "reviewed"]);
  assert.deepEqual(Object.keys(messages.annotations.titles), ["comment", "edit"]);
  assert.deepEqual(Object.keys(messages.annotations.identities), ["account", "share_link"]);
  assert.deepEqual(Object.keys(messages.collaboration.statuses), ["disconnected", "connecting", "connected"]);
  assert.deepEqual(Object.keys(messages.collaboration.roles), ["owner", "editor", "commenter", "viewer"]);
  assert.deepEqual(Object.keys(messages.collaboration.operationTypes), ["note_edit", "measure_edit", "part_edit", "transpose", "restore", "candidate_accept", "candidate_reject", "unknown"]);
  assert.deepEqual(Object.keys(messages.modes), ["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian"]);
});

test("sharing clients receive only current server copy and preserve raw API and user content", () => {
  const viewer = readFileSync(new URL("../../components/SharedScoreViewer.tsx", import.meta.url), "utf8");
  const annotations = readFileSync(new URL("../../components/ScoreAnnotationWorkspace.tsx", import.meta.url), "utf8");
  const collaboration = readFileSync(new URL("../../components/ScoreCollaborationPanel.tsx", import.meta.url), "utf8");
  const client = readFileSync(new URL("./client.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../../app/scores/shared/[token]/page.tsx", import.meta.url), "utf8");
  const detailPage = readFileSync(new URL("../../app/scores/[id]/page.tsx", import.meta.url), "utf8");

  for (const source of [viewer, annotations, collaboration, client]) {
    assert.doesNotMatch(source, /from\s+["'][^"']*score-sharing-messages["']/u);
    assert.doesNotMatch(source, /SCORE_SHARING_MESSAGE_CATALOGS/u);
    assert.doesNotMatch(source, /locale\s*[!=]==?\s*["']zh-CN["']/u);
  }
  assert.match(viewer, /useScoreSharingMessages\(\)/u);
  assert.match(annotations, /useScoreSharingMessages\(\)/u);
  assert.match(collaboration, /useScoreSharingMessages\(\)/u);
  assert.match(client, /import type \{ ScoreSharingMessages \}/u);
  assert.match(page, /getScoreSharingMessages\(locale\)/u);
  assert.match(page, /<ScoreSharingMessagesProvider locale=\{locale\} messages=\{getScoreSharingMessages\(locale\)\}>/u);
  assert.match(detailPage, /<ScoreSharingMessagesProvider locale=\{locale\} messages=\{getScoreSharingMessages\(locale\)\}>/u);

  assert.equal(viewer.match(/setError\(result\.error\)/gu)?.length, 2);
  assert.match(viewer, /setAssignmentScoreError\(result\.error\)/u);
  assert.match(viewer, /\[assignment\.id\]: \{ kind: "error", message: result\.error \}/u);
  assert.match(viewer, /failure\?\.error \?\? reviewCopy\.performancePreviewFailed/u);
  assert.match(annotations, /text: result\.error/u);
  assert.doesNotMatch(viewer, /result\.error\s*\|\|/u);
  assert.doesNotMatch(annotations, /result\.error\s*\|\|/u);

  for (const original of [
    "payload.score.title", "assignment.title", "assignment.instructions", "criterion.label", "submission.teacherFeedback",
    "submission.performanceFile.originalName", "comment.body",
  ]) assert.ok(viewer.includes(original), `missing verbatim user content ${original}`);
  assert.match(annotations, /annotation\.author\.displayName/u);
  assert.match(annotations, /\{annotation\.body\}/u);
  assert.match(collaboration, /trustedActors\[operation\.id\]\?\.displayName \?\? operation\.actorName/u);
});

test("sharing endpoints, payloads, tokens, upload limits, assignment flow, and Yjs semantics stay intact", () => {
  const viewer = readFileSync(new URL("../../components/SharedScoreViewer.tsx", import.meta.url), "utf8");
  const annotations = readFileSync(new URL("../../components/ScoreAnnotationWorkspace.tsx", import.meta.url), "utf8");
  const collaboration = readFileSync(new URL("../../components/ScoreCollaborationPanel.tsx", import.meta.url), "utf8");

  for (const endpoint of [
    "/api/scores/shared/${token}",
    "/api/scores/shared/${token}/submission-reviews/${reviewToken}",
    "/api/scores/shared/${token}/submission-reviews/${reviewToken}/performance-file",
    "/api/scores/shared/${token}/assignments/${assignment.id}/score",
    "/api/scores/shared/${token}/assignments/${assignment.id}/submissions/performance",
    "/api/scores/shared/${token}/assignments/${assignment.id}/submissions",
    "/api/scores/shared/${token}/assignments/${assignment.id}/playback",
    "/api/scores/shared/${token}/playback",
  ]) assert.ok(viewer.includes(endpoint), `missing unchanged sharing endpoint ${endpoint}`);
  for (const key of ["submitterName", "submitterContact", "note", "recordingUrl", "practiceMinutes", "practiceSettings", "performanceAnalysis", "performanceFile"]) {
    assert.ok(viewer.includes(`body.append("${key}"`), `missing unchanged performance upload field ${key}`);
  }
  assert.match(viewer, /JSON\.stringify\(\{[\s\S]*submitterName: form\.submitterName,[\s\S]*submitterContact: form\.submitterContact,[\s\S]*note: form\.note,[\s\S]*recordingUrl: form\.recordingUrl,[\s\S]*practiceSettings: playbackPracticeSettings,[\s\S]*performanceAnalysis:/u);
  assert.match(viewer, /accept="audio\/\*,video\/mp4,video\/quicktime,video\/webm"/u);
  assert.match(viewer, /score-shared-review-tokens:\$\{token\}/u);
  assert.match(viewer, /max=\{10000\}/u);

  assert.ok(annotations.includes("/api/scores/shared/${encodeURIComponent(shareToken)}/comments"));
  assert.match(annotations, /JSON\.stringify\(\{[\s\S]*body: text,[\s\S]*target: targetMode === "selection"/u);
  assert.match(annotations, /maxLength=\{2000\}/u);

  assert.ok(collaboration.includes("/api/scores/${scoreId}/collaboration/commands"));
  assert.match(collaboration, /Authorization: `Bearer \$\{token\}`/u);
  assert.match(collaboration, /new HocuspocusProvider\(\{[\s\S]*name: scoreId,[\s\S]*document,[\s\S]*token,/u);
  assert.match(collaboration, /document\.getText\("rehearsal-note"\)/u);
  assert.match(collaboration, /\}, "rehearsal-note"\);/u);
  assert.match(collaboration, /appendScoreCollaborationOperation\(document, operation\)/u);
  assert.match(collaboration, /value\.slice\(0, 2000\)/u);
});

test("sharing uses centralized Intl helpers and leaves external score tools connected", () => {
  const viewer = readFileSync(new URL("../../components/SharedScoreViewer.tsx", import.meta.url), "utf8");
  const annotations = readFileSync(new URL("../../components/ScoreAnnotationWorkspace.tsx", import.meta.url), "utf8");
  const collaboration = readFileSync(new URL("../../components/ScoreCollaborationPanel.tsx", import.meta.url), "utf8");
  for (const source of [viewer, annotations, collaboration]) {
    assert.doesNotMatch(source, /\.toLocaleString\(/u);
    assert.doesNotMatch(source, /\.toFixed\(/u);
  }
  assert.match(viewer, /formatDateTime/u);
  assert.match(viewer, /formatNumber/u);
  assert.match(annotations, /formatDateTime/u);
  assert.match(annotations, /formatNumber/u);
  assert.match(collaboration, /formatNumber/u);
  assert.match(viewer, /<ScoreVisualEditorPanel/u);
  assert.match(viewer, /<ScorePlaybackPanel/u);
  assert.match(viewer, /<PracticeRecorder/u);
  assert.match(viewer, /retryLabel=\{copy\.previewRetry\}/u);
  assert.match(viewer, /technicalDetailsLabel=\{copy\.previewTechnicalDetails\}/u);
  assert.match(viewer, /deferredLabel=\{copy\.previewDeferred\}/u);
  assert.match(viewer, /renderLabel=\{copy\.previewRender\}/u);
  assert.match(viewer, /eventLabelTemplate=\{copy\.previewEventLabel\}/u);
  assert.match(viewer, /noteLabel=\{copy\.previewNote\}/u);
  assert.match(viewer, /restLabel=\{copy\.previewRest\}/u);
});

test("sharing localization files remain TypeScript-only with extensionless local imports", () => {
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
