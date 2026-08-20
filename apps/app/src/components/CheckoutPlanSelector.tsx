"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckoutPlanCode } from "@score/shared";
import { trackFunnelEvent } from "../lib/analytics";
import { AppCheckoutClient } from "./AppCheckoutClient";
import styles from "./AppCheckout.module.css";

export type CheckoutPlanDisplay = {
  code: CheckoutPlanCode;
  badge: string;
  name: string;
  cycle: string;
  price: string;
  unitPrice: string;
  credits: string;
  audience: string;
  benefits: string[];
  resources: string[];
  cta: string;
  featured: boolean;
};

export function CheckoutPlanSelector({
  plans,
  planNote,
  isChinese,
}: {
  plans: CheckoutPlanDisplay[];
  planNote: string;
  isChinese: boolean;
}) {
  const initialPlanCode = plans.find((plan) => plan.featured)?.code ?? plans[0]?.code;
  const [selectedPlanCode, setSelectedPlanCode] = useState<CheckoutPlanCode | undefined>(initialPlanCode);
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
        <div className={styles.planGrid} role="radiogroup" aria-label={isChinese ? "选择积分套餐" : "Choose a credit plan"}>
          {plans.map((plan) => {
            const isSelected = plan.code === selectedPlan.code;
            return (
              <label
                key={plan.code}
                className={`${styles.planCard} ${plan.featured ? styles.featuredPlan : ""} ${isSelected ? styles.selectedPlan : ""}`}
              >
                <input
                  className={styles.planInput}
                  type="radio"
                  name="checkout-plan"
                  value={plan.code}
                  checked={isSelected}
                  onChange={() => selectPlan(plan)}
                />
                <div className={styles.planTop}>
                  <span className={styles.planBadge}>{plan.badge}</span>
                  <span className={styles.planCycle}>{plan.cycle}</span>
                </div>
                <div className={styles.planIdentity}>
                  <h2>{plan.name}</h2>
                  <p>{plan.audience}</p>
                </div>
                <div className={styles.priceBlock}>
                  <p className={styles.planPrice}>{plan.price}</p>
                  <p className={styles.unitPrice}>{plan.unitPrice}</p>
                </div>
                <div className={styles.creditBox}>
                  <span aria-hidden="true">⚡</span>
                  <div>
                    <strong>{plan.credits}</strong>
                    <small>{isChinese ? "创建成功的后台任务计费" : "Charged for successfully created server jobs"}</small>
                  </div>
                </div>
                <span className={`button ${isSelected ? "button-primary" : "button-secondary"} ${styles.planButton}`}>
                  {isSelected ? `${isChinese ? "已选择" : "Selected"} · ${plan.cycle}` : plan.cta}
                </span>
                <div className={styles.cardSection}>
                  <h3>{isChinese ? "包含能力" : "Included capabilities"}</h3>
                  <ul className={styles.planFeatures}>{plan.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
                </div>
                <div className={`${styles.cardSection} ${styles.resourceSection}`}>
                  <h3>{isChinese ? "福利与资源" : "Benefits and resources"}</h3>
                  <ul className={styles.resourceList}>{plan.resources.map((resource) => <li key={resource}>{resource}</li>)}</ul>
                </div>
              </label>
            );
          })}
        </div>

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
