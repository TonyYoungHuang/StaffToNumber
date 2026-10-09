import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import AdmZip from "adm-zip";
import { AudiverisOutputSelectionError, findAudiverisMusicXmlOutput, findAudiverisProjectOutput, readAudiverisMusicXml } from "./audiveris-output.js";

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

test("rejects separate movement exports regardless of file modification times", () => {
  const directory = path.join(tempDir, "movements");
  const files = [1, 2, 3].map((number) => scoreOutput(directory, `normalized.mvt${number}.mxl`));
  fs.utimesSync(files[0], 1, 1);
  fs.utimesSync(files[1], 3, 3);
  fs.utimesSync(files[2], 2, 2);
  assert.throws(() => findAudiverisMusicXmlOutput(directory), (error: unknown) => {
    assert.ok(error instanceof AudiverisOutputSelectionError);
    assert.equal(error.code, "MULTIPLE_MOVEMENTS");
    assert.deepEqual(error.candidatePaths, files);
    return true;
  });
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

test("rejects multiple score roots and opus documents inside compressed MusicXML", () => {
  const multiple = path.join(tempDir, "multiple-roots.mxl");
  const zip = new AdmZip();
  zip.addFile("META-INF/container.xml", Buffer.from('<container><rootfiles><rootfile full-path="first.xml"/><rootfile full-path="second.xml"/></rootfiles></container>'));
  zip.addFile("first.xml", Buffer.from("<score-partwise/>"));
  zip.addFile("second.xml", Buffer.from("<score-partwise/>"));
  zip.writeZip(multiple);
  assert.throws(() => readAudiverisMusicXml(multiple), { code: "MULTIPLE_MOVEMENTS" });

  const opus = path.join(tempDir, "opus.mxl");
  const opusZip = new AdmZip();
  opusZip.addFile("opus.xml", Buffer.from('<opus><score href="first.xml"/><score href="second.xml"/></opus>'));
  opusZip.addFile("first.xml", Buffer.from("<score-partwise/>"));
  opusZip.addFile("second.xml", Buffer.from("<score-partwise/>"));
  opusZip.writeZip(opus);
  assert.throws(() => readAudiverisMusicXml(opus), { code: "MULTIPLE_MOVEMENTS" });
});

test("does not pick one project when an attempt contains multiple OMR bundles", () => {
  const directory = path.join(tempDir, "multiple-projects");
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "first.omr"), "first");
  fs.writeFileSync(path.join(directory, "second.omr"), "second");
  assert.throws(() => findAudiverisProjectOutput(directory), { code: "MULTIPLE_PROJECTS" });
});
