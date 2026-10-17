import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { estimateRecognitionMemoryMb, planPdfRasterBudget, recognitionMemoryLane, type ScoreStructurePreflight } from "@score/shared";
import { assessRecognitionSource, estimateRecognitionMemory, parsePhotoCorners, revalidateRecognitionAssessment } from "./recognition-memory-estimate.js";
import { recognitionImageMetadata } from "./recognition-image-metadata.js";

const config = { enabled: true, normalMb: 1536, bigMb: 2048, capacityVersion: "test-cx33-raster-v2" };
const uncertain: ScoreStructurePreflight = {
  schemaVersion: 1, recommendation: "uncertain", confidence: "low", sourcePageCount: 1,
  pagesAnalyzed: 1, complete: false, reasonCodes: ["INCOMPLETE_ANALYSIS"],
  pages: [{ page: 1, staffCount: 0, systemCount: 0, maxStavesPerSystem: 0, hasTab: false, uncertain: true }],
};

test("measured eleven/twelve-page PDF and original/rectified/enhanced phone metadata select their memory lanes", () => {
  // Metadata only: no customer originals are stored in the repository.
  const samples = [
    { name: "13462035 eleven-page Letter PDF", sizeBytes: 5_891_455, pageCount: 11, maxPagePixels: 2550 * 3300, lane: "big", mb: 1792 },
    { name: "c435ba2f twelve-page A4 PDF", sizeBytes: 536_443, pageCount: 12, maxPagePixels: 2480 * 3509, lane: "big", mb: 1792 },
    { name: "40e5a46b original phone photo", sizeBytes: 2_166_908, pageCount: 1, maxPagePixels: 3840 * 2160, lane: "normal", mb: 1536 },
    { name: "40e5a46b rectified photo", sizeBytes: 2_166_908, pageCount: 1, maxPagePixels: 2168 * 2561, lane: "normal", mb: 1536 },
    { name: "40e5a46b enhanced photo", sizeBytes: 2_166_908, pageCount: 1, maxPagePixels: 2399 * 2834, lane: "normal", mb: 1536 },
  ];
  for (const sample of samples) {
    const assessment = estimateRecognitionMemory({ ...sample, preflight: uncertain }, config);
    assert.equal(assessment.lane, sample.lane, sample.name);
    assert.equal(assessment.estimatedMemoryMb, sample.mb, sample.name);
  }
});

test("normal/big/unsupported boundaries include exact 1536 and 2048 MiB with safety headroom", () => {
  const normalEdge = { sizeBytes: 0, pageCount: 3, maxPagePixels: 12_000_000 };
  assert.equal(estimateRecognitionMemoryMb(normalEdge), 1536);
  assert.equal(estimateRecognitionMemory(normalEdge, config).lane, "normal");
  assert.equal(estimateRecognitionMemory({ ...normalEdge, maxPagePixels: 12_000_001 }, config).lane, "big");
  const bigEdge = { ...normalEdge, pageCount: 19 };
  assert.equal(estimateRecognitionMemoryMb(bigEdge), 2048);
  assert.equal(estimateRecognitionMemory(bigEdge, config).lane, "big");
  assert.equal(estimateRecognitionMemory({ ...bigEdge, sizeBytes: 1 }, config).lane, "unsupported");
  assert.equal(recognitionMemoryLane(Number.NaN), "unsupported");
  assert.equal(recognitionMemoryLane(0), "unsupported");
});

test("twenty and twenty-four normal-paper pages fit the big budget; a larger book is refused", () => {
  for (const [pageCount, expected] of [[20, "big"], [24, "big"], [25, "unsupported"]] as const) {
    const plan = planPdfRasterBudget(Array.from({ length: pageCount }, () => ({ widthPoints: 612, heightPoints: 792 })),
      { dpi: 300, maxPagePixels: 12_000_000, maxTotalPixels: 120_000_000 });
    assert.equal(plan.ok, true);
    const result = estimateRecognitionMemory({ sizeBytes: 1000, pageCount, maxPagePixels: Math.max(...plan.pages.map(page => page.pixelCount)) }, config);
    assert.equal(result.lane, expected, `${pageCount} pages`);
    assert.equal(result.estimatedMemoryMb, expected === "big" ? 2048 : 2304);
  }
});

test("confidence, layout, recognition mode and manual enhancement cannot change admission", () => {
  const source = { sizeBytes: 2_166_908, pageCount: 1, maxPagePixels: 3840 * 2160 };
  const ordinary = estimateRecognitionMemory(source, config);
  assert.equal(ordinary.lane, "normal");
  const certain = { ...uncertain, complete: true, confidence: "high" as const,
    pages: [{ ...uncertain.pages[0]!, staffCount: 100, uncertain: false }] };
  for (const preflight of [undefined, uncertain, certain]) for (const mode of ["simple", "complex"] as const) {
    assert.deepEqual(estimateRecognitionMemory({ ...source, preflight, mode, heavyEnhancement: true }, config), ordinary);
  }
});

test("current API admission revalidates the same numeric ceilings used by workers", () => {
  const previous = process.env.RECOGNITION_LANES_ENABLED;
  process.env.RECOGNITION_LANES_ENABLED = "true";
  try {
    const accepted = estimateRecognitionMemory({ sizeBytes: 1000, pageCount: 11, maxPagePixels: 2550 * 3300 }, config);
    assert.doesNotThrow(() => revalidateRecognitionAssessment(accepted));
    assert.throws(() => revalidateRecognitionAssessment({ ...accepted, lane: "normal" }), /No credits/);
    const rejected = estimateRecognitionMemory({ sizeBytes: 1000, pageCount: 1000, maxPagePixels: 12_000_000 }, config);
    assert.equal(rejected.lane, "unsupported");
    assert.throws(() => revalidateRecognitionAssessment(rejected), /No credits/);
    assert.equal(estimateRecognitionMemory({ sizeBytes: 1000, pageCount: 1000, maxPagePixels: 12_000_000 }, { ...config, enabled: false }).lane, "unsupported");
    assert.equal(estimateRecognitionMemory({ sizeBytes: 1000, pageCount: 11, maxPagePixels: 2550 * 3300 }, { ...config, enabled: false }).lane, "normal");
  } finally {
    if (previous === undefined) delete process.env.RECOGNITION_LANES_ENABLED; else process.env.RECOGNITION_LANES_ENABLED = previous;
  }
});

test("small synthetic PDF fixture is normal without structural inspection", async () => {
  const sourcePath = fileURLToPath(new URL("../../../../tests/fixtures/recognition/two-page-score.pdf", import.meta.url));
  const sizeBytes = (await fs.stat(sourcePath)).size;
  const ordinary = await assessRecognitionSource({ sourcePath, detectedKind: "pdf", sizeBytes });
  assert.equal(ordinary.sourcePageCount, 2); assert.equal(ordinary.lane, "normal");
  assert.equal(ordinary.estimatedMemoryMb, 1536);
});

test("direct and checked JPEG admission use original header dimensions, not a thumbnail or fallback", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "recognition-metadata-"));
  const sourcePath = path.join(directory, "photo.jpg");
  // Header-only synthetic metadata fixture; no decoder is launched here.
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 8, 8, 0x08, 0x70, 0x0f, 0, 1]);
  await fs.writeFile(sourcePath, jpeg);
  try {
    const input = { sourcePath, detectedKind: "jpeg", sizeBytes: 2_166_908 };
    const direct = await assessRecognitionSource(input);
    const checked = await assessRecognitionSource({ ...input, preflight: { ...uncertain,
      pages: [{ ...uncertain.pages[0]!, sourceWidth: 900, sourceHeight: 900 }] },
      photoCorners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] });
    assert.equal(direct.maxPagePixels, 12_000_000, "includes the enhancement canvas as well as the smaller original");
    assert.equal(direct.lane, "normal"); assert.deepEqual(checked, direct);
    jpeg.writeUInt16BE(20_000, 9); await fs.writeFile(sourcePath, jpeg);
    const oversized = await assessRecognitionSource(input);
    assert.equal(oversized.lane, "unsupported", "source decoder's 32 MP ceiling also applies at API admission");
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test("bounded PNG/WebP/TIFF headers retain all page dimensions and fail closed on malformed offsets", () => {
  const png = Buffer.alloc(24); png.write("IHDR", 12); png.writeUInt32BE(3840, 16); png.writeUInt32BE(2160, 20);
  assert.deepEqual(recognitionImageMetadata(png, "png"), { pageCount: 1, maxPagePixels: 8_294_400 });
  const webp = Buffer.alloc(30); webp.write("VP8X", 12); webp.writeUInt32LE(10, 16); webp.writeUIntLE(3839, 24, 3); webp.writeUIntLE(2159, 27, 3);
  assert.deepEqual(recognitionImageMetadata(webp, "webp"), { pageCount: 1, maxPagePixels: 8_294_400 });
  const tiff = Buffer.alloc(8 + 2 * 30); tiff.write("II"); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  for (const [offset, width, next] of [[8, 3840, 38], [38, 2000, 0]]) {
    tiff.writeUInt16LE(2, offset!);
    for (const [entry, tag, value] of [[offset! + 2, 256, width!], [offset! + 14, 257, 2160]]) {
      tiff.writeUInt16LE(tag!, entry!); tiff.writeUInt16LE(4, entry! + 2); tiff.writeUInt32LE(1, entry! + 4); tiff.writeUInt32LE(value!, entry! + 8);
    }
    tiff.writeUInt32LE(next!, offset! + 26);
  }
  assert.deepEqual(recognitionImageMetadata(tiff, "tiff"), { pageCount: 2, maxPagePixels: 8_294_400 });
  tiff.writeUInt32LE(8, 64); assert.equal(recognitionImageMetadata(tiff, "tiff"), null);
  assert.equal(recognitionImageMetadata(webp.subarray(0, 25), "webp"), null);
});

test("four photo corners must be normalized, ordered and noncrossing", () => {
  assert.equal(parsePhotoCorners('[{"x":0,"y":0},{"x":1,"y":0},{"x":1,"y":1},{"x":0,"y":1}]')?.length, 4);
  assert.throws(() => parsePhotoCorners([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }]), /without crossing/);
  assert.throws(() => parsePhotoCorners([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }]), /four corners/);
});
