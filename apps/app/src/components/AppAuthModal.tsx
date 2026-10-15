"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getGoogleAuthCopy, launchGoogleSignIn, prepareGoogleSignIn, rememberGoogleAccount, clearGoogleAutoSignInSuppression, consumeGoogleRedirectResult } from "@score/shared";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { AuthForm } from "./AuthForm";
import { resolveAuthReturnPath } from "../lib/auth-return";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { getSessionStatus, restoreSessionFromCookie, setPreferredLoginMethod } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";
import { AppGoogleOneTap } from "./AppGoogleOneTap";
import { consumeAuthIntent, saveAuthIntent, clearAuthIntent } from "../lib/auth-intent";

type OpenAuth = (mode?: "login" | "register", onDone?: () => void, options?: { interactive?: boolean; beforeRedirect?: () => void | Promise<void> }) => void;
const Context = createContext<OpenAuth | null>(null);
export function useAppAuthModal() {
  const open = useContext(Context);
  if (!open) throw new Error("AppAuthModalProvider required");
  return open;
}

export function AppAuthModalProvider({ children, messages }: { children: ReactNode; messages: AuthMessageCatalog }) {
  const { locale } = useAppLocale();
  const [entry, setEntry] = useState<{ mode: "login" | "register"; gis: boolean; inApp?: boolean; emailOnly?: boolean } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const generation = useRef(0);
  const callback = useRef<(() => void) | undefined>(undefined);
  const returnPath = useRef<string | null>(null);
  const operation = useRef<ReturnType<typeof launchGoogleSignIn>>(undefined);
  useEffect(() => {
    void prepareGoogleSignIn(API_BASE_URL);
    const redirected = consumeGoogleRedirectResult();
    if (redirected && redirected !== "success") setEntry({ mode: "login", gis: true, inApp: redirected === "disallowed_useragent" });
    if (redirected === "success") {
      clearGoogleAutoSignInSuppression();
      void apiRequest<{ user: { email: string } }>("/api/auth/me").then(result => { if (result.ok) rememberGoogleAccount(result.data.user.email); });
      void restoreSessionFromCookie().then(status => {
        if (status !== "signed-in") return;
        const next = resolveAuthReturnPath(consumeAuthIntent<string>("navigation"));
        if (next) window.location.assign(next);
      });
    }
    return () => operation.current?.cancel();
  }, []);
  const complete = useCallback(() => {
    setAuthBusy(false);
    clearAuthIntent("navigation");
    setEntry(null);
    const onDone = callback.current;
    const target = returnPath.current;
    callback.current = undefined;
    returnPath.current = null;
    if (onDone) onDone();
    else if (target && target !== window.location.pathname + window.location.search + window.location.hash) window.location.assign(target);
  }, []);
  const dismiss = () => {
    generation.current++; setAuthBusy(false);
    operation.current?.cancel();
    callback.current = undefined; returnPath.current = null;
    for (const kind of ["navigation", "activation", "score-upgrade", "one-score-pass"]) clearAuthIntent(kind);
    setEntry(null);
  };
  const open = useCallback<OpenAuth>((mode = "login", onDone, options) => {
    const requestGeneration = ++generation.current;
    callback.current = onDone;
    returnPath.current = null;
    if (getSessionStatus() === "signed-in") { complete(); return; }
    if (options?.interactive === false) { setEntry({ mode, gis: false }); return; }
    const startGoogle = (popup?: Window | null, reserved = false) => {
      setAuthBusy(true);
      operation.current?.cancel();
      operation.current = launchGoogleSignIn({
      apiBaseUrl: API_BASE_URL, locale,
      ...(reserved ? { popup } : {}),
      returnPath: window.location.pathname + window.location.search + window.location.hash,
      beforeRedirect: options?.beforeRedirect,
      onSuccess: async () => {
        if (generation.current !== requestGeneration) return;
        if (await restoreSessionFromCookie() !== "signed-in") { setEntry({ mode, gis: true }); return; }
        if (generation.current !== requestGeneration) return;
        setPreferredLoginMethod("google");
        clearGoogleAutoSignInSuppression();
        const result = await apiRequest<{ user: { email: string } }>("/api/auth/me");
        if (result.ok) rememberGoogleAccount(result.data.user.email);
        if (generation.current !== requestGeneration) return;
        complete();
      },
      onFallback: reason => { setAuthBusy(false); setEntry({ mode, gis: true, inApp: reason === "disallowed_useragent" }); },
      onError: () => { setAuthBusy(false); setEntry({ mode, gis: true }); },
      });
    };
    if (getSessionStatus() === "checking") {
      setAuthBusy(true);
      let popup: Window | null = null;
      try { popup = window.open("", "score-google-login", "popup,width=520,height=650"); } catch { /* Redirect fallback remains available. */ }
      void restoreSessionFromCookie().then(status => {
        if (generation.current !== requestGeneration) { popup?.close(); return; }
        if (status === "signed-in") { popup?.close(); complete(); }
        else if (status === "signed-out") startGoogle(popup, true);
        else { popup?.close(); setAuthBusy(false); setEntry({ mode, gis: false }); }
      });
    } else startGoogle();
  }, [complete, locale]);
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || !["/login", "/register"].includes(url.pathname)) return;
      const target = resolveAuthReturnPath(url.searchParams.get("next") ?? undefined);
      if (url.searchParams.get("method") === "email") {
        event.preventDefault(); event.stopPropagation();
        operation.current?.cancel(); generation.current++; setAuthBusy(false);
        callback.current = undefined; returnPath.current = target;
        setEntry({ mode: url.pathname === "/register" ? "register" : "login", gis: false, emailOnly: true });
        return;
      }
      if (getSessionStatus() === "signed-in") {
        if (target) { event.preventDefault(); event.stopPropagation(); window.location.assign(target); }
        return;
      }
      event.preventDefault(); event.stopPropagation();
      open(url.pathname === "/register" ? "register" : "login");
      returnPath.current = target;
      if (target) saveAuthIntent("navigation", target);
    };
    document.addEventListener("click", listener, true);
    return () => document.removeEventListener("click", listener, true);
  }, [open]);
  return <Context.Provider value={open}><AppGoogleOneTap paused={Boolean(entry) || authBusy} />{entry ? <section className="surface-panel stack-lg" aria-label={getGoogleAuthCopy(locale).googleSignIn}>
    <div className="button-row"><button type="button" className="button button-tertiary" onClick={dismiss}>{messages.shell.back}</button></div>
    <AuthForm key={`${entry.mode}:${entry.gis}:${entry.emailOnly}`} mode={entry.mode} googleFallbackOnly={entry.gis} inAppBrowser={entry.inApp} emailOnly={entry.emailOnly}
      redirectTo={returnPath.current ?? undefined} messages={messages.form} onAuthenticated={complete} />
  </section> : null}{children}</Context.Provider>;
}
