import assert from "node:assert/strict";
import test from "node:test";
import { recognitionCreditSettlement, settledRecognitionCreditCost } from "./recognition-credit-settlement.js";

test("partial recognition bills only delivered unique pages to four decimal places", () => {
  const settlement = recognitionCreditSettlement({ quotedCredits: 5, sourcePageCount: 15, deliveredPages: [2, 3, 4, 5, 6, 7, 8, 9, 9] });
  assert.equal(settlement.settledCreditCost, 2.6666);
  assert.equal(settlement.creditsReturned, 2.3334);
  assert.equal(settlement.refundMethod, "credits-only");
  assert.equal(settledRecognitionCreditCost({ creditCost: 5, creditSettlement: settlement }), 2.6666);
  assert.equal(recognitionCreditSettlement({ quotedCredits: 1, sourcePageCount: 10, deliveredPages: 8 }).settledCreditCost, .8);
  assert.equal(recognitionCreditSettlement({ quotedCredits: 5, sourcePageCount: 10, deliveredPages: 10 }).settledCreditCost, 5);
  assert.equal(recognitionCreditSettlement({ quotedCredits: 5, sourcePageCount: 10, deliveredPages: 0 }).settledCreditCost, 0);
});

test("invalid delivery counts and forged/inconsistent settlement fields do not lower billing", () => {
  for (const deliveredPages of [-1, 11, 1.1, [0], [11]]) assert.throws(() => recognitionCreditSettlement({ quotedCredits: 5, sourcePageCount: 10, deliveredPages }));
  const settlement = recognitionCreditSettlement({ quotedCredits: 5, sourcePageCount: 10, deliveredPages: 8 });
  assert.equal(settledRecognitionCreditCost({ creditCost: 1, creditSettlement: settlement }), null);
  assert.equal(settledRecognitionCreditCost({ creditCost: 5, creditSettlement: { ...settlement, settledCreditCost: 0 } }), null);
  assert.equal(settledRecognitionCreditCost({ creditCost: 5, settledCreditCost: 0 }), null);
});
