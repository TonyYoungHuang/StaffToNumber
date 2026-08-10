import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { PlaybackDocument } from "@score/shared";
import { PDFDocument } from "pdf-lib";
import { buildFfmpegAudioArgs, buildFluidSynthArgs, inspectRenderedScoreFile, parseFfmpegAudioQuality, playbackToMidiBuffer } from "./score-export-renderer.js";

const playback: PlaybackDocument = {
  schemaVersion: 1,
  title: "Export fixture",
  tempoBpm: 96,
  downbeatEvery: 4,
  totalBeats: 8,
  parts: [
    { id: "piano", name: "Piano", midiProgram: 1 },
    { id: "violin", name: "Violin", midiProgram: 41 },
  ],
  measureMarkers: [],
  events: [
    {
      id: "e1",
      sourceEventId: "n1",
      partId: "piano",
      measureId: "m1",
      measureNumber: "1",
      voice: "1",
      pitch: { step: "C", alter: 0, octave: 4 },
      midi: 60,
      noteName: "C4",
      startBeat: 0,
      durationBeats: 1,
      velocity: 0.8,
    },
    {
      id: "e2",
      sourceEventId: "n2",
      partId: "violin",
      measureId: "m1",
      measureNumber: "1",
      voice: "1",
      pitch: { step: "G", alter: 0, octave: 4 },
      midi: 67,
      noteName: "G4",
      startBeat: 2,
      durationBeats: 2,
      velocity: 0.7,
    },
  ],
  metadata: { sourceRevisionParser: "musicxml-basic-v1", generatedAt: new Date(0).toISOString(), eventCount: 2, warnings: [] },
};

test("creates reproducible MIDI snapshots with part filtering and practice count-in", () => {
  const options = { soloPartIds: ["piano"], countIn: true, metronome: true, partPans: { piano: -0.5 } };
  const first = playbackToMidiBuffer(playback, options);
  const second = playbackToMidiBuffer(playback, options);
  assert.equal(first.eventCount, 1);
  assert.equal(first.tempoBpm, 96);
  assert.equal(first.buffer.subarray(0, 4).toString("ascii"), "MThd");
  assert.deepEqual(first.buffer, second.buffer);
});

test("builds explicit SoundFont and normalized MP3 render arguments", () => {
  assert.deepEqual(
    buildFluidSynthArgs({
      sourceMidiPath: "source.mid",
      targetWavPath: "raw.wav",
      options: { sampleRate: 96000, soundFontGain: 0.8, reverbEnabled: false, chorusEnabled: true },
    }),
    ["-ni", "-R", "0", "-C", "1", "-g", "0.8", "-r", "96000", "-F", "raw.wav"],
  );

  const ffmpegArgs = buildFfmpegAudioArgs({
    sourceWavPath: "raw.wav",
    targetPath: "final.mp3",
    format: "mp3",
    options: { sampleRate: 48000, audioChannels: 2, normalizeLoudness: true, loudnessTargetLufs: -14, bitrateKbps: 320 },
  });
  assert.deepEqual(ffmpegArgs, [
    "-y", "-i", "raw.wav", "-ar", "48000", "-ac", "2", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
    "-codec:a", "libmp3lame", "-b:a", "320k", "final.mp3",
  ]);
});

test("parses ffmpeg duration and loudness delivery metrics", () => {
  const quality = parseFfmpegAudioQuality(`
    Duration: 00:01:23.45, start: 0.000000, bitrate: 1536 kb/s
    [Parsed_volumedetect_0] mean_volume: -18.2 dB
    [Parsed_volumedetect_0] max_volume: -1.5 dB
  `);
  assert.deepEqual(quality, { durationSeconds: 83.45, meanVolumeDb: -18.2, peakVolumeDb: -1.5 });
});

test("validates rendered score formats and reads the real PDF page count", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "score-render-inspection-"));
  try {
    const pdf = await PDFDocument.create();
    pdf.addPage([595, 842]);
    pdf.addPage([595, 842]);
    const pdfPath = path.join(directory, "two-pages.pdf");
    fs.writeFileSync(pdfPath, await pdf.save());
    assert.deepEqual(await inspectRenderedScoreFile("pdf", pdfPath), { pageCount: 2 });

    const svgPath = path.join(directory, "page.svg");
    fs.writeFileSync(svgPath, '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    assert.deepEqual(await inspectRenderedScoreFile("svg", svgPath), { pageCount: 1 });

    const pngPath = path.join(directory, "page.png");
    fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
    assert.deepEqual(await inspectRenderedScoreFile("png", pngPath), { pageCount: 1 });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects corrupted files that only use a rendered score extension", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "score-render-corrupt-"));
  try {
    const fakePdf = path.join(directory, "fake.pdf");
    fs.writeFileSync(fakePdf, "not a pdf");
    await assert.rejects(() => inspectRenderedScoreFile("pdf", fakePdf), /valid PDF signature/u);

    const corruptPdf = path.join(directory, "corrupt.pdf");
    fs.writeFileSync(corruptPdf, "%PDF-1.7\nthis is not a document");
    await assert.rejects(() => inspectRenderedScoreFile("pdf", corruptPdf), /unreadable PDF/u);

    const fakeSvg = path.join(directory, "fake.svg");
    fs.writeFileSync(fakeSvg, "<html></html>");
    await assert.rejects(() => inspectRenderedScoreFile("svg", fakeSvg), /valid SVG root/u);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
