import assert from "node:assert/strict";
import test from "node:test";
import { withProxyHeaders } from "../src/request-proxy.js";

test("Stripe webhook proxy preserves the exact request bytes", async () => {
  const payload = new Uint8Array([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x22, 0xc3, 0xa9, 0x22, 0x7d, 0x0a]);
  const request = new Request("https://api-staging.scoretransposer.com/webhooks/stripe?source=test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=1,v1=test",
    },
    body: payload,
  });

  const proxied = await withProxyHeaders(request);

  assert.equal(new URL(proxied.url).pathname, "/api/webhooks/stripe");
  assert.equal(new URL(proxied.url).search, "?source=test");
  assert.equal(proxied.headers.get("stripe-signature"), "t=1,v1=test");
  assert.deepEqual(new Uint8Array(await proxied.arrayBuffer()), payload);
});

test("Paddle webhook proxy preserves the exact request bytes", async () => {
  const payload = new TextEncoder().encode('{"event_id":"evt_test","event_type":"transaction.completed"}');
  const request = new Request("https://api-staging.scoretransposer.com/webhooks/paddle?source=test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "paddle-signature": "ts=1;h1=test",
    },
    body: payload,
  });

  const proxied = await withProxyHeaders(request);

  assert.equal(new URL(proxied.url).pathname, "/api/webhooks/paddle");
  assert.equal(new URL(proxied.url).search, "?source=test");
  assert.equal(proxied.headers.get("paddle-signature"), "ts=1;h1=test");
  assert.deepEqual(new Uint8Array(await proxied.arrayBuffer()), payload);
});

test("non-webhook proxy keeps its path and body", async () => {
  const request = new Request("https://api-staging.scoretransposer.com/api/health", {
    method: "POST",
    body: "unchanged",
  });

  const proxied = await withProxyHeaders(request);

  assert.equal(new URL(proxied.url).pathname, "/api/health");
  assert.equal(await proxied.text(), "unchanged");
});
