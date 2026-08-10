import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreJson } from "@score/shared";
import {
  applyCanonicalScoreCommand,
  canonicalScoreCommandScopes,
  scoreCommandScopesOverlap,
  validateCanonicalScoreCommandRequest,
  type CanonicalScoreCommand,
} from "./score-collaboration-command.js";

const timestamp = new Date(0).toISOString();

function scoreFixture(): ScoreJson {
  return {
    schemaVersion: 2,
    title: "Canonical command fixture",
    source: { kind: "musicxml", originalName: "commands.musicxml" },
    metadata: {
      importedAt: timestamp,
      parser: "musicxml-basic-v1",
      workTitle: "Canonical command fixture",
      measureCount: 2,
      noteCount: 3,
      restCount: 0,
      warnings: [],
    },
    parts: [{ id: "P1", name: "Piano", staffCount: 1, measureCount: 2 }],
    measures: [
      {
        id: "measure-1",
        partId: "P1",
        number: "1",
        sequence: 1,
        attributes: { divisions: 1, time: { beats: "4", beatType: "4" }, clef: { sign: "G", line: 2 } },
        events: [
          { id: "event-1", type: "note", pitch: { step: "C", alter: 0, octave: 4 }, duration: 1, durationType: "quarter", dots: 0, voice: "1", staff: 1, chord: false, ties: [], lyrics: [] },
          { id: "event-2", type: "note", pitch: { step: "D", alter: 0, octave: 4 }, duration: 1, durationType: "quarter", dots: 0, voice: "1", staff: 1, chord: false, ties: [], lyrics: [] },
        ],
      },
      {
        id: "measure-2",
        partId: "P1",
        number: "2",
        sequence: 2,
        events: [
          { id: "event-3", type: "note", pitch: { step: "E", alter: 0, octave: 4 }, duration: 1, durationType: "quarter", dots: 0, voice: "1", staff: 1, chord: false, ties: [], lyrics: [] },
        ],
      },
    ],
  };
}

test("validates and applies every canonical graphical editing command", () => {
  const commands: CanonicalScoreCommand[] = [
    { type: "note.patch", patch: { eventId: "event-1", step: "G" } },
    { type: "note.insert", patch: { measureId: "measure-1", afterEventId: "event-1", step: "F", duration: 1, durationType: "quarter" } },
    { type: "event.delete", patch: { eventId: "event-2" } },
    { type: "events.batch", patch: { action: "duplicate", eventIds: ["event-1"], targetMeasureId: "measure-2", afterEventId: "event-3" } },
    { type: "event.reorder", patch: { eventId: "event-1", targetMeasureId: "measure-2", targetIndex: 0 } },
  ];

  for (const [index, command] of commands.entries()) {
    const validated = validateCanonicalScoreCommandRequest({
      operationId: `operation-${index + 1}-canonical`,
      baseRevisionId: "revision-1",
      command,
    });
    const result = applyCanonicalScoreCommand(scoreFixture(), validated.command);
    assert.equal(result.schemaVersion, 2);
    assert.notDeepEqual(result, scoreFixture());
  }
});

test("derives event and measure scopes for structural merge conflicts", () => {
  const score = scoreFixture();
  const insertion = canonicalScoreCommandScopes(score, {
    type: "note.insert",
    patch: { measureId: "measure-1", afterEventId: "event-1" },
  });
  const reorder = canonicalScoreCommandScopes(score, {
    type: "event.reorder",
    patch: { eventId: "event-1", targetMeasureId: "measure-2", targetIndex: 0 },
  });
  const batchMove = canonicalScoreCommandScopes(score, {
    type: "events.batch",
    patch: { action: "move", eventIds: ["event-1", "event-2"], targetMeasureId: "measure-2", afterEventId: "event-3" },
  });

  assert.deepEqual(insertion, ["event:event-1", "measure:measure-1"]);
  assert.deepEqual(reorder, ["event:event-1", "measure:measure-1", "measure:measure-2"]);
  assert.deepEqual(batchMove, ["event:event-1", "event:event-2", "event:event-3", "measure:measure-1", "measure:measure-2"]);
  assert.equal(scoreCommandScopesOverlap(insertion, reorder), true);
  assert.equal(scoreCommandScopesOverlap(["event:event-3"], insertion), false);
});

test("rejects unsafe ids and unsupported command payloads", () => {
  assert.throws(
    () => validateCanonicalScoreCommandRequest({ operationId: "short", baseRevisionId: "revision-1", command: { type: "note.patch", patch: { eventId: "event-1" } } }),
    /Operation id/u,
  );
  assert.throws(
    () => validateCanonicalScoreCommandRequest({ operationId: "operation-valid-1", baseRevisionId: "revision-1", command: { type: "measure.erase", patch: {} } }),
    /not supported/u,
  );
});
