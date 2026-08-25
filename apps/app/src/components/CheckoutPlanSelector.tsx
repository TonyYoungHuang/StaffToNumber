"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { APP_ROUTES, type CheckoutPlanCode, type PricingPlanCode, type PricingPlanDisplay } from "@score/shared";
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
  plans: readonly PricingPlanDisplay[];
  planNote: string;
  isChinese: boolean;
  initialPlanCode?: CheckoutPlanCode;
}) {
  const defaultPlanCode = initialPlanCode ?? plans.find((plan) => plan.featured)?.code ?? plans[0]?.code;
  const [selectedPlanCode, setSelectedPlanCode] = useState<PricingPlanCode | undefined>(defaultPlanCode);
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

  useEffect(() => {
    if (!initialPlanCode) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("checkout-action")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialPlanCode]);

  function selectPlan(plan: PricingPlanDisplay) {
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

  function continueWithPlan(plan: PricingPlanDisplay) {
    const url = new URL(window.location.href);
    url.searchParams.set("plan", plan.code);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    window.requestAnimationFrame(() => {
      document.getElementById("checkout-action")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
                actionLabel={isSelected && plan.code !== "free"
                  ? isChinese ? `继续购买 ${plan.name} ${plan.cycle}` : `Continue with ${plan.name} ${plan.cycle}`
                  : plan.cta}
                control={<input
                  className="score-plan-card__input"
                  type="radio"
                  name="checkout-plan"
                  value={plan.code}
                  checked={isSelected}
                  onChange={() => selectPlan(plan)}
                  onClick={() => continueWithPlan(plan)}
                  aria-controls="checkout-action"
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
        {selectedPlan.code === "free" ? (
          <section id="checkout-action" className={`${styles.paymentPanel} stack-lg`} aria-labelledby="free-plan-title">
            <div className="stack-sm">
              <p className="eyebrow">Free</p>
              <h2 id="free-plan-title" className={styles.sectionHeading}>
                {isChinese ? "免费创建你的第一份完整乐谱" : "Create your first complete score for free"}
              </h2>
              <p className="body-copy large">
                {isChinese
                  ? "无需付款或信用卡。免费方案长期保留一个完整乐谱项目，并包含每月 25 个后台任务。"
                  : "No payment or card is required. Free keeps one complete score project with 25 server jobs each month."}
              </p>
            </div>
            <div className="button-row">
              <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-primary">
                {isChinese ? "免费创建乐谱" : "Create a score for free"}
              </Link>
            </div>
          </section>
        ) : (
          <AppCheckoutClient selectedPlan={{
            code: selectedPlan.code as CheckoutPlanCode,
            name: selectedPlan.name,
            cycle: selectedPlan.cycle,
            price: selectedPlan.price,
            credits: selectedPlan.credits,
          }} />
        )}
      </div>
    </>
  );
}
