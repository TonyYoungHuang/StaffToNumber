import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import {
  formatPlaybackDuration,
  formatPlaybackNumber,
  formatPlaybackPercent,
  formatSignedPlaybackNumber,
  rawPlaybackErrorOrFallback,
} from "./formatters";
import { getPlaybackPracticeMessages, PLAYBACK_PRACTICE_MESSAGE_CATALOGS } from "./index";
import {
  PLAYBACK_GRAPH_TERMINATION_REASONS,
  PLAYBACK_NAVIGATION_ACTIONS,
  PLAYBACK_RECORDER_STATUSES,
  PRACTICE_ALIGNMENT_SOURCES,
  PRACTICE_EVENT_STATUSES,
} from "./types";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (typeof value === "string") return [{ key: prefix, value }];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => leafStrings(nested, prefix ? `${prefix}.${key}` : key));
}

function placeholders(value: string) {
  return [...value.matchAll(/\{([a-zA-Z][\w]*)\}/gu)].map((match) => match[1]).sort();
}

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("playback and practice catalogs have identical non-empty typed keys in all nine locales", () => {
  assert.deepEqual(Object.keys(PLAYBACK_PRACTICE_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const english = getPlaybackPracticeMessages("en");
  const englishKeys = leafKeys(english).sort();
  const englishLeaves = new Map(leafStrings(english).map(({ key, value }) => [key, value]));

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getPlaybackPracticeMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} playback/practice keys`);
    for (const { key, value } of leafStrings(catalog)) {
      assert.ok(value.trim().length > 0, `${locale} has an empty message at ${key}`);
      assert.deepEqual(placeholders(value), placeholders(englishLeaves.get(key) ?? ""), `${locale} placeholders at ${key}`);
    }
  }
});

test("playback, recorder, Jianpu, waveform, status, validation, and ARIA copy is genuinely localized", () => {
  const english = getPlaybackPracticeMessages("en");
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getPlaybackPracticeMessages(locale);
    assert.notEqual(catalog.playback.title, english.playback.title, `${locale} playback title`);
    assert.notEqual(catalog.playback.empty, english.playback.empty, `${locale} playback empty state`);
    assert.notEqual(catalog.playback.terminationReasons.guard, english.playback.terminationReasons.guard, `${locale} playback termination reason`);
    assert.notEqual(catalog.playback.navigationActions["repeat-jump"], english.playback.navigationActions["repeat-jump"], `${locale} playback navigation action`);
    assert.notEqual(catalog.recorder.denied, english.recorder.denied, `${locale} recorder validation`);
    assert.notEqual(catalog.recorder.statuses.ready, english.recorder.statuses.ready, `${locale} recorder status`);
    assert.notEqual(catalog.recorder.eventStatuses.missing, english.recorder.eventStatuses.missing, `${locale} analysis status`);
    assert.notEqual(catalog.jianpu.regionAria, english.jianpu.regionAria, `${locale} Jianpu ARIA`);
    assert.notEqual(catalog.waveform.waveformAria, english.waveform.waveformAria, `${locale} waveform ARIA`);
  }

  assert.equal(getPlaybackPracticeMessages("zh-TW").jianpu.regionAria, "可互動簡譜");
  assert.equal(getPlaybackPracticeMessages("ja").waveform.practiceSpeed, "練習速度");
  assert.equal(getPlaybackPracticeMessages("ko").recorder.statuses.recording, "녹음 중");
  assert.equal(getPlaybackPracticeMessages("fr").playback.metronome, "Métronome");
  assert.equal(getPlaybackPracticeMessages("es").recorder.eventStatuses.missing, "No detectada");
  assert.equal(getPlaybackPracticeMessages("de").playback.startMeasure, "Starttakt");
  assert.equal(getPlaybackPracticeMessages("ru").playback.diagnostics, "Диагностика воспроизведения");
  assert.equal(getPlaybackPracticeMessages("zh-CN").playback.navigationActions["fine-stop"], "在 Fine 处停止");
  assert.equal(getPlaybackPracticeMessages("ja").playback.terminationReasons.end, "楽譜の終端");
  assert.equal(getPlaybackPracticeMessages("de").playback.navigationMeasureTemplate, "Takt {measure}");
});

test("fixed playback-navigation, recorder, alignment, and practice-feedback enums have complete localized maps", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const messages = getPlaybackPracticeMessages(locale);
    const { recorder, playback } = messages;
    assert.deepEqual(Object.keys(playback.terminationReasons), [...PLAYBACK_GRAPH_TERMINATION_REASONS]);
    assert.deepEqual(Object.keys(playback.navigationActions), [...PLAYBACK_NAVIGATION_ACTIONS]);
    assert.deepEqual(Object.keys(recorder.statuses), [...PLAYBACK_RECORDER_STATUSES]);
    assert.deepEqual(Object.keys(recorder.alignmentSources), [...PRACTICE_ALIGNMENT_SOURCES]);
    assert.deepEqual(Object.keys(recorder.eventStatuses), [...PRACTICE_EVENT_STATUSES]);
  }
});

test("playback formatters use locale-aware numbers, percentages, durations, and exact raw errors", () => {
  const rawError = "  Playback service returned this English diagnostic.  ";
  assert.equal(rawPlaybackErrorOrFallback(rawError, "localized fallback"), rawError);
  assert.equal(rawPlaybackErrorOrFallback("   ", "localized fallback"), "localized fallback");
  assert.equal(rawPlaybackErrorOrFallback(null, "localized fallback"), "localized fallback");

  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(formatPlaybackNumber(12_345.5, locale).length > 0, `${locale} number`);
    assert.ok(formatPlaybackPercent(0.825, locale).length > 0, `${locale} percent`);
    assert.ok(formatPlaybackDuration(125, locale).includes(":"), `${locale} duration`);
    assert.ok(formatSignedPlaybackNumber(18, locale).length > 0, `${locale} signed number`);
  }
});

test("all four clients consume only provider-selected copy and never import the nine-locale catalog", () => {
  const clientFiles = [
    "../../components/ScorePlaybackPanel.tsx",
    "../../components/PracticeRecorder.tsx",
    "../../components/JianpuNotationView.tsx",
    "../../components/AudioWaveformPlayer.tsx",
  ];
  for (const file of clientFiles) {
    const contents = source(file);
    assert.match(contents, /^"use client";/u, file);
    assert.match(contents, /usePlaybackPracticeMessages/u, file);
    assert.doesNotMatch(contents, /playback-practice-messages(?:\/index)?["']/u, `${file} imports no catalog barrel`);
    assert.doesNotMatch(contents, /playback-practice-messages\/locales/u, `${file} imports no locale files`);
    assert.doesNotMatch(contents, /getPlaybackPracticeMessages|PLAYBACK_PRACTICE_MESSAGE_CATALOGS/u, file);
    assert.doesNotMatch(contents, /locale\s*[!=]==?\s*["']zh-CN["']|isChinese/u, `${file} has no binary locale branch`);
  }

  const provider = source("./client.tsx");
  assert.match(provider, /import type \{ PlaybackPracticeMessages \}/u);
  assert.doesNotMatch(provider, /from\s+["']\.\/index["']|locales\//u);
  assert.match(provider, /PlaybackPracticeMessagesProvider/u);

  for (const page of [
    source("../../app/scores/[id]/page.tsx"),
    source("../../app/scores/shared/[token]/page.tsx"),
  ]) {
    assert.match(page, /<PlaybackPracticeMessagesProvider locale=\{locale\} messages=\{getPlaybackPracticeMessages\(locale\)\}>/u);
  }
});

test("Tone scheduling, tempo maps, loops, count-in, metronome, solo, mute, and export callbacks remain intact", () => {
  const playback = source("../../components/ScorePlaybackPanel.tsx");
  for (const fragment of [
    "buildPlaybackTempoSegments(currentPlayback, effectiveTempo)",
    "playbackTempoAtBeat(tempoSegments, sectionStart)",
    "playbackSecondsAtBeat(tempoSegments, soundEndBeat)",
    "tone.Transport.schedule",
    "tone.Transport.loopStart",
    "tone.Transport.loopEnd",
    "tone.Transport.start()",
    "tone.Transport.clear(id)",
    "tone.Transport.cancel()",
    "triggerAttackRelease(event.noteName, soundDurationSeconds, time, velocity)",
    "beat % input.downbeatEvery === 0 ? \"C4\" : \"C3\"",
    "practiceSettings.countInEnabled ? downbeatEvery : 0",
    "setTimeout(() => void play(nextTempo), 350)",
    "exportActions.midi.onClick",
    "exportActions.wav.onClick",
    "exportActions.mp3.onClick",
  ]) {
    assert.ok(playback.includes(fragment), `missing playback invariant: ${fragment}`);
  }
  assert.match(playback, /soloPartIds\.includes\(event\.partId\)/u);
  assert.match(playback, /!mutedPartIds\.includes\(event\.partId\)/u);
  assert.match(playback, /clamp\(partVolumes\[partId\] \?\? 1, 0, 1\.5\)/u);
  assert.match(playback, /event\.startBeat >= sectionStart && event\.startBeat < sectionEnd/u);
});

test("playback endpoint, recorder formats, microphone constraints, timing, files, and analysis semantics remain intact", () => {
  const playback = source("../../components/ScorePlaybackPanel.tsx");
  const recorder = source("../../components/PracticeRecorder.tsx");
  assert.match(playback, /`\/api\/scores\/\$\{scoreId\}\/playback`/u);
  assert.match(playback, /Authorization: `Bearer \$\{token\}`/u);

  for (const format of ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"]) {
    assert.ok(recorder.includes(format), `missing recorder format ${format}`);
  }
  assert.match(recorder, /recorder\.start\(250\)/u);
  assert.match(recorder, /`practice-recording-\$\{Date\.now\(\)\}\.\$\{recordingExtension\(finalType\)\}`/u);
  assert.match(recorder, /echoCancellation: false, noiseSuppression: false, autoGainControl: false/u);
  assert.match(recorder, /countInTimerRef\.current = setTimeout\(tick, 1_000\)/u);
  assert.match(recorder, /Promise\.all\(\[/u);
  assert.match(recorder, /apiRequest<\{ playback: PlaybackDocument; revisionId\?: string \| null \}>\(playbackEndpoint\)/u);
  assert.match(recorder, /analyzePracticePerformance\(\{ samples, sampleRate: decoded\.sampleRate, playback: playbackResult\.data\.playback, events, scoreRevisionId \}\)/u);
  assert.match(recorder, /analyzePracticePerformance\(\{ \.\.\.decoded, alignment: \{ recordingStartSeconds, timeScale \} \}\)/u);
  assert.match(recorder, /event\.startBeat >= practiceSettings\.loopEndBeat/u);
});

test("fixed playback navigation is localized while service errors, diagnostics, warnings, and source facts remain verbatim", () => {
  const playback = source("../../components/ScorePlaybackPanel.tsx");
  const recorder = source("../../components/PracticeRecorder.tsx");
  assert.match(playback, /rawPlaybackErrorOrFallback\(result\.error, copy\.failed\)/u);
  assert.match(playback, /playback\.metadata\.warnings\.map\(\(warning/u);
  assert.match(playback, /\{warning\}/u);
  assert.match(playback, /copy\.terminationReasons\[graph\.terminatedBy\]/u);
  assert.match(playback, /copy\.navigationActions\[step\.action\]/u);
  assert.match(playback, /formatMessage\(copy\.navigationMeasureTemplate, \{ measure: step\.measureNumber \}\)/u);
  assert.doesNotMatch(playback, /\{graph\.terminatedBy\}/u);
  assert.doesNotMatch(playback, /· \{step\.action\}/u);
  assert.doesNotMatch(playback, /M\{step\.measureNumber\}/u);
  assert.match(playback, /step\.detail/u);
  assert.match(recorder, /rawPlaybackErrorOrFallback\(playbackResult\.error, copy\.analysisFailed\)/u);
  assert.match(recorder, /analysis\.warnings\.map\(\(warning/u);
  assert.match(recorder, /\{warning\}/u);
  assert.match(recorder, /\{event\.noteName\}/u);
});

test("Jianpu notation and waveform rendering algorithms remain projections of structured score and audio data", () => {
  const jianpu = source("../../components/JianpuNotationView.tsx");
  const waveform = source("../../components/AudioWaveformPlayer.tsx");
  assert.match(jianpu, /durationType === "eighth" \? 1/u);
  assert.match(jianpu, /durationType === "64th" \? 4/u);
  assert.match(jianpu, /durationType === "whole" \? 3/u);
  assert.match(jianpu, /"#"\.repeat\(accidental\)/u);
  assert.match(jianpu, /event\.type === "note" && event\.chord/u);
  assert.match(jianpu, /event\.timeModification\.actualNotes/u);
  assert.match(jianpu, /event\.slurs/u);
  assert.match(jianpu, /event\.ties/u);

  assert.match(waveform, /fetch\(src\)/u);
  assert.match(waveform, /const bucketCount = 600/u);
  assert.match(waveform, /decoded\.getChannelData\(0\)/u);
  assert.match(waveform, /for \(const marker of markers\)/u);
  assert.match(waveform, /\[0\.5, 0\.75, 1, 1\.25, 1\.5\]/u);
  assert.match(waveform, /audioRef\.current\.playbackRate = rate/u);
});

test("visible numbers and interactive controls use shared Intl helpers and localized accessibility text", () => {
  const playback = source("../../components/ScorePlaybackPanel.tsx");
  const recorder = source("../../components/PracticeRecorder.tsx");
  const jianpu = source("../../components/JianpuNotationView.tsx");
  const waveform = source("../../components/AudioWaveformPlayer.tsx");
  for (const contents of [playback, recorder, jianpu, waveform]) {
    assert.doesNotMatch(contents, /\.toLocaleString\(|\.toFixed\(/u);
  }
  assert.match(playback, /formatPlaybackNumber/u);
  assert.match(playback, /formatPlaybackPercent/u);
  assert.match(recorder, /formatPlaybackDuration/u);
  assert.match(recorder, /formatPlaybackPercent/u);
  assert.match(jianpu, /formatNumber/u);
  assert.match(waveform, /role="slider"/u);
  assert.match(waveform, /aria-valuetext=\{waveformValue\}/u);
  assert.match(waveform, /onKeyDown/u);
  assert.match(recorder, /role="alert"/u);
  assert.match(playback, /aria-pressed=\{isSolo\}/u);
  assert.match(playback, /aria-pressed=\{isMuted\}/u);
});

test("playback localization sources stay UTF-8 TypeScript with extensionless app imports", () => {
  const files = [
    ...readdirSync(new URL(".", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(entry.name, import.meta.url)),
    ...readdirSync(new URL("./locales/", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(`./locales/${entry.name}`, import.meta.url)),
  ];
  assert.equal(files.filter((file) => /\/locales\/[^/]+\.ts$/u.test(file.pathname)).length, 9);
  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    assert.doesNotMatch(file.pathname, /\.(?:js|d\.ts)$/u, file.pathname);
    assert.doesNotMatch(contents, /\uFFFD/u, `${file.pathname} encoding`);
    assert.doesNotMatch(contents, /from\s+["'][^"']+\.js["']/u, `${file.pathname} extensionless import`);
  }
});
