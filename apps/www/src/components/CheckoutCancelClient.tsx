"use client";

import { MetricCard, Panel, StatusPill } from "@score/ui";
import type { CheckoutCancelCopy } from "../lib/checkout-localization";
import { localizePublicHref } from "../lib/locale-routing";
import { getAppActivateUrl, getCheckoutUrl, getSupportUrl } from "../lib/site";
import { useSiteLocale } from "./SiteLocaleProvider";

export function CheckoutCancelClient({
  copy,
  translationNotice,
}: {
  copy: CheckoutCancelCopy;
  translationNotice: string;
}) {
  const { locale } = useSiteLocale();
  const activateUrl = getAppActivateUrl(locale);
  const checkoutUrl = getCheckoutUrl(locale);

  return (
    <div className="surface-panel stack-xl">
      <div className="stack-sm">
        <StatusPill tone="amber">{copy.badge}</StatusPill>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
        {translationNotice ? <p className="helper-copy" role="note">{translationNotice}</p> : null}
      </div>

      <div className="button-row">
        <a href={checkoutUrl} className="public-button primary">{copy.retry}</a>
        <a href={activateUrl} className="public-button secondary">{copy.activate}</a>
        <a href={localizePublicHref("/", locale)} className="public-button tertiary">{copy.home}</a>
      </div>

      <div className="metric-grid">
        <MetricCard label={copy.stateLabel} value={copy.stateValue} body={copy.stateBody} />
        <MetricCard label={copy.altLabel} value={copy.altValue} body={copy.altBody} />
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
