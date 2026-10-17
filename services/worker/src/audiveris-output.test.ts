import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import AdmZip from "adm-zip";
import { enumerateAudiverisMusicXmlOutputs, enumerateAudiverisProjectOutputs, findAudiverisMusicXmlOutput, findAudiverisProjectOutput, normalizeMovementTitle, readAudiverisMusicXml, readAudiverisMusicXmlCandidates } from "./audiveris-output.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audiveris-output-"));
after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

test("finds and reads an Audiveris compressed MusicXML output", () => {
  const outputPath = path.join(tempDir, "recognized.mxl");
  const zip = new AdmZip();
  zip.addFile(
    "META-INF/container.xml",
    Buffer.from('<?xml version="1.0"?><container><rootfiles><rootfile full-path="score/recognized.xml"/></rootfiles></container>'),
  );
  zip.addFile("score/recognized.xml", Buffer.from('<?xml version="1.0"?><score-partwise version="4.0"></score-partwise>'));
  zip.writeZip(outputPath);

  assert.equal(findAudiverisMusicXmlOutput(tempDir), outputPath);
  assert.match(readAudiverisMusicXml(outputPath), /<score-partwise/u);
});

test("rejects an MXL archive without a score document", () => {
  const outputPath = path.join(tempDir, "invalid.mxl");
  const zip = new AdmZip();
  zip.addFile("META-INF/container.xml", Buffer.from("<container/>"));
  zip.writeZip(outputPath);
  assert.throws(() => readAudiverisMusicXml(outputPath), /does not contain a score XML file/u);
});

function scoreOutput(directory: string, name: string) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, name);
  if (name.endsWith(".mxl")) {
    const zip = new AdmZip();
    zip.addFile("score.xml", Buffer.from('<score-partwise version="4.0"/>'));
    zip.writeZip(file);
  } else fs.writeFileSync(file, '<score-partwise version="4.0"/>');
  return file;
}

test("retains every separate movement in stable order regardless of modification times", () => {
  const directory = path.join(tempDir, "movements");
  const files = [1, 2, 3].map((number) => scoreOutput(directory, `normalized.mvt${number}.mxl`));
  fs.utimesSync(files[0], 1, 1);
  fs.utimesSync(files[1], 3, 3);
  fs.utimesSync(files[2], 2, 2);
  assert.deepEqual(enumerateAudiverisMusicXmlOutputs(directory), files);
  assert.equal(findAudiverisMusicXmlOutput(directory), files[0]);
  assert.ok(files.every((file) => fs.existsSync(file)));
});

test("reads only the successful rotation and never selects a newer failed attempt", () => {
  const directory = path.join(tempDir, "rotations");
  const stale = scoreOutput(path.join(directory, "rotation-0"), "failed.mxl");
  const successful = scoreOutput(path.join(directory, "rotation-180"), "recognized.mxl");
  fs.utimesSync(stale, 3, 3);
  fs.utimesSync(successful, 1, 1);
  const staleProject = path.join(directory, "rotation-0", "failed.omr");
  const successfulProject = path.join(directory, "rotation-180", "recognized.omr");
  fs.writeFileSync(staleProject, "failed");
  fs.writeFileSync(successfulProject, "successful");
  assert.equal(findAudiverisMusicXmlOutput(directory, { rotationDegrees: 180 }), successful);
  assert.equal(findAudiverisProjectOutput(directory, { rotationDegrees: 180 }), successfulProject);
  assert.throws(() => findAudiverisMusicXmlOutput(directory), { code: "ROTATION_NOT_SELECTED" });
  assert.throws(() => findAudiverisProjectOutput(directory), { code: "ROTATION_NOT_SELECTED" });
  assert.throws(() => findAudiverisMusicXmlOutput(directory, { rotationDegrees: 90 }), { code: "ROTATION_OUTPUT_MISSING" });
});

test("a successful rotation without an export does not fall back to another attempt", () => {
  const directory = path.join(tempDir, "empty-successful-rotation");
  scoreOutput(path.join(directory, "rotation-0"), "partial.mxl");
  fs.mkdirSync(path.join(directory, "rotation-90"));
  assert.equal(findAudiverisMusicXmlOutput(directory, { rotationDegrees: 90 }), undefined);
});

test("ignores ordinary XML metadata while retaining legacy single-score lookup", () => {
  const directory = path.join(tempDir, "single-score");
  const successful = scoreOutput(directory, "recognized.musicxml");
  fs.writeFileSync(path.join(directory, "book.xml"), "<book/>");
  fs.writeFileSync(path.join(directory, "sheet.xml"), "<sheet/>");
  assert.equal(findAudiverisMusicXmlOutput(directory), successful);
  assert.equal(findAudiverisMusicXmlOutput(directory, { rotationDegrees: 0 }), successful);
});

test("retains multiple score roots and safely expands local opus documents", () => {
  const multiple = path.join(tempDir, "multiple-roots.mxl");
  const zip = new AdmZip();
  zip.addFile("META-INF/container.xml", Buffer.from('<container><rootfiles><rootfile full-path="first.xml"/><rootfile full-path="second.xml"/></rootfiles></container>'));
  zip.addFile("first.xml", Buffer.from("<score-partwise/>"));
  zip.addFile("second.xml", Buffer.from("<score-partwise/>"));
  zip.writeZip(multiple);
  assert.deepEqual(readAudiverisMusicXmlCandidates(multiple).map(candidate => candidate.rootPath), ["first.xml", "second.xml"]);

  const opus = path.join(tempDir, "opus.mxl");
  const opusZip = new AdmZip();
  opusZip.addFile("opus.xml", Buffer.from('<opus><score href="first.xml"/><score href="second.xml"/></opus>'));
  opusZip.addFile("first.xml", Buffer.from("<score-partwise/>"));
  opusZip.addFile("second.xml", Buffer.from("<score-partwise/>"));
  opusZip.writeZip(opus);
  assert.deepEqual(readAudiverisMusicXmlCandidates(opus).map(candidate => candidate.rootPath), ["first.xml", "second.xml"]);
});

test("enumerates all OMR projects without failing usable musical output", () => {
  const directory = path.join(tempDir, "multiple-projects");
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "first.omr"), "first");
  fs.writeFileSync(path.join(directory, "second.omr"), "second");
  assert.deepEqual(enumerateAudiverisProjectOutputs(directory), ["first.omr", "second.omr"].map(name => path.join(directory, name)));
  assert.equal(findAudiverisProjectOutput(directory), path.join(directory, "first.omr"));
});

test("title formatting is normalized while work and movement numbers stay meaningful", () => {
  for (const title of ["MoonLight", "Moon Light", "moon-light!", "ＭＯＯＮ　ＬＩＧＨＴ", "Moon Light - 1", "Moon Light－２", "Moon Light (1)"]) {
    assert.equal(normalizeMovementTitle(title), "moonlight");
  }
  assert.notEqual(normalizeMovementTitle("Sonata No. 1"), normalizeMovementTitle("Sonata No. 2"));
  assert.notEqual(normalizeMovementTitle("I. Allegro"), normalizeMovementTitle("II. Adagio"));
});

test("a malformed score root does not erase a usable sibling", () => {
  const outputPath = path.join(tempDir, "mixed-roots.mxl");
  const zip = new AdmZip();
  zip.addFile("broken.xml", Buffer.from("<score-partwise><part>"));
  zip.addFile("good.xml", Buffer.from("<score-partwise/>"));
  zip.writeZip(outputPath);
  assert.deepEqual(readAudiverisMusicXmlCandidates(outputPath).map(candidate => candidate.rootPath), ["good.xml"]);
});

test("opus references cannot escape to external URLs or parent paths", () => {
  for (const reference of ["https://example.com/score.xml", "../../score.xml"]) {
    const outputPath = path.join(tempDir, "unsafe-opus.mxl");
    const zip = new AdmZip();
    zip.addFile("opus.xml", Buffer.from(`<opus><score href="${reference}"/></opus>`));
    zip.addFile("score.xml", Buffer.from("<score-partwise/>"));
    zip.writeZip(outputPath);
    assert.throws(() => readAudiverisMusicXmlCandidates(outputPath), /External|Unsafe/u);
  }
});

test("cyclic opus references are rejected without following an unbounded chain", () => {
  const outputPath = path.join(tempDir, "cyclic-opus.mxl");
  const zip = new AdmZip();
  zip.addFile("a.xml", Buffer.from('<opus><opus-link href="b.xml"/></opus>'));
  zip.addFile("b.xml", Buffer.from('<opus><opus-link href="a.xml"/></opus>'));
  zip.addFile("score.xml", Buffer.from("<score-partwise/>"));
  zip.writeZip(outputPath);
  assert.throws(() => readAudiverisMusicXmlCandidates(outputPath), /cycle/u);
});

test("timewise output becomes an editable partwise alternative without losing lyrics or measure attributes", () => {
  const file = path.join(tempDir, "timewise.musicxml");
  fs.writeFileSync(file, '<score-timewise version="4.0"><movement-title>Timewise piece</movement-title><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><measure number="8" implicit="yes"><part id="P1"><note><rest/><duration>4</duration><lyric><text>hello</text></lyric></note></part></measure></score-timewise>');
  const xml = readAudiverisMusicXmlCandidates(file)[0].musicXml;
  assert.match(xml, /<score-partwise/u);
  assert.match(xml, /<part id="P1"><measure number="8" implicit="yes">/u);
  assert.match(xml, /<lyric><text>hello<\/text><\/lyric>/u);
  assert.match(fs.readFileSync(file, "utf8"), /<score-timewise/u, "The original remains unchanged");
});
