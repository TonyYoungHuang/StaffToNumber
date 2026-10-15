"use client";

import { useEffect, useState } from "react";
import { validateCheckoutReturnPath, type CheckoutReturnContext, type PaymentProvider, type PaymentVerification } from "@score/shared";
import { MetricCard, Panel, StatusPill } from "@score/ui";
import type { CheckoutCancelCopy } from "../lib/checkout-localization";
import { localizePublicHref } from "../lib/locale-routing";
import { getCheckoutUrl, getSupportUrl, siteConfig } from "../lib/site";
import { apiRequest } from "../lib/api";
import { useSiteLocale } from "./SiteLocaleProvider";

export function CheckoutCancelClient({
  copy,
  translationNotice,
  orderId, token, provider = "stripe", returnToken,
}: {
  copy: CheckoutCancelCopy;
  translationNotice: string;
  orderId?: string; token?: string; provider?: PaymentProvider; returnToken?: string;
}) {
  const { locale } = useSiteLocale();
  const checkoutUrl = getCheckoutUrl(locale);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!orderId || !token) return;
    let cancelled = false;
    const query = new URLSearchParams({ order_id: orderId, token, provider });
    if (returnToken) query.set("return_token", returnToken);
    const appStatus = (status: "success" | "cancel") => {
      const destination = new URL("/api/locale", `${siteConfig.appUrl}/`);
      destination.searchParams.set("locale", locale);
      destination.searchParams.set("next", `/checkout/${status}?${query}`);
      window.location.replace(destination.toString());
    };
    void (async () => {
      const result = await apiRequest<{ order: { status: string; planCode?: string; billingKind?: string; returnContext?: CheckoutReturnContext | null }; verification?: PaymentVerification }>(`/api/payments/orders/${encodeURIComponent(orderId)}?${new URLSearchParams({ token, provider })}`);
      if (cancelled) return;
      if (!result.ok) { setError(result.error); return; }
      if (result.data.order.status === "paid" || result.data.verification && ["waiting_fulfillment", "fulfillment_failed", "verification_failed"].includes(result.data.verification.status)) { appStatus("success"); return; }
      if (!result.data.order.returnContext) { appStatus("cancel"); return; }
      let handoff = await apiRequest<{ returnContext: CheckoutReturnContext }>(`/api/payments/orders/${encodeURIComponent(orderId)}/return`, {
        method: "POST", body: JSON.stringify(returnToken ? { returnToken } : {}),
      });
      if (!handoff.ok && handoff.status === 409 && returnToken) {
        handoff = await apiRequest<{ returnContext: CheckoutReturnContext }>(`/api/payments/orders/${encodeURIComponent(orderId)}/return`, { method: "POST", body: "{}" });
      }
      if (cancelled) return;
      if (!handoff.ok) {
        if (handoff.status === 401) appStatus("cancel");
        else setError(handoff.error);
        return;
      }
      const context = handoff.data.returnContext;
      if (context.site === "app") { appStatus("cancel"); return; }
      const path = validateCheckoutReturnPath("www", context.path);
      if (!path) { setError(copy.body); return; }
      const destination = new URL(path, `${siteConfig.siteUrl}/`);
      destination.searchParams.set("checkout_cancelled", "1");
      if (result.data.order.planCode) destination.searchParams.set("plan", result.data.order.planCode);
      if (result.data.order.billingKind) destination.searchParams.set("billing", result.data.order.billingKind);
      destination.searchParams.set("provider", provider);
      // No payment token survives the authenticated handoff into a business URL.
      window.location.replace(destination.toString());
    })();
    return () => { cancelled = true; };
  }, [orderId, token, provider, returnToken, locale, copy.body]);

  return (
    <div className="surface-panel stack-xl">
      <div className="stack-sm">
        <StatusPill tone="amber">{copy.badge}</StatusPill>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
        {error ? <p role="alert" className="form-status error">{error}</p> : null}
        {translationNotice ? <p className="helper-copy" role="note">{translationNotice}</p> : null}
      </div>

      <div className="button-row">
        <a href={checkoutUrl} className="public-button primary">{copy.retry}</a>
        <a href={localizePublicHref("/", locale)} className="public-button tertiary">{copy.home}</a>
      </div>

      <div className="metric-grid">
        <MetricCard label={copy.stateLabel} value={copy.stateValue} body={copy.stateBody} />
        <MetricCard label={copy.noteLabel} value={copy.noteValue} body={copy.noteBody} />
      </div>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">{copy.nextTitle}</h2>
        {copy.nextSteps.map((item) => <p key={item} className="body-copy">{item}</p>)}
        <div className="button-row">
          <a href={localizePublicHref(getSupportUrl("payment", "checkout-cancel"), locale)} className="public-button tertiary">
            {copy.contact}
          </a>
        </div>
      </Panel>
    </div>
  );
}
