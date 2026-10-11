import assert from "node:assert/strict";
import test from "node:test";
import { pendingOmrReviews, type ReviewableScore } from "./pending-omr-reviews";

const scan = (id: string, overrides: Partial<ReviewableScore> = {}): ReviewableScore => ({
  id, userId: "user-1", title: id, status: "needs_review", updatedAt: "2026-10-11T01:00:00Z",
  pendingRevision: { id: `revision-${id}`, createdFrom: "omr_import" }, ...overrides,
});

test("scan reminders handle zero, one and multiple pending scans in newest-first order", () => {
  assert.deepEqual(pendingOmrReviews([]), []);
  assert.deepEqual(pendingOmrReviews([scan("one")]).map(score => score.id), ["one"]);
  const input = [scan("older"), scan("newer", { status: "candidate", updatedAt: "2026-10-11T02:00:00Z" })];
  assert.deepEqual(pendingOmrReviews(input).map(score => score.id), ["newer", "older"]);
  assert.equal(input[0].id, "older", "the API payload is not reordered in place");
});

test("accepted, rejected, archived, failed and unfinished jobs never produce a scan reminder", () => {
  const closed = ["ready", "archived", "failed", "imported", "rejected"].map(status => scan(status, { status }));
  closed.push(scan("accepted", { pendingRevision: null }), scan("processing", { pendingRevision: null }));
  assert.deepEqual(pendingOmrReviews(closed), []);
});

test("audio, other imports and ambiguous manual edits are not called scans", () => {
  const inputs = ["audio_transcribe", "musicxml_import", "midi_import", "manual_edit"].map(createdFrom =>
    scan(createdFrom, { pendingRevision: { id: createdFrom, createdFrom } }));
  assert.deepEqual(pendingOmrReviews(inputs), []);
});

test("corrected scans from all existing OMR engines remain reviewable while audio is excluded", () => {
  const corrected = scan("corrected", { pendingRevision: { id: "edited", createdFrom: "manual_edit", scoreJson: { recognitionLayer: { engine: "audiveris" } } } });
  const audio = scan("audio", { pendingRevision: { id: "audio", createdFrom: "manual_edit", scoreJson: { recognitionLayer: { engine: "audiveris" }, metadata: { audioTranscriptionCleanup: [{}] } } } });
  assert.deepEqual(pendingOmrReviews([corrected, audio]).map(score => score.id), ["corrected"]);
  for (const engine of ["audiveris", "homr", "hybrid"]) {
    const score = scan(engine, { pendingRevision: { id: engine, createdFrom: "manual_edit", scoreJson: { recognitionLayer: { engine } } } });
    assert.equal(pendingOmrReviews([score]).length, 1, engine);
  }
});
