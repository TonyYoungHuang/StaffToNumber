import assert from "node:assert/strict";
import test from "node:test";
import { projectSynchronizedScroll, type ScrollViewportMetrics } from "./score-review-viewport.js";

test("maps independent source and score scroll ranges by progress", () => {
  const source = metrics({ scrollLeft: 250, scrollTop: 600, scrollWidth: 1500, scrollHeight: 2000 });
  const target = metrics({ scrollWidth: 2000, scrollHeight: 1400 });
  assert.deepEqual(projectSynchronizedScroll(source, target), { left: 375, top: 375 });
});

test("clamps overscroll and handles a non-scrollable axis", () => {
  const target = metrics({ scrollWidth: 2000, scrollHeight: 800 });
  assert.deepEqual(
    projectSynchronizedScroll(metrics({ scrollLeft: 5000, scrollTop: -50, scrollWidth: 1500, scrollHeight: 800 }), target),
    { left: 1500, top: 0 },
  );
});

test("rejects invalid positions instead of propagating NaN", () => {
  assert.deepEqual(
    projectSynchronizedScroll(metrics({ scrollLeft: Number.NaN, scrollTop: Number.POSITIVE_INFINITY }), metrics({ scrollWidth: 2000, scrollHeight: 1600 })),
    { left: 0, top: 0 },
  );
});

function metrics(overrides: Partial<ScrollViewportMetrics> = {}): ScrollViewportMetrics {
  return {
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 1000,
    scrollHeight: 800,
    clientWidth: 500,
    clientHeight: 400,
    ...overrides,
  };
}
