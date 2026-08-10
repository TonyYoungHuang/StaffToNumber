import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ScoreJson, ScorePitch } from "@score/shared";
import { parseMusicXmlToScoreJson } from "./musicxml-score-parser.js";
import { transposeScoreJsonWithMusic21 } from "./score-music21-transpose.js";

type FixtureManifestEntry = {
  id: string;
  file: string;
  title: string;
  sha256: string;
  provenance: {
    kind: "public-domain" | "user-provided";
    source: string;
    license: string;
    licenseUrl?: string;
  };
};

type FixtureManifest = {
  schemaVersion: 1;
  fixtures: FixtureManifestEntry[];
};

const importedAt = "2026-07-17T00:00:00.000Z";
const music21Command = process.env.MUSIC21_COMMAND?.trim();
const fixtureRootSetting = process.env.MUSIC21_FIXTURE_ROOT?.trim() || process.env.MUSIC21_REAL_FIXTURE_ROOT?.trim();
const fixtureRootSkip = fixtureRootSetting
  ? false
  : "Set MUSIC21_FIXTURE_ROOT (or MUSIC21_REAL_FIXTURE_ROOT) to opt into the real fixture matrix.";
const realMatrixSkip = !music21Command
  ? "Set MUSIC21_COMMAND to a Python command with music21 installed to run the real-engine matrix."
  : fixtureRootSkip;
const apiRoot = fileURLToPath(new URL("../..", import.meta.url));

function fixtureRoot() {
  assert.ok(fixtureRootSetting, "A fixture root is required for this integration suite.");
  const resolved = fs.realpathSync(path.resolve(fixtureRootSetting));
  assert.ok(fs.statSync(resolved).isDirectory(), `Fixture root is not a directory: ${resolved}`);
  return resolved;
}

function sha256(content: Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

function loadManifest() {
  const root = fixtureRoot();
  const manifestPath = path.join(root, "manifest.json");
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Partial<FixtureManifest>;
  assert.equal(parsed.schemaVersion, 1, "Fixture manifest schemaVersion must be 1.");
  assert.ok(Array.isArray(parsed.fixtures) && parsed.fixtures.length > 0, "Fixture manifest must contain fixtures.");

  const ids = new Set<string>();
  for (const fixture of parsed.fixtures) {
    assert.match(fixture.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Fixture ids must be stable kebab-case values.");
    assert.ok(!ids.has(fixture.id), `Duplicate fixture id: ${fixture.id}`);
    ids.add(fixture.id);
    assert.ok(fixture.title.trim(), `Fixture ${fixture.id} must have a title.`);
    assert.match(fixture.sha256, /^[a-f0-9]{64}$/u, `Fixture ${fixture.id} must have a lowercase SHA-256.`);
    assert.ok(
      fixture.provenance.kind === "public-domain" || fixture.provenance.kind === "user-provided",
      `Fixture ${fixture.id} must be public-domain or user-provided.`,
    );
    assert.ok(fixture.provenance.source.trim(), `Fixture ${fixture.id} must identify its source.`);
    assert.ok(fixture.provenance.license.trim(), `Fixture ${fixture.id} must identify its license or grant.`);

    const absolutePath = fs.realpathSync(path.resolve(root, fixture.file));
    const relativePath = path.relative(root, absolutePath);
    assert.ok(relativePath && relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath),
      `Fixture ${fixture.id} resolves outside MUSIC21_FIXTURE_ROOT.`);
    assert.equal(sha256(fs.readFileSync(absolutePath)), fixture.sha256, `SHA-256 mismatch for fixture ${fixture.id}.`);
  }

  return parsed as FixtureManifest;
}

function loadFixture(id: string) {
  const root = fixtureRoot();
  const fixture = loadManifest().fixtures.find((candidate) => candidate.id === id);
  assert.ok(fixture, `Fixture manifest is missing required fixture ${id}.`);
  const absolutePath = path.resolve(root, fixture.file);
  const musicXml = fs.readFileSync(absolutePath, "utf8");
  const score = parseMusicXmlToScoreJson({
    musicXml,
    title: fixture.title,
    sourceFileId: `music21-real:${fixture.id}`,
    sourceOriginalName: fixture.file,
    importedAt,
  });
  return { fixture, musicXml, score };
}

const pitchClassByStep: Record<ScorePitch["step"], number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function pitchToMidi(pitch: ScorePitch) {
  return (pitch.octave + 1) * 12 + pitchClassByStep[pitch.step] + pitch.alter;
}

function noteMidis(score: ScoreJson, partId?: string) {
  return score.measures
    .filter((measure) => !partId || measure.partId === partId)
    .flatMap((measure) => measure.events)
    .filter((event) => event.type === "note")
    .map((event) => pitchToMidi(event.pitch))
    .sort((left, right) => left - right);
}

function assertChromaticShift(source: ScoreJson, output: ScoreJson, semitones: number, sourcePartId?: string, outputPartId?: string) {
  assert.deepEqual(
    noteMidis(output, outputPartId),
    noteMidis(source, sourcePartId).map((midi) => midi + semitones),
  );
}

function shellQuote(value: string) {
  if (process.platform === "win32") {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function runNodeScript(scriptPath: string, timeoutMs: number) {
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", scriptPath], {
      cwd: apiRoot,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Isolated music21 output test timed out after ${timeoutMs} ms.`));
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

async function runMutatedOutputCase(score: ScoreJson, kind: "malformed" | "corrupt") {
  assert.ok(music21Command);
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `score-music21-${kind}-`));
  const proxyPath = path.join(workspace, "music21-output-proxy.cjs");
  const runnerPath = path.join(workspace, "adapter-runner.mts");
  const mutation = kind === "malformed"
    ? "fs.writeFileSync(outputPath, '<not-a-score/>', 'utf8');"
    : "fs.writeFileSync(outputPath, Buffer.from([0x00, 0xff, 0x00, 0xfe, 0x7f]));";
  fs.writeFileSync(proxyPath, `
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const args = process.argv.slice(2);
const outputPath = args[2];
const child = spawn(${JSON.stringify(music21Command)}, args, { shell: true, windowsHide: true });
child.stdout?.pipe(process.stdout);
child.stderr?.pipe(process.stderr);
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("close", (code) => {
  if (code !== 0) { process.exitCode = code || 1; return; }
  ${mutation}
});
`, "utf8");

  const proxyCommand = `${shellQuote(process.execPath)} ${shellQuote(proxyPath)}`;
  const adapterUrl = pathToFileURL(path.join(apiRoot, "src/lib/score-music21-transpose.ts")).href;
  fs.writeFileSync(runnerPath, `
import { transposeScoreJsonWithMusic21 } from ${JSON.stringify(adapterUrl)};
const score = ${JSON.stringify(score)};
try {
  await transposeScoreJsonWithMusic21({ score, semitones: 2, music21Command: ${JSON.stringify(proxyCommand)}, timeoutMs: 20000 });
  process.stdout.write("UNEXPECTED_SUCCESS");
} catch (error) {
  process.stderr.write(\`ADAPTER_REJECTED: \${error instanceof Error ? error.message : String(error)}\`);
  process.exitCode = 2;
}
`, "utf8");

  try {
    return await runNodeScript(runnerPath, 30_000);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

test("real music21 fixture manifest permits only traceable fixtures and verifies SHA-256", { skip: fixtureRootSkip }, () => {
  const manifest = loadManifest();
  assert.deepEqual(manifest.fixtures.map((fixture) => fixture.id).sort(), ["complex", "instrument-parts", "simple"]);
  for (const fixture of manifest.fixtures) {
    const { score } = loadFixture(fixture.id);
    assert.ok(score.parts.length > 0, `Fixture ${fixture.id} did not produce any parts.`);
    assert.ok(score.metadata.measureCount > 0, `Fixture ${fixture.id} did not produce any measures.`);
    assert.ok(score.metadata.noteCount > 0, `Fixture ${fixture.id} did not produce any notes.`);
  }
});

test("real music21 completes a chromatic transposition through the public adapter", { skip: realMatrixSkip }, async () => {
  assert.ok(music21Command);
  const { score } = loadFixture("simple");
  const result = await transposeScoreJsonWithMusic21({
    score,
    semitones: 2,
    music21Command,
    timeoutMs: 20_000,
    spellingPolicy: "prefer-sharps",
    generatedAt: importedAt,
  });

  assert.match(result.musicXml, /<score-partwise\b/u);
  assert.equal(result.scoreJson.metadata.noteCount, score.metadata.noteCount);
  assert.equal(result.scoreJson.metadata.restCount, score.metadata.restCount);
  assert.match(result.scoreJson.metadata.warnings[0], /Transposed \+2 semitones with music21/u);
  assertChromaticShift(score, result.scoreJson, 2);
});

test("real music21 timeout is surfaced explicitly", { skip: realMatrixSkip }, async () => {
  assert.ok(music21Command);
  const { score } = loadFixture("simple");
  await assert.rejects(
    transposeScoreJsonWithMusic21({ score, semitones: 2, music21Command, timeoutMs: 5 }),
    /music21 transposition timed out after 5 ms/u,
  );
});

test("malformed and corrupt post-engine output cannot produce a successful adapter result", { skip: realMatrixSkip }, async () => {
  const { score } = loadFixture("simple");
  for (const kind of ["malformed", "corrupt"] as const) {
    const result = await runMutatedOutputCase(score, kind);
    assert.notEqual(result.code, 0, `${kind} MusicXML output unexpectedly succeeded: ${result.stdout}`);
    assert.doesNotMatch(result.stdout, /UNEXPECTED_SUCCESS/u);
    assert.match(`${result.stdout}\n${result.stderr}`, /Only MusicXML score-partwise documents are supported|ADAPTER_REJECTED/u);
  }
});

test("real music21 transposes complex MusicXML without flattening notation evidence", { skip: realMatrixSkip }, async () => {
  assert.ok(music21Command);
  const { score } = loadFixture("complex");
  const result = await transposeScoreJsonWithMusic21({
    score,
    semitones: 5,
    music21Command,
    timeoutMs: 20_000,
    spellingPolicy: "prefer-flats",
    generatedAt: importedAt,
  });
  const notes = result.scoreJson.measures.flatMap((measure) => measure.events).filter((event) => event.type === "note");

  assert.equal(result.scoreJson.metadata.measureCount, score.metadata.measureCount);
  assert.equal(result.scoreJson.metadata.noteCount, score.metadata.noteCount);
  assertChromaticShift(score, result.scoreJson, 5);
  assert.ok(notes.some((note) => note.grace), "Grace-note evidence was lost.");
  assert.ok(notes.some((note) => note.chord), "Chord evidence was lost.");
  assert.ok(notes.some((note) => note.timeModification?.actualNotes === 3), "Tuplet timing evidence was lost.");
  assert.ok(notes.some((note) => note.staff === 2), "Second-staff evidence was lost.");
  assert.ok(notes.some((note) => note.lyrics.some((lyric) => lyric.text === "ground")), "Lyric evidence was lost.");
  assert.ok(notes.some((note) => note.ties.some((tie) => tie.type === "start")), "Tie evidence was lost.");
});

test("real music21 makes sharp and flat enharmonic policies observable", { skip: realMatrixSkip }, async () => {
  assert.ok(music21Command);
  const { score } = loadFixture("simple");
  const [sharp, flat] = await Promise.all([
    transposeScoreJsonWithMusic21({
      score,
      semitones: 1,
      music21Command,
      timeoutMs: 20_000,
      targetKey: { tonic: "C#", mode: "major", fifths: 7 },
      spellingPolicy: "prefer-sharps",
      generatedAt: importedAt,
    }),
    transposeScoreJsonWithMusic21({
      score,
      semitones: 1,
      music21Command,
      timeoutMs: 20_000,
      targetKey: { tonic: "Db", mode: "major", fifths: -5 },
      spellingPolicy: "prefer-flats",
      generatedAt: importedAt,
    }),
  ]);
  const sharpPitch = sharp.scoreJson.measures.flatMap((measure) => measure.events)
    .find((event) => event.type === "note" && pitchToMidi(event.pitch) === 61);
  const flatPitch = flat.scoreJson.measures.flatMap((measure) => measure.events)
    .find((event) => event.type === "note" && pitchToMidi(event.pitch) === 61);

  assert.ok(sharpPitch?.type === "note" && flatPitch?.type === "note");
  assert.deepEqual(sharpPitch.pitch, { step: "C", alter: 1, octave: 4 });
  assert.deepEqual(flatPitch.pitch, { step: "D", alter: -1, octave: 4 });
  assert.equal(sharp.scoreJson.measures[0].attributes?.key?.fifths, 7);
  assert.equal(flat.scoreJson.measures[0].attributes?.key?.fifths, -5);
});

test("real music21 provides pitch-shift evidence for every instrument part", { skip: realMatrixSkip }, async () => {
  assert.ok(music21Command);
  const { score } = loadFixture("instrument-parts");
  const result = await transposeScoreJsonWithMusic21({
    score,
    semitones: 2,
    music21Command,
    timeoutMs: 20_000,
    spellingPolicy: "prefer-sharps",
    generatedAt: importedAt,
  });

  assert.deepEqual(
    result.scoreJson.parts.map(({ name, abbreviation, midiProgram }) => ({ name, abbreviation, midiProgram })),
    score.parts.map(({ name, abbreviation, midiProgram }) => ({ name, abbreviation, midiProgram })),
  );
  for (const sourcePart of score.parts) {
    const outputPart = result.scoreJson.parts.find((part) => part.name === sourcePart.name);
    assert.ok(outputPart, `music21 output is missing instrument part ${sourcePart.name}.`);
    assertChromaticShift(score, result.scoreJson, 2, sourcePart.id, outputPart.id);
  }
});
