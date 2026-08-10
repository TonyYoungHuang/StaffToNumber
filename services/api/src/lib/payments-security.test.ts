import assert from "node:assert/strict";
import test from "node:test";
import { buildPaddleTransactionEndpoint } from "./payments.js";

test("Paddle transaction lookup stays on an approved host and rejects path injection", () => {
  const endpoint = buildPaddleTransactionEndpoint("txn_01abcDEF234");
  assert.ok(["api.paddle.com", "sandbox-api.paddle.com"].includes(endpoint.hostname));
  assert.equal(endpoint.pathname, "/transactions/txn_01abcDEF234");

  for (const candidate of [
    "https://attacker.example/",
    "txn_../prices",
    "txn_%2f%2fattacker.example",
    "txn_01abc?redirect=https://attacker.example",
  ]) {
    assert.throws(() => buildPaddleTransactionEndpoint(candidate), /Invalid Paddle transaction id/u);
  }
});
