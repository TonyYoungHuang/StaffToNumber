"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { ScoreDetailClient } from "./ScoreDetailClient";
import { TrialScorePreview } from "./TrialScorePreview";
import { useAppLocale } from "./AppLocaleProvider";

type AccessPayload = {
  user: {
    entitlement: { status: "inactive" | "active" | "expired" };
  };
};

export function ScoreAccessWorkspace() {
  const { locale } = useAppLocale();
  const token = useMemo(() => getStoredToken(), []);
  const [access, setAccess] = useState<"checking" | "paid" | "preview" | "error">("checking");

  useEffect(() => {
    if (!token) {
      setAccess("error");
      return;
    }
    apiRequest<AccessPayload>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((result) => {
      if (!result.ok) setAccess("error");
      else setAccess(result.data.user.entitlement.status === "active" ? "paid" : "preview");
    });
  }, [token]);

  if (access === "paid") return <ScoreDetailClient />;
  if (access === "preview") return <TrialScorePreview />;
  return (
    <div className="surface-panel stack-sm">
      <p className="eyebrow">
        {access === "checking"
          ? locale === "zh-CN" ? "正在检查访问权限..." : "Checking access..."
          : locale === "zh-CN" ? "无法读取当前账户。" : "The current account could not be loaded."}
      </p>
    </div>
  );
}
