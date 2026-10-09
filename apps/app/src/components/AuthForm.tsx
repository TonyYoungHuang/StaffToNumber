"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const sharedCopy = messages.shared;
  const copy = messages[mode];

  const statusTone = status ? statusKind : null;

  const completeAuthentication = useCallback((payload: AuthPayload, method: "email" | "google") => {
    setPreferredLoginMethod(method);
    setStoredToken(payload.token);
    trackFunnelEvent(payload.isNewUser || mode === "register" ? "sign_up" : "login", { method });
    setStatus(payload.isNewUser || mode === "register" ? messages.register.success : messages.login.success);
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
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (!response.credential) {
          setStatus(sharedCopy.googleFailed);
          setStatusKind("error");
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
            return;
          }
          completeAuthentication(result.data, "google");
        });
      },
    });
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
      window.google.accounts.id.renderButton(button, {
        theme: "outline", size: "large", shape: "rectangular", text: "continue_with", width, locale: locale.replace("-", "_"),
      });
    };
    const labelGoogleFrames = () => {
      button.querySelectorAll("iframe").forEach(frame => { frame.title = sharedCopy.googleButtonRegionLabel; });
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
        setGoogleButtonFailed(true);
        setStatus(sharedCopy.googleFailed);
        setStatusKind("error");
      }
    }, 8000);
    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      window.clearTimeout(failTimer);
      observer.disconnect();
      frameObserver.disconnect();
    };
  }, [completeAuthentication, googleClientId, googleReady, sharedCopy.googleFailed, sharedCopy.googleButtonRegionLabel, locale]);

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
            onLoad={() => setGoogleReady(true)}
            onReady={() => setGoogleReady(true)}
            onError={() => { setGoogleButtonFailed(true); setStatus(sharedCopy.googleFailed); setStatusKind("error"); }}
          />
          <section className="google-auth-panel" aria-label={sharedCopy.googleButtonRegionLabel}>
            <strong className="google-auth-heading">{sharedCopy.googleButtonRegionLabel}</strong>
            {!googleButtonFailed ? <div ref={googleButtonRef} className="google-auth-button" aria-live="polite" /> : null}
            {googleButtonFailed ? <p className="helper-copy">{sharedCopy.googleFailed}</p> : null}
          </section>
          <div className="auth-divider"><span>{sharedCopy.googleDivider}</span></div>
        </div>
      ) : null}

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
          <button type="submit" disabled={submitting} className="button button-primary">
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
          {!emailOnly ? <Link href={`${APP_ROUTES.activate}?${new URLSearchParams({ next: redirectTo ?? WORKSPACE_ROUTE })}`} className="button button-tertiary">
            {sharedCopy.redeem}
          </Link> : null}
          <Link href={APP_ROUTES.forgotPassword} className="button button-secondary">
            {sharedCopy.forgot}
          </Link>
        </div>
      ) : null}
      {status && statusTone ? (
        <p className={`form-status ${statusTone}`} role={statusTone === "error" ? "alert" : "status"}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
