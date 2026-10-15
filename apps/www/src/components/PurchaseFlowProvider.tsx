"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { SupportedLocale } from "@score/i18n";
import { consumeGoogleRedirectResult, getGoogleAuthCopy, isInAppBrowser, launchGoogleSignIn, prepareGoogleSignIn, rememberGoogleAccount } from "@score/shared";
import { API_BASE_URL, apiRequest } from "../lib/api";
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
import { googleLoginDestination, publicLoginResume, publicSessionState, type PublicSessionState } from "../lib/google-login";

type User = { id: string; email: string };
type AuthPayload = { user: User; isNewUser?: boolean };
type Purchase = PurchaseSelection & { name: string; cycle: string; price: string };
type CheckoutResult = { url: string | null; orderId: string; token: string; status?: string; order?: { purchaseStatus?: string } };
type RecoverableOrder = { id: string; token: string; provider: string; planCode?: string; billingKind: string; targetDocumentId?: string | null };
type FlowContext = {
  user: User | null;
  session: PublicSessionState;
  selected: PurchaseSelection | null;
  busy: boolean;
  copy: PurchaseFlowCopy;
  signIn: (mode?: "login" | "register", options?: { destination?: string; automatic?: boolean }) => void;
  emailSignIn: () => void;
  select: (selection: PurchaseSelection) => void;
  purchase: (plan: Purchase) => void;
};
const Context = createContext<FlowContext | null>(null);
function reserveGooglePopup() {
  try { return window.open("", "score-google-login", "popup,width=520,height=650"); }
  catch { return null; }
}
export function usePurchaseFlow() {
  const context = useContext(Context);
  if (!context) throw new Error("PurchaseFlowProvider is required.");
  return context;
}

export function PurchaseFlowProvider({ children, locale, auth, copy }: {
  children: ReactNode; locale: SupportedLocale; auth: HomepageWorkbenchCopy; copy: PurchaseFlowCopy;
}) {
  const [session, setSession] = useState<PublicSessionState>("checking");
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
  const [googleBusy, setGoogleBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const destination = useRef<string | undefined>(undefined);
  const googleCopy = getGoogleAuthCopy(locale);
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gisFallback, setGisFallback] = useState(false);
  const googleLogin = useRef<ReturnType<typeof launchGoogleSignIn>>(undefined);
  const authLock = useRef(false);
  const checkoutLock = useRef(false);
  const [recoveryOrders, setRecoveryOrders] = useState<RecoverableOrder[]>([]);
  const allowNewPurchase = useRef(false);
  const recoveryCopy = getPurchaseRecoveryCopy(locale);
  const sessionRequest = useRef<ReturnType<typeof apiRequest<AuthPayload>> | null>(null);
  const pendingRef = useRef<Purchase | null>(null);
  const pendingExpires = useRef(0);
  const pendingPath = useRef("");
  const resumePurchase = useRef(false);
  const checkingLogin = useRef(false);

  const refreshSession = useCallback(() => {
    const request = apiRequest<AuthPayload>("/api/auth/me");
    sessionRequest.current = request;
    void request.then(result => {
      if (sessionRequest.current === request) {
        setSession(publicSessionState(result.ok, result.ok ? undefined : result.status));
        if (result.ok || result.status === 401) setUser(result.ok ? result.data.user : null);
      }
    });
    return request;
  }, []);

  useEffect(() => {
    void prepareGoogleSignIn(API_BASE_URL);
    setInApp(isInAppBrowser(navigator.userAgent));
    const redirectResult = consumeGoogleRedirectResult();
    if (redirectResult === "disallowed_useragent") { setInApp(true); setOpen(true); setEmailOpen(true); }
    else if (redirectResult && redirectResult !== "success") { setOpen(true); setEmailOpen(true); setGisFallback(redirectResult === "unavailable"); }
    void refreshSession().then(result => {
      try {
        const raw = window.sessionStorage.getItem("scoretransposer_www_auth_resume");
        if (!raw) return;
        window.sessionStorage.removeItem("scoretransposer_www_auth_resume");
        const resume = publicLoginResume(raw, `${window.location.pathname}${window.location.search}${window.location.hash}`, siteConfig.appUrl);
        if (!resume) return;
        destination.current = resume.destination;
        pendingRef.current = resume.purchase === true ? readPendingPurchase() : null;
        pendingExpires.current = pendingRef.current ? resume.savedAt + 10 * 60_000 : 0;
        pendingPath.current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (result.ok && redirectResult === "success") finishSignIn(result.data.user, "google");
        else if (!result.ok && result.status === 401) showSignIn(pendingRef.current);
      } catch { /* Invalid interrupted login cannot start a purchase. */ }
    });
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

  const dismissAuth = useCallback(() => {
    if (authLock.current) return;
    pendingRef.current = null;
    setPending(null);
    clearPendingPurchase();
    googleLogin.current?.cancel();
    setGoogleBusy(false);
    destination.current = undefined;
    setOpen(false);
  }, []);

  const showSignIn = useCallback((plan: Purchase | null, mode: "login" | "register" = "login") => {
    pendingRef.current = plan;
    setPending(plan);
    if (plan) savePendingPurchase(plan);
    setAuthError(null); setMode(mode); setPassword(""); setEmailOpen(!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID); setOpen(true);
  }, []);
  function finishSignIn(account: User, method: "google" | "email", newAccount = false) {
    const plan = pendingExpires.current > Date.now() && pendingPath.current === `${window.location.pathname}${window.location.search}${window.location.hash}` ? pendingRef.current : null;
    if (!plan) { pendingRef.current = null; setPending(null); clearPendingPurchase(); }
    setUser(account); setSession("signed-in"); setOpen(false); setPassword("");
    setNotice({ text: plan ? copy.signedIn : auth.signedIn });
    if (method === "google") rememberGoogleAccount(account.email);
    trackFunnelEvent(newAccount ? "sign_up" : "login", { method });
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
    if (plan) { pendingRef.current = plan; setPending(plan); resumePurchase.current = true; }
    else if (destination.current) { const target = destination.current; destination.current = undefined; window.location.assign(target); }
  }

  function startGoogle(plan: Purchase | null, authMode: "login" | "register" = "login", popup?: Window | null, reserved = false) {
    googleLogin.current?.cancel();
    setGoogleBusy(true);
    pendingRef.current = plan; setPending(plan);
    if (plan) savePendingPurchase(plan);
    setMode(authMode); setAuthError(null);
    googleLogin.current = launchGoogleSignIn({
      apiBaseUrl: API_BASE_URL, locale,
      ...(reserved ? { popup } : {}),
      beforeRedirect: () => {
        try { window.sessionStorage.setItem("scoretransposer_www_auth_resume", JSON.stringify({ savedAt: Date.now(), path: `${window.location.pathname}${window.location.search}${window.location.hash}`, destination: destination.current, purchase: Boolean(pendingRef.current) })); } catch { /* The saved B2 intent still supports explicit recovery. */ }
        // A File stays in memory for popup login. Redirect fallback asks once
        // for the original file; never persist private sheet music by default.
        window.dispatchEvent(new Event("scoretransposer:google-redirect"));
      },
      onSuccess: () => { void refreshSession().then(result => { setGoogleBusy(false); if (result.ok) finishSignIn(result.data.user, "google"); else { setOpen(true); setAuthError(auth.authFailed); } }); },
      onFallback: reason => { setGoogleBusy(false); setOpen(true); setGisFallback(reason === "unavailable"); setInApp(reason === "disallowed_useragent" || isInAppBrowser(navigator.userAgent)); setEmailOpen(true); },
      onError: () => { setGoogleBusy(false); setOpen(true); setEmailOpen(true); setAuthError(googleCopy.googleError); },
    });
  }

  function signIn(authMode: "login" | "register" = "login", options?: { destination?: string; automatic?: boolean }) {
    destination.current = options?.destination ? googleLoginDestination(options.destination, siteConfig.appUrl) ?? undefined : undefined;
    if (options?.automatic) { showSignIn(pendingRef.current, authMode); return; }
    pendingRef.current = null; setPending(null); clearPendingPurchase();
    if (user) { if (destination.current) window.location.assign(destination.current); return; }
    if (session === "checking") {
      if (checkingLogin.current) return;
      checkingLogin.current = true;
      setGoogleBusy(true);
      // Reserve while the gesture is live; checking is never signed-out.
      const popup = reserveGooglePopup();
      void (sessionRequest.current ?? refreshSession()).then(result => {
        checkingLogin.current = false;
        if (result.ok) { popup?.close(); setGoogleBusy(false); finishSignIn(result.data.user, "google"); }
        else if (result.status === 401) startGoogle(pendingRef.current, authMode, popup, true);
        else { popup?.close(); setGoogleBusy(false); showSignIn(pendingRef.current, authMode); setAuthError(result.error); }
      });
      return;
    }
    startGoogle(pendingRef.current, authMode);
  }
  const select = useCallback((selection: PurchaseSelection) => { setSelected(selection); rememberPurchaseSelection(selection); }, []);


  async function authenticate(path: "login" | "register" | "google", body: Record<string, string>) {
    if (authLock.current) return;
    authLock.current = true; setAuthBusy(true); setAuthError(null);
    try {
      const result = await apiRequest<AuthPayload>(`/api/auth/${path}`, { method: "POST", body: JSON.stringify(body) });
      if (!result.ok) { setAuthError(result.error || auth.authFailed); if (path === "google") setEmailOpen(true); return; }
      finishSignIn(result.data.user, path === "google" ? "google" : "email", result.data.isNewUser || path === "register");
    } finally { authLock.current = false; setAuthBusy(false); }
  }

  async function purchase(plan: Purchase, explicitPurchase = false, reservedPopup?: Window | null, hasReservedPopup = false) {
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
          if (result.status === 401) {
            if (hasReservedPopup) startGoogle(plan, "login", reservedPopup, true);
            else showSignIn(plan);
          }
          else { reservedPopup?.close(); clearPendingPurchase(); setNotice({ text: result.error, error: true }); }
          return;
        }
        reservedPopup?.close(); account = result.data.user; setUser(account); setSession("signed-in");
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
        if (result.status === 401) { setUser(null); setSession("signed-out"); sessionRequest.current = null; showSignIn(plan); }
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
    const plan = pendingRef.current;
    resumePurchase.current = false;
    if (!plan) return;
    void purchase(plan);
  }, [user]);

  const signInRef = useRef(signIn); signInRef.current = signIn;
  const requestSignIn = useCallback((authMode?: "login" | "register", options?: { destination?: string; automatic?: boolean }) => signInRef.current(authMode, options), []);

  function beginPurchase(plan: Purchase) {
    if (checkoutLock.current) return;
    destination.current = undefined;
    pendingExpires.current = Date.now() + 30 * 60_000;
    pendingRef.current = plan; setPending(plan); setSelected(plan);
    rememberPurchaseSelection(plan); savePendingPurchase(plan);
    pendingPath.current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (session === "signed-out") { startGoogle(plan); return; }
    const popup = session === "checking" ? reserveGooglePopup() : undefined;
    void purchase(plan, true, popup, session === "checking");
  }

  async function copyCurrentLink() {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(window.location.href); setCopied(true); return; } catch { /* Older embedded browsers can use document copy. */ }
    }
    const field = document.createElement("textarea"); field.value = window.location.href;
    field.style.position = "fixed"; field.style.opacity = "0";
    document.body.append(field); field.select();
    try { setCopied(document.execCommand("copy")); } finally { field.remove(); }
  }

  return <Context.Provider value={{ user, session, selected, busy, copy, signIn: requestSignIn, emailSignIn: () => { googleLogin.current?.cancel(); setGoogleBusy(false); destination.current = undefined; clearPendingPurchase(); showSignIn(null); setEmailOpen(true); }, select, purchase: beginPurchase }}>
    {children}
    {recoveryOrders.length ? <div className={styles.notice} role="status">
      <span>{recoveryCopy.found}</span>
      {recoveryOrders.map(order => <a key={order.id} href={`/checkout/success?${new URLSearchParams({ order_id: order.id, token: order.token, provider: order.provider })}`}>{recoveryCopy.resume} · {order.id}</a>)}
      <button type="button" onClick={() => { setRecoveryOrders([]); allowNewPurchase.current = true; const plan = pendingRef.current; if (plan) beginPurchase(plan); }}>{recoveryCopy.newPurchase}</button>
    </div> : null}
    <GoogleOneTap enabled={session === "signed-out" && !open && !busy && !googleBusy} locale={locale} onDone={() => {
      void refreshSession().then(result => {
        if (!result.ok) return;
        finishSignIn(result.data.user, "google");
      });
    }} />
    {notice ? <div className={`${styles.notice} ${notice.error ? styles.error : ""}`} role={notice.error ? "alert" : "status"}>
      <span>{notice.text}</span><button type="button" aria-label={auth.close} onClick={() => setNotice(null)}>×</button>
    </div> : null}
    {open ? <section className={styles.authPanel} aria-labelledby="purchase-auth-title">
      <div className={styles.dialogBody}>
        <button className={styles.close} type="button" aria-label={auth.close} disabled={authBusy} onClick={dismissAuth}>×</button>
        <span className={styles.brand}>♫ ScoreTransposer</span>
        <h2 id="purchase-auth-title">{copy.authTitle}</h2>
        <p>{pending ? copy.authBody : copy.accountBody}</p>
        {pending ? <div className={styles.selection}><small>{copy.selected}</small><strong>{pending.name} · {pending.cycle}</strong><span>{pending.price}</span></div> : null}
        {inApp ? <p>{googleCopy.inAppBrowser} <button type="button" className={styles.emailLink} onClick={() => { void copyCurrentLink(); }}>{copied ? googleCopy.linkCopied : googleCopy.copyLink}</button></p> : null}
        {!gisFallback && !inApp ? <button type="button" className="public-button primary" disabled={authBusy} onClick={() => startGoogle(pendingRef.current, mode)}>{googleCopy.googleSignIn}</button> : null}
        {gisFallback && !inApp ? <HomeGoogleSignIn appUrl={siteConfig.appUrl} locale={locale} disabled={authBusy} label={auth.googleLabel} loadingLabel={auth.googleLoading} errorLabel={auth.googleFailed}
          onCredential={credential => { void authenticate("google", { credential }); }} onError={message => { setAuthError(message); setEmailOpen(true); }} />
          : null}
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
    </section> : null}
  </Context.Provider>;
}

const legalLabels: Record<SupportedLocale, [string, string]> = {
  en: ["Terms", "Privacy"], "zh-CN": ["服务条款", "隐私政策"], "zh-TW": ["服務條款", "隱私政策"], ja: ["利用規約", "プライバシー"], ko: ["이용약관", "개인정보 보호"], fr: ["Conditions", "Confidentialité"], es: ["Condiciones", "Privacidad"], de: ["Nutzungsbedingungen", "Datenschutz"], ru: ["Условия", "Конфиденциальность"],
};
