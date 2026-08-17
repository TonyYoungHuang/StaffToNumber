import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { compactCollaborationDocument, createCollaborationServer } from "./server.js";

const collaborationPerformanceReport = path.join(fileURLToPath(new URL("../../../", import.meta.url)), "artifacts", "performance", "collaboration-20-users.json");

async function freePort() {
  const probe = net.createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL);
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT);
    CREATE TABLE score_documents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, current_revision_id TEXT);
    CREATE TABLE score_shares (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, share_token TEXT NOT NULL, permission TEXT NOT NULL, label TEXT, expires_at TEXT, revoked_at TEXT);
    INSERT INTO users VALUES ('user-1', 'owner@example.com');
    INSERT INTO sessions VALUES ('session-1', 'user-1', 'owner-token', '2099-01-01T00:00:00.000Z', NULL);
    INSERT INTO score_documents VALUES ('score-1', 'user-1', 'revision-1');
  `);
  return db;
}

function waitForSync(provider: HocuspocusProvider) {
  if (provider.synced) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Collaboration provider did not sync.")), 5_000);
    provider.on("synced", ({ state }: { state: boolean }) => {
      if (!state) return;
      clearTimeout(timeout);
      resolve();
    });
  });
}

function operation(id: string, revisionId: string, targetEventId = id, baseRevisionId: string | null = null) {
  const value = new Y.Map<unknown>();
  value.set("id", id);
  value.set("baseRevisionId", baseRevisionId);
  value.set("resultRevisionId", revisionId);
  value.set("targetEventIds", [targetEventId]);
  value.set("createdAt", new Date().toISOString());
  return value;
}

async function waitFor(check: () => boolean, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for collaboration persistence.");
}

test("authenticates, persists, audits, and reloads a Yjs score operation over WebSocket", async () => {
  const db = database();
  const firstPort = await freePort();
  const firstServer = createCollaborationServer(db, { port: firstPort, address: "127.0.0.1" });
  await firstServer.listen();
  const firstDocument = new Y.Doc();
  const firstProvider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${firstPort}`,
    name: "score-1",
    document: firstDocument,
    token: "owner-token",
  });

  await waitForSync(firstProvider);
  assert.equal(firstDocument.getMap("score-metadata").get("currentRevisionId"), "revision-1");
  const operation = new Y.Map<unknown>();
  operation.set("id", "operation-1");
  operation.set("resultRevisionId", "revision-2");
  firstDocument.getArray<Y.Map<unknown>>("score-operations").push([operation]);
  await waitFor(() => Number((db.prepare("SELECT COUNT(*) AS count FROM score_collaboration_updates").get() as { count: number }).count) > 0);
  firstProvider.destroy();
  await firstServer.destroy();

  const stored = db.prepare("SELECT yjs_state FROM score_collaboration_documents WHERE document_id = 'score-1'").get() as { yjs_state: Uint8Array } | undefined;
  assert.ok(stored?.yjs_state.byteLength);
  const snapshot = db.prepare("SELECT snapshot_version, compaction_count, source_operation_count, retained_operation_count, state_sha256, state_size_bytes FROM score_collaboration_snapshots WHERE document_id = 'score-1'").get() as Record<string, unknown>;
  assert.equal(snapshot.snapshot_version, 1);
  assert.ok(Number(snapshot.compaction_count) >= 1);
  assert.equal(snapshot.source_operation_count, 1);
  assert.equal(snapshot.retained_operation_count, 1);
  assert.match(String(snapshot.state_sha256), /^[a-f0-9]{64}$/u);
  assert.equal(snapshot.state_size_bytes, stored!.yjs_state.byteLength);
  const audit = db.prepare("SELECT actor_id, actor_role, update_sha256, update_size_bytes FROM score_collaboration_updates LIMIT 1").get() as Record<string, unknown>;
  assert.equal(audit.actor_id, "user-1");
  assert.equal(audit.actor_role, "owner");
  assert.match(String(audit.update_sha256), /^[a-f0-9]{64}$/);
  assert.ok(Number(audit.update_size_bytes) > 0);

  const secondPort = await freePort();
  const secondServer = createCollaborationServer(db, { port: secondPort, address: "127.0.0.1" });
  await secondServer.listen();
  const secondDocument = new Y.Doc();
  const secondProvider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${secondPort}`,
    name: "score-1",
    document: secondDocument,
    token: "owner-token",
  });
  await waitForSync(secondProvider);
  assert.equal(secondDocument.getArray("score-operations").length, 1);
  secondProvider.destroy();
  await secondServer.destroy();
  db.close();
});

test("reports database readiness instead of the Hocuspocus welcome page", async () => {
  const db = database();
  const port = await freePort();
  const server = createCollaborationServer(db, { port, address: "127.0.0.1" });
  await server.listen();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ready",
      service: "collaboration",
      databasePrimary: "unknown",
      databaseSchema: "main",
      dependencies: { database: "ready", redis: "disabled" },
    });
  } finally {
    await server.destroy();
    db.close();
  }
});

test("compacts operation history into a bounded restart-safe Yjs snapshot", async () => {
  const db = database();
  const firstPort = await freePort();
  const firstServer = createCollaborationServer(db, { port: firstPort, address: "127.0.0.1", maxOperations: 2, maxConflicts: 2 });
  await firstServer.listen();
  const firstDocument = new Y.Doc();
  const firstProvider = new HocuspocusProvider({ url: `ws://127.0.0.1:${firstPort}`, name: "score-1", document: firstDocument, token: "owner-token" });
  await waitForSync(firstProvider);
  firstDocument.getText("rehearsal-note").insert(0, "Keep this rehearsal note");
  firstDocument.getArray<Y.Map<unknown>>("score-operations").push([
    operation("operation-1", "revision-2"),
    operation("operation-2", "revision-3"),
    operation("operation-3", "revision-4"),
    operation("operation-4", "revision-5"),
  ]);
  firstDocument.getMap("score-metadata").set("currentRevisionId", "revision-5");
  await waitFor(() => Number((db.prepare("SELECT COUNT(*) AS count FROM score_collaboration_updates").get() as { count: number }).count) >= 3);
  firstProvider.destroy();
  await firstServer.destroy();

  const snapshot = db.prepare("SELECT source_operation_count, retained_operation_count, current_revision_id FROM score_collaboration_snapshots WHERE document_id = 'score-1'").get() as Record<string, unknown>;
  assert.equal(snapshot.source_operation_count, 4);
  assert.equal(snapshot.retained_operation_count, 2);
  assert.equal(snapshot.current_revision_id, "revision-5");

  const secondPort = await freePort();
  const secondServer = createCollaborationServer(db, { port: secondPort, address: "127.0.0.1", maxOperations: 2, maxConflicts: 2 });
  await secondServer.listen();
  const reloaded = new Y.Doc();
  const secondProvider = new HocuspocusProvider({ url: `ws://127.0.0.1:${secondPort}`, name: "score-1", document: reloaded, token: "owner-token" });
  await waitForSync(secondProvider);
  assert.deepEqual(reloaded.getArray<Y.Map<unknown>>("score-operations").toArray().map((item) => item.get("id")), ["operation-3", "operation-4"]);
  assert.equal(reloaded.getText("rehearsal-note").toString(), "Keep this rehearsal note");
  assert.equal(reloaded.getMap("score-metadata").get("currentRevisionId"), "revision-5");
  assert.equal(reloaded.getMap("score-metadata").get("sourceOperationCount"), 4);
  assert.equal(reloaded.getMap("score-metadata").get("retainedOperationCount"), 2);
  secondProvider.destroy();
  await secondServer.destroy();
  db.close();
});

test("keeps only conflicts whose operations survive compaction", () => {
  const source = new Y.Doc();
  source.getArray<Y.Map<unknown>>("score-operations").push([
    operation("operation-1", "revision-2"),
    operation("operation-2", "revision-3"),
    operation("operation-3", "revision-4"),
  ]);
  source.getArray<unknown>("score-operations").push(["malformed-operation"]);
  const conflicts = source.getArray<Y.Map<unknown>>("score-conflicts");
  const staleConflict = new Y.Map<unknown>();
  staleConflict.set("id", "operation-1:operation-2");
  staleConflict.set("operationId", "operation-2");
  staleConflict.set("conflictingOperationId", "operation-1");
  const retainedConflict = new Y.Map<unknown>();
  retainedConflict.set("id", "operation-2:operation-3");
  retainedConflict.set("operationId", "operation-3");
  retainedConflict.set("conflictingOperationId", "operation-2");
  conflicts.push([staleConflict, retainedConflict]);
  source.getArray<unknown>("score-conflicts").push([42]);
  const compacted = compactCollaborationDocument(source, { maxOperations: 2, maxConflicts: 10 });
  const decoded = new Y.Doc();
  Y.applyUpdate(decoded, compacted.state);
  assert.deepEqual(decoded.getArray<Y.Map<unknown>>("score-conflicts").toArray().map((item) => item.get("id")), ["operation-2:operation-3"]);
  assert.equal(compacted.sourceOperationCount, 4);
  assert.equal(compacted.retainedOperationCount, 2);
  assert.equal(compacted.sourceConflictCount, 3);
  assert.equal(compacted.retainedConflictCount, 1);
  source.destroy();
  decoded.destroy();
});

test("prevents a view-share WebSocket from mutating the server document", async () => {
  const db = database();
  db.exec("INSERT INTO score_shares VALUES ('share-view', 'score-1', 'view-token', 'view', NULL, NULL, NULL)");
  const port = await freePort();
  const server = createCollaborationServer(db, { port, address: "127.0.0.1" });
  await server.listen();
  const ownerDocument = new Y.Doc();
  const viewerDocument = new Y.Doc();
  const owner = new HocuspocusProvider({ url: `ws://127.0.0.1:${port}`, name: "score-1", document: ownerDocument, token: "owner-token" });
  const viewer = new HocuspocusProvider({ url: `ws://127.0.0.1:${port}`, name: "score-1", document: viewerDocument, token: "view-token" });
  await Promise.all([waitForSync(owner), waitForSync(viewer)]);
  viewerDocument.getMap("score-metadata").set("unauthorized", true);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(ownerDocument.getMap("score-metadata").get("unauthorized"), undefined);
  const viewerAudits = db.prepare("SELECT COUNT(*) AS count FROM score_collaboration_updates WHERE actor_role = 'viewer'").get() as { count: number };
  assert.equal(viewerAudits.count, 0);
  viewer.destroy();
  owner.destroy();
  await server.destroy();
  db.close();
});

test("converges 20 independently authenticated concurrent editors within the collaboration budget", async () => {
  const db = database();
  const insertShare = db.prepare("INSERT INTO score_shares VALUES (?, 'score-1', ?, 'edit', ?, NULL, NULL)");
  for (let index = 0; index < 20; index += 1) insertShare.run(`load-share-${index}`, `load-token-${index}`, `Editor ${index + 1}`);
  const port = await freePort();
  const server = createCollaborationServer(db, { port, address: "127.0.0.1", maxOperations: 100, maxConflicts: 100 });
  await server.listen();
  const documents = Array.from({ length: 20 }, () => new Y.Doc());
  const providers = documents.map((document, index) => new HocuspocusProvider({
    url: `ws://127.0.0.1:${port}`,
    name: "score-1",
    document,
    token: `load-token-${index}`,
  }));
  const startedAt = performance.now();
  try {
    await Promise.all(providers.map(waitForSync));
    documents.forEach((document, index) => {
      document.getArray<Y.Map<unknown>>("score-operations").push([operation(`load-operation-${index}`, `load-revision-${index}`, `load-event-${index}`, "revision-1")]);
    });
    await waitFor(() => documents.every((document) => document.getArray("score-operations").length === 20), 10_000);
    const convergenceMs = performance.now() - startedAt;
    assert.ok(convergenceMs < 10_000, `20-editor convergence took ${convergenceMs.toFixed(1)}ms`);
    const operationIds = new Set(documents[0].getArray<Y.Map<unknown>>("score-operations").toArray().map((item) => item.get("id")));
    assert.equal(operationIds.size, 20);
    await waitFor(() => Number((db.prepare("SELECT COUNT(DISTINCT actor_id) AS count FROM score_collaboration_updates WHERE actor_role = 'editor'").get() as { count: number }).count) === 20, 10_000);
    fs.mkdirSync(path.dirname(collaborationPerformanceReport), { recursive: true });
    fs.writeFileSync(collaborationPerformanceReport, `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      transport: "Hocuspocus WebSocket + Yjs",
      independentlyAuthenticatedEditors: 20,
      concurrentOperations: 20,
      convergedClientDocuments: 20,
      distinctAuditedActors: 20,
      convergenceMs: Number(convergenceMs.toFixed(2)),
      hardLimitMs: 10_000,
      passed: true,
    }, null, 2)}\n`, "utf8");
  } finally {
    providers.forEach((provider) => provider.destroy());
    documents.forEach((document) => document.destroy());
    await server.destroy();
    db.close();
  }
});

test("reconciles offline overlap after disconnect and repeated reconnect jitter", async () => {
  const db = database();
  const insertShare = db.prepare("INSERT INTO score_shares VALUES (?, 'score-1', ?, 'edit', ?, NULL, NULL)");
  insertShare.run("network-share-a", "network-token-a", "Editor A");
  insertShare.run("network-share-b", "network-token-b", "Editor B");
  insertShare.run("network-share-c", "network-token-c", "Editor C");
  const port = await freePort();
  const server = createCollaborationServer(db, { port, address: "127.0.0.1" });
  await server.listen();
  const documents = [new Y.Doc(), new Y.Doc(), new Y.Doc()];
  const providers = documents.map((document, index) => new HocuspocusProvider({
    url: `ws://127.0.0.1:${port}`,
    name: "score-1",
    document,
    token: `network-token-${String.fromCharCode(97 + index)}`,
  }));
  try {
    await Promise.all(providers.map(waitForSync));
    providers[1].disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));
    documents[0].getArray<Y.Map<unknown>>("score-operations").push([operation("network-operation-a", "network-revision-a", "shared-event", "revision-1")]);
    documents[2].getArray<Y.Map<unknown>>("score-operations").push([operation("network-operation-c", "network-revision-c", "independent-event", "revision-1")]);
    documents[1].getArray<Y.Map<unknown>>("score-operations").push([operation("network-operation-b", "network-revision-b", "shared-event", "revision-1")]);
    providers[2].disconnect();
    await new Promise((resolve) => setTimeout(resolve, 25));
    providers[2].connect();
    await waitForSync(providers[2]);
    providers[2].disconnect();
    await new Promise((resolve) => setTimeout(resolve, 25));
    providers[2].connect();
    providers[1].connect();
    await Promise.all([waitForSync(providers[1]), waitForSync(providers[2])]);
    await waitFor(() => documents.every((document) => document.getArray("score-operations").length === 3), 10_000);
    await waitFor(() => documents.every((document) => document.getArray("score-conflicts").length === 1), 10_000);
    for (const document of documents) {
      const conflict = document.getArray<Y.Map<unknown>>("score-conflicts").get(0);
      assert.equal(conflict.get("id"), "network-operation-a:network-operation-b");
      assert.deepEqual(conflict.get("targetEventIds"), ["shared-event"]);
    }
    const duplicate = new Y.Map<unknown>();
    duplicate.set("id", "network-operation-a:network-operation-b");
    documents[0].getArray<Y.Map<unknown>>("score-conflicts").push([duplicate]);
    await waitFor(() => documents.every((document) => document.getArray("score-conflicts").length === 1), 10_000);
  } finally {
    providers.forEach((provider) => provider.destroy());
    documents.forEach((document) => document.destroy());
    await server.destroy();
    db.close();
  }
});
