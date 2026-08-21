"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckoutPlanCode, CheckoutPlanDisplay } from "@score/shared";
import { CreditPlanCard, CreditPlanGrid } from "@score/ui";
import { trackFunnelEvent } from "../lib/analytics";
import { AppCheckoutClient } from "./AppCheckoutClient";
import styles from "./AppCheckout.module.css";

export function CheckoutPlanSelector({
  plans,
  planNote,
  isChinese,
  initialPlanCode,
}: {
  plans: readonly CheckoutPlanDisplay[];
  planNote: string;
  isChinese: boolean;
  initialPlanCode?: CheckoutPlanCode;
}) {
  const defaultPlanCode = initialPlanCode ?? plans.find((plan) => plan.featured)?.code ?? plans[0]?.code;
  const [selectedPlanCode, setSelectedPlanCode] = useState<CheckoutPlanCode | undefined>(defaultPlanCode);
  const selectedPlan = plans.find((plan) => plan.code === selectedPlanCode) ?? plans[0];
  const planListTracked = useRef(false);

  useEffect(() => {
    if (planListTracked.current) return;
    planListTracked.current = true;
    trackFunnelEvent("view_item_list", {
      item_list_id: "credit_plans",
      item_list_name: "ScoreTransposer credit plans",
      items: plans.map((plan) => ({
        item_id: plan.code,
        item_name: plan.name,
        item_variant: plan.cycle,
      })),
    });
  }, [plans]);

  function selectPlan(plan: CheckoutPlanDisplay) {
    setSelectedPlanCode(plan.code);
    trackFunnelEvent("select_item", {
      item_list_id: "credit_plans",
      item_list_name: "ScoreTransposer credit plans",
      items: [{
        item_id: plan.code,
        item_name: plan.name,
        item_variant: plan.cycle,
      }],
    });
  }

  if (!selectedPlan) return null;

  return (
    <>
      <section className={styles.plansPanel} aria-labelledby="checkout-plans-title">
        <CreditPlanGrid selectable label={isChinese ? "选择积分套餐" : "Choose a credit plan"}>
          {plans.map((plan) => {
            const isSelected = plan.code === selectedPlan.code;
            return (
              <CreditPlanCard
                key={plan.code}
                plan={plan}
                isChinese={isChinese}
                selected={isSelected}
                actionLabel={isSelected ? `${isChinese ? "已选择" : "Selected"} · ${plan.cycle}` : plan.cta}
                control={<input
                  className="score-plan-card__input"
                  type="radio"
                  name="checkout-plan"
                  value={plan.code}
                  checked={isSelected}
                  onChange={() => selectPlan(plan)}
                />}
              />
            );
          })}
        </CreditPlanGrid>

        <div className={styles.selectedPlanBar} role="status" aria-live="polite">
          <span>{isChinese ? "当前已选" : "Selected plan"}</span>
          <strong>{selectedPlan.name} · {selectedPlan.cycle}</strong>
          <span>{selectedPlan.price}</span>
          <span>{selectedPlan.credits}</span>
        </div>
        <p className={styles.planNote}>{planNote}</p>
      </section>

      <div className={styles.checkoutActionWrap}>
        <AppCheckoutClient selectedPlan={selectedPlan} />
      </div>
    </>
  );
}
