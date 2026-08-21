"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";
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
}: {
  children: ReactNode;
  allowFreePreview?: boolean;
  deniedMode?: "redirect" | "panel";
}) {
  const router = useRouter();
  const { locale } = useAppLocale();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "redirecting">("checking");

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            checking: "正在检查账户权限...",
            redirecting: "当前账户尚未开通，正在跳转到开通页面...",
            deniedEyebrow: "需要完整权限",
            deniedTitle: "课堂与教学管理尚未对当前账户开放",
            deniedBody: "开通后可使用机构、课堂、学生名册、资源、通知和 LMS 管理。当前页面不会展示不可操作的表单。",
            deniedAction: checkoutAvailable ? "开通完整权限" : "兑换激活码",
            back: "返回控制台",
          }
        : {
            checking: "Checking account access...",
            redirecting: "This account is not activated yet. Redirecting to checkout...",
            deniedEyebrow: "Full access required",
            deniedTitle: "Classroom and teaching tools are not active for this account",
            deniedBody: "Full access includes organizations, classrooms, rosters, resources, notifications, and LMS management. Disabled forms are hidden until access is active.",
            deniedAction: checkoutAvailable ? "Unlock full access" : "Redeem activation code",
            back: "Back to dashboard",
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
          <Link href={accountActivationRoute} className="button button-primary">{copy.deniedAction}</Link>
          <Link href={APP_ROUTES.dashboard} className="button button-secondary">{copy.back}</Link>
        </div>
      </section>
    );
  }

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
