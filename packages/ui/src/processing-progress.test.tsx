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

import { PhotoCornerEditor, photoPerspective, validPhotoCorners } from './photo-corner-editor';
import { RecognitionPurchaseActions, needsBigRecognitionLane } from './recognition-purchase-actions';
import { SUPPORTED_LOCALES, getRecognitionExperienceMessages } from '@score/i18n';

test('large-score purchase offers put Starter first and the $2.99 pass second in every locale', () => {
  assert.equal(needsBigRecognitionLane({ lane: 'normal', enabled: true }, 'complex'), false);
  assert.equal(needsBigRecognitionLane({ lane: 'normal', enabled: true }, 'simple'), false);
  assert.equal(needsBigRecognitionLane({ lane: 'normal', enabled: false }, 'complex'), false);
  assert.equal(needsBigRecognitionLane({ lane: 'unsupported', enabled: true }, 'complex'), false);
  assert.equal(needsBigRecognitionLane({ lane: 'big', enabled: true }, 'simple'), true);
  assert.equal(needsBigRecognitionLane({ lane: 'big', enabled: true }, 'complex'), true);
  for (const locale of SUPPORTED_LOCALES) {
    const html = renderToStaticMarkup(<RecognitionPurchaseActions messages={getRecognitionExperienceMessages(locale)} onStarter={() => undefined} onPass={() => undefined} />);
    const copy = getRecognitionExperienceMessages(locale);
    assert.ok(html.indexOf('data-plan-type="subscription"') < html.indexOf('data-plan-type="one_score"'));
    assert.ok(html.includes(copy.starterCta));
    assert.ok(html.includes(copy.passCta));
    assert.match(copy.passCta, /2[.,]99/);
    assert.match(html, /class="button button-primary" data-plan-type="subscription"/);
    assert.match(html, /class="button button-secondary" data-plan-type="one_score"/);
    assert.match(html, /data-upsell-primary="starter"/);
  }
});

test('photo geometry maps the four corners and rejects inverted or degenerate crops', () => {
  const corners = [{ x: .1, y: .2 }, { x: .9, y: .1 }, { x: .8, y: .9 }, { x: .2, y: .8 }] as Parameters<typeof photoPerspective>[0];
  assert.equal(validPhotoCorners(corners), true);
  const matrix = photoPerspective(corners)!;
  for (const [index, [x, y]] of [[0, 0], [1, 0], [1, 1], [0, 1]].entries()) {
    const z = matrix[6]! * x! + matrix[7]! * y! + matrix[8]!;
    assert.ok(Math.abs((matrix[0]! * x! + matrix[1]! * y! + matrix[2]!) / z - corners[index]!.x) < 1e-8);
    assert.ok(Math.abs((matrix[3]! * x! + matrix[4]! * y! + matrix[5]!) / z - corners[index]!.y) < 1e-8);
  }
  assert.equal(validPhotoCorners([corners[0], corners[3], corners[2], corners[1]]), false);
  assert.equal(validPhotoCorners([corners[0], corners[0], corners[0], corners[0]]), false);
  // This convex 2.25% crop passed the turn-angle check but is below the API/worker area budget.
  assert.equal(validPhotoCorners([{ x: .1, y: .1 }, { x: .25, y: .1 }, { x: .25, y: .25 }, { x: .1, y: .25 }]), false);
  assert.equal(validPhotoCorners([{ x: 0, y: 0 }, { x: .2, y: 0 }, { x: .2, y: .25 }, { x: 0, y: .25 }]), true);
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  const html = renderToStaticMarkup(<PhotoCornerEditor file={file} messages={getRecognitionExperienceMessages("en")} onContinue={() => undefined} />);
  assert.match(html, /data-photo-corner-editor/);
  assert.equal((html.match(/aria-label="Drag the four handles/g) ?? []).length, 4);
});
