import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { ScoreEvent, ScoreJson, ScoreNoteEvent } from "@score/shared";
import { parseJianpuToScoreJson } from "./jianpu-score-parser.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/jianpu-publication/", import.meta.url));
const IMPORTED_AT = "2026-07-17T00:00:00.000Z";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const APPROVED_LICENSES = ["CC-BY-4.0", "CC0-1.0", "PDM-1.0"];
const REQUIRED_PROVENANCE_FIELDS = [
  "origin",
  "authoringEntity",
  "createdAt",
  "method",
  "sourceReference",
  "originalityStatement",
];

type Capability =
  | "complex-voices"
  | "cross-line-tie"
  | "cross-line-slur"
  | "lyrics"
  | "tuplets"
  | "ornaments"
  | "pickup"
  | "senza-misura"
  | "diagnostics";

type ArtifactReference = {
  path: string;
  mediaType: string;
  checksum: string;
};

type PublicationFixture = {
  id: string;
  title: string;
  capabilities: Capability[];
  source: ArtifactReference;
  expectation: ArtifactReference;
  provenance: {
    origin: "original" | "public-domain";
    authoringEntity: string;
    createdAt: string;
    method: string;
    sourceReference: string | null;
    originalityStatement: string;
  };
  license: {
    spdx: string;
    name: string;
    url: string;
    scope: string;
  };
  commercialScoreContent: boolean;
};

type PublicationManifest = {
  schemaVersion: number;
  corpus: {
    id: string;
    version: string;
    publishedAt: string;
    description: string;
    assertionModel: string;
  };
  policy: {
    acceptedOrigins: string[];
    acceptedLicenses: string[];
    commercialScoreContent: string;
    checksum: { algorithm: string; encoding: string; covers: string };
    requiredProvenanceFields: string[];
  };
  requiredCoverage: Capability[];
  fixtures: PublicationFixture[];
};

type PublicationExpectation = {
  score: unknown;
  diagnostics: unknown;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function artifactPath(relativePath: string) {
  assert.equal(path.posix.normalize(relativePath), relativePath, `Non-normalized artifact path: ${relativePath}`);
  assert.equal(path.posix.isAbsolute(relativePath), false, `Absolute artifact path: ${relativePath}`);
  assert.equal(relativePath.includes("\\"), false, `Non-portable artifact path: ${relativePath}`);
  const resolved = path.resolve(FIXTURE_ROOT, relativePath);
  assert.ok(resolved.startsWith(`${path.resolve(FIXTURE_ROOT)}${path.sep}`), `Artifact escapes fixture root: ${relativePath}`);
  return resolved;
}

function sha256(filePath: string) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function normalizeEvent(event: ScoreEvent) {
  const shared = {
    type: event.type,
    duration: event.duration,
    durationType: event.durationType ?? null,
    dots: event.dots,
    voice: event.voice ?? "1",
    staff: event.staff ?? 1,
    timeModification: event.timeModification
      ? { actualNotes: event.timeModification.actualNotes, normalNotes: event.timeModification.normalNotes }
      : null,
    tuplets: (event.tuplets ?? []).map((tuplet) => ({ type: tuplet.type, number: tuplet.number })),
  };

  if (event.type === "rest") {
    return { ...shared, measureRest: event.measureRest };
  }

  return {
    ...shared,
    pitch: event.pitch,
    chord: event.chord,
    ties: event.ties.map((tie) => tie.type),
    slurs: (event.slurs ?? []).map((slur) => ({ type: slur.type, number: slur.number ?? null })),
    lyrics: event.lyrics.map((lyric) => ({
      number: lyric.number ?? null,
      syllabic: lyric.syllabic ?? null,
      text: lyric.text,
    })),
    ornaments: (event.ornaments ?? []).map((ornament) => ({
      type: ornament.type,
      placement: ornament.placement ?? null,
      value: ornament.value ?? null,
    })),
  };
}

function normalizeScore(score: ScoreJson) {
  return {
    title: score.title,
    parser: score.metadata.parser,
    measureCount: score.metadata.measureCount,
    noteCount: score.metadata.noteCount,
    restCount: score.metadata.restCount,
    warnings: score.metadata.warnings,
    measures: score.measures.map((measure) => ({
      number: measure.number,
      sequence: measure.sequence,
      implicit: Boolean(measure.implicit),
      divisions: measure.attributes?.divisions ?? null,
      key: measure.attributes?.key ?? null,
      time: measure.attributes?.time
        ? {
            beats: measure.attributes.time.beats,
            beatType: measure.attributes.time.beatType,
            senzaMisura: Boolean(measure.attributes.time.senzaMisura),
          }
        : null,
      events: measure.events.map(normalizeEvent),
    })),
  };
}

function normalizeDiagnostics(score: ScoreJson) {
  return (score.metadata.importDiagnostics ?? []).map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    token: diagnostic.token,
    line: diagnostic.line,
    column: diagnostic.column,
    start: diagnostic.start,
    end: diagnostic.end,
    suggestion: diagnostic.suggestion ?? null,
  }));
}

function noteEntries(score: ScoreJson) {
  return score.measures.flatMap((measure, measureIndex) =>
    measure.events
      .filter((event): event is ScoreNoteEvent => event.type === "note")
      .map((event) => ({ event, measureIndex })),
  );
}

function pitchKey(note: ScoreNoteEvent) {
  return `${note.pitch.step}:${note.pitch.alter}:${note.pitch.octave}`;
}

function assertCrossLineTie(source: string, score: ScoreJson) {
  const notes = noteEntries(score);
  const start = notes.find(({ event }) => event.ties.some((tie) => tie.type === "start"));
  assert.ok(start, "Expected a tie start");
  assert.ok(
    notes.some(({ event, measureIndex }) =>
      measureIndex > start.measureIndex
      && pitchKey(event) === pitchKey(start.event)
      && event.ties.some((tie) => tie.type === "stop")),
    "Expected the tie to stop on the same pitch in a later measure",
  );

  const lines = source.split(/\r?\n/);
  const startLine = lines.findIndex((line) => /[1-7][',_-]*~(?:\{|\s|\|)/.test(line));
  const stopLine = lines.findIndex((line) => /~[#b]*[1-7]/.test(line));
  assert.ok(startLine >= 0 && stopLine >= 0 && startLine !== stopLine, "Tie markers must span physical source lines");
}

function assertCrossLineSlur(source: string, score: ScoreJson) {
  const notes = noteEntries(score);
  const start = notes.find(({ event }) => event.slurs?.some((slur) => slur.type === "start"));
  assert.ok(start, "Expected a slur start");
  const startSlur = start.event.slurs?.find((slur) => slur.type === "start");
  assert.ok(
    notes.some(({ event, measureIndex }) =>
      measureIndex > start.measureIndex
      && event.slurs?.some((slur) => slur.type === "stop" && slur.number === startSlur?.number)),
    "Expected the numbered slur to stop in a later measure",
  );

  const lines = source.split(/\r?\n/);
  const startLine = lines.findIndex((line) => line.includes("{slur:start:"));
  const stopLine = lines.findIndex((line) => line.includes("{slur:stop:"));
  assert.ok(startLine >= 0 && stopLine >= 0 && startLine !== stopLine, "Slur markers must span physical source lines");
}

function assertCapability(capability: Capability, source: string, score: ScoreJson) {
  const events = score.measures.flatMap((measure) => measure.events);
  const notes = events.filter((event): event is ScoreNoteEvent => event.type === "note");

  switch (capability) {
    case "complex-voices":
      assert.ok(new Set(events.map((event) => event.voice ?? "1")).size >= 2, "Expected multiple voices");
      assert.ok(new Set(events.map((event) => event.staff ?? 1)).size >= 2, "Expected multiple staves");
      break;
    case "cross-line-tie":
      assertCrossLineTie(source, score);
      break;
    case "cross-line-slur":
      assertCrossLineSlur(source, score);
      break;
    case "lyrics":
      assert.ok(notes.some((note) => note.lyrics.length > 0), "Expected note-attached lyrics");
      break;
    case "tuplets":
      assert.ok(events.some((event) => event.timeModification), "Expected tuplet ratios");
      assert.ok(events.some((event) => event.tuplets?.some((tuplet) => tuplet.type === "start")), "Expected tuplet start");
      assert.ok(events.some((event) => event.tuplets?.some((tuplet) => tuplet.type === "stop")), "Expected tuplet stop");
      break;
    case "ornaments":
      assert.ok(new Set(notes.flatMap((note) => (note.ornaments ?? []).map((ornament) => ornament.type))).size >= 2, "Expected distinct ornaments");
      break;
    case "pickup":
      assert.equal(score.measures[0]?.implicit, true, "Expected an implicit pickup measure");
      assert.equal(score.measures[0]?.attributes?.time?.senzaMisura, undefined, "Pickup must not be free meter");
      break;
    case "senza-misura":
      assert.equal(score.measures[0]?.attributes?.time?.senzaMisura, true, "Expected senza misura");
      assert.ok(score.measures.every((measure) => !measure.implicit), "Free meter must not imply pickup status");
      break;
    case "diagnostics":
      assert.ok((score.metadata.importDiagnostics?.length ?? 0) > 0, "Expected import diagnostics");
      assert.equal(score.metadata.warnings.length, score.metadata.importDiagnostics?.length);
      for (const diagnostic of score.metadata.importDiagnostics ?? []) {
        assert.equal(source.slice(diagnostic.start, diagnostic.end), diagnostic.token, `Bad source span for ${diagnostic.code}`);
        assert.ok(diagnostic.suggestion, `Missing repair suggestion for ${diagnostic.code}`);
      }
      break;
  }
}

const manifestPath = path.join(FIXTURE_ROOT, "manifest.json");
const manifest = readJson<PublicationManifest>(manifestPath);

test("Jianpu publication manifest enforces provenance, licensing, checksums, and coverage", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.corpus.assertionModel, "score-json-semantics-without-renderer-or-generated-ids");
  assert.deepEqual([...manifest.policy.acceptedOrigins].sort(), ["original", "public-domain"]);
  assert.deepEqual([...manifest.policy.acceptedLicenses].sort(), APPROVED_LICENSES);
  assert.equal(manifest.policy.commercialScoreContent, "prohibited");
  assert.deepEqual(manifest.policy.checksum, {
    algorithm: "sha256",
    encoding: "lowercase-hex",
    covers: "exact-file-bytes",
  });
  assert.deepEqual(manifest.policy.requiredProvenanceFields, REQUIRED_PROVENANCE_FIELDS);

  const fixtureIds = manifest.fixtures.map((fixture) => fixture.id);
  assert.equal(new Set(fixtureIds).size, fixtureIds.length, "Fixture ids must be unique");
  const declaredArtifacts = new Set<string>();
  const coveredCapabilities = new Set<Capability>();

  for (const fixture of manifest.fixtures) {
    assert.match(fixture.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(fixture.title.trim());
    assert.equal(fixture.commercialScoreContent, false, `${fixture.id} contains prohibited commercial score content`);
    assert.ok(manifest.policy.acceptedOrigins.includes(fixture.provenance.origin));
    assert.ok(manifest.policy.acceptedLicenses.includes(fixture.license.spdx));
    assert.equal(fixture.license.scope, "source-and-expectation");
    assert.match(fixture.license.url, /^https:\/\//);

    for (const field of REQUIRED_PROVENANCE_FIELDS) {
      assert.ok(field in fixture.provenance, `${fixture.id} is missing provenance.${field}`);
    }
    assert.ok(fixture.provenance.authoringEntity.trim());
    assert.match(fixture.provenance.createdAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(fixture.provenance.method.trim());
    assert.ok(fixture.provenance.originalityStatement.trim());
    if (fixture.provenance.origin === "original") {
      assert.equal(fixture.provenance.sourceReference, null);
      assert.match(fixture.provenance.originalityStatement, /not copied, transcribed, or adapted/i);
    } else {
      assert.match(fixture.provenance.sourceReference ?? "", /^https:\/\//);
      assert.match(fixture.provenance.originalityStatement, /public domain/i);
    }

    for (const artifact of [fixture.source, fixture.expectation]) {
      assert.match(artifact.checksum, SHA256_PATTERN, `${fixture.id} has an invalid checksum`);
      assert.ok(artifact.mediaType.trim());
      assert.equal(declaredArtifacts.has(artifact.path), false, `Duplicate artifact path: ${artifact.path}`);
      declaredArtifacts.add(artifact.path);
      const filePath = artifactPath(artifact.path);
      assert.equal(sha256(filePath), artifact.checksum, `Checksum mismatch: ${artifact.path}`);
      assert.equal(fs.readFileSync(filePath, "utf8").includes("\r"), false, `Artifact must use LF: ${artifact.path}`);
    }

    fixture.capabilities.forEach((capability) => coveredCapabilities.add(capability));
  }

  assert.deepEqual([...coveredCapabilities].sort(), [...manifest.requiredCoverage].sort());
  const filesOnDisk = fs.readdirSync(FIXTURE_ROOT, { withFileTypes: true });
  assert.ok(filesOnDisk.every((entry) => entry.isFile()), "Publication fixture directory must not contain undeclared subdirectories");
  assert.deepEqual(
    filesOnDisk.map((entry) => entry.name).sort(),
    ["manifest.json", ...declaredArtifacts].sort(),
    "Every publication artifact must be declared and checksummed",
  );
});

for (const fixture of manifest.fixtures) {
  test(`Jianpu publication semantics: ${fixture.id}`, () => {
    const source = fs.readFileSync(artifactPath(fixture.source.path), "utf8");
    const expectation = readJson<PublicationExpectation>(artifactPath(fixture.expectation.path));
    const score = parseJianpuToScoreJson({
      text: source,
      importedAt: IMPORTED_AT,
      sourceOriginalName: fixture.source.path,
    });

    assert.equal(score.title, fixture.title);
    assert.deepEqual(normalizeScore(score), expectation.score);
    assert.deepEqual(normalizeDiagnostics(score), expectation.diagnostics);
    fixture.capabilities.forEach((capability) => assertCapability(capability, source, score));
  });
}
