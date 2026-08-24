"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
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
  const [access, setAccess] = useState<"checking" | "paid" | "preview" | "error">("checking");

  useEffect(() => {
    apiRequest<AccessPayload>("/api/auth/me").then((result) => {
      if (!result.ok) setAccess("error");
      else setAccess(result.data.user.entitlement.status === "active" ? "paid" : "preview");
    });
  }, []);

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
