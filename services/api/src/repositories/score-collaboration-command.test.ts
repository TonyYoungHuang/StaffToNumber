import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import Fastify from "fastify";
import type { ScoreJson } from "@score/shared";

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "score-collaboration-command-"));
process.env.DB_FILE = path.join(testDir, "test.sqlite");
process.env.STORAGE_DIR = path.join(testDir, "storage");

const { db, initDb } = await import("../db.js");
const { authPlugin } = await import("../plugins/auth.js");
const { scoreRoutes } = await import("../routes/scores.js");
const {
  applyCanonicalScoreCollaborationCommand,
  applyScoreCollaborationHistoryCommand,
  createScoreDocumentFromDerivedScoreJson,
  createScoreRevisionFromScoreJson,
  createScoreShare,
  findCurrentRevisionForDocument,
  findScoreDocumentById,
  listScoreCommentsByDocumentId,
  listScoreRevisionsByDocumentId,
  mapScoreCollaborationCommandForApi,
  mapScoreShareForApi,
  setScoreCommentResolved,
} = await import("./score-repository.js");

initDb();
const timestamp = new Date(0).toISOString();
const userId = "collaboration-command-user";
db.prepare("INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
  .run(userId, "collaboration-command@example.com", "hash", "salt", timestamp, timestamp);

after(() => {
  db.close();
  fs.rmSync(testDir, { recursive: true, force: true });
});

function scoreFixture(title: string): ScoreJson {
  return {
    schemaVersion: 2,
    title,
    source: { kind: "musicxml", originalName: `${title}.musicxml` },
    metadata: {
      importedAt: timestamp,
      parser: "musicxml-basic-v1",
      workTitle: title,
      measureCount: 2,
      noteCount: 2,
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
        attributes: { divisions: 1, key: { fifths: 0, mode: "major" }, time: { beats: "4", beatType: "4" }, clef: { sign: "G", line: 2 } },
        events: [{ id: "event-1", type: "note", pitch: { step: "C", alter: 0, octave: 4 }, duration: 1, durationType: "quarter", dots: 0, voice: "1", staff: 1, chord: false, ties: [], lyrics: [] }],
      },
      {
        id: "measure-2",
        partId: "P1",
        number: "2",
        sequence: 2,
        events: [{ id: "event-2", type: "note", pitch: { step: "E", alter: 0, octave: 4 }, duration: 1, durationType: "quarter", dots: 0, voice: "1", staff: 1, chord: false, ties: [], lyrics: [] }],
      },
    ],
  };
}

function createDocument(label: string) {
  const document = createScoreDocumentFromDerivedScoreJson({ userId, title: label, scoreJson: scoreFixture(label), createdFrom: "system" });
  assert.ok(document);
  const revision = findCurrentRevisionForDocument(document);
  assert.ok(revision);
  return { document, revision };
}

function notePatch(eventId: string, step: "D" | "F" | "G" | "A") {
  return { type: "note.patch" as const, patch: { eventId, step } };
}

test("merges disjoint commands from one base revision and records overlapping conflicts", () => {
  const { document, revision: base } = createDocument("Concurrent merge");
  const first = applyCanonicalScoreCollaborationCommand({
    operationId: "operation-a-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: base.id,
    command: notePatch("event-1", "D"),
  });
  assert.equal(first.status, "applied");
  assert.ok(first.revision);

  const second = applyCanonicalScoreCollaborationCommand({
    operationId: "operation-b-0001",
    documentId: document.id,
    actorId: "editor-b",
    actorRole: "editor",
    baseRevisionId: base.id,
    command: notePatch("event-2", "F"),
  });
  assert.equal(second.status, "merged");
  assert.ok(second.revision);
  const current = findCurrentRevisionForDocument(findScoreDocumentById(document.id)!);
  assert.ok(current);
  const score = JSON.parse(current.score_json) as ScoreJson;
  assert.equal(score.measures[0]!.events[0]!.type === "note" ? score.measures[0]!.events[0]!.pitch.step : null, "D");
  assert.equal(score.measures[1]!.events[0]!.type === "note" ? score.measures[1]!.events[0]!.pitch.step : null, "F");
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 3);

  const conflict = applyCanonicalScoreCollaborationCommand({
    operationId: "operation-c-0001",
    documentId: document.id,
    actorId: "editor-c",
    actorRole: "editor",
    baseRevisionId: base.id,
    command: notePatch("event-1", "G"),
  });
  assert.equal(conflict.status, "conflict");
  assert.equal(conflict.command?.conflict_reason, "target-overlap");
  assert.deepEqual(JSON.parse(conflict.command!.conflicting_command_ids_json), ["operation-a-0001"]);
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 3);

  const repeatedConflict = applyCanonicalScoreCollaborationCommand({
    operationId: "operation-c-0001",
    documentId: document.id,
    actorId: "editor-c",
    actorRole: "editor",
    baseRevisionId: base.id,
    command: notePatch("event-1", "G"),
  });
  assert.equal(repeatedConflict.status, "conflict");
  assert.equal(repeatedConflict.command?.conflict_reason, "target-overlap");
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 3);
});

test("makes retries idempotent and rejects operation id payload changes", () => {
  const { document, revision: base } = createDocument("Idempotent command");
  const input = {
    operationId: "operation-idempotent-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor" as const,
    baseRevisionId: base.id,
    command: notePatch("event-1", "D"),
  };
  const applied = applyCanonicalScoreCollaborationCommand(input);
  const duplicate = applyCanonicalScoreCollaborationCommand(input);
  assert.equal(applied.status, "applied");
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.revision?.id, applied.revision?.id);
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 2);

  const mismatch = applyCanonicalScoreCollaborationCommand({ ...input, command: notePatch("event-1", "A") });
  assert.equal(mismatch.status, "idempotency_mismatch");
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 2);

  const actorMismatch = applyCanonicalScoreCollaborationCommand({ ...input, actorId: "editor-b" });
  assert.equal(actorMismatch.status, "idempotency_mismatch");
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 2);
});

test("fails closed when stale history contains a non-command revision", () => {
  const { document, revision: base } = createDocument("Diverged history");
  const external = createScoreRevisionFromScoreJson({ documentId: document.id, scoreJson: scoreFixture("External edit"), createdFrom: "manual_edit" });
  assert.ok(external);
  const result = applyCanonicalScoreCollaborationCommand({
    operationId: "operation-diverged-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: base.id,
    command: notePatch("event-2", "G"),
  });
  assert.equal(result.status, "conflict");
  assert.equal(result.command?.conflict_reason, "revision-history-diverged");
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 2);
});

test("allows only active edit shares to submit canonical commands", async () => {
  const { document, revision: base } = createDocument("Shared command");
  const viewShare = createScoreShare({ documentId: document.id, userId, permission: "view" });
  const editShare = createScoreShare({ documentId: document.id, userId, permission: "edit", label: "Violin coach" });
  assert.ok(viewShare && editShare);
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(scoreRoutes, { prefix: "/api" });
  await app.ready();
  const payload = { operationId: "operation-shared-0001", baseRevisionId: base.id, command: notePatch("event-1", "D") };

  try {
    const denied = await app.inject({ method: "POST", url: `/api/scores/shared/${mapScoreShareForApi(viewShare).token}/collaboration/commands`, payload });
    assert.equal(denied.statusCode, 403);
    const applied = await app.inject({ method: "POST", url: `/api/scores/shared/${mapScoreShareForApi(editShare).token}/collaboration/commands`, payload });
    assert.equal(applied.statusCode, 201);
    assert.equal(applied.json().status, "applied");
    assert.equal(applied.json().command.actorRole, "editor");
    assert.deepEqual(applied.json().command.actor, { kind: "share_link", displayName: "Violin coach", verification: "share_link" });
    const duplicate = await app.inject({ method: "POST", url: `/api/scores/shared/${mapScoreShareForApi(editShare).token}/collaboration/commands`, payload });
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.json().status, "duplicate");
  } finally {
    await app.close();
  }
});

test("gives comment shares a target-validated annotation workspace while view shares stay private", async () => {
  const { document } = createDocument("Shared annotations");
  const viewShare = createScoreShare({ documentId: document.id, userId, permission: "view", label: "Audience" });
  const commentShare = createScoreShare({ documentId: document.id, userId, permission: "comment", label: "Section coach" });
  assert.ok(viewShare && commentShare);
  const viewToken = mapScoreShareForApi(viewShare).token;
  const commentToken = mapScoreShareForApi(commentShare).token;
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(scoreRoutes, { prefix: "/api" });
  await app.ready();

  try {
    const denied = await app.inject({ method: "POST", url: `/api/scores/shared/${viewToken}/comments`, payload: { body: "Should fail", target: { type: "score" } } });
    assert.equal(denied.statusCode, 403);
    const invalid = await app.inject({ method: "POST", url: `/api/scores/shared/${commentToken}/comments`, payload: { body: "Missing note", target: { type: "note", eventId: "not-in-score" } } });
    assert.equal(invalid.statusCode, 400);
    const created = await app.inject({
      method: "POST",
      url: `/api/scores/shared/${commentToken}/comments`,
      payload: { body: "Check this entrance", target: { type: "note", eventId: "event-1", label: "Measure 1 C4" } },
    });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().comment.author.displayName, "Section coach");
    assert.equal(created.json().comment.author.verification, "share_link");
    assert.equal(created.json().comment.authorUserId, null);
    assert.equal(created.json().comment.target.eventId, "event-1");

    const commentPayload = await app.inject({ method: "GET", url: `/api/scores/shared/${commentToken}` });
    assert.equal(commentPayload.statusCode, 200);
    assert.equal(commentPayload.json().comments.length, 1);
    const viewPayload = await app.inject({ method: "GET", url: `/api/scores/shared/${viewToken}` });
    assert.equal(viewPayload.statusCode, 200);
    assert.deepEqual(viewPayload.json().comments, []);

    const row = listScoreCommentsByDocumentId(document.id)[0];
    assert.ok(row);
    const resolved = setScoreCommentResolved({ commentId: row.id, documentId: document.id, resolved: true, userId });
    assert.ok(resolved?.resolved_at);
  } finally {
    await app.close();
  }
});

test("undoes and redoes an actor operation without reverting a collaborator's disjoint edit", () => {
  const { document, revision: base } = createDocument("Shared history");
  const first = applyCanonicalScoreCollaborationCommand({
    operationId: "history-source-edit-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: base.id,
    command: notePatch("event-1", "D"),
  });
  assert.equal(first.status, "applied");
  const collaborator = applyCanonicalScoreCollaborationCommand({
    operationId: "history-other-edit-0001",
    documentId: document.id,
    actorId: "editor-b",
    actorRole: "editor",
    baseRevisionId: base.id,
    command: notePatch("event-2", "F"),
  });
  assert.equal(collaborator.status, "merged");

  const undo = applyScoreCollaborationHistoryCommand({
    operationId: "history-undo-edit-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: collaborator.revision!.id,
    action: "undo",
    targetOperationId: "history-source-edit-0001",
  });
  assert.equal(undo.status, "applied");
  assert.equal(undo.command?.command_type, "history.undo");
  let current = JSON.parse(findCurrentRevisionForDocument(findScoreDocumentById(document.id)!)!.score_json) as ScoreJson;
  assert.equal(current.measures[0]!.events[0]!.type === "note" ? current.measures[0]!.events[0]!.pitch.step : null, "C");
  assert.equal(current.measures[1]!.events[0]!.type === "note" ? current.measures[1]!.events[0]!.pitch.step : null, "F");
  assert.deepEqual(mapScoreCollaborationCommandForApi(undo.command!).history, {
    action: "undo",
    targetOperationId: "history-source-edit-0001",
    affectedEventIds: ["event-1"],
  });

  const duplicate = applyScoreCollaborationHistoryCommand({
    operationId: "history-undo-edit-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: collaborator.revision!.id,
    action: "undo",
    targetOperationId: "history-source-edit-0001",
  });
  assert.equal(duplicate.status, "duplicate");

  const redo = applyScoreCollaborationHistoryCommand({
    operationId: "history-redo-edit-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: undo.revision!.id,
    action: "redo",
    targetOperationId: "history-undo-edit-0001",
  });
  assert.equal(redo.status, "applied");
  current = JSON.parse(findCurrentRevisionForDocument(findScoreDocumentById(document.id)!)!.score_json) as ScoreJson;
  assert.equal(current.measures[0]!.events[0]!.type === "note" ? current.measures[0]!.events[0]!.pitch.step : null, "D");
  assert.equal(current.measures[1]!.events[0]!.type === "note" ? current.measures[1]!.events[0]!.pitch.step : null, "F");
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 5);
});

test("rejects cross-actor history and records a conflict after the same event changes", () => {
  const { document, revision: base } = createDocument("History conflict");
  const first = applyCanonicalScoreCollaborationCommand({
    operationId: "history-conflict-source-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: base.id,
    command: notePatch("event-1", "D"),
  });
  assert.equal(first.status, "applied");
  const forbidden = applyScoreCollaborationHistoryCommand({
    operationId: "history-forbidden-0001",
    documentId: document.id,
    actorId: "editor-b",
    actorRole: "editor",
    baseRevisionId: first.revision!.id,
    action: "undo",
    targetOperationId: "history-conflict-source-0001",
  });
  assert.equal(forbidden.status, "forbidden");

  const second = applyCanonicalScoreCollaborationCommand({
    operationId: "history-conflict-later-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: first.revision!.id,
    command: notePatch("event-1", "G"),
  });
  assert.equal(second.status, "applied");
  const conflict = applyScoreCollaborationHistoryCommand({
    operationId: "history-conflict-undo-0001",
    documentId: document.id,
    actorId: "editor-a",
    actorRole: "editor",
    baseRevisionId: second.revision!.id,
    action: "undo",
    targetOperationId: "history-conflict-source-0001",
  });
  assert.equal(conflict.status, "conflict");
  assert.equal(conflict.command?.conflict_reason, "history-target-changed");
  assert.deepEqual(JSON.parse(conflict.command!.conflicting_command_ids_json), ["history-conflict-later-0001"]);
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, 3);
});

test("exposes edit-share history while keeping view shares read-only", async () => {
  const { document, revision: base } = createDocument("Shared history API");
  const viewShare = createScoreShare({ documentId: document.id, userId, permission: "view" });
  const editShare = createScoreShare({ documentId: document.id, userId, permission: "edit" });
  assert.ok(viewShare && editShare);
  const viewToken = mapScoreShareForApi(viewShare).token;
  const editToken = mapScoreShareForApi(editShare).token;
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(scoreRoutes, { prefix: "/api" });
  await app.ready();

  try {
    const applied = await app.inject({
      method: "POST",
      url: `/api/scores/shared/${editToken}/collaboration/commands`,
      payload: { operationId: "shared-history-source-0001", baseRevisionId: base.id, command: notePatch("event-1", "D") },
    });
    assert.equal(applied.statusCode, 201);
    const currentRevisionId = applied.json().score.currentRevisionId as string;
    const history = await app.inject({ method: "GET", url: `/api/scores/shared/${editToken}/collaboration/commands` });
    assert.equal(history.statusCode, 200);
    assert.equal(history.json().commands[0].isCurrentActor, true);
    const undone = await app.inject({
      method: "POST",
      url: `/api/scores/shared/${editToken}/collaboration/history`,
      payload: { operationId: "shared-history-undo-0001", baseRevisionId: currentRevisionId, action: "undo", targetOperationId: "shared-history-source-0001" },
    });
    assert.equal(undone.statusCode, 201);
    assert.equal(undone.json().command.history.action, "undo");
    const deniedList = await app.inject({ method: "GET", url: `/api/scores/shared/${viewToken}/collaboration/commands` });
    const deniedUndo = await app.inject({ method: "POST", url: `/api/scores/shared/${viewToken}/collaboration/history`, payload: {} });
    assert.equal(deniedList.statusCode, 403);
    assert.equal(deniedUndo.statusCode, 403);
  } finally {
    await app.close();
  }
});
