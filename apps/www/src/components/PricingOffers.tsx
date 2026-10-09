import type { SupportedLocale } from "@score/i18n";
import { getPricingPlanCatalog, getPurchaseOptionsCopy } from "@score/shared";
import { getHomepageLocalization, localizeHomepagePlans } from "../lib/homepage-localization";
import { getLocalizedPaidPlans } from "../lib/localized-pricing";
import { getFrenchPricingPlans } from "../lib/french-pricing";
import { getPurchaseFlowCopy } from "../lib/purchase-copy";
import { PricingOffersClient } from "./PricingOffersClient";
import styles from "./PurchaseFlow.module.css";

export function PricingOffers({ locale, title, description }: { locale: SupportedLocale; title?: string; description?: string }) {
  const home = getHomepageLocalization(locale).page;
  const purchase = getPurchaseOptionsCopy(locale);
  const localizedPlans = localizeHomepagePlans(locale, getPricingPlanCatalog("en")).filter(plan => plan.code !== "free");
  const plans = Object.fromEntries((["subscription", "one_time"] as const).map(kind => {
    if (locale === "fr") return [kind, getFrenchPricingPlans(kind)];
    if (locale === "en" || locale === "es" || locale === "de" || locale === "ru") return [kind, getLocalizedPaidPlans(locale, kind)];
    return [kind, localizedPlans.map(plan => {
      if (kind === "subscription") return plan;
      const duration = plan.code.endsWith("annual") ? purchase.year : purchase.month;
      const renewalResourceIndex = plan.code.endsWith("annual") ? 2 : 3;
      return { ...plan, cycle: duration, badge: purchase.oneTime, cta: purchase.buyTemplate.replace("{name}", plan.name).replace("{duration}", duration), resources: [...plan.resources.filter((_, index) => index !== renewalResourceIndex), purchase.oneTimeNote] };
    })];
  })) as { subscription: typeof localizedPlans; one_time: typeof localizedPlans };
  return <section id="pricing-plans" className={styles.offers} aria-labelledby="pricing-title">
    <header className={styles.heading}><h1 id="pricing-title">{title ?? getPurchaseFlowCopy(locale).title}</h1><p>{description ?? home.pricingBody}</p></header>
    <PricingOffersClient locale={locale} plans={plans} labels={home.creditPlanCardLabels} purchase={purchase} />
    <p className="helper-copy">{home.priceNote}</p>
  </section>;
}
