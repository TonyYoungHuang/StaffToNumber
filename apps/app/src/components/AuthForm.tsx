"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getStoredToken, setStoredToken } from "../lib/auth-storage";
import type { AuthMessageCatalog } from "../lib/auth-messages";

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
            options: { theme: "outline"; size: "large"; shape: "rectangular"; text: "continue_with"; width: number },
          ): void;
        };
      };
    };
  }
}

export function AuthForm({
  mode,
  redirectTo,
  onAuthenticated,
  messages,
}: {
  mode: "register" | "login";
  redirectTo?: string;
  onAuthenticated?: () => void;
  messages: AuthMessageCatalog["form"];
}) {
  const router = useRouter();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const switchRoute = mode === "register" ? APP_ROUTES.login : APP_ROUTES.register;
  const switchHref = redirectTo
    ? `${switchRoute}?${new URLSearchParams({ next: redirectTo }).toString()}`
    : switchRoute;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const sharedCopy = messages.shared;
  const copy = messages[mode];

  const statusTone = status ? statusKind : null;

  const completeAuthentication = useCallback((payload: AuthPayload, method: "email" | "google") => {
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
    router.push(nextRoute);
    router.refresh();
  }, [messages.login.success, messages.register.success, mode, onAuthenticated, redirectTo, router]);

  useEffect(() => {
    if (onAuthenticated || !redirectTo || !getStoredToken()) {
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }, [onAuthenticated, redirectTo, router]);

  useEffect(() => {
    if (!googleClientId || !googleReady || !window.google || !googleButtonRef.current) return;

    const button = googleButtonRef.current;
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
    window.google.accounts.id.renderButton(button, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      width: 320,
    });
  }, [completeAuthentication, googleClientId, googleReady, sharedCopy.googleFailed]);

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
      setStatus(result.error);
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
          />
          <div
            ref={googleButtonRef}
            className="google-auth-button"
            role="group"
            aria-label={sharedCopy.googleButtonRegionLabel}
            aria-live="polite"
          />
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
          <Link href={switchHref} className="button button-secondary">
            {copy.switch}
          </Link>
        </div>
      </form>

      <p className="micro-copy">{copy.footnote}</p>
      {mode === "login" ? (
        <div className="button-row">
          <Link href={APP_ROUTES.activate} className="button button-tertiary">
            {sharedCopy.redeem}
          </Link>
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
