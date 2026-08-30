"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { accountActivationRoute, checkoutAvailable } from "../lib/release";

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
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "redirecting">("checking");
  const deniedAction = checkoutAvailable ? copy.unlockAction : copy.redeemAction;

  useEffect(() => {
    apiRequest<MePayload>("/api/auth/me").then((result) => {
      if (!result.ok) {
        setStatus("redirecting");
        router.replace(APP_ROUTES.login);
        return;
      }

      if (result.data.user.entitlement.status !== "active" && !allowFreePreview) {
        if (deniedMode === "panel") {
          setStatus("denied");
          return;
        }
        setStatus("redirecting");
        router.replace(accountActivationRoute);
        return;
      }

      setStatus("allowed");
    });
  }, [allowFreePreview, deniedMode, router]);

  if (status === "denied") {
    return (
      <section className="surface-panel stack-lg" aria-labelledby="entitlement-required-title">
        <div className="stack-sm">
          <p className="eyebrow">{copy.deniedEyebrow}</p>
          <h2 id="entitlement-required-title" className="card-title">{copy.deniedTitle}</h2>
          <p className="body-copy">{copy.deniedBody}</p>
        </div>
        <div className="button-row">
          <Link href={accountActivationRoute} className="button button-primary">{deniedAction}</Link>
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
