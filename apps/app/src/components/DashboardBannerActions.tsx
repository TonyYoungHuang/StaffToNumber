"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export function DashboardBannerActions() {
  const { locale } = useAppLocale();
  const [status, setStatus] = useState<"loading" | "inactive" | "active">("loading");

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setStatus("inactive");
      return;
    }

    apiRequest<MePayload>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((result) => {
      if (!result.ok) {
        setStatus("inactive");
        return;
      }

      setStatus(result.data.user.entitlement.status === "active" ? "active" : "inactive");
    });
  }, []);

  if (status !== "active") {
    return (
      <div className="page-banner-actions">
        <Link href={APP_ROUTES.checkout} className="button button-primary">
          {locale === "zh-CN" ? "立即开通" : "Pay now"}
        </Link>
        <Link href={locale === "zh-CN" ? APP_ROUTES.activate : APP_ROUTES.register} className="button button-secondary">
          {locale === "zh-CN" ? "兑换激活码" : "View account setup"}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-banner-actions">
      <Link href={APP_ROUTES.upload} className="button button-primary">
        {locale === "zh-CN" ? "打开上传页" : "Open uploads"}
      </Link>
      <Link href={APP_ROUTES.jobs} className="button button-secondary">
        {locale === "zh-CN" ? "打开任务页" : "Open jobs"}
      </Link>
    </div>
  );
}
