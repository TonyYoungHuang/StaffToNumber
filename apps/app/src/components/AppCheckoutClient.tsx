"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportedLocale } from "@score/i18n";
import { getPurchaseOptionsCopy, type CheckoutIntendedAction, type CheckoutBillingKind, type PurchasePlanCode, type PaymentProvider } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { rawApiErrorOrFallback } from "../lib/billing-messages/client";
import type { CheckoutClientCopy } from "../lib/billing-messages/types";
import { AuthForm } from "./AuthForm";
import { saveCheckoutReturn, workReturnPath } from "../lib/flow-return";
import { useFlowMessages } from "../lib/flow-messages/client";
import { getOneScoreUpsellCopy } from "../lib/one-score-upsell-copy";
import styles from "./AppCheckout.module.css";
import { getPaymentRecoveryCopy } from "@score/shared";
import { getScorePassCopy } from "../lib/billing-messages/client";
import type { CheckoutReturnState } from "@score/shared";
import { checkoutReturnContext, lookupAndStartCheckout, prepareCheckout, checkoutLoginPath } from "../lib/checkout-flow";
import { getCheckoutReturnCopy } from "../lib/checkout-return-copy";

type CheckoutPayload = {
  provider: PaymentProvider;
  orderId: string;
  token: string;
  url: string;
  code?: "PAYMENT_PROVIDER_BUILDING" | "CHECKOUT_PREPARATION_FAILED";
};

type Organization = { id: string; name: string; currentRole: string };

type SelectedCheckoutPlan = {
  code: PurchasePlanCode;
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
  billingKind = "one_time",
  returnTo = "/scores",
  targetDocumentId,
  intendedAction,
  returnState,
  isTopUp = false,
  continueAfterLogin = false,
  originalOrderId,
  originalOrderToken,
  selectedPlan,
  authMessages,
  locale,
  copy,
}: {
  returnTo?: string;
  targetDocumentId?: string;
  intendedAction?: CheckoutIntendedAction;
  returnState?: CheckoutReturnState;
  isTopUp?: boolean;
  continueAfterLogin?: boolean;
  originalOrderId?: string;
  originalOrderToken?: string;
  billingKind?: CheckoutBillingKind;
  selectedPlan: SelectedCheckoutPlan;
  authMessages: AuthMessageCatalog["form"];
  locale: SupportedLocale;
  copy: CheckoutClientCopy;
}) {
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "signedOut">("checking");
  const [provider, setProvider] = useState<PaymentProvider>(billingKind === "one_time" ? "stripe" : defaultProvider);
  const flow = useFlowMessages();
  const checkoutParams = new URLSearchParams({ plan: selectedPlan.code, billing: billingKind, next: workReturnPath(returnTo) });
  if (targetDocumentId) checkoutParams.set("targetDocumentId", targetDocumentId);
  if (intendedAction) checkoutParams.set("intendedAction", JSON.stringify(intendedAction));
  if (returnState) checkoutParams.set("returnState", JSON.stringify(returnState));
  if (isTopUp) checkoutParams.set("passMode", "top_up");
  if (continueAfterLogin) checkoutParams.set("continue", "1");
  if (originalOrderId) checkoutParams.set("order_id", originalOrderId);
  if (originalOrderToken) checkoutParams.set("token", originalOrderToken);
  const checkoutPath = `/checkout?${checkoutParams}`;
  const scorePassCopy = getScorePassCopy(locale);
  const purchaseCopy = getPurchaseOptionsCopy(locale);
  const recoveryCopy = getPaymentRecoveryCopy(locale);
  const availableProviders = billingKind === "one_time" ? providers.filter(item => item === "stripe") : providers;
  const [status, setStatus] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [recoverableOrders, setRecoverableOrders] = useState<Array<{ id: string; provider: string; token: string; status: string; planCode?: string; billingKind: string; targetDocumentId?: string; checkoutUrl?: string }>>([]);
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
    if (sessionState !== "ready") return;
    const authToken = getStoredToken(); const controller = new AbortController();
    void apiRequest<{ orders: typeof recoverableOrders }>("/api/payments/orders?pending=1", { signal: controller.signal, headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined }).then(result => {
      if (!result.ok || controller.signal.aborted) return;
      setRecoverableOrders(result.data.orders.filter(order => order.planCode === selectedPlan.code && order.billingKind === billingKind && (order.targetDocumentId ?? null) === (targetDocumentId ?? null)));
    });
    return () => controller.abort();
  }, [sessionState, selectedPlan.code, billingKind, targetDocumentId]);

  useEffect(() => {
    if (!getStoredToken()) {
      let active = true;
      void apiRequest("/api/auth/me").then(result => {
        if (!active) return;
        resumeCheckout.current = new URLSearchParams(window.location.search).get("continue") === "1";
        setSessionState(result.ok ? "ready" : "signedOut");
      });
      return () => { active = false; };
    }
    resumeCheckout.current = new URLSearchParams(window.location.search).get("continue") === "1";
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

  async function startCheckout(explicitPurchase = false) {
    if (checkoutLock.current) return;
    const token = getStoredToken() ?? "";
    if (!token && sessionState !== "ready") {
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
      if (originalOrderId) {
        const original = await apiRequest<{ order: { status: string; checkoutUrl?: string } }>(`/api/payments/orders/${encodeURIComponent(originalOrderId)}/owned`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!original.ok) { setStatus({ message: original.error, tone: "error" }); return; }
        navigating = true;
        window.location.assign(original.data.order.status === "pending" && original.data.order.checkoutUrl ? original.data.order.checkoutUrl : checkoutLoginPath("/checkout/success", { order_id: originalOrderId, token: originalOrderToken, provider }));
        return;
      }
      if (!(await prepareCheckout())) { setStatus({ message: scorePassCopy.continueFailed, tone: "error" }); return; }
      const result = await lookupAndStartCheckout({
          provider,
          billingKind,
          locale,
          planCode: selectedPlan.code,
          passMode: isTopUp ? "top_up" : undefined,
          targetDocumentId,
          intendedAction,
          ...checkoutReturnContext(returnTo, intendedAction, returnState),
          organizationId: planKind === "school" ? organizationId : undefined,
          seatQuantity: planKind === "school" ? seatQuantity : 1,
      }, token, undefined, undefined, explicitPurchase);

      if (!result.ok) {
        if (result.data?.code === "CHECKOUT_RECOVERY_REQUIRED") { setStatus({ message: getCheckoutReturnCopy(locale).recover, tone: "error" }); return; }
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
        if (result.data?.code === "PAYMENT_PROVIDER_BUILDING") {
          setStatus({ message: recoveryCopy.providerBuilding, tone: "error" });
          return;
        }
        setStatus({ message: `${recoveryCopy.preparingFailed} ${rawApiErrorOrFallback(result.error, copy.fallbackError)}`, tone: "error" });
        return;
      }

      if (!result.data?.url || !/^(https?:\/\/|\/checkout\/success\?)/u.test(result.data.url)) {
        setStatus({ message: recoveryCopy.preparingFailed, tone: "error" });
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
    } catch {
      setStatus({ message: recoveryCopy.preparingFailed, tone: "error" });
    } finally {
      if (!navigating) {
        checkoutLock.current = false;
        setLoading(false);
      }
    }
  }

  function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void startCheckout(true);
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
            redirectTo={checkoutLoginPath(checkoutPath, { continue: "1" })}
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
        <p className={styles.purchaseNotice}>{selectedPlan.code === "single-score" ? targetDocumentId ? scorePassCopy.sharedCredits : getOneScoreUpsellCopy(locale).passNote : billingKind === "one_time" ? purchaseCopy.oneTimeNote : purchaseCopy.subscriptionNote}</p>
        <div className={styles.checkoutSelection}>
          <span>{copy.selectedPlan}</span>
          <strong>{selectedPlan.name} · {selectedPlan.cycle}</strong>
          <small>{selectedPlan.price} · {selectedPlan.credits}</small>
        </div>
        <p className="helper-copy">{copy.accountNote}</p>
        {targetDocumentId ? <p className="helper-copy">{scorePassCopy.passTarget} {scorePassCopy.sharedCredits}</p> : null}

      </div>

      {recoverableOrders.length ? <div className="stack-sm"><p>{getCheckoutReturnCopy(locale).recover}</p><div className="button-row">{recoverableOrders.map(order => <a key={order.id} href={order.status === "pending" && order.checkoutUrl ? order.checkoutUrl : `/checkout/success?${new URLSearchParams({ order_id: order.id, token: order.token, provider: order.provider })}`} className="button button-secondary">{order.planCode} · {order.id.slice(-8)}</a>)}</div></div> : null}

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
          <button type="submit" className="button button-primary" data-plan-type={selectedPlan.code === "single-score" ? "one_score" : "subscription"} disabled={loading || (planKind === "school" && !organizationId)}>
            {loading ? copy.loading : selectedPlan.code === "single-score" ? getOneScoreUpsellCopy(locale).passCta : liveProviders.has(provider) ? copy.button : copy.intentButton}
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
