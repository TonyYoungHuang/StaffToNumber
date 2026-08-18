import assert from "node:assert/strict";
import test from "node:test";
import { createJobBrokerRedisOptions, safeJobBrokerErrorMessage } from "./job-broker-connection.js";

test("API BullMQ Redis options parse managed TLS connection details", () => {
  const options = createJobBrokerRedisOptions(
    "\uFEFF\r\n rediss://default:secret%2Fvalue@example.upstash.io:6380/2 \t\r\n",
    12_000,
  );

  assert.equal(options.host, "example.upstash.io");
  assert.equal(options.port, 6380);
  assert.equal(options.username, "default");
  assert.equal(options.password, "secret/value");
  assert.equal(options.db, 2);
  assert.deepEqual(options.tls, {});
  assert.equal(options.connectTimeout, 12_000);
  assert.equal(options.keepAlive, 10_000);
});

test("API BullMQ Redis options reject unsupported and invalid database URLs", () => {
  assert.throws(() => createJobBrokerRedisOptions("https://example.test", 1_000), /Unsupported Redis URL protocol/);
  assert.throws(() => createJobBrokerRedisOptions("redis://localhost/not-a-database", 1_000), /Invalid Redis database number/);
});

test("API BullMQ errors never expose connection credentials", () => {
  const unsafe = new Error("connect ENOENT //default:super-secret@example.upstash.io:6379");
  const safe = safeJobBrokerErrorMessage(unsafe);

  assert.equal(safe, "BullMQ dispatcher could not connect to Redis.");
  assert.equal(safe.includes("super-secret"), false);
});
