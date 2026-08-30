"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { accountActivationRoute, checkoutAvailable } from "../lib/release";
import type { WorkspaceMessages } from "../lib/workspace-messages/types";

type MePayload = {
  user: {
    entitlement: {
      status: "inactive" | "active" | "expired";
    };
  };
};

export function DashboardBannerActions({ copy, setupHref }: { copy: WorkspaceMessages["banner"]; setupHref: string }) {
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
        <Link href={accountActivationRoute} className="button button-primary">
          {checkoutAvailable ? copy.payNow : copy.activationOptions}
        </Link>
        <Link href={setupHref} className="button button-secondary">
          {copy.accountSetup}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-banner-actions">
      <Link href={`${APP_ROUTES.scores}#free-scan`} className="button button-primary">
        {copy.importScore}
      </Link>
      <Link href={APP_ROUTES.jobs} className="button button-secondary">
        {copy.openJobs}
      </Link>
    </div>
  );
}
