"use client";

import { useRef, useState } from "react";
import type { PaymentProvider } from "@score/shared";
import { MetricCard, Panel, StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import type { CheckoutStartCopy } from "../lib/checkout-localization";
import { localizePublicHref } from "../lib/locale-routing";
import { getAppActivateUrl, getSupportUrl } from "../lib/site";
import { useSiteLocale } from "./SiteLocaleProvider";

type CheckoutPayload = {
  provider: PaymentProvider;
  orderId: string;
  token: string;
  url: string;
};

const providers = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDERS ?? "stripe")
  .split(",")
  .map((item) => item.trim())
  .filter((item): item is PaymentProvider => item === "stripe" || item === "paddle");

export function CheckoutClient({
  copy,
  translationNotice,
}: {
  copy: CheckoutStartCopy;
  translationNotice: string;
}) {
  const { locale } = useSiteLocale();
  const activateUrl = getAppActivateUrl(locale);
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>(providers[0] ?? "stripe");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const checkoutIntent = useRef<{ signature: string; key: string } | null>(null);

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const normalizedEmail = email.trim().toLowerCase();
    const signature = JSON.stringify({ provider, locale, email: normalizedEmail });
    if (checkoutIntent.current?.signature !== signature) {
      checkoutIntent.current = { signature, key: crypto.randomUUID() };
    }

    const result = await apiRequest<CheckoutPayload>("/api/payments/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": checkoutIntent.current.key },
      body: JSON.stringify({ provider, email: normalizedEmail, locale }),
    });

    if (!result.ok) {
      setLoading(false);
      setStatus(result.error);
      return;
    }

    trackFunnelEvent("begin_checkout", {
      payment_type: provider,
      plan_kind: "individual",
      quantity: 1,
    });
    window.location.href = result.data.url;
  }

  return (
    <div className="surface-panel stack-xl">
      <div className="stack-sm">
        <StatusPill tone="cyan">{copy.badge}</StatusPill>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
        {translationNotice ? <p className="helper-copy" role="note">{translationNotice}</p> : null}
      </div>

      <form className="form-grid" onSubmit={handleCheckout}>
        <label className="field-group">
          <span className="field-label">{copy.email}</span>
          <input
            className="field-control"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            required
          />
          <span className="helper-copy">{copy.emailHelp}</span>
        </label>

        <div className="field-group">
          <span className="field-label">{copy.provider}</span>
          <div className="feature-grid">
            {providers.map((item) => {
              const isActive = provider === item;
              const title = item === "stripe" ? copy.stripeTitle : copy.paddleTitle;
              const body = item === "stripe" ? copy.stripeBody : copy.paddleBody;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={isActive}
                  className={`glass-panel stack-sm ${isActive ? "is-selected" : ""}`}
                  onClick={() => setProvider(item)}
                  style={{ textAlign: "left", border: isActive ? "1px solid rgba(113,236,206,0.6)" : undefined }}
                >
                  <p className="item-title">{title}</p>
                  <p className="body-copy">{body}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="button-row">
          <button type="submit" className="public-button primary" disabled={loading}>
            {loading ? copy.loading : copy.button}
          </button>
          <a href={activateUrl} className="public-button secondary">{copy.activate}</a>
        </div>
      </form>

      {status ? <p className="form-status error" role="alert">{status}</p> : null}

      <div className="metric-grid">
        <MetricCard label={copy.accessLabel} value={copy.accessValue} body={copy.accessBody} />
        <MetricCard label={copy.deliveryLabel} value={copy.deliveryValue} body={copy.deliveryBody} />
        <MetricCard label={copy.supportLabel} value={copy.supportValue} body={copy.supportBody} />
      </div>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">{copy.nextTitle}</h2>
        {copy.nextSteps.map((item) => <p key={item} className="body-copy">{item}</p>)}
        <div className="button-row">
          <a href={localizePublicHref(getSupportUrl("payment", "checkout"), locale)} className="public-button tertiary">
            {copy.contact}
          </a>
        </div>
      </Panel>
    </div>
  );
}
