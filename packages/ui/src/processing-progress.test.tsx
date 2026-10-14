import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { advanceProgress, estimatedProgress, idleProgress, PROGRESS_COMPLETION_MS } from "./progress-state.ts";
import { PercentProgressBar } from "./processing-progress.tsx";

test("estimates progress smoothly but cannot reach completion while waiting", () => {
  const samples = [0, 1_000, 10_000, 60_000, 600_000].map(estimatedProgress);
  assert.equal(samples[0], 1);
  assert.ok(samples.every(value => value >= 1 && value <= 94));
  assert.ok(samples.every((value, index) => index === 0 || value >= samples[index - 1]));
});

test("success displays 100 percent briefly then automatically disappears", () => {
  const input = { active: true, label: "Exporting…", operationKey: "first" };
  const started = advanceProgress(idleProgress(), input, 1_000);
  const waiting = advanceProgress(started, input, 11_000);
  assert.ok(waiting.progressPercent > started.progressPercent);
  const done = advanceProgress(waiting, { ...input, active: false, label: "Export" }, 12_000);
  assert.equal(done.progressPercent, 100);
  assert.equal(done.label, input.label);
  assert.equal(done.phase, "complete");
  assert.equal(advanceProgress(done, { ...input, active: false }, 12_000 + PROGRESS_COMPLETION_MS - 1).phase, "complete");
  assert.equal(advanceProgress(done, { ...input, active: false }, 12_000 + PROGRESS_COMPLETION_MS).phase, "idle");
});

test("failure cancels completion and retry begins a new estimate", () => {
  const input = { active: true, label: "Checking…", operationKey: 1 };
  const waiting = advanceProgress(advanceProgress(idleProgress(), input, 1), input, 90_000);
  const failed = advanceProgress(waiting, { ...input, active: false, error: true }, 90_001);
  assert.equal(failed.phase, "idle");
  assert.equal(advanceProgress(failed, { ...input, active: false }, 90_002).phase, "idle");
  const retry = advanceProgress(waiting, { ...input, operationKey: 2 }, 90_002);
  assert.equal(retry.progressPercent, 1);
});

test("actual byte and job percentages are retained, clamped and accessible", () => {
  for (const value of [0, 37, 100]) {
    const state = advanceProgress(idleProgress(), { active: true, label: "Uploading…", progressPercent: value }, 0);
    assert.equal(state.progressPercent, value);
    const markup = renderToStaticMarkup(<PercentProgressBar label="Uploading…" progressPercent={value} locale="en" />);
    assert.match(markup, /role="progressbar"/);
    assert.match(markup, /aria-label="Uploading…"/);
    assert.ok(markup.includes(`aria-valuenow="${value}"`));
    assert.ok(markup.includes(`aria-valuetext="${value}%"`));
    assert.match(markup, /aria-valuemin="0" aria-valuemax="100"/);
  }
  assert.equal(advanceProgress(idleProgress(), { active: true, label: "Working", progressPercent: -1 }, 0).progressPercent, 0);
  assert.equal(advanceProgress(idleProgress(), { active: true, label: "Working", progressPercent: 101 }, 0).progressPercent, 100);
  assert.equal(advanceProgress(idleProgress(), { active: true, label: "Working", progressPercent: NaN }, 0).progressPercent, 1);
});
