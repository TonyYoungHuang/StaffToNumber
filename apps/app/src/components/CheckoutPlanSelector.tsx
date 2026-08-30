"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMessage, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, type CheckoutPlanCode, type PricingPlanCode, type PricingPlanDisplay } from "@score/shared";
import { CreditPlanCard, CreditPlanGrid } from "@score/ui";
import { trackFunnelEvent } from "../lib/analytics";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import type { BillingMessageCatalog } from "../lib/billing-messages/types";
import { AppCheckoutClient } from "./AppCheckoutClient";
import styles from "./AppCheckout.module.css";

type CheckoutCopy = BillingMessageCatalog["checkout"];

export function CheckoutPlanSelector({
  plans,
  locale,
  copy,
  initialPlanCode,
  authMessages,
}: {
  plans: readonly PricingPlanDisplay[];
  locale: SupportedLocale;
  copy: CheckoutCopy;
  initialPlanCode?: CheckoutPlanCode;
  authMessages: AuthMessageCatalog["form"];
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
        <CreditPlanGrid selectable label={copy.selector.plansAria}>
          {plans.map((plan) => {
            const isSelected = plan.code === selectedPlan.code;
            const actionLabel = isSelected && plan.code !== "free"
              ? formatMessage(copy.selector.continueTemplate, { name: plan.name, cycle: plan.cycle })
              : plan.cta;
            return (
              <CreditPlanCard
                key={plan.code}
                plan={plan}
                labels={{
                  creditUsage: copy.selector.creditUsage,
                  includedCapabilities: copy.selector.includedCapabilities,
                  benefitsAndResources: copy.selector.benefitsAndResources,
                }}
                selected={isSelected}
                actionLabel={actionLabel}
                control={<input
                  className="score-plan-card__input"
                  type="radio"
                  name="checkout-plan"
                  value={plan.code}
                  checked={isSelected}
                  onChange={() => selectPlan(plan)}
                  onClick={() => continueWithPlan(plan)}
                  aria-label={actionLabel}
                  aria-controls="checkout-action"
                />}
              />
            );
          })}
        </CreditPlanGrid>

        <div className={styles.selectedPlanBar} role="status" aria-live="polite">
          <span>{copy.selector.selectedPlan}</span>
          <strong>{selectedPlan.name} · {selectedPlan.cycle}</strong>
          <span>{selectedPlan.price}</span>
          <span>{selectedPlan.credits}</span>
        </div>
        <p className={styles.planNote}>{copy.page.planNote}</p>
      </section>

      <div className={styles.checkoutActionWrap}>
        {selectedPlan.code === "free" ? (
          <section id="checkout-action" className={`${styles.paymentPanel} stack-lg`} aria-labelledby="free-plan-title">
            <div className="stack-sm">
              <p className="eyebrow">{copy.selector.freeEyebrow}</p>
              <h2 id="free-plan-title" className={styles.sectionHeading}>{copy.selector.freeTitle}</h2>
              <p className="body-copy large">{copy.selector.freeBody}</p>
            </div>
            <div className="button-row">
              <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-primary">
                {copy.selector.freeCta}
              </Link>
            </div>
          </section>
        ) : (
          <AppCheckoutClient
            locale={locale}
            copy={copy.client}
            authMessages={authMessages}
            selectedPlan={{
              code: selectedPlan.code as CheckoutPlanCode,
              name: selectedPlan.name,
              cycle: selectedPlan.cycle,
              price: selectedPlan.price,
              credits: selectedPlan.credits,
            }}
          />
        )}
      </div>
    </>
  );
}
