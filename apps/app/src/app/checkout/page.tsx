import type { Metadata } from "next";
import Link from "next/link";
import { APP_ROUTES, isPurchasePlanCode, normalizeCheckoutReturnState } from "@score/shared";
import { CheckoutPlanSelector } from "../../components/CheckoutPlanSelector";
import styles from "../../components/AppCheckout.module.css";
import { getAuthMessages } from "../../lib/auth-messages";
import { getBillingMessages, getLocalizedPricingPlanCatalog } from "../../lib/billing-messages";
import { readAppLocale } from "../../lib/locale";
import { readCheckoutAction } from "../../lib/score-pass-checkout";

type CheckoutSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();
  const { page } = getBillingMessages(locale).checkout;
  return { title: page.title, description: page.body };
}

export default async function CheckoutPage({ searchParams }: { searchParams: CheckoutSearchParams }) {
  const locale = await readAppLocale();
  const authMessages = getAuthMessages(locale).form;
  const copy = getBillingMessages(locale);
  const checkoutAvailable = process.env.NEXT_PUBLIC_CHECKOUT_AVAILABLE === "true";

  if (!checkoutAvailable) {
    return (
      <section className="container page-shell">
        <div className="page-banner">
          <p className="eyebrow">{copy.checkout.unavailable.eyebrow}</p>
          <h1 className="page-title">{copy.checkout.unavailable.title}</h1>
          <p className="body-copy large">{copy.checkout.unavailable.body}</p>
          {copy.reviewNotice ? <p className="helper-copy">{copy.reviewNotice}</p> : null}
          <div className="button-row">
            <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-primary">
              {copy.checkout.unavailable.continueFree}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const params = await searchParams;
  const requestedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const initialPlanCode = isPurchasePlanCode(requestedPlan) ? requestedPlan : undefined;
  const plans = getLocalizedPricingPlanCatalog(locale, initialPlanCode === "converter-pro-annual");
  let returnState;
  try { returnState = normalizeCheckoutReturnState(typeof params.returnState === "string" ? JSON.parse(params.returnState) : undefined); } catch { returnState = undefined; }

  return (
    <section className={styles.checkoutShell}>
      <header className={styles.pricingHeader}>
        <div>
          <p className="eyebrow">{copy.checkout.page.eyebrow}</p>
          <h1 id="checkout-plans-title" className={styles.pageTitle}>{copy.checkout.page.title}</h1>
          <p className={styles.heroCopy}>{copy.checkout.page.body}</p>
          {copy.reviewNotice ? <p className="helper-copy">{copy.reviewNotice}</p> : null}
        </div>
        <div className={styles.promoPill}>
          <span>{copy.checkout.page.promoLabel}</span>
          <strong>{copy.checkout.page.promoValue}</strong>
        </div>
      </header>

      <CheckoutPlanSelector
        returnTo={typeof params.next === "string" ? params.next : undefined}
        plans={plans}
        initialPlanCode={initialPlanCode}
        targetDocumentId={typeof params.targetDocumentId === "string" ? params.targetDocumentId : undefined}
        intendedAction={readCheckoutAction(typeof params.intendedAction === "string" ? params.intendedAction : undefined)}
        isTopUp={params.passMode === "top_up"}
        returnState={returnState ?? undefined}
        continueAfterLogin={params.continue === "1"}
        originalOrderId={typeof params.order_id === "string" ? params.order_id : undefined}
        originalOrderToken={typeof params.token === "string" ? params.token : undefined}
        initialBillingKind={initialPlanCode === "converter-pro-lifetime" || initialPlanCode === "single-score" || params.billing === "one_time" ? "one_time" : "subscription"}
        locale={locale}
        copy={copy.checkout}
        authMessages={authMessages}
      />
    </section>
  );
}
