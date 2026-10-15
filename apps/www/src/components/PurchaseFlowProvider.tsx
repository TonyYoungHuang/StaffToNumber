"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { SupportedLocale } from "@score/i18n";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import type { HomepageWorkbenchCopy } from "../lib/homepage-localization/types";
import type { PurchaseFlowCopy } from "../lib/purchase-copy";
import { clearPendingPurchase, defaultPurchaseSelection, purchaseSelectionKey, readPendingPurchase, readPurchaseSelection, rememberPurchaseSelection, savePendingPurchase, savePurchaseReturn, SESSION_CHANGED_EVENT, type PurchaseSelection } from "../lib/purchase-flow";
import { localizePublicHref } from "../lib/locale-routing";
import { siteConfig } from "../lib/site";
import { GoogleOneTap } from "./GoogleOneTap";
import { HomeGoogleSignIn } from "./HomeGoogleSignIn";
import styles from "./PurchaseFlow.module.css";
import { completePurchaseIntent, persistentPurchaseIntent, purchaseIntentSignature, purchaseReturnContext, rememberPurchaseOrder, shouldReplacePurchaseIntent } from "../lib/checkout-return";
import { getPurchaseRecoveryCopy } from "../lib/purchase-copy";

type User = { id: string; email: string };
type AuthPayload = { user: User; isNewUser?: boolean };
type Purchase = PurchaseSelection & { name: string; cycle: string; price: string };
type CheckoutResult = { url: string | null; orderId: string; token: string; status?: string; order?: { purchaseStatus?: string } };
type RecoverableOrder = { id: string; token: string; provider: string; planCode?: string; billingKind: string; targetDocumentId?: string | null };
type FlowContext = {
  user: User | null;
  selected: PurchaseSelection | null;
  busy: boolean;
  copy: PurchaseFlowCopy;
  signIn: (mode?: "login" | "register") => void;
  select: (selection: PurchaseSelection) => void;
  purchase: (plan: Purchase) => void;
};
const Context = createContext<FlowContext | null>(null);
export function usePurchaseFlow() {
  const context = useContext(Context);
  if (!context) throw new Error("PurchaseFlowProvider is required.");
  return context;
}

export function PurchaseFlowProvider({ children, locale, auth, copy }: {
  children: ReactNode; locale: SupportedLocale; auth: HomepageWorkbenchCopy; copy: PurchaseFlowCopy;
}) {
  const [sessionReady, setSessionReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<PurchaseSelection | null>(() => defaultPurchaseSelection());
  const [pending, setPending] = useState<Purchase | null>(null);
  const [open, setOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const authLock = useRef(false);
  const checkoutLock = useRef(false);
  const [recoveryOrders, setRecoveryOrders] = useState<RecoverableOrder[]>([]);
  const allowNewPurchase = useRef(false);
  const recoveryCopy = getPurchaseRecoveryCopy(locale);
  const sessionRequest = useRef<ReturnType<typeof apiRequest<AuthPayload>> | null>(null);
  const pendingRef = useRef<Purchase | null>(null);
  const resumePurchase = useRef(false);

  const refreshSession = useCallback(() => {
    const request = apiRequest<AuthPayload>("/api/auth/me");
    sessionRequest.current = request;
    void request.then(result => {
      if (sessionRequest.current === request) { setUser(result.ok ? result.data.user : null); setSessionReady(result.ok || result.status === 401); }
    });
    return request;
  }, []);

  useEffect(() => {
    refreshSession();
    setSelected(readPurchaseSelection(window.location.search) ?? defaultPurchaseSelection(window.location.search));
    const returned = new URLSearchParams(window.location.search);
    if (returned.has("checkout_cancelled") || returned.get("checkoutResult") === "cancelled") setNotice({ text: recoveryCopy.cancelled });
    const sync = () => { void refreshSession(); };
    const restore = () => {
      checkoutLock.current = false; setBusy(false); setNotice(null); sync();
      setSelected(readPurchaseSelection(window.location.search) ?? defaultPurchaseSelection(window.location.search));
    };
    window.addEventListener(SESSION_CHANGED_EVENT, sync);
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, sync);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", sync);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const position = { left: window.scrollX, top: window.scrollY, behavior: "instant" as ScrollBehavior };
    document.body.style.overflow = "hidden";
    element.showModal();
    window.scrollTo(position);
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      window.scrollTo(position);
    };
  }, [open]);

  const dismissAuth = useCallback(() => {
    if (authLock.current) return;
    pendingRef.current = null;
    setPending(null);
    clearPendingPurchase();
    setOpen(false);
  }, []);

  const showSignIn = useCallback((plan: Purchase | null, mode: "login" | "register" = "login") => {
    pendingRef.current = plan;
    setPending(plan);
    if (plan) savePendingPurchase(plan);
    setAuthError(null); setMode(mode); setPassword(""); setEmailOpen(!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID); setOpen(true);
  }, []);
  const signIn = useCallback((mode?: "login" | "register") => showSignIn(null, mode), [showSignIn]);
  const select = useCallback((selection: PurchaseSelection) => { setSelected(selection); rememberPurchaseSelection(selection); }, []);


  async function authenticate(path: "login" | "register" | "google", body: Record<string, string>) {
    if (authLock.current) return;
    authLock.current = true; setAuthBusy(true); setAuthError(null);
    try {
      const result = await apiRequest<AuthPayload>(`/api/auth/${path}`, { method: "POST", body: JSON.stringify(body) });
      if (!result.ok) { setAuthError(result.error || auth.authFailed); if (path === "google") setEmailOpen(true); return; }
      const plan = pendingRef.current ?? readPendingPurchase();
      setUser(result.data.user); setOpen(false); setPassword("");
      setNotice({ text: plan ? copy.signedIn : auth.signedIn });
      trackFunnelEvent(result.data.isNewUser || path === "register" ? "sign_up" : "login", { method: path === "google" ? "google" : "email" });
      window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
      if (plan) {
        pendingRef.current = plan;
        setPending(plan);
        resumePurchase.current = true;
      }
    } finally { authLock.current = false; setAuthBusy(false); }
  }

  async function purchase(plan: Purchase, explicitPurchase = false) {
    if (checkoutLock.current) return;
    checkoutLock.current = true; setBusy(true); setNotice(null);
    const returnContext = purchaseReturnContext(window.location);
    pendingRef.current = plan;
    setSelected(plan); setPending(plan); rememberPurchaseSelection(plan); savePendingPurchase(plan);
    let navigating = false;
    try {
      let account = user;
      if (!account) {
        const result = await (sessionRequest.current ?? refreshSession());
        if (!result.ok) {
          if (result.status === 401) showSignIn(plan);
          else { clearPendingPurchase(); setNotice({ text: result.error, error: true }); }
          return;
        }
        account = result.data.user; setUser(account);
      }
      const signature = purchaseIntentSignature(account.id, locale, purchaseSelectionKey(plan), returnContext);
      let intent = persistentPurchaseIntent(signature, window.localStorage, undefined, returnContext);
      let previous = await apiRequest<CheckoutResult>(`/api/payments/orders/by-intent?${new URLSearchParams({ provider: plan.provider, intent_id: intent.key })}`);
      if (previous.ok && shouldReplacePurchaseIntent(previous.data.status, previous.data.order?.purchaseStatus, explicitPurchase, allowNewPurchase.current)) {
        rememberPurchaseOrder(signature, intent, previous.data.orderId, window.localStorage);
        completePurchaseIntent(previous.data.orderId, window.localStorage);
        intent = persistentPurchaseIntent(signature, window.localStorage, undefined, returnContext);
        previous = await apiRequest<CheckoutResult>(`/api/payments/orders/by-intent?${new URLSearchParams({ provider: plan.provider, intent_id: intent.key })}`);
      }
      const savedReturnContext = intent.returnContext ?? returnContext;
      if (!previous.ok && previous.status !== 404) { setNotice({ text: previous.error, error: true }); return; }
      if (previous.ok && previous.data.status === "paid" && explicitPurchase) {
        setRecoveryOrders([{ id: previous.data.orderId, token: previous.data.token, provider: plan.provider, planCode: plan.planCode, billingKind: plan.billingKind, targetDocumentId: returnContext.targetDocumentId }]);
        return;
      }
      if (!previous.ok && !allowNewPurchase.current) {
        const owned = await apiRequest<{ orders: RecoverableOrder[] }>("/api/payments/orders?pending=1");
        if (!owned.ok) { setNotice({ text: owned.error, error: true }); return; }
        const candidates = owned.data.orders.filter(order => order.provider === plan.provider && order.billingKind === plan.billingKind
          && order.planCode === plan.planCode && (order.targetDocumentId ?? null) === (returnContext.targetDocumentId ?? null));
        if (candidates.length) { setRecoveryOrders(candidates); return; }
      }
      allowNewPurchase.current = false;
      const result = previous.ok && (previous.data.url || ["paid", "cancelled", "failed"].includes(previous.data.status ?? "")) ? previous : await apiRequest<CheckoutResult>("/api/payments/checkout/authenticated", {
        method: "POST", headers: { "Idempotency-Key": intent.key },
        body: JSON.stringify({ provider: plan.provider, locale, planCode: plan.planCode, billingKind: plan.billingKind, seatQuantity: 1, ...savedReturnContext }),
      });
      if (!result.ok) {
        if (result.status === 401) { setUser(null); sessionRequest.current = null; showSignIn(plan); }
        else { clearPendingPurchase(); pendingRef.current = null; setPending(null); setNotice({ text: result.error, error: true }); }
        return;
      }
      rememberPurchaseOrder(signature, intent, result.data.orderId, window.localStorage);
      if (["paid", "cancelled", "failed"].includes(result.data.status ?? "")) {
        const query = new URLSearchParams({ order_id: result.data.orderId, token: result.data.token, provider: plan.provider });
        window.location.assign(localizePublicHref(`/checkout/success?${query}`, locale));
        navigating = true;
        return;
      }
      if (!result.data.url) { setNotice({ text: copy.failed, error: true }); return; }
      savePurchaseReturn(result.data.orderId, window.location.search);
      clearPendingPurchase();
      pendingRef.current = null;
      setPending(null);
      trackFunnelEvent("begin_checkout", { payment_type: plan.provider, plan_code: plan.planCode, plan_kind: "individual", quantity: 1 });
      window.location.assign(result.data.url);
      navigating = true;
      return;
    } catch {
      setNotice({ text: copy.failed, error: true });
    } finally {
      if (!navigating) { checkoutLock.current = false; setBusy(false); }
    }
  }

  useEffect(() => {
    if (!resumePurchase.current || !user) return;
    const plan = pendingRef.current ?? readPendingPurchase();
    resumePurchase.current = false;
    if (!plan) return;
    void purchase(plan);
  }, [user]);

  return <Context.Provider value={{ user, selected, busy, copy, signIn, select, purchase: plan => { void purchase(plan, true); } }}>
    {children}
    {recoveryOrders.length ? <div className={styles.notice} role="status">
      <span>{recoveryCopy.found}</span>
      {recoveryOrders.map(order => <a key={order.id} href={`/checkout/success?${new URLSearchParams({ order_id: order.id, token: order.token, provider: order.provider })}`}>{recoveryCopy.resume} · {order.id}</a>)}
      <button type="button" onClick={() => { setRecoveryOrders([]); allowNewPurchase.current = true; const plan = pendingRef.current; if (plan) void purchase(plan, true); }}>{recoveryCopy.newPurchase}</button>
    </div> : null}
    <GoogleOneTap enabled={sessionReady && !user && !open} locale={locale} onDone={() => {
      void refreshSession().then(result => {
        if (!result.ok) return;
        setUser(result.data.user);
        setNotice({ text: auth.signedIn });
        window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
        const plan = pendingRef.current ?? readPendingPurchase();
        if (plan) {
          pendingRef.current = plan;
          setPending(plan);
          resumePurchase.current = true;
        }
      });
    }} />
    {notice ? <div className={`${styles.notice} ${notice.error ? styles.error : ""}`} role={notice.error ? "alert" : "status"}>
      <span>{notice.text}</span><button type="button" aria-label={auth.close} onClick={() => setNotice(null)}>×</button>
    </div> : null}
    {open ? createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby="purchase-auth-title"
      onCancel={event => { event.preventDefault(); dismissAuth(); }}
      onClick={event => { if (event.target === event.currentTarget) dismissAuth(); }}>
      <div className={styles.dialogBody}>
        <button className={styles.close} type="button" aria-label={auth.close} disabled={authBusy} onClick={dismissAuth}>×</button>
        <span className={styles.brand}>♫ ScoreTransposer</span>
        <h2 id="purchase-auth-title">{copy.authTitle}</h2>
        <p>{pending ? copy.authBody : copy.accountBody}</p>
        {pending ? <div className={styles.selection}><small>{copy.selected}</small><strong>{pending.name} · {pending.cycle}</strong><span>{pending.price}</span></div> : null}
        <HomeGoogleSignIn appUrl={siteConfig.appUrl} locale={locale} disabled={authBusy} label={auth.googleLabel} loadingLabel={auth.googleLoading} errorLabel={auth.googleFailed}
          onCredential={credential => { void authenticate("google", { credential }); }} onError={message => { setAuthError(message); setEmailOpen(true); }} />
        {!emailOpen ? <button className={styles.emailLink} type="button" onClick={() => setEmailOpen(true)}>{copy.emailAction}</button> : <>
          <div className={styles.tabs} role="group" aria-label={copy.emailAction}>{(["login", "register"] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} disabled={authBusy} onClick={() => { setMode(value); setAuthError(null); }}>{auth[value]}</button>)}</div>
          <form className={styles.form} onSubmit={event => { event.preventDefault(); void authenticate(mode, { email: email.trim(), password }); }}>
            <label>{auth.email}<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
            <label>{auth.password}<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label>
            {mode === "login" ? <a className={styles.emailLink} href={`${siteConfig.appUrl}/api/locale?${new URLSearchParams({ locale, next: "/forgot-password" })}`}>{copy.forgotPassword}</a> : null}
            <button type="submit" className="public-button primary" disabled={authBusy}>{authBusy ? auth.submitting : auth[mode]}</button>
          </form>
        </>}
        {authError ? <p role="alert" className={styles.error}>{authError}</p> : null}
        <div className={styles.legal}><a href={localizePublicHref("/terms", locale)}>{legalLabels[locale][0]}</a><span>·</span><a href={localizePublicHref("/privacy", locale)}>{legalLabels[locale][1]}</a></div>
      </div>
    </dialog>, document.body) : null}
  </Context.Provider>;
}

const legalLabels: Record<SupportedLocale, [string, string]> = {
  en: ["Terms", "Privacy"], "zh-CN": ["服务条款", "隐私政策"], "zh-TW": ["服務條款", "隱私政策"], ja: ["利用規約", "プライバシー"], ko: ["이용약관", "개인정보 보호"], fr: ["Conditions", "Confidentialité"], es: ["Condiciones", "Privacidad"], de: ["Nutzungsbedingungen", "Datenschutz"], ru: ["Условия", "Конфиденциальность"],
};
