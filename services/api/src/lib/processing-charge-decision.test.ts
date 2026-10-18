import assert from "node:assert/strict";
import test from "node:test";
import { processingChargeDecision } from "./processing-charge-decision.js";

test("processing charge decisions select monthly, prepaid and bound pass in order and never charge a free allowance", () => {
  const base = { paid: true, monthlyRemaining: 5, prepaidRemaining: 50, passRemaining: 10, creditCost: 5 };
  assert.equal(processingChargeDecision(base).source, "monthly");
  assert.equal(processingChargeDecision({ ...base, monthlyRemaining: 4 }).source, "prepaid");
  assert.equal(processingChargeDecision({ ...base, monthlyRemaining: 4, prepaidRemaining: 4 }).source, "score_pass");
  assert.equal(processingChargeDecision({ ...base, paid: false }).source, "score_pass");
  assert.equal(processingChargeDecision({ ...base, paid: false, passRemaining: null }).canSubmit, false);
  assert.equal(processingChargeDecision({ ...base, paid: false, passRemaining: null, allowFreeTrial: true }).source, "free_trial");
  assert.equal(processingChargeDecision({ ...base, monthlyRemaining: 0, prepaidRemaining: 0, passRemaining: 0 }).canSubmit, false);
});
