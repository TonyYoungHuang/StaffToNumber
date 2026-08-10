import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { collaborationRedisConfiguration } from "./redis-config.js";
import { createCollaborationServer } from "./server.js";

const redisUrl = process.env.TEST_REDIS_URL?.trim();

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
    const timeout = setTimeout(() => reject(new Error("Collaboration provider did not sync.")), 10_000);
    provider.on("synced", ({ state }: { state: boolean }) => {
      if (!state) return;
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function waitFor(check: () => boolean, message: string, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

test("coordinates document updates and awareness across two Redis-backed server instances", { skip: !redisUrl }, async () => {
  const db = database();
  const [firstPort, secondPort] = await Promise.all([freePort(), freePort()]);
  const prefix = `score-collaboration-test-${process.pid}-${Date.now()}`;
  const firstServer = createCollaborationServer(db, {
    port: firstPort,
    address: "127.0.0.1",
    redis: collaborationRedisConfiguration({ url: redisUrl!, identifier: "integration-instance-a", prefix }),
  });
  const secondServer = createCollaborationServer(db, {
    port: secondPort,
    address: "127.0.0.1",
    redis: collaborationRedisConfiguration({ url: redisUrl!, identifier: "integration-instance-b", prefix }),
  });
  const firstDocument = new Y.Doc();
  const secondDocument = new Y.Doc();
  let firstProvider: HocuspocusProvider | undefined;
  let secondProvider: HocuspocusProvider | undefined;

  try {
    await Promise.all([firstServer.listen(), secondServer.listen()]);
    firstProvider = new HocuspocusProvider({
      url: `ws://127.0.0.1:${firstPort}`,
      name: "score-1",
      document: firstDocument,
      token: "owner-token",
    });
    secondProvider = new HocuspocusProvider({
      url: `ws://127.0.0.1:${secondPort}`,
      name: "score-1",
      document: secondDocument,
      token: "owner-token",
    });
    await Promise.all([waitForSync(firstProvider), waitForSync(secondProvider)]);

    firstDocument.getMap("redis-integration").set("fromA", "revision-a");
    await waitFor(
      () => secondDocument.getMap("redis-integration").get("fromA") === "revision-a",
      "The second collaboration instance did not receive the first Redis update.",
    );
    secondDocument.getMap("redis-integration").set("fromB", "revision-b");
    await waitFor(
      () => firstDocument.getMap("redis-integration").get("fromB") === "revision-b",
      "The first collaboration instance did not receive the reverse Redis update.",
    );

    firstProvider.awareness!.setLocalStateField("presence", { name: "Redis Editor A" });
    await waitFor(
      () => [...secondProvider!.awareness!.getStates().values()].some((state) => (state.presence as { name?: string } | undefined)?.name === "Redis Editor A"),
      "Awareness did not propagate across Redis-backed collaboration instances.",
    );
    assert.equal(firstDocument.getMap("redis-integration").size, 2);
    assert.equal(secondDocument.getMap("redis-integration").size, 2);
  } finally {
    firstProvider?.destroy();
    secondProvider?.destroy();
    firstDocument.destroy();
    secondDocument.destroy();
    await Promise.all([firstServer.destroy(), secondServer.destroy()]);
    db.close();
  }
});
