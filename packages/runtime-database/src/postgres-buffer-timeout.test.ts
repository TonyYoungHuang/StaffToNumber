import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
// Production workers use compiled JavaScript. Resolve it dynamically so tsc
// does not treat its own output declarations as source inputs.
const { createRuntimeDatabase } = await import(new URL("../dist/index.js", import.meta.url).href) as typeof import("./index.js");

test("a lost synchronous worker response poisons the connection before any buffer can be reused", { timeout: 15_000 }, async () => {
  // This loopback listener deliberately never completes PostgreSQL's handshake.
  // It uses no external database, credentials, filesystem or production service.
  const sockets = new Set<net.Socket>();
  const server = net.createServer(socket => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as net.AddressInfo;
  const db = createRuntimeDatabase({ primary: "postgres", postgresUrl: `postgres://synthetic@127.0.0.1:${address.port}/never-handshakes`,
    postgresSchema: "public", queryTimeoutMs: 1, responseBufferBytes: 4096 });
  try {
    assert.throws(() => db.prepare("SELECT 1").get(), /runtime query exceeded 5001ms/u);
    assert.throws(() => db.prepare("SELECT 2").get(), /runtime database is closed/u);
    db.close();
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
