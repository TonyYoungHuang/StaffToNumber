import assert from "node:assert/strict";
import test from "node:test";
import { bullMqStartupRetryDelayMs, createBullMqWorkerRedisOptions } from "./job-broker-connection.js";

test("BullMQ worker Redis options parse managed TLS connection details", () => {
  const options = createBullMqWorkerRedisOptions("rediss://default:secret%2Fvalue@example.upstash.io:6380/2");

  assert.equal(options.host, "example.upstash.io");
  assert.equal(options.port, 6380);
  assert.equal(options.username, "default");
  assert.equal(options.password, "secret/value");
  assert.equal(options.db, 2);
  assert.deepEqual(options.tls, {});
  assert.equal(options.maxRetriesPerRequest, null);
  assert.equal(options.enableReadyCheck, false);
  assert.equal(options.lazyConnect, true);
  assert.equal(options.connectTimeout, 15_000);
  assert.equal(options.keepAlive, 10_000);
  assert.equal(options.retryStrategy?.(1), 500);
  assert.equal(options.retryStrategy?.(6), 10_000);
  assert.equal(options.retryStrategy?.(20), 10_000);
});

test("BullMQ worker Redis options use local non-TLS defaults", () => {
  const options = createBullMqWorkerRedisOptions("redis://localhost");

  assert.equal(options.host, "localhost");
  assert.equal(options.port, 6379);
  assert.equal(options.db, 0);
  assert.equal(options.tls, undefined);
});

test("BullMQ worker Redis options ignore boundary BOM and control characters", () => {
  const options = createBullMqWorkerRedisOptions(
    "\uFEFF\r\n rediss://default:secret@example.upstash.io:6379 \t\r\n",
  );

  assert.equal(options.host, "example.upstash.io");
  assert.equal(options.port, 6379);
  assert.equal(options.username, "default");
  assert.equal(options.password, "secret");
  assert.deepEqual(options.tls, {});
});

test("BullMQ worker Redis options reject invalid URLs", () => {
  assert.throws(
    () => createBullMqWorkerRedisOptions("https://example.test"),
    /Unsupported Redis URL protocol/,
  );
  assert.throws(
    () => createBullMqWorkerRedisOptions("redis://localhost/not-a-database"),
    /Invalid Redis database number/,
  );
});

test("BullMQ worker startup retries use bounded exponential backoff", () => {
  assert.equal(bullMqStartupRetryDelayMs(1), 1_000);
  assert.equal(bullMqStartupRetryDelayMs(2), 2_000);
  assert.equal(bullMqStartupRetryDelayMs(5), 10_000);
  assert.equal(bullMqStartupRetryDelayMs(50), 10_000);
});
