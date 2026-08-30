import type { Metadata } from "next";
import { BillingManager } from "../../components/BillingManager";
import { getBillingMessages, getLocalizedPricingPlanCatalog } from "../../lib/billing-messages";
import { readAppLocale } from "../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();
  const { page } = getBillingMessages(locale).billing;
  return { title: page.title, description: page.body };
}

export default async function BillingPage() {
  const locale = await readAppLocale();
  const copy = getBillingMessages(locale);
  const freePlanCredits = getLocalizedPricingPlanCatalog(locale).find((plan) => plan.code === "free")?.resources[0] ?? "";
  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{copy.billing.page.eyebrow}</p>
        <h1 className="page-title">{copy.billing.page.title}</h1>
        <p className="body-copy large">{copy.billing.page.body}</p>
        {copy.reviewNotice ? <p className="helper-copy">{copy.reviewNotice}</p> : null}
      </div>
      <BillingManager locale={locale} copy={copy.billing.manager} freePlanCredits={freePlanCredits} />
    </section>
  );
}
