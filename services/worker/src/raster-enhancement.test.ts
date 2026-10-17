import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import AdmZip from "adm-zip";
import { claimRasterCall, createRasterEnhancementBudget, inspectRasterQuality, prepareRasterEnhancement, rasterVariantIds, selectRasterVariant,
  type RasterEnhancementOptions, type RasterEnhancementRun, type RasterQuality, type RasterVariant } from "./raster-enhancement.js";

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "raster-enhancement-"));
after(() => fs.rmSync(temporary, { recursive: true, force: true }));
const options: RasterEnhancementOptions = { enabled: true, lane: "big", pythonCommand: "python", pythonScriptPath: "raster_enhancement.py" };
const quality: RasterQuality = { valid: true, musicXmlCount: 1, noteCount: 20, measureCount: 4,
  physicalStaffCount: 10, expectedStaffCount: 10, coverage: 1, invalidDurationRatio: 0,
  hasTimeSignature: true, abnormalMeasureRatio: .1, confidence: .8, lowConfidenceRatio: .1 };

function candidate(id: string, values: Partial<RasterQuality>): RasterEnhancementRun {
  return { id, outputDir: id, status: "succeeded", variant: {} as RasterVariant, quality: { ...quality, ...values } };
}

test("both memory lanes retain at most three bounded quality configurations", () => {
  assert.deepEqual(rasterVariantIds({ ...options, lane: "normal" }), ["gray", "detail", "shadow-detail"]);
  assert.deepEqual(rasterVariantIds(options), ["gray", "detail", "shadow-detail"]);
});

test("normal-lane PDF budget limits comparisons to two pages and P+4 calls", () => {
  const budget = createRasterEnhancementBudget(8);
  for (let page = 1; page <= 8; page++) {
    const ids = rasterVariantIds({ ...options, lane: "normal", budget, pageNumber: page });
    ids.forEach((_, index) => assert.equal(claimRasterCall(budget, page, index > 0), true));
  }
  assert.equal(budget.calls, 12);
  assert.equal(budget.extraCalls, 4);
  assert.deepEqual(budget.sampledPages, [1, 2]);
  assert.equal(claimRasterCall(budget, 8, true), false);
});

test("normal to big reprocessing uses overhead without stealing later primary pages", () => {
  const budget = createRasterEnhancementBudget(3);
  assert.equal(claimRasterCall(budget, 1, false), true); // original normal page
  assert.equal(claimRasterCall(budget, 1, false), true); // same page on big lane
  assert.equal(claimRasterCall(budget, 1, true), true);
  assert.equal(claimRasterCall(budget, 1, true), true);
  assert.equal(claimRasterCall(budget, 2, false), true);
  assert.equal(claimRasterCall(budget, 2, true), true);
  assert.equal(claimRasterCall(budget, 2, true), false);
  assert.equal(claimRasterCall(budget, 3, false), true);
  assert.equal(budget.calls, budget.maxCalls);
  assert.deepEqual(budget.primaryPages, [1, 2, 3]);
});

test("quality selection prefers covered music and known rhythm over extra notes", () => {
  const runs = [candidate("more-notes", { noteCount: 900, coverage: .7, confidence: .99 }), candidate("covered", {})];
  assert.equal(selectRasterVariant(runs)?.id, "covered");
  assert.equal(selectRasterVariant([candidate("no-time", { noteCount: 900, hasTimeSignature: false }), candidate("time", {})])?.id, "time");
  assert.equal(selectRasterVariant([candidate("invalid", { valid: false, noteCount: 9999 })]), undefined);
});

test("artifact inspection retains all XML documents and checks duration and OMR coverage", () => {
  const directory = path.join(temporary, "quality"); fs.mkdirSync(directory);
  const xml = '<score-partwise><part id="P1"><measure><attributes><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note></measure></part></score-partwise>';
  fs.writeFileSync(path.join(directory, "piece1.musicxml"), xml);
  fs.writeFileSync(path.join(directory, "piece2.musicxml"), xml.replace("<duration>1</duration>", "<duration>0</duration>"));
  const zip = new AdmZip();
  zip.addFile("sheet#1/sheet#1.xml", Buffer.from('<sheet><page><system><part><staff id="1"/><staff id="2"/><measure id="1" abnormal="true"/></part><stack id="1"/><stack id="2"/><sig><inters><head grade="0.9"/><head grade="0.4"/><staff-barline id="3"/></inters></sig></system></page></sheet>'));
  zip.writeZip(path.join(directory, "book.omr"));
  const result = inspectRasterQuality(directory, 4);
  assert.equal(result.valid, true);
  assert.equal(result.musicXmlCount, 2);
  assert.equal(result.noteCount, 2);
  assert.equal(result.coverage, .5);
  assert.equal(result.invalidDurationRatio, .5);
  assert.equal(result.abnormalMeasureRatio, .5);
  assert.equal(result.hasTimeSignature, true);
  assert.equal(result.lowConfidenceRatio, .5);
});

test("preparation rejects output escaping the private job directory", async () => {
  const directory = path.join(temporary, "escape"); fs.mkdirSync(directory);
  const script = path.join(temporary, "prepare.cjs");
  const imagePath = path.join(temporary, "outside.png"); fs.writeFileSync(imagePath, "fixture");
  fs.writeFileSync(script, `const fs=require('node:fs'); fs.writeFileSync(process.argv.at(-1), JSON.stringify({schemaVersion:1, variants:[{id:'gray',imagePath:${JSON.stringify(imagePath)},width:10,height:10}]}));`);
  await assert.rejects(prepareRasterEnhancement({ inputPath: imagePath, outputDir: directory, timeoutMs: 2_000,
    options: { ...options, pythonCommand: process.execPath, pythonScriptPath: script } }), /safety budget/);
});
