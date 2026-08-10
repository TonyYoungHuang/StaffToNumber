import assert from "node:assert/strict";
import test from "node:test";
import {
  orderOfflineScoreCollaborationCommands,
  queuedScoreCollaborationRequest,
  scoreCollaborationQueueScope,
  type OfflineScoreCollaborationCommand,
} from "./score-collaboration-queue.js";

function queued(operationId: string, createdAt: string): OfflineScoreCollaborationCommand {
  return {
    version: 1,
    operationId,
    scope: "scope",
    scoreId: "score-1",
    baseRevisionId: "revision-old",
    command: { type: "note.patch", patch: { eventId: "event-1", step: "G" } },
    targetEventIds: ["event-1"],
    createdAt,
  };
}

test("queue scopes are stable and never expose a share token", async () => {
  const owner = await scoreCollaborationQueueScope({ scoreId: "score-1" });
  const shared = await scoreCollaborationQueueScope({ scoreId: "score-1", shareToken: "secret-share-token" });
  const repeated = await scoreCollaborationQueueScope({ scoreId: "score-1", shareToken: "secret-share-token" });
  assert.match(owner, /^[a-f0-9]{64}$/u);
  assert.equal(shared, repeated);
  assert.notEqual(owner, shared);
  assert.equal(shared.includes("secret-share-token"), false);
});

test("queued commands are de-duplicated and replayed in causal order", () => {
  const later = queued("operation-b", "2026-07-16T10:00:01.000Z");
  const earlier = queued("operation-a", "2026-07-16T10:00:00.000Z");
  assert.deepEqual(orderOfflineScoreCollaborationCommands([later, earlier, earlier]).map((item) => item.operationId), ["operation-a", "operation-b"]);
  assert.deepEqual(queuedScoreCollaborationRequest(later, "revision-latest"), {
    operationId: "operation-b",
    baseRevisionId: "revision-latest",
    command: later.command,
  });
});
