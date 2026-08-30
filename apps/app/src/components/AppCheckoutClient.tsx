"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMessage, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, type CheckoutPlanCode, type PaymentProvider } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { rawApiErrorOrFallback } from "../lib/billing-messages/client";
import type { CheckoutClientCopy } from "../lib/billing-messages/types";
import { AuthForm } from "./AuthForm";
import styles from "./AppCheckout.module.css";

type CheckoutPayload = {
  provider: PaymentProvider;
  orderId: string;
  token: string;
  url: string;
  code?: "PAYMENT_PROVIDER_BUILDING" | "CHECKOUT_INTENT_NOTIFICATION_FAILED";
  intentNotified?: boolean;
};

type Organization = { id: string; name: string; currentRole: string };

type SelectedCheckoutPlan = {
  code: CheckoutPlanCode;
  name: string;
  cycle: string;
  price: string;
  credits: string;
};

const providers = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDERS ?? "paddle,stripe")
  .split(",")
  .map((item) => item.trim())
  .filter((item): item is PaymentProvider => item === "stripe" || item === "paddle");
const liveProviders = new Set(
  (process.env.NEXT_PUBLIC_LIVE_PAYMENT_PROVIDERS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is PaymentProvider => item === "stripe" || item === "paddle"),
);
const schoolCheckoutAvailable = process.env.NEXT_PUBLIC_SCHOOL_CHECKOUT_AVAILABLE === "true";

export function AppCheckoutClient({
  selectedPlan,
  authMessages,
  locale,
  copy,
}: {
  selectedPlan: SelectedCheckoutPlan;
  authMessages: AuthMessageCatalog["form"];
  locale: SupportedLocale;
  copy: CheckoutClientCopy;
}) {
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "signedOut">("checking");
  const [provider, setProvider] = useState<PaymentProvider>(providers.find((item) => liveProviders.has(item)) ?? providers[0] ?? "stripe");
  const [status, setStatus] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [planKind, setPlanKind] = useState<"individual" | "school">("individual");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [seatQuantity, setSeatQuantity] = useState(10);
  const checkoutIntent = useRef<{ signature: string; key: string } | null>(null);
  const handleAuthenticated = useCallback(() => setSessionState("ready"), []);

  useEffect(() => {
    if (!getStoredToken()) {
      setSessionState("signedOut");
      return;
    }
    setSessionState("ready");
  }, []);

  useEffect(() => {
    if (!schoolCheckoutAvailable || sessionState !== "ready") return;
    const token = getStoredToken();
    if (!token) return;
    void apiRequest<{ organizations: Organization[] }>("/api/education/organizations", { headers: { Authorization: `Bearer ${token}` } })
      .then((result) => {
        if (!result.ok) return;
        const manageable = result.data.organizations.filter((organization) => organization.currentRole === "owner" || organization.currentRole === "admin");
        setOrganizations(manageable);
        setOrganizationId((current) => manageable.some((organization) => organization.id === current) ? current : manageable[0]?.id ?? "");
      });
  }, [sessionState]);

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      setSessionState("signedOut");
      return;
    }

    setLoading(true);
    setStatus(null);

    const signature = JSON.stringify({ provider, locale, planCode: selectedPlan.code, planKind, organizationId, seatQuantity });
    if (checkoutIntent.current?.signature !== signature) {
      checkoutIntent.current = { signature, key: crypto.randomUUID() };
    }

    const result = await apiRequest<CheckoutPayload>("/api/payments/checkout/authenticated", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": checkoutIntent.current.key,
      },
      body: JSON.stringify({
        provider,
        locale,
        planCode: selectedPlan.code,
        organizationId: planKind === "school" ? organizationId : undefined,
        seatQuantity: planKind === "school" ? seatQuantity : 1,
      }),
    });

    if (!result.ok) {
      setLoading(false);
      if (result.status === 401) {
        clearStoredToken();
        setSessionState("signedOut");
        return;
      }
      if (result.error?.trim()) {
        setStatus({ message: result.error, tone: "error" });
        return;
      }
      if (result.data?.code === "PAYMENT_PROVIDER_BUILDING") {
        const providerName = provider === "stripe" ? copy.stripeTitle : copy.paddleTitle;
        setStatus({ message: formatMessage(copy.providerBuildingTemplate, { provider: providerName }), tone: "success" });
        return;
      }
      if (result.data?.code === "CHECKOUT_INTENT_NOTIFICATION_FAILED") {
        setStatus({ message: copy.notificationFailed, tone: "error" });
        return;
      }
      setStatus({ message: rawApiErrorOrFallback(result.error, copy.fallbackError), tone: "error" });
      return;
    }

    trackFunnelEvent("begin_checkout", {
      payment_type: provider,
      plan_code: selectedPlan.code,
      plan_kind: planKind,
      quantity: planKind === "school" ? seatQuantity : 1,
      items: [{
        item_id: selectedPlan.code,
        item_name: selectedPlan.name,
        item_variant: selectedPlan.cycle,
        quantity: planKind === "school" ? seatQuantity : 1,
      }],
    });
    window.location.href = result.data.url;
  }

  if (sessionState !== "ready") {
    return (
      <section id="checkout-action" className={styles.accessPanel} aria-labelledby="checkout-sign-in-title">
        <div className={styles.accessCopy}>
          <p className="eyebrow">{copy.signInEyebrow}</p>
          <h2 id="checkout-sign-in-title" className={styles.sectionHeading}>{copy.signInTitle}</h2>
          <p className="body-copy large">{copy.signInBody}</p>
          <div className={styles.checkoutSelection}>
            <span>{copy.selectedPlan}</span>
            <strong>{selectedPlan.name} · {selectedPlan.cycle}</strong>
            <small>{selectedPlan.price} · {selectedPlan.credits}</small>
          </div>
          <ul className={styles.accessPoints}>
            {copy.signInPoints.map((point) => <li key={point}>{point}</li>)}
          </ul>
          {sessionState === "checking" ? <p className="helper-copy" role="status" aria-live="polite">{copy.checking}</p> : null}
        </div>
        <div className="auth-card stack-lg">
          <AuthForm
            mode="login"
            redirectTo={`${APP_ROUTES.checkout}?plan=${selectedPlan.code}`}
            onAuthenticated={handleAuthenticated}
            messages={authMessages}
          />
        </div>
      </section>
    );
  }

  return (
    <section id="checkout-action" className={`${styles.paymentPanel} stack-lg`} aria-labelledby="checkout-payment-title">
      <div className="stack-sm">
        <p className="eyebrow">{copy.checkoutEyebrow}</p>
        <h2 id="checkout-payment-title" className={styles.sectionHeading}>{copy.title}</h2>
        <p className="body-copy large">{copy.body}</p>
        <div className={styles.checkoutSelection}>
          <span>{copy.selectedPlan}</span>
          <strong>{selectedPlan.name} · {selectedPlan.cycle}</strong>
          <small>{selectedPlan.price} · {selectedPlan.credits}</small>
        </div>
        <p className="helper-copy">{copy.accountNote}</p>
        <p className="helper-copy">{copy.intentNote}</p>
      </div>

      <form className="form-grid" onSubmit={handleCheckout} aria-label={copy.title}>
        {schoolCheckoutAvailable ? (
          <div className="field-group">
            <span className="field-label">{copy.plan}</span>
            <div className="button-row" role="group" aria-label={copy.plan}>
              <button type="button" className={`button ${planKind === "individual" ? "button-primary" : "button-secondary"}`} aria-pressed={planKind === "individual"} onClick={() => setPlanKind("individual")}>{copy.individual}</button>
              <button type="button" className={`button ${planKind === "school" ? "button-primary" : "button-secondary"}`} aria-pressed={planKind === "school"} onClick={() => setPlanKind("school")}>{copy.school}</button>
            </div>
          </div>
        ) : null}
        {planKind === "school" ? (
          <div className="form-grid two-column">
            <label className="field-group">
              <span className="field-label">{copy.organization}</span>
              <select className="field-select" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required>
                <option value="">{copy.organizationPlaceholder}</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
              {organizations.length === 0 ? <span className="micro-copy" role="status">{copy.noOrganizations}</span> : null}
            </label>
            <label className="field-group">
              <span className="field-label">{copy.seats}</span>
              <input
                className="field-control"
                type="number"
                min={2}
                max={100000}
                step={1}
                value={seatQuantity}
                onChange={(event) => setSeatQuantity(Math.max(2, Number(event.target.value) || 2))}
                aria-describedby="checkout-seat-help"
                required
              />
              <span id="checkout-seat-help" className="micro-copy">{copy.seatsHelp}</span>
            </label>
          </div>
        ) : null}
        <div className="field-group">
          <span className="field-label">{copy.provider}</span>
          <div className="feature-grid" role="group" aria-label={copy.provider}>
            {providers.map((item) => {
              const isActive = provider === item;
              const isLive = liveProviders.has(item);
              const title = item === "stripe" ? copy.stripeTitle : copy.paddleTitle;
              const body = item === "stripe"
                ? isLive ? copy.stripeLiveBody : copy.stripeBuildingBody
                : isLive ? copy.paddleLiveBody : copy.paddleBuildingBody;
              const statusLabel = isLive ? copy.available : item === "stripe" ? copy.building : copy.waiting;
              return (
                <button
                  key={item}
                  type="button"
                  className={`glass-panel stack-sm ${isActive ? "is-selected" : ""}`}
                  aria-pressed={isActive}
                  aria-label={`${title}: ${statusLabel}`}
                  onClick={() => setProvider(item)}
                  style={{ textAlign: "left", border: isActive ? "1px solid rgba(113,236,206,0.6)" : undefined }}
                >
                  <p className="item-title">{title} <span className={`status-chip ${isLive ? "tone-green" : "tone-amber"}`}>{statusLabel}</span></p>
                  <p className="body-copy">{body}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="button-row">
          <button type="submit" className="button button-primary" disabled={loading || (planKind === "school" && !organizationId)}>
            {loading ? copy.loading : liveProviders.has(provider) ? copy.button : copy.intentButton}
          </button>
        </div>
      </form>

      {status ? (
        <p className={`form-status ${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
