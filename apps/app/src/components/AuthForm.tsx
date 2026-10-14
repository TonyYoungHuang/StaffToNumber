"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { clearStoredToken, getStoredToken, setStoredToken, setPreferredLoginMethod } from "../lib/auth-storage";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { shopError } from "../lib/shop-activation";
import { useAppLocale } from "./AppLocaleProvider";

type AuthPayload = {
  token: string;
  user: {
    id: string;
    email: string;
    entitlement: { status: "inactive" | "active" | "expired" };
  };
  isNewUser?: boolean;
};

type GoogleCredentialResponse = { credential?: string };

const WORKSPACE_ROUTE = `${APP_ROUTES.scores}#free-scan`;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
          renderButton(
            parent: HTMLElement,
            options: { theme: "outline"; size: "large"; shape: "rectangular"; text: "continue_with"; width: number | string; locale: string },
          ): void;
        };
      };
    };
  }
}

export function AuthForm({
  mode: initialMode,
  redirectTo,
  onAuthenticated,
  messages,
  emailOnly = false,
}: {
  mode: "register" | "login";
  redirectTo?: string;
  onAuthenticated?: () => void;
  messages: AuthMessageCatalog["form"];
  emailOnly?: boolean;
}) {
  const router = useRouter();
  const { locale } = useAppLocale();
  const [mode, setMode] = useState(initialMode);
  const googleClientId = emailOnly ? "" : process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleButtonFailed, setGoogleButtonFailed] = useState(false);
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);
  const [showEmail, setShowEmail] = useState(emailOnly || !googleClientId);
  const emailFormId = useId();
  const sharedCopy = messages.shared;
  const copy = messages[mode];

  const statusTone = status ? statusKind : null;

  const completeAuthentication = useCallback((payload: AuthPayload, method: "email" | "google") => {
    setPreferredLoginMethod(method);
    setStoredToken(payload.token);
    const isNewUser = method === "google" ? Boolean(payload.isNewUser) : mode === "register";
    trackFunnelEvent(isNewUser ? "sign_up" : "login", { method });
    setStatus(isNewUser ? messages.register.success : messages.login.success);
    setStatusKind("success");
    if (onAuthenticated) {
      onAuthenticated();
      router.refresh();
      return;
    }
    const nextRoute = redirectTo ?? WORKSPACE_ROUTE;
    // Start with the new session and an exact URL, including the original tool
    // anchor. Refreshing an in-flight App Router navigation can append it twice.
    window.location.assign(nextRoute);
  }, [messages.login.success, messages.register.success, mode, onAuthenticated, redirectTo, router]);

  useEffect(() => {
    const token = getStoredToken();
    if (onAuthenticated || !token) return;
    let active = true;
    const controller = new AbortController();
    void apiRequest<{ user: AuthPayload["user"] }>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    }).then(result => {
      if (!active || getStoredToken() !== token) return;
      if (result.ok && result.data?.user?.id) {
        window.location.replace(redirectTo ?? WORKSPACE_ROUTE);
      } else if (!result.ok && result.status === 401) {
        clearStoredToken();
      }
    });
    return () => { active = false; controller.abort(); };
  }, [onAuthenticated, redirectTo, router]);

  const showGoogleFallback = useCallback(() => {
    setGoogleButtonFailed(true);
    setShowEmail(true);
    setStatus(sharedCopy.googleFailed);
    setStatusKind("error");
  }, [sharedCopy.googleFailed]);

  const handleGoogleReady = useCallback(() => {
    if (window.google?.accounts?.id) setGoogleReady(true);
    else showGoogleFallback();
  }, [showGoogleFallback]);

  // A blocked GSI request may never emit either load or error.
  useEffect(() => {
    if (emailOnly || !googleClientId || googleReady) return;
    const timer = window.setTimeout(showGoogleFallback, 8000);
    return () => window.clearTimeout(timer);
  }, [emailOnly, googleClientId, googleReady, showGoogleFallback]);

  // If the GSI script was already loaded by a previous mount/navigation, onLoad will not fire again.
  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts?.id) setGoogleReady(true);
  }, [googleClientId]);

  useEffect(() => {
    if (!googleClientId || !googleReady || !window.google || !googleButtonRef.current) return;

    const button = googleButtonRef.current;
    setGoogleButtonFailed(false);
    button.replaceChildren();
    try { window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (!response.credential) {
          setStatus(sharedCopy.googleFailed);
          setStatusKind("error");
          setShowEmail(true);
          return;
        }
        setSubmitting(true);
        setStatus(null);
        setStatusKind(null);
        void apiRequest<AuthPayload>("/api/auth/google", {
          method: "POST",
          body: JSON.stringify({ credential: response.credential }),
        }).then((result) => {
          setSubmitting(false);
          if (!result.ok) {
            setStatus(result.error);
            setStatusKind("error");
            setShowEmail(true);
            return;
          }
          completeAuthentication(result.data, "google");
        });
      },
    }); } catch {
      showGoogleFallback();
      return;
    }
    let renderedWidth = 0;
    const measureWidth = () => {
      const direct = Math.floor(button.clientWidth);
      if (direct > 0) return Math.min(400, direct);
      const parent = Math.floor(button.parentElement?.clientWidth ?? 0);
      if (parent > 0) return Math.min(400, parent);
      // Modal / first-paint race: never skip renderButton solely because layout is briefly 0.
      return 320;
    };
    const renderButton = () => {
      if (!window.google) return;
      const width = measureWidth();
      if (width === renderedWidth) return;
      renderedWidth = width;
      button.replaceChildren();
      try { window.google.accounts.id.renderButton(button, {
        theme: "outline", size: "large", shape: "rectangular", text: "continue_with", width, locale: locale.replace("-", "_"),
      }); } catch { showGoogleFallback(); }
    };
    const labelGoogleFrames = () => {
      button.querySelectorAll("iframe").forEach(frame => { frame.title = sharedCopy.googleButtonRegionLabel; });
      if (button.querySelector("iframe")) setGoogleButtonRendered(true);
    };
    const frameObserver = new MutationObserver(labelGoogleFrames);
    frameObserver.observe(button, { childList: true, subtree: true });
    // Double rAF waits for dialog/layout width before the first GIS paint.
    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(renderButton);
    });
    labelGoogleFrames();
    const observer = new ResizeObserver(renderButton);
    observer.observe(button);
    const failTimer = window.setTimeout(() => {
      if (!button.querySelector("iframe")) {
        showGoogleFallback();
      }
    }, 8000);
    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      window.clearTimeout(failTimer);
      observer.disconnect();
      frameObserver.disconnect();
    };
  }, [completeAuthentication, googleClientId, googleReady, sharedCopy.googleFailed, sharedCopy.googleButtonRegionLabel, locale, showGoogleFallback]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setStatusKind(null);

    const result = await apiRequest<AuthPayload>(`/api/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(emailOnly ? shopError(result.error, result.status) : result.error);
      setStatusKind("error");
      return;
    }

    completeAuthentication(result.data, "email");
  }

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      {googleClientId ? (
        <div className="stack-sm">
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onLoad={handleGoogleReady}
            onReady={handleGoogleReady}
            onError={showGoogleFallback}
          />
          <section className="google-auth-panel" aria-label={sharedCopy.googleButtonRegionLabel}>
            {!googleButtonFailed ? <>
              {!googleButtonRendered ? <button type="button" disabled className="button button-primary" aria-busy="true">{sharedCopy.googleButtonRegionLabel}</button> : null}
              <div ref={googleButtonRef} className="google-auth-button" inert={submitting} aria-busy={submitting} aria-live="polite" />
            </> : null}
            {googleButtonFailed ? <p className="helper-copy">{sharedCopy.googleFailed}</p> : null}
          </section>
        </div>
      ) : null}

      {!emailOnly && googleClientId ? <button type="button" className="button button-tertiary" aria-expanded={showEmail} aria-controls={emailFormId}
        onClick={() => setShowEmail(value => !value)}>{sharedCopy.googleDivider}</button> : null}

      {showEmail ? <div id={emailFormId} className="stack-sm">
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="field-group">
          <span className="field-label">{sharedCopy.email}</span>
          <input
            className="field-control"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={sharedCopy.emailPlaceholder}
            required
          />
        </label>
        <label className="field-group">
          <span className="field-label">{sharedCopy.password}</span>
          <input
            className="field-control"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={sharedCopy.passwordPlaceholder}
            required
            minLength={8}
          />
        </label>

        <div className="button-row">
          <button type="submit" disabled={submitting} className="button button-secondary">
            {submitting ? sharedCopy.submitWaiting : copy.submit}
          </button>
          <button type="button" disabled={submitting} onClick={() => { setMode(mode === "login" ? "register" : "login"); setStatus(null); }} className="button button-secondary">
            {copy.switch}
          </button>
        </div>
      </form>

      <p className="micro-copy">{copy.footnote}</p>
      {mode === "login" ? (
        <div className="button-row">
          <Link href={APP_ROUTES.forgotPassword} className="button button-secondary">
            {sharedCopy.forgot}
          </Link>
        </div>
      ) : null}
      </div> : null}
      {status && statusTone ? (
        <p className={`form-status ${statusTone}`} role={statusTone === "error" ? "alert" : "status"}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
