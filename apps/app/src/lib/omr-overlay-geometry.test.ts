import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreRecognitionPage } from "@score/shared";
import { hasMatchingOmrImageDimensions, projectOmrBbox, projectOmrBboxToCssPixels } from "./omr-overlay-geometry.js";

const page: ScoreRecognitionPage = { page: 1, width: 1000, height: 1400, imageWidth: 1000, imageHeight: 1400 };
const bbox = { x: 250, y: 280, width: 100, height: 140 };

test("projects Audiveris coordinates independently of output DPI", () => {
  assert.deepEqual(projectOmrBbox(page, bbox), {
    leftPercent: 25,
    topPercent: 20,
    widthPercent: 10,
    heightPercent: 10,
    clipped: false,
  });
  assert.deepEqual(projectOmrBboxToCssPixels(page, bbox, 500, 700), {
    x: 125,
    y: 140,
    width: 50,
    height: 70,
    clipped: false,
  });
  assert.deepEqual(projectOmrBboxToCssPixels(page, bbox, 1200, 1680), {
    x: 300,
    y: 336,
    width: 120,
    height: 168,
    clipped: false,
  });
});

test("applies crop and all lossless page rotations", () => {
  const cropped = { page: 1, width: 1000, height: 1400, imageTransform: { crop: { x: 100, y: 200, width: 600, height: 800 } } } satisfies ScoreRecognitionPage;
  assert.deepEqual(projectOmrBbox(cropped, { x: 220, y: 360, width: 60, height: 80 }), {
    leftPercent: 20,
    topPercent: 20,
    widthPercent: 10,
    heightPercent: 10,
    clipped: false,
  });

  const expected = new Map([
    [0, { leftPercent: 20, topPercent: 20, widthPercent: 10, heightPercent: 10 }],
    [90, { leftPercent: 70, topPercent: 20, widthPercent: 10, heightPercent: 10 }],
    [180, { leftPercent: 70, topPercent: 70, widthPercent: 10, heightPercent: 10 }],
    [270, { leftPercent: 20, topPercent: 70, widthPercent: 10, heightPercent: 10 }],
  ]);
  for (const rotation of [0, 90, 180, 270] as const) {
    const result = projectOmrBbox({ ...cropped, imageTransform: { ...cropped.imageTransform, rotation } }, { x: 220, y: 360, width: 60, height: 80 });
    assert.deepEqual(result, { ...expected.get(rotation), clipped: false });
  }
});

test("clips partial boxes and rejects boxes outside the rendered crop", () => {
  const cropped = { page: 1, width: 1000, height: 1400, imageTransform: { crop: { x: 100, y: 200, width: 600, height: 800 } } } satisfies ScoreRecognitionPage;
  assert.deepEqual(projectOmrBbox(cropped, { x: 80, y: 180, width: 60, height: 80 }), {
    leftPercent: 0,
    topPercent: 0,
    widthPercent: 40 / 6,
    heightPercent: 7.5,
    clipped: true,
  });
  assert.equal(projectOmrBbox(cropped, { x: 0, y: 0, width: 20, height: 20 }), null);
});

test("validates the persisted Audiveris page image dimensions", () => {
  assert.equal(hasMatchingOmrImageDimensions(page, 1000, 1400), true);
  assert.equal(hasMatchingOmrImageDimensions(page, 999, 1400), false);
  assert.equal(hasMatchingOmrImageDimensions({ page: 1, width: 1000, height: 1400 }, 500, 700), true);
});
