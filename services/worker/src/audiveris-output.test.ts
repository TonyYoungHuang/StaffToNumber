import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import AdmZip from "adm-zip";
import { findAudiverisMusicXmlOutput, readAudiverisMusicXml } from "./audiveris-output.js";

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
