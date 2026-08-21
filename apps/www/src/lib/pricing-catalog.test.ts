import assert from "node:assert/strict";
import test from "node:test";
import { CHECKOUT_PLAN_CODES, getCheckoutPlanCatalog } from "@score/shared";

test("Chinese and English checkout surfaces share one complete four-plan catalog", () => {
  const chinese = getCheckoutPlanCatalog("zh-CN");
  const english = getCheckoutPlanCatalog("en");

  assert.deepEqual(chinese.map((plan) => plan.code), [...CHECKOUT_PLAN_CODES]);
  assert.deepEqual(english.map((plan) => plan.code), [...CHECKOUT_PLAN_CODES]);

  for (const code of CHECKOUT_PLAN_CODES) {
    const zhPlan = chinese.find((plan) => plan.code === code);
    const enPlan = english.find((plan) => plan.code === code);
    assert.ok(zhPlan);
    assert.ok(enPlan);
    assert.equal(zhPlan.price, enPlan.price);
    assert.equal(zhPlan.featured, enPlan.featured);
    assert.ok(zhPlan.benefits.length >= 5);
    assert.ok(zhPlan.resources.length >= 3);
    assert.ok(zhPlan.credits.length > 0);
    assert.ok(zhPlan.unitPrice.length > 0);
  }
});
