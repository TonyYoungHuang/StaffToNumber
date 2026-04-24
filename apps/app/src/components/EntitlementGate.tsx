"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

type MePayload = {
  user: {
    entitlement: {
      status: "inactive" | "active" | "expired";
    };
  };
};

export function EntitlementGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { locale } = useAppLocale();
  const [status, setStatus] = useState<"checking" | "allowed" | "redirecting">("checking");

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            checking: "正在检查账户权限...",
            redirecting: "当前账户尚未开通，正在跳转到开通页面...",
          }
        : {
            checking: "Checking account access...",
            redirecting: "This account is not activated yet. Redirecting to checkout...",
          },
    [locale],
  );

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setStatus("redirecting");
      router.replace(APP_ROUTES.login);
      return;
    }

    apiRequest<MePayload>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((result) => {
      if (!result.ok) {
        setStatus("redirecting");
        router.replace(APP_ROUTES.login);
        return;
      }

      if (result.data.user.entitlement.status !== "active") {
        setStatus("redirecting");
        router.replace(APP_ROUTES.checkout);
        return;
      }

      setStatus("allowed");
    });
  }, [router]);

  if (status !== "allowed") {
    return (
      <div className="surface-panel stack-sm">
        <p className="eyebrow">{status === "checking" ? copy.checking : copy.redirecting}</p>
        <h2 className="card-title">{status === "checking" ? copy.checking : copy.redirecting}</h2>
      </div>
    );
  }

  return <>{children}</>;
}
