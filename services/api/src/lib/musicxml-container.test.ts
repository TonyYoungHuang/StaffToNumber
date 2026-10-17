import assert from "node:assert/strict";
import test from "node:test";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import { extractMusicXmlCandidatesFromCompressedMxl, normalizeMusicXmlScore } from "./musicxml-container.js";

test("MXL imports every unique score root and isolates malformed alternatives", () => {
  const zip = new AdmZip();
  zip.addFile("META-INF/container.xml", Buffer.from('<container><rootfiles><rootfile full-path="a.xml"/><rootfile full-path="b.xml"/><rootfile full-path="a.xml"/></rootfiles></container>'));
  zip.addFile("a.xml", Buffer.from('<score-partwise><movement-title>First piece</movement-title></score-partwise>'));
  zip.addFile("b.xml", Buffer.from('<score-partwise><movement-title>Second piece</movement-title></score-partwise>'));
  zip.addFile("bad.xml", Buffer.from('<score-partwise><part>'));
  const result = extractMusicXmlCandidatesFromCompressedMxl(zip.toBuffer());
  assert.deepEqual(result.candidates.map(candidate => candidate.rootPath), ["a.xml", "b.xml"]);
  assert.deepEqual(result.rejected.map(candidate => candidate.rootPath), ["bad.xml"]);
});

test("timewise conversion preserves part identity, lyrics, rests and original measure attributes", () => {
  const xml = '<score-timewise version="4.0"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><measure number="8" implicit="yes"><part id="P1"><attributes><divisions>1</divisions></attributes><note><rest/><duration>4</duration><lyric><text>hello</text></lyric></note></part></measure></score-timewise>';
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(normalizeMusicXmlScore(xml));
  assert.equal(parsed["score-partwise"].part["@_id"], "P1");
  assert.equal(parsed["score-partwise"].part.measure["@_number"], "8");
  assert.equal(parsed["score-partwise"].part.measure.note.lyric.text, "hello");
  assert.equal(parsed["score-partwise"]["@_version"], "4.0");
});

test("bad opus cycles and external references cannot hide safe sibling scores", () => {
  const zip = new AdmZip();
  zip.addFile("a.xml", Buffer.from('<opus><opus-link href="b.xml"/></opus>'));
  zip.addFile("b.xml", Buffer.from('<opus><opus-link href="a.xml"/></opus>'));
  zip.addFile("outside.xml", Buffer.from('<opus><score href="https://example.com/private.xml"/></opus>'));
  zip.addFile("good.xml", Buffer.from('<score-partwise/>'));
  const result = extractMusicXmlCandidatesFromCompressedMxl(zip.toBuffer());
  assert.deepEqual(result.candidates.map(candidate => candidate.rootPath), ["good.xml"]);
  assert.ok(result.rejected.some(item => /Cyclic/u.test(item.message)));
  assert.ok(result.rejected.some(item => /External/u.test(item.message)));
});
