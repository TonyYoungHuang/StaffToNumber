import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";
import { appendScoreCollaborationOperation, currentScoreCollaborationOperation, listScoreCollaborationConflicts, listScoreCollaborationOperations, reconcileScoreCollaborationConflicts, scoreCollaborationTypes } from "./score-collaboration-document.js";

function operation(overrides: Record<string, unknown> = {}) {
  return {
    id: "operation-1", actorId: "user-1", actorName: "Editor", role: "editor" as const,
    commandType: "note.patch", baseRevisionId: "revision-1", resultRevisionId: "revision-2",
    targetEventIds: ["event-1"], createdAt: "2026-07-15T00:00:00.000Z", ...overrides,
  };
}

test("stores score operations as Yjs shared maps instead of a whole JSON string", () => {
  const document = new Y.Doc();
  const result = appendScoreCollaborationOperation(document, operation());
  assert.equal(result.inserted, true);
  assert.equal(listScoreCollaborationOperations(document)[0].targetEventIds[0], "event-1");
  assert.equal(scoreCollaborationTypes(document).metadata.get("currentRevisionId"), "revision-2");
  assert.equal(document.getText("score-json").length, 0);
  assert.equal(appendScoreCollaborationOperation(document, operation()).inserted, false);
});

test("merges offline operations from two clients without losing either update", () => {
  const left = new Y.Doc();
  const right = new Y.Doc();
  appendScoreCollaborationOperation(left, operation());
  appendScoreCollaborationOperation(right, operation({ id: "operation-2", resultRevisionId: "revision-3", targetEventIds: ["event-2"] }));
  const leftUpdate = Y.encodeStateAsUpdate(left);
  const rightUpdate = Y.encodeStateAsUpdate(right);
  Y.applyUpdate(left, rightUpdate);
  Y.applyUpdate(right, leftUpdate);
  assert.deepEqual(listScoreCollaborationOperations(left).map((item) => item.id).sort(), ["operation-1", "operation-2"]);
  assert.deepEqual(listScoreCollaborationOperations(right).map((item) => item.id).sort(), ["operation-1", "operation-2"]);
});

test("records an explainable conflict when concurrent edits target the same event", () => {
  const document = new Y.Doc();
  appendScoreCollaborationOperation(document, operation());
  const result = appendScoreCollaborationOperation(document, operation({ id: "operation-2", resultRevisionId: "revision-3" }));
  assert.equal(result.conflicts.length, 1);
  assert.deepEqual(listScoreCollaborationConflicts(document)[0].targetEventIds, ["event-1"]);
});

test("reconciles a conflict discovered only after offline Yjs updates merge", () => {
  const left = new Y.Doc();
  const right = new Y.Doc();
  appendScoreCollaborationOperation(left, operation());
  appendScoreCollaborationOperation(right, operation({ id: "operation-2", resultRevisionId: "revision-3" }));
  Y.applyUpdate(left, Y.encodeStateAsUpdate(right));
  assert.equal(listScoreCollaborationConflicts(left).length, 0);
  assert.equal(reconcileScoreCollaborationConflicts(left).length, 1);
  assert.equal(reconcileScoreCollaborationConflicts(left).length, 0);
  assert.deepEqual(listScoreCollaborationConflicts(left)[0].targetEventIds, ["event-1"]);
});

test("selects only the operation matching a compacted snapshot current revision", () => {
  const document = new Y.Doc();
  appendScoreCollaborationOperation(document, operation());
  appendScoreCollaborationOperation(document, operation({ id: "operation-2", resultRevisionId: "revision-3", targetEventIds: ["event-2"] }));
  appendScoreCollaborationOperation(document, operation({ id: "operation-3", resultRevisionId: "revision-4", targetEventIds: ["event-3"] }));
  scoreCollaborationTypes(document).metadata.set("sourceOperationCount", 300);
  assert.equal(currentScoreCollaborationOperation(document)?.id, "operation-3");
  scoreCollaborationTypes(document).metadata.set("currentRevisionId", "revision-not-retained");
  assert.equal(currentScoreCollaborationOperation(document), null);
});
