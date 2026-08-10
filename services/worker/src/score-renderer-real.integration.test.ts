import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { PlaybackDocument, ScoreExportFormat, ScoreExportSnapshot } from "@score/shared";
import { XMLParser } from "fast-xml-parser";
import { PDFDocument } from "pdf-lib";
import { PNG } from "pngjs";
import { inspectRenderedScoreFile, renderScoreExport, type ScoreExportRendererConfig } from "./score-export-renderer.js";

type Tolerance = { target: number; tolerance: number };

type QualificationManifest = {
  schemaVersion: 1;
  fixture: string;
  optInEnv: string;
  environment: {
    museScoreCommand: string;
    fluidSynthCommand: string;
    ffmpegCommand: string;
    soundFontPath: string;
    soundFontLicenseManifest: string;
  };
  timeoutsMs: {
    museScore: number;
    fluidSynth: number;
    ffmpeg: number;
    forcedFailure: number;
  };
  soundFontLicensePolicy: {
    allowedExtensions: string[];
    allowedSpdxLicenseIds: string[];
    licensesRequiringAttribution: string[];
    requireRedistributionAllowed: boolean;
    requireSha256: boolean;
  };
  acousticGolden: {
    sampleRate: 44100 | 48000 | 96000;
    channels: 1 | 2;
    tempoBpm: number;
    durationSeconds: Tolerance;
    meanVolumeDb: Tolerance;
    peakVolumeDb: Tolerance;
  };
};

type SoundFontLicenseManifest = {
  schemaVersion: 1;
  soundFont: {
    name: string;
    fileName: string;
    sha256: string;
    sourceUrl: string;
  };
  license: {
    spdxId: string;
    licenseUrl: string;
    redistributionAllowed: boolean;
    attribution?: string;
  };
};

const fixtureDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "render-real");
const manifest = JSON.parse(fs.readFileSync(path.join(fixtureDirectory, "manifest.json"), "utf8")) as QualificationManifest;
const fixtureMusicXml = fs.readFileSync(path.join(fixtureDirectory, manifest.fixture), "utf8");

function configuredValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

function realToolSkip(requiredEnvironmentNames: string[]) {
  if (configuredValue(manifest.optInEnv) !== "1") {
    return `set ${manifest.optInEnv}=1 to run real renderer qualification`;
  }
  const missing = requiredEnvironmentNames.filter((name) => !configuredValue(name));
  return missing.length > 0 ? `missing environment: ${missing.join(", ")}` : false;
}

function rendererConfig(overrides: Partial<ScoreExportRendererConfig> = {}): ScoreExportRendererConfig {
  return {
    museScoreCommand: configuredValue(manifest.environment.museScoreCommand),
    museScoreTimeoutMs: manifest.timeoutsMs.museScore,
    fluidSynthCommand: configuredValue(manifest.environment.fluidSynthCommand),
    fluidSynthTimeoutMs: manifest.timeoutsMs.fluidSynth,
    soundFontPath: configuredValue(manifest.environment.soundFontPath),
    ffmpegCommand: configuredValue(manifest.environment.ffmpegCommand),
    ffmpegTimeoutMs: manifest.timeoutsMs.ffmpeg,
    ...overrides,
  };
}

function visualSnapshot(format: "pdf" | "svg" | "png", musicXml = fixtureMusicXml): ScoreExportSnapshot {
  return {
    schemaVersion: 1,
    format,
    revisionId: "renderer-real-fixture",
    revisionNumber: 1,
    title: "Renderer qualification scale",
    musicXml,
    options: format === "png" ? { imageResolutionDpi: 144 } : {},
  };
}

const playback: PlaybackDocument = {
  schemaVersion: 1,
  title: "Renderer acoustic qualification",
  tempoBpm: manifest.acousticGolden.tempoBpm,
  downbeatEvery: 4,
  totalBeats: 4,
  parts: [{ id: "piano", name: "Piano", midiProgram: 1 }],
  measureMarkers: [],
  events: ["C4", "D4", "E4", "F4"].map((noteName, index) => ({
    id: `note-${index + 1}`,
    sourceEventId: `fixture-note-${index + 1}`,
    partId: "piano",
    measureId: "measure-1",
    measureNumber: "1",
    voice: "1",
    pitch: { step: noteName[0] as "C" | "D" | "E" | "F", alter: 0, octave: 4 },
    midi: 60 + index * 2 - (index === 3 ? 1 : 0),
    noteName,
    startBeat: index,
    durationBeats: 0.75,
    velocity: 0.72,
  })),
  metadata: {
    sourceRevisionParser: "musicxml-basic-v1",
    generatedAt: new Date(0).toISOString(),
    eventCount: 4,
    warnings: [],
  },
};

function temporaryDirectory(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function independentlyReopen(format: "pdf" | "svg" | "png", filePath: string) {
  const bytes = fs.readFileSync(filePath);
  if (format === "pdf") {
    const first = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    assert.ok(first.getPageCount() >= 1);
    const reopened = await PDFDocument.load(await first.save(), { updateMetadata: false });
    assert.equal(reopened.getPageCount(), first.getPageCount());
    return;
  }
  if (format === "svg") {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(bytes.toString("utf8")) as Record<string, unknown>;
    assert.ok(parsed.svg, "SVG must have a parseable root element");
    const reopened = parser.parse(Buffer.from(bytes).toString("utf8")) as Record<string, unknown>;
    assert.ok(reopened.svg, "SVG must remain parseable when reopened");
    return;
  }
  const decoded = PNG.sync.read(bytes);
  assert.ok(decoded.width > 0 && decoded.height > 0, "PNG must have non-zero dimensions");
  const reopened = PNG.sync.read(PNG.sync.write(decoded));
  assert.deepEqual([reopened.width, reopened.height], [decoded.width, decoded.height]);
}

function listFilesRecursively(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFilesRecursively(filePath) : [filePath];
  });
}

function sha256(filePath: string) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assertHttpUrl(value: string, label: string) {
  const url = new URL(value);
  assert.ok(url.protocol === "https:" || url.protocol === "http:", `${label} must use HTTP(S)`);
}

function loadLicensedSoundFont() {
  const soundFontPath = path.resolve(configuredValue(manifest.environment.soundFontPath));
  const licenseManifestPathValue = configuredValue(manifest.environment.soundFontLicenseManifest);
  assert.ok(licenseManifestPathValue, `${manifest.environment.soundFontLicenseManifest} is required when SOUNDFONT_PATH is configured`);
  assert.ok(fs.existsSync(soundFontPath), `SoundFont does not exist: ${soundFontPath}`);
  const fixtureRelativePath = path.relative(fixtureDirectory, soundFontPath);
  assert.ok(fixtureRelativePath.startsWith("..") || path.isAbsolute(fixtureRelativePath), "SoundFonts must not be bundled with integration fixtures");
  assert.ok(manifest.soundFontLicensePolicy.allowedExtensions.includes(path.extname(soundFontPath).toLowerCase()), "SoundFont must use an approved extension");

  const licenseManifestPath = path.resolve(licenseManifestPathValue);
  assert.ok(fs.existsSync(licenseManifestPath), `SoundFont license manifest does not exist: ${licenseManifestPath}`);
  const licenseManifest = JSON.parse(fs.readFileSync(licenseManifestPath, "utf8")) as SoundFontLicenseManifest;
  assert.equal(licenseManifest.schemaVersion, 1);
  assert.ok(licenseManifest.soundFont.name.trim(), "SoundFont license manifest requires a name");
  assert.equal(licenseManifest.soundFont.fileName, path.basename(soundFontPath));
  assertHttpUrl(licenseManifest.soundFont.sourceUrl, "SoundFont sourceUrl");
  assertHttpUrl(licenseManifest.license.licenseUrl, "SoundFont licenseUrl");
  assert.ok(manifest.soundFontLicensePolicy.allowedSpdxLicenseIds.includes(licenseManifest.license.spdxId), `SoundFont license ${licenseManifest.license.spdxId} is not approved`);
  if (manifest.soundFontLicensePolicy.requireRedistributionAllowed) {
    assert.equal(licenseManifest.license.redistributionAllowed, true, "SoundFont manifest must explicitly permit redistribution");
  }
  if (manifest.soundFontLicensePolicy.licensesRequiringAttribution.includes(licenseManifest.license.spdxId)) {
    assert.ok(licenseManifest.license.attribution?.trim(), `${licenseManifest.license.spdxId} requires attribution text`);
  }
  if (manifest.soundFontLicensePolicy.requireSha256) {
    assert.match(licenseManifest.soundFont.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(sha256(soundFontPath), licenseManifest.soundFont.sha256, "SoundFont checksum does not match its license manifest");
  }
  return soundFontPath;
}

function numericMetric(metrics: Record<string, unknown>, name: string) {
  const value = metrics[name];
  if (typeof value !== "number") {
    assert.fail(`${name} must be a numeric renderer metric`);
  }
  assert.ok(Number.isFinite(value), `${name} must be finite`);
  return value;
}

function assertWithinTolerance(actual: number, golden: Tolerance, label: string) {
  const difference = Math.abs(actual - golden.target);
  assert.ok(difference <= golden.tolerance, `${label} ${actual} is outside ${golden.target} +/- ${golden.tolerance}`);
}

function assertWavHeader(filePath: string) {
  const header = fs.readFileSync(filePath).subarray(0, 12);
  assert.equal(header.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(header.subarray(8, 12).toString("ascii"), "WAVE");
  assert.ok(fs.statSync(filePath).size > 44, "WAV must contain audio frames");
}

function runExternal(command: string, args: string[], timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = "";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error(`${command} validation timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => finish(error));
    child.on("close", (code) => {
      if (code === 0) finish();
      else finish(new Error(`${command} validation exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

test("real renderer fixture declares license gates and bundles no SoundFont", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(manifest.soundFontLicensePolicy.allowedSpdxLicenseIds.length > 0);
  for (const golden of [manifest.acousticGolden.durationSeconds, manifest.acousticGolden.meanVolumeDb, manifest.acousticGolden.peakVolumeDb]) {
    assert.ok(Number.isFinite(golden.target));
    assert.ok(Number.isFinite(golden.tolerance) && golden.tolerance > 0);
  }
  const bundledSoundFonts = listFilesRecursively(fixtureDirectory).filter((filePath) => /\.sf[23]$/iu.test(filePath));
  assert.deepEqual(bundledSoundFonts, []);
});

for (const format of ["pdf", "svg", "png"] as const) {
  test(`MuseScore renders valid ${format.toUpperCase()} and the output reopens`, {
    skip: realToolSkip([manifest.environment.museScoreCommand]),
  }, async () => {
    const directory = temporaryDirectory(`score-renderer-real-${format}-`);
    try {
      const progress: number[] = [];
      const result = await renderScoreExport({
        snapshot: visualSnapshot(format),
        workDir: directory,
        config: rendererConfig(),
        isCancelled: () => false,
        onProgress: (value) => progress.push(value),
      });
      assert.ok(result.files.length >= 1);
      assert.equal(result.engine.name, "MuseScore");
      assert.equal(progress.at(-1), 100);
      for (const file of result.files) {
        assert.equal(file.mimeType, visualMimeType(format));
        assert.ok((await inspectRenderedScoreFile(format, file.path)).pageCount >= 1);
        await independentlyReopen(format, file.path);
      }
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

test("MuseScore rejects corrupt MusicXML through the production renderer", {
  skip: realToolSkip([manifest.environment.museScoreCommand]),
}, async () => {
  const directory = temporaryDirectory("score-renderer-real-corrupt-");
  try {
    await assert.rejects(() => renderScoreExport({
      snapshot: visualSnapshot("pdf", "<score-partwise><part>corrupt"),
      workDir: directory,
      config: rendererConfig(),
      isCancelled: () => false,
      onProgress: () => undefined,
    }), /MuseScore|PDF output|MusicXML|XML/iu);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("MuseScore execution obeys the configured timeout", {
  skip: realToolSkip([manifest.environment.museScoreCommand]),
}, async () => {
  const directory = temporaryDirectory("score-renderer-real-timeout-");
  try {
    await assert.rejects(() => renderScoreExport({
      snapshot: visualSnapshot("pdf"),
      workDir: directory,
      config: rendererConfig({ museScoreTimeoutMs: manifest.timeoutsMs.forcedFailure }),
      isCancelled: () => false,
      onProgress: () => undefined,
    }), new RegExp(`MuseScore timed out after ${manifest.timeoutsMs.forcedFailure} ms`, "u"));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("configured SoundFont passes checksum and license-manifest gates", {
  skip: realToolSkip([manifest.environment.soundFontPath]),
}, () => {
  loadLicensedSoundFont();
});

test("FluidSynth execution obeys the configured timeout", {
  skip: realToolSkip([
    manifest.environment.fluidSynthCommand,
    manifest.environment.soundFontPath,
    manifest.environment.soundFontLicenseManifest,
  ]),
}, async () => {
  const soundFontPath = loadLicensedSoundFont();
  const directory = temporaryDirectory("score-renderer-real-fluid-timeout-");
  try {
    const snapshot = acousticSnapshot();
    await assert.rejects(() => renderScoreExport({
      snapshot,
      workDir: directory,
      config: rendererConfig({ soundFontPath, fluidSynthTimeoutMs: manifest.timeoutsMs.forcedFailure }),
      isCancelled: () => false,
      onProgress: () => undefined,
    }), new RegExp(`FluidSynth timed out after ${manifest.timeoutsMs.forcedFailure} ms`, "u"));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("ffmpeg rejects corrupt WAV input", {
  skip: realToolSkip([manifest.environment.ffmpegCommand]),
}, async () => {
  const directory = temporaryDirectory("score-renderer-real-ffmpeg-corrupt-");
  try {
    const corruptWav = path.join(directory, "corrupt.wav");
    fs.writeFileSync(corruptWav, "RIFF-not-a-wave-file");
    await assert.rejects(() => runExternal(
      configuredValue(manifest.environment.ffmpegCommand),
      ["-hide_banner", "-v", "error", "-i", corruptWav, "-f", "null", "-"],
      manifest.timeoutsMs.ffmpeg,
    ), /exited with code/iu);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("FluidSynth renders WAV and ffmpeg analysis stays within acoustic golden tolerances", {
  skip: realToolSkip([
    manifest.environment.fluidSynthCommand,
    manifest.environment.ffmpegCommand,
    manifest.environment.soundFontPath,
    manifest.environment.soundFontLicenseManifest,
  ]),
}, async () => {
  const soundFontPath = loadLicensedSoundFont();
  const directory = temporaryDirectory("score-renderer-real-audio-");
  try {
    const snapshot = acousticSnapshot();
    const result = await renderScoreExport({
      snapshot,
      workDir: directory,
      config: rendererConfig({ soundFontPath }),
      isCancelled: () => false,
      onProgress: () => undefined,
    });
    assert.equal(result.engine.name, "FluidSynth + ffmpeg");
    assert.equal(result.files.length, 1);
    const renderedWav = result.files[0].path;
    assertWavHeader(renderedWav);
    const rawWav = fs.readdirSync(directory).find((entry) => entry.endsWith(".raw.wav"));
    assert.ok(rawWav, "FluidSynth raw WAV output must be retained in the qualification work directory");
    assertWavHeader(path.join(directory, rawWav));

    const durationSeconds = numericMetric(result.metrics, "durationSeconds");
    const meanVolumeDb = numericMetric(result.metrics, "meanVolumeDb");
    const peakVolumeDb = numericMetric(result.metrics, "peakVolumeDb");
    assertWithinTolerance(durationSeconds, manifest.acousticGolden.durationSeconds, "durationSeconds");
    assertWithinTolerance(meanVolumeDb, manifest.acousticGolden.meanVolumeDb, "meanVolumeDb");
    assertWithinTolerance(peakVolumeDb, manifest.acousticGolden.peakVolumeDb, "peakVolumeDb");

    await runExternal(
      configuredValue(manifest.environment.ffmpegCommand),
      ["-hide_banner", "-v", "error", "-i", renderedWav, "-f", "null", "-"],
      manifest.timeoutsMs.ffmpeg,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function acousticSnapshot(): ScoreExportSnapshot {
  return {
    schemaVersion: 1,
    format: "wav",
    revisionId: "renderer-real-acoustic-fixture",
    revisionNumber: 1,
    title: "Renderer acoustic qualification",
    playback,
    options: {
      sampleRate: manifest.acousticGolden.sampleRate,
      audioChannels: manifest.acousticGolden.channels,
      soundFontGain: 0.7,
      reverbEnabled: false,
      chorusEnabled: false,
      normalizeLoudness: true,
      loudnessTargetLufs: manifest.acousticGolden.meanVolumeDb.target,
    },
  };
}

function visualMimeType(format: Extract<ScoreExportFormat, "pdf" | "svg" | "png">) {
  return {
    pdf: "application/pdf",
    svg: "image/svg+xml",
    png: "image/png",
  }[format];
}
