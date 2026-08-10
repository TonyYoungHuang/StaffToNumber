import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import AdmZip from "adm-zip";
import type { ScoreJson } from "@score/shared";
import { applyAudiverisOmrDiagnostics } from "./audiveris-omr-diagnostics.js";

test("extracts Audiveris page dimensions, symbol confidence, bbox, and event mapping", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audiveris-diagnostics-"));
  const omrPath = path.join(tempDir, "fixture.omr");
  const zip = new AdmZip();
  zip.addFile("book.xml", Buffer.from('<book software-version="5.10.2"/>'));
  const binaryPage = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(binaryPage, 0);
  binaryPage.write("IHDR", 12, "ascii");
  binaryPage.writeUInt32BE(2000, 16);
  binaryPage.writeUInt32BE(2800, 20);
  zip.addFile("sheet#3/BINARY.png", binaryPage);
  zip.addFile(
    "sheet#3/sheet#3.xml",
    Buffer.from(`
      <sheet>
        <picture width="1000" height="1400"/>
        <page id="1">
          <system id="1">
            <stack id="1" left="100" right="900"/>
            <part id="1"><staff id="1"/></part>
            <sig>
              <inters>
                <head shape="NOTEHEAD_BLACK" grade="0.71" ctx-grade="0.82" staff="1" id="42">
                  <bounds x="250" y="300" w="24" h="20"/>
                </head>
              </inters>
            </sig>
          </system>
        </page>
      </sheet>
    `),
  );
  zip.writeZip(omrPath);

  const score = {
    version: "1.0",
    title: "Fixture",
    metadata: {
      parser: "test",
      sourceFormat: "musicxml",
      importedAt: new Date(0).toISOString(),
      partCount: 1,
      measureCount: 1,
      noteCount: 1,
      restCount: 0,
      warnings: [],
    },
    parts: [{ id: "p1", name: "Piano", measureCount: 1 }],
    measures: [
      {
        id: "m1",
        partId: "p1",
        number: "1",
        sequence: 1,
        events: [
          {
            id: "n1",
            type: "note",
            pitch: { step: "C", alter: 0, octave: 4 },
            duration: 1,
            dots: 0,
            chord: false,
            ties: [],
            lyrics: [],
          },
        ],
      },
    ],
    navigationMarks: [],
  } as unknown as ScoreJson;

  try {
    const result = applyAudiverisOmrDiagnostics(score, omrPath);
    assert.deepEqual(result.recognitionLayer?.pages, [
      {
        page: 3,
        width: 1000,
        height: 1400,
        imageWidth: 2000,
        imageHeight: 2800,
        imageTransform: { crop: { x: 0, y: 0, width: 1000, height: 1400 }, rotation: 0 },
      },
    ]);
    assert.equal(result.recognitionLayer?.engineVersion, "5.10.2");
    assert.equal(result.recognitionLayer?.symbols.length, 1);
    assert.deepEqual(result.recognitionLayer?.symbols[0].bbox, { x: 250, y: 300, width: 24, height: 20 });
    assert.equal(result.recognitionLayer?.symbols[0].confidence, 0.82);
    assert.equal(result.recognitionLayer?.symbols[0].eventId, "n1");
    assert.equal(result.measures[0].events[0].recognition?.source, "omr-engine");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
