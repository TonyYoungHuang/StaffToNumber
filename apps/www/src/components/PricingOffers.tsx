import type { SupportedLocale } from "@score/i18n";
import { getPricingPlanCatalog, getPurchaseOptionsCopy } from "@score/shared";
import { getHomepageLocalization, localizeHomepagePlans } from "../lib/homepage-localization";
import { getPurchaseFlowCopy } from "../lib/purchase-copy";
import { PricingOffersClient } from "./PricingOffersClient";
import styles from "./PurchaseFlow.module.css";

export function PricingOffers({ locale, title }: { locale: SupportedLocale; title?: string }) {
  const home = getHomepageLocalization(locale).page;
  const purchase = getPurchaseOptionsCopy(locale);
  const localizedPlans = localizeHomepagePlans(locale, getPricingPlanCatalog("en")).filter(plan => plan.code !== "free");
  const plans = Object.fromEntries((["subscription", "one_time"] as const).map(kind => {
    return [kind, localizedPlans.map(plan => {
      if (kind === "subscription" || plan.code === "converter-pro-annual") return plan;
      const duration = plan.code.endsWith("annual") ? purchase.year : purchase.month;
      return { ...plan, cycle: duration, badge: purchase.oneTime, cta: purchase.buyTemplate.replace("{name}", plan.name).replace("{duration}", duration) };
    })];
  })) as { subscription: typeof localizedPlans; one_time: typeof localizedPlans };
  return <section id="pricing-plans" className={styles.offers} aria-labelledby="pricing-title">
    <header className={styles.heading}><h1 id="pricing-title">{title ?? getPurchaseFlowCopy(locale).title}</h1><p>{home.pricingBody}</p></header>
    <PricingOffersClient locale={locale} plans={plans} labels={home.creditPlanCardLabels} purchase={purchase} />
  </section>;
}
