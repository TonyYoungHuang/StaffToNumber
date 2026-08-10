import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { resolveCollaborationAccess } from "./access.js";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL);
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT);
    CREATE TABLE score_documents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
    CREATE TABLE score_shares (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, share_token TEXT NOT NULL, permission TEXT NOT NULL, label TEXT, expires_at TEXT, revoked_at TEXT);
    INSERT INTO users VALUES ('user-1', 'owner@example.com');
    INSERT INTO sessions VALUES ('session-1', 'user-1', 'owner-token', '2026-08-01T00:00:00.000Z', NULL);
    INSERT INTO score_documents VALUES ('score-1', 'user-1');
    INSERT INTO score_shares VALUES ('share-edit', 'score-1', 'edit-token', 'edit', 'Violin coach', NULL, NULL);
    INSERT INTO score_shares VALUES ('share-view', 'score-1', 'view-token', 'view', NULL, NULL, NULL);
    INSERT INTO score_shares VALUES ('share-expired', 'score-1', 'expired-token', 'edit', NULL, '2026-07-01T00:00:00.000Z', NULL);
  `);
  return db;
}

test("grants owners and edit-share holders write access", () => {
  const db = database();
  assert.deepEqual(resolveCollaborationAccess(db, "score-1", "owner-token", "2026-07-15T00:00:00.000Z"), {
    actorId: "user-1", actorName: "owner@example.com", role: "owner", readOnly: false,
  });
  assert.equal(resolveCollaborationAccess(db, "score-1", "edit-token", "2026-07-15T00:00:00.000Z")?.readOnly, false);
  assert.equal(resolveCollaborationAccess(db, "score-1", "edit-token", "2026-07-15T00:00:00.000Z")?.actorName, "Violin coach");
  db.close();
});

test("makes view shares read-only and rejects expired or unknown tokens", () => {
  const db = database();
  assert.equal(resolveCollaborationAccess(db, "score-1", "view-token", "2026-07-15T00:00:00.000Z")?.role, "viewer");
  assert.equal(resolveCollaborationAccess(db, "score-1", "view-token", "2026-07-15T00:00:00.000Z")?.readOnly, true);
  assert.equal(resolveCollaborationAccess(db, "score-1", "expired-token", "2026-07-15T00:00:00.000Z"), null);
  assert.equal(resolveCollaborationAccess(db, "score-2", "edit-token", "2026-07-15T00:00:00.000Z"), null);
  db.close();
});
