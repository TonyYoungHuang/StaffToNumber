"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMessage, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, getPurchaseOptionsCopy, type CheckoutBillingKind, type CheckoutPlanCode, type PaymentProvider } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { rawApiErrorOrFallback } from "../lib/billing-messages/client";
import type { CheckoutClientCopy } from "../lib/billing-messages/types";
import { AuthForm } from "./AuthForm";
import { saveCheckoutReturn, workReturnPath } from "../lib/flow-return";
import { useFlowMessages } from "../lib/flow-messages/client";
import { getOneScoreUpsellCopy, showsSeparateActivationCta } from "../lib/one-score-upsell-copy";
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

const PENDING_CHECKOUT_KEY = "scoretransposer_pending_checkout";
const PENDING_CHECKOUT_TTL_MS = 30 * 60 * 1000;

type PendingCheckout = {
  planCode: string;
  billingKind: CheckoutBillingKind;
  provider: PaymentProvider;
  planKind: "individual" | "school";
  organizationId: string;
  seatQuantity: number;
  savedAt: number;
};

function savePendingCheckout(payload: Omit<PendingCheckout, "savedAt">) {
  try {
    window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {
    /* Auto-continue can still use the in-memory resume flag. */
  }
}

function clearPendingCheckout() {
  try {
    window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    /* Ignore storage failures when clearing. */
  }
}

function readPendingCheckout(): Omit<PendingCheckout, "savedAt"> | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (!parsed || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > PENDING_CHECKOUT_TTL_MS) {
      clearPendingCheckout();
      return null;
    }
    if (parsed.billingKind !== "subscription" && parsed.billingKind !== "one_time") {
      clearPendingCheckout();
      return null;
    }
    if (parsed.provider !== "stripe" && parsed.provider !== "paddle") {
      clearPendingCheckout();
      return null;
    }
    if (parsed.planKind !== "individual" && parsed.planKind !== "school") {
      clearPendingCheckout();
      return null;
    }
    if (typeof parsed.planCode !== "string" || typeof parsed.organizationId !== "string" || typeof parsed.seatQuantity !== "number") {
      clearPendingCheckout();
      return null;
    }
    return {
      planCode: parsed.planCode,
      billingKind: parsed.billingKind,
      provider: parsed.billingKind === "one_time" ? "stripe" : parsed.provider,
      planKind: parsed.planKind,
      organizationId: parsed.organizationId,
      seatQuantity: parsed.seatQuantity,
    };
  } catch {
    clearPendingCheckout();
    return null;
  }
}

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
const defaultProvider = providers.includes("stripe") && liveProviders.has("stripe")
  ? "stripe"
  : providers.find((item) => liveProviders.has(item)) ?? providers[0] ?? "stripe";
const schoolCheckoutAvailable = process.env.NEXT_PUBLIC_SCHOOL_CHECKOUT_AVAILABLE === "true";

export function AppCheckoutClient({
  billingKind = "subscription",
  returnTo = "/scores",
  selectedPlan,
  authMessages,
  locale,
  copy,
}: {
  returnTo?: string;
  billingKind?: CheckoutBillingKind;
  selectedPlan: SelectedCheckoutPlan;
  authMessages: AuthMessageCatalog["form"];
  locale: SupportedLocale;
  copy: CheckoutClientCopy;
}) {
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "signedOut">("checking");
  const [provider, setProvider] = useState<PaymentProvider>(billingKind === "one_time" ? "stripe" : defaultProvider);
  const flow = useFlowMessages();
  const checkoutPath = `/checkout?${new URLSearchParams({ plan: selectedPlan.code, billing: billingKind, next: workReturnPath(returnTo) })}`;
  const purchaseCopy = getPurchaseOptionsCopy(locale);
  const availableProviders = billingKind === "one_time" ? providers.filter(item => item === "stripe") : providers;
  const [status, setStatus] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [planKind, setPlanKind] = useState<"individual" | "school">("individual");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [seatQuantity, setSeatQuantity] = useState(10);
  const checkoutIntent = useRef<{ signature: string; key: string } | null>(null);
  const checkoutLock = useRef(false);
  const resumeCheckout = useRef(false);
  const handleAuthenticated = useCallback(() => {
    resumeCheckout.current = true;
    setSessionState("ready");
  }, []);

  useEffect(() => {
    if (!getStoredToken()) {
      setSessionState("signedOut");
      return;
    }
    setSessionState("ready");
  }, []);

  useEffect(() => {
    if (sessionState !== "signedOut") return;
    savePendingCheckout({
      planCode: selectedPlan.code,
      billingKind,
      provider,
      planKind,
      organizationId,
      seatQuantity,
    });
  }, [sessionState, selectedPlan.code, billingKind, provider, planKind, organizationId, seatQuantity]);

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

  async function startCheckout() {
    if (checkoutLock.current) return;
    const token = getStoredToken();
    if (!token) {
      setSessionState("signedOut");
      return;
    }

    checkoutLock.current = true;
    setLoading(true);
    setStatus(null);
    savePendingCheckout({
      planCode: selectedPlan.code,
      billingKind,
      provider,
      planKind,
      organizationId,
      seatQuantity,
    });

    let navigating = false;
    try {
      const signature = JSON.stringify({ provider, billingKind, locale, planCode: selectedPlan.code, planKind, organizationId, seatQuantity });
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
          billingKind,
          locale,
          planCode: selectedPlan.code,
          organizationId: planKind === "school" ? organizationId : undefined,
          seatQuantity: planKind === "school" ? seatQuantity : 1,
        }),
      });

      if (!result.ok) {
        if ((result.data as { code?: string } | undefined)?.code === "ACTIVE_RECURRING_SUBSCRIPTION") {
          clearPendingCheckout();
          setStatus({ message: purchaseCopy.subscriptionConflict, tone: "error" });
          return;
        }
        if (result.status === 401) {
          clearStoredToken();
          setSessionState("signedOut");
          return;
        }
        clearPendingCheckout();
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

      clearPendingCheckout();
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
      saveCheckoutReturn(result.data.orderId, returnTo, checkoutPath);
      navigating = true;
      window.location.href = result.data.url;
    } finally {
      if (!navigating) {
        checkoutLock.current = false;
        setLoading(false);
      }
    }
  }

  function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void startCheckout();
  }

  useEffect(() => {
    if (sessionState !== "ready" || !resumeCheckout.current) return;
    resumeCheckout.current = false;
    // Prefer the plan already rendered (query/selector); pending only confirms intent + TTL.
    if (!readPendingCheckout() && !selectedPlan.code) return;
    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume once after auth success
  }, [sessionState]);

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
            redirectTo={checkoutPath}
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
        <p className={styles.purchaseNotice}>{billingKind === "one_time" ? purchaseCopy.oneTimeNote : purchaseCopy.subscriptionNote}</p>
        <div className={styles.checkoutSelection}>
          <span>{copy.selectedPlan}</span>
          <strong>{selectedPlan.name} · {selectedPlan.cycle}</strong>
          <small>{selectedPlan.price} · {selectedPlan.credits}</small>
        </div>
        <p className="helper-copy">{copy.accountNote}</p>

      </div>

      <form className="form-grid" onSubmit={handleCheckout} aria-label={copy.title}>
        {schoolCheckoutAvailable && billingKind === "subscription" ? (
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
        <p className="helper-copy">{copy.provider}: {provider === "stripe" ? copy.stripeTitle : copy.paddleTitle}</p>
        {availableProviders.filter(item => liveProviders.has(item)).length > 1 ? <details className="flow-details">
          <summary>{flow.paymentOptions}</summary>
          <label className="field-group"><span>{copy.provider}</span>
            <select className="field-select" value={provider} onChange={event => setProvider(event.target.value as PaymentProvider)}>
              {availableProviders.filter(item => liveProviders.has(item)).map(item => <option key={item} value={item}>{item === "stripe" ? copy.stripeTitle : copy.paddleTitle}</option>)}
            </select>
          </label>
        </details> : null}

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
      {showsSeparateActivationCta(locale) ? (
        // P5: zh card checkout above; activation-code redemption is a separate, clearly labelled path.
        <div className="stack-sm" data-plan-type="activation_code">
          <p className="micro-copy">{getOneScoreUpsellCopy(locale).activationNote}</p>
          <div className="button-row">
            <Link
              href={`${APP_ROUTES.activate}?${new URLSearchParams({ next: workReturnPath(returnTo) })}`}
              className="button button-tertiary"
              onClick={() => trackFunnelEvent("upgrade_click", { source: "checkout_activation_code", plan_type: "activation_code" })}
            >
              {getOneScoreUpsellCopy(locale).activationCta}
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
