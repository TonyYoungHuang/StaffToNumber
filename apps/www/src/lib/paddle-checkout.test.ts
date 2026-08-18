import assert from "node:assert/strict";
import test from "node:test";
import { resolvePaddleSuccessUrl } from "./paddle-checkout.js";

const input = {
  orderId: "order-1",
  publicToken: "public-token",
  allowedBaseUrls: ["https://scoretransposer.com", "https://app.scoretransposer.com"],
};

test("Paddle checkout accepts only a matching ScoreTransposer success URL", () => {
  assert.equal(resolvePaddleSuccessUrl({
    ...input,
    candidate: "https://app.scoretransposer.com/checkout/success?provider=paddle&order_id=order-1&token=public-token",
  }), "https://app.scoretransposer.com/checkout/success?provider=paddle&order_id=order-1&token=public-token");

  for (const candidate of [
    "https://attacker.example/checkout/success?provider=paddle&order_id=order-1&token=public-token",
    "https://scoretransposer.com/checkout/success?provider=stripe&order_id=order-1&token=public-token",
    "https://scoretransposer.com/checkout/success?provider=paddle&order_id=wrong&token=public-token",
  ]) {
    assert.equal(resolvePaddleSuccessUrl({ ...input, candidate }), null);
  }
});
