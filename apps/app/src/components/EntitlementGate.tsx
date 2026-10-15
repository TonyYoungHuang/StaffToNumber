"use client";

import { useAppAuthModal } from "./AppAuthModal";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { APP_ROUTES, type CheckoutIntendedAction } from "@score/shared";
import { scoreCheckoutPath } from "../lib/score-pass-checkout";
import { clearStoredToken, getStoredToken, getServerAuthToken, subscribeAuthChanges } from "../lib/auth-storage";
import { useFlowMessages } from "../lib/flow-messages/client";
import { apiRequest } from "../lib/api";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { currentWorkPath, upgradePath } from "../lib/flow-return";
import { trackFunnelEvent } from "../lib/analytics";
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
  targetDocumentId,
  intendedAction,
  copy,
}: {
  children: ReactNode;
  allowFreePreview?: boolean;
  deniedMode?: "redirect" | "panel";
  targetDocumentId?: string;
  intendedAction?: CheckoutIntendedAction;
  copy: AuthMessageCatalog["entitlement"];
}) {
  const router = useRouter();
  const signIn = useAppAuthModal();
  const token = useSyncExternalStore(subscribeAuthChanges, getStoredToken, getServerAuthToken);
  const flow = useFlowMessages();
  const { locale } = useAppLocale();
  const signInLabel = flow.signInLabel;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "redirecting" | "signin" | "guest">("checking");
  const deniedAction = copy.unlockAction;
  const checkoutPath = () => targetDocumentId ? scoreCheckoutPath(targetDocumentId, intendedAction) : upgradePath(currentWorkPath());

  useEffect(() => {
    setError(null);
    apiRequest<MePayload>("/api/auth/me", { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then((result) => {
      if (!result.ok) {
        if (result.status !== 401) {
          setError(result.error);
          return;
        }
        if (token && getStoredToken() === token) clearStoredToken();
        // Free-scan pages keep #free-scan mounted so marketing CTAs land cleanly and
        // guests can pick a file before auth. Paid-only gates still force sign-in.
        if (allowFreePreview) {
          setStatus("guest");
          return;
        }
        setStatus("signin");
        return;
      }

      if (result.data.user.entitlement.status !== "active" && !allowFreePreview) {
        if (deniedMode === "panel") {
          setStatus("denied");
          return;
        }
        setStatus("redirecting");
        router.replace(checkoutPath());
        return;
      }

      setStatus("allowed");
    });
  }, [allowFreePreview, deniedMode, router, attempt, signIn, targetDocumentId, intendedAction, token]);

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

  if (status === "guest" || (status === "allowed" && allowFreePreview)) {
    return (
      <div className="stack-lg">
        {status === "guest" ? <div className="surface-panel stack-sm">
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => signIn("login", () => setAttempt((n) => n + 1))}>{signInLabel}</button>
          </div>
        </div> : null}
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
            href={checkoutPath()}
            className="button button-primary"
            onClick={() => trackFunnelEvent("upgrade_click", { source: "entitlement_gate" })}
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
