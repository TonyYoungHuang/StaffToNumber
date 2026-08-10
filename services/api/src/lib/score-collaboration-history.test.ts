import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreEvent, ScoreJson } from "@score/shared";
import {
  ScoreHistoryConflictError,
  affectedEventIdsForHistory,
  selectivelyReverseScoreOperation,
  validateScoreCollaborationHistoryRequest,
} from "./score-collaboration-history.js";

function note(id: string, step: "C" | "D" | "E" | "F" | "G" | "A" | "B"): ScoreEvent {
  return { id, type: "note", pitch: { step, alter: 0, octave: 4 }, duration: 1, durationType: "quarter", dots: 0, voice: "1", staff: 1, chord: false, ties: [], lyrics: [] };
}

function score(events: ScoreEvent[]): ScoreJson {
  return {
    schemaVersion: 2,
    title: "History",
    source: { kind: "musicxml", originalName: "history.musicxml" },
    metadata: { importedAt: new Date(0).toISOString(), parser: "musicxml-basic-v1", measureCount: 1, noteCount: events.filter((event) => event.type === "note").length, restCount: events.filter((event) => event.type === "rest").length, warnings: [] },
    parts: [{ id: "P1", name: "Part", staffCount: 1, measureCount: 1 }],
    measures: [{ id: "M1", partId: "P1", number: "1", sequence: 1, events }],
  };
}

test("validates history requests and rejects unsafe or self-referencing ids", () => {
  assert.deepEqual(validateScoreCollaborationHistoryRequest({
    operationId: "history-undo-0001",
    baseRevisionId: "revision-1",
    action: "undo",
    targetOperationId: "operation-edit-0001",
  }), {
    operationId: "history-undo-0001",
    baseRevisionId: "revision-1",
    action: "undo",
    targetOperationId: "operation-edit-0001",
  });
  assert.throws(() => validateScoreCollaborationHistoryRequest({ operationId: "same-operation", baseRevisionId: "r1", action: "undo", targetOperationId: "same-operation" }));
  assert.throws(() => validateScoreCollaborationHistoryRequest({ operationId: "history-0001", baseRevisionId: "r1", action: "restore", targetOperationId: "edit-00000001" }));
});

test("selectively undoes a note patch while preserving a later disjoint edit", () => {
  const before = score([note("event-1", "C"), note("event-2", "E")]);
  const after = score([note("event-1", "D"), note("event-2", "E")]);
  const current = score([note("event-1", "D"), note("event-2", "F")]);
  const affected = affectedEventIdsForHistory({ before, after, commandJson: { type: "note.patch", patch: { eventId: "event-1", step: "D" } } });
  assert.deepEqual(affected, ["event-1"]);
  const reversed = selectivelyReverseScoreOperation({ before, after, current, affectedEventIds: affected, action: "undo", targetOperationId: "edit-1", generatedAt: new Date(1).toISOString() });
  assert.deepEqual(reversed.measures[0]!.events.map((event) => event.type === "note" ? event.pitch.step : "rest"), ["C", "F"]);
  assert.match(reversed.metadata.warnings.at(-1) ?? "", /Collaboration undo applied/u);
});

test("fails closed when the same event changed after the target operation", () => {
  const before = score([note("event-1", "C")]);
  const after = score([note("event-1", "D")]);
  const current = score([note("event-1", "G")]);
  assert.throws(
    () => selectivelyReverseScoreOperation({ before, after, current, affectedEventIds: ["event-1"], action: "undo", targetOperationId: "edit-1" }),
    (error) => error instanceof ScoreHistoryConflictError && error.affectedEventIds[0] === "event-1",
  );
});

test("reverses insertion, deletion, and order changes without dropping unrelated events", () => {
  const a = note("a-event", "C");
  const b = note("b-event", "D");
  const c = note("c-event", "E");
  const x = note("x-inserted", "F");
  const y = note("y-later", "G");

  const insertion = selectivelyReverseScoreOperation({
    before: score([a, b]),
    after: score([a, x, b]),
    current: score([a, x, b, y]),
    affectedEventIds: ["x-inserted"],
    action: "undo",
    targetOperationId: "insert-1",
  });
  assert.deepEqual(insertion.measures[0]!.events.map((event) => event.id), ["a-event", "b-event", "y-later"]);

  const deletion = selectivelyReverseScoreOperation({
    before: score([a, b]),
    after: score([b]),
    current: score([b, y]),
    affectedEventIds: ["a-event"],
    action: "undo",
    targetOperationId: "delete-1",
  });
  assert.deepEqual(deletion.measures[0]!.events.map((event) => event.id), ["a-event", "b-event", "y-later"]);

  const reorder = selectivelyReverseScoreOperation({
    before: score([a, b, c]),
    after: score([b, c, a]),
    current: score([b, y, c, a]),
    affectedEventIds: ["a-event"],
    action: "undo",
    targetOperationId: "reorder-1",
  });
  assert.deepEqual(reorder.measures[0]!.events.map((event) => event.id), ["a-event", "b-event", "y-later", "c-event"]);
});
