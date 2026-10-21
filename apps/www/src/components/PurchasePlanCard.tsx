"use client";

import { useEffect, useState } from "react";
import { CreditPlanCard, type CreditPlanCardLabels } from "@score/ui";
import { getLifetimePolicy, isPurchasePlanCode, type CheckoutBillingKind, type PaymentProvider, type PricingPlanDisplay } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getCheckoutUrl, getSupportUrl, siteConfig } from "../lib/site";
import { purchaseSelectionKey } from "../lib/purchase-flow";
import { useSiteLocale } from "./SiteLocaleProvider";
import { usePurchaseFlow } from "./PurchaseFlowProvider";
import { PlanCardFrame } from "./PlanCardFrame";
import { withMobilePricingCopy } from "../lib/pricing-card-copy";

export function PurchasePlanCard({ plan, labels, billingKind = "subscription", provider = "stripe" }: {
  plan: PricingPlanDisplay; labels: CreditPlanCardLabels; billingKind?: CheckoutBillingKind; provider?: PaymentProvider;
}) {
  const { locale } = useSiteLocale();
  const flow = usePurchaseFlow();
  const [upgrade, setUpgrade] = useState<{ userId: string; amountMinor: number } | null>(null);
  useEffect(() => {
    if (plan.code !== "converter-pro-lifetime" || !flow.user) return;
    const userId = flow.user.id;
    const controller = new AbortController();
    void apiRequest<{ amountMinor: number; upgrade: boolean }>("/api/payments/lifetime-quote", { signal: controller.signal })
      .then(result => { if (result.ok && result.data.upgrade) setUpgrade({ userId, amountMinor: result.data.amountMinor }); }).catch(() => {});
    return () => controller.abort();
  }, [plan.code, flow.user?.id]);
  const cardLabels = plan.code === "converter-pro-lifetime" ? { ...labels, creditUsage: plan.resources[0] } : labels;
  const upgradedPlan = upgrade && upgrade.userId === flow.user?.id ? { ...plan,
    price: new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(upgrade.amountMinor / 100),
    audience: getLifetimePolicy(locale).upgradePrice, resources: [...plan.resources, getLifetimePolicy(locale).upgrade] } : plan;
  const responsivePlan = withMobilePricingCopy(locale, upgradedPlan);
  if (!isPurchasePlanCode(plan.code)) return null;
  if (!siteConfig.release.checkoutAvailable) return <PlanCardFrame code={plan.code} label={plan.code === "converter-pro-lifetime" ? plan.badge : undefined}><CreditPlanCard plan={responsivePlan} labels={cardLabels} headingLevel={3} actionHref={getSupportUrl("payment", "pricing", locale)} /></PlanCardFrame>;
  if (plan.code === "converter-pro-lifetime") { billingKind = "one_time"; provider = "stripe"; }
  const selection = { planCode: plan.code, billingKind, provider };
  const selected = Boolean(flow.selected && purchaseSelectionKey(flow.selected) === purchaseSelectionKey(selection));
  return <PlanCardFrame code={plan.code} label={plan.code === "converter-pro-lifetime" ? plan.badge : undefined}><CreditPlanCard plan={responsivePlan} labels={cardLabels} headingLevel={3}
    actionHref={`${getCheckoutUrl(locale, plan.code, billingKind)}&provider=${provider}`}
    selected={selected} busy={flow.busy}
    actionLabel={flow.busy && selected ? flow.copy.loading : plan.cta}
    onActionClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      flow.purchase({ ...selection, name: plan.name, cycle: plan.cycle, price: plan.price });
    }} /></PlanCardFrame>;
}
