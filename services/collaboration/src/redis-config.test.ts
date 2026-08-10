import assert from "node:assert/strict";
import test from "node:test";
import { collaborationRedisConfiguration } from "./redis-config.js";

test("parses authenticated Redis URLs into isolated collaboration extension configuration", () => {
  assert.deepEqual(collaborationRedisConfiguration({
    url: "rediss://worker%20name:secret%2Fvalue@redis.internal:6380/3",
    identifier: "collaboration-1",
    prefix: "scores:collaboration",
  }), {
    host: "redis.internal",
    port: 6380,
    identifier: "collaboration-1",
    prefix: "scores:collaboration",
    options: {
      username: "worker name",
      password: "secret/value",
      db: 3,
      tls: {},
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    },
  });
});

test("rejects unsafe collaboration Redis configuration", () => {
  assert.throws(() => collaborationRedisConfiguration({ url: "http://redis:6379", identifier: "one" }), /redis:\/\/ or rediss:\/\//u);
  assert.throws(() => collaborationRedisConfiguration({ url: "redis://redis/not-a-db", identifier: "one" }), /database/u);
});
