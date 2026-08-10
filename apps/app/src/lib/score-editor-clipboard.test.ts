import assert from "node:assert/strict";
import test from "node:test";
import { parseScoreEditorClipboard, scoreEditorClipboardKey, serializeScoreEditorClipboard } from "./score-editor-clipboard";

const now = Date.parse("2026-07-14T10:00:00.000Z");

test("restores a versioned clipboard only for the same score and existing events", () => {
  const raw = serializeScoreEditorClipboard("score-1", { eventIds: ["n1", "n1", "n2"], mode: "copy" }, "2026-07-14T09:00:00.000Z");
  assert.deepEqual(parseScoreEditorClipboard(raw, { scoreId: "score-1", availableEventIds: ["n1", "n2"], now }), {
    eventIds: ["n1", "n2"],
    mode: "copy",
  });
  assert.equal(parseScoreEditorClipboard(raw, { scoreId: "score-2", availableEventIds: ["n1", "n2"], now }), null);
  assert.equal(parseScoreEditorClipboard(raw, { scoreId: "score-1", availableEventIds: ["n1"], now }), null);
});

test("rejects expired, future, and malformed clipboard payloads", () => {
  const expired = serializeScoreEditorClipboard("score-1", { eventIds: ["n1"], mode: "cut" }, "2026-07-01T09:00:00.000Z");
  const future = serializeScoreEditorClipboard("score-1", { eventIds: ["n1"], mode: "cut" }, "2026-07-14T12:00:00.000Z");
  assert.equal(parseScoreEditorClipboard(expired, { scoreId: "score-1", availableEventIds: ["n1"], now }), null);
  assert.equal(parseScoreEditorClipboard(future, { scoreId: "score-1", availableEventIds: ["n1"], now }), null);
  assert.equal(parseScoreEditorClipboard("not-json", { scoreId: "score-1", availableEventIds: ["n1"], now }), null);
  assert.equal(scoreEditorClipboardKey("score-1"), "scoretransposer:score-editor-clipboard:v1:score-1");
});
