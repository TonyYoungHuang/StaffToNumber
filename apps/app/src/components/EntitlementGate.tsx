"use client";

import { useAppAuthModal } from "./AppAuthModal";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { getStoredToken } from "../lib/auth-storage";
import { useFlowMessages } from "../lib/flow-messages/client";
import { apiRequest } from "../lib/api";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { getAuthMessages } from "../lib/auth-messages";
import { currentWorkPath, upgradePath } from "../lib/flow-return";
import { trackFunnelEvent } from "../lib/analytics";
import { accountActivationRoute, checkoutAvailable } from "../lib/release";
import { useAppLocale } from "./AppLocaleProvider";

type MePayload = {
  user: {
    entitlement: {
      status: "inactive" | "active" | "expired";
    };
  };
};

export function EntitlementGate({
  children,
  allowFreePreview = false,
  deniedMode = "redirect",
  copy,
}: {
  children: ReactNode;
  allowFreePreview?: boolean;
  deniedMode?: "redirect" | "panel";
  copy: AuthMessageCatalog["entitlement"];
}) {
  const router = useRouter();
  const signIn = useAppAuthModal();
  const flow = useFlowMessages();
  const { locale } = useAppLocale();
  const signInLabel = getAuthMessages(locale).form.login.submit;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "redirecting" | "signin" | "guest">("checking");
  const deniedAction = checkoutAvailable ? copy.unlockAction : copy.redeemAction;

  useEffect(() => {
    setError(null);
    const token = getStoredToken();
    apiRequest<MePayload>("/api/auth/me", { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then((result) => {
      if (!result.ok) {
        if (result.status !== 401) {
          setError(result.error);
          return;
        }
        // Free-scan pages keep #free-scan mounted so marketing CTAs land cleanly and
        // guests can pick a file before auth. Paid-only gates still force sign-in.
        if (allowFreePreview) {
          setStatus("guest");
          return;
        }
        setStatus("signin");
        signIn("login", () => setAttempt((n) => n + 1));
        return;
      }

      if (result.data.user.entitlement.status !== "active" && !allowFreePreview) {
        if (deniedMode === "panel") {
          setStatus("denied");
          return;
        }
        setStatus("redirecting");
        router.replace(
          checkoutAvailable
            ? upgradePath(currentWorkPath())
            : `${accountActivationRoute}?${new URLSearchParams({ next: currentWorkPath() })}`,
        );
        return;
      }

      setStatus("allowed");
    });
  }, [allowFreePreview, deniedMode, router, attempt, signIn]);

  if (error) {
    return (
      <div className="surface-panel stack-sm">
        <p className="form-status error" role="alert">{error}</p>
        <button className="button button-secondary" onClick={() => setAttempt((n) => n + 1)}>{flow.retry}</button>
      </div>
    );
  }

  if (status === "signin") {
    return (
      <div className="surface-panel stack-sm">
        <button className="button button-primary" onClick={() => signIn("login", () => setAttempt((n) => n + 1))}>{signInLabel}</button>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <div className="stack-lg">
        <div className="surface-panel stack-sm">
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => signIn("login", () => setAttempt((n) => n + 1))}>{signInLabel}</button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  if (status === "denied") {
    return (
      <section className="surface-panel stack-lg" aria-labelledby="entitlement-required-title">
        <div className="stack-sm">
          <p className="eyebrow">{copy.deniedEyebrow}</p>
          <h2 id="entitlement-required-title" className="card-title">{copy.deniedTitle}</h2>
          <p className="body-copy">{copy.deniedBody}</p>
        </div>
        <div className="button-row">
          <Link
            href={checkoutAvailable ? upgradePath(currentWorkPath()) : `${accountActivationRoute}?${new URLSearchParams({ next: currentWorkPath() })}`}
            className="button button-primary"
            onClick={() => trackFunnelEvent("upgrade_click", { source: checkoutAvailable ? "entitlement_gate" : "entitlement_gate_activation" })}
          >
            {deniedAction}
          </Link>
          <Link href={APP_ROUTES.dashboard} className="button button-secondary">{copy.back}</Link>
        </div>
      </section>
    );
  }

  if (status !== "allowed") {
    return (
      <div className="surface-panel stack-sm" role="status" aria-live="polite">
        <p className="eyebrow">{status === "checking" ? copy.checking : copy.redirecting}</p>
        <h2 className="card-title">{status === "checking" ? copy.checking : copy.redirecting}</h2>
      </div>
    );
  }

  return <>{children}</>;
}
