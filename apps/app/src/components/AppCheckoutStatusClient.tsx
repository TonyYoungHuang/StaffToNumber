"use client";

import { useEffect, useMemo, useState } from "react";
import type { PaymentProvider, PaymentOrderStatus } from "@score/shared";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

type PublicOrder = {
  id: string;
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  activationCode: string | null;
  paidAt: string | null;
};

type OrderPayload = { order: PublicOrder | null };

export function AppCheckoutStatusClient({
  orderId,
  token,
  provider,
  sessionId,
}: {
  orderId: string;
  token: string;
  provider: PaymentProvider;
  sessionId?: string;
}) {
  const { locale } = useAppLocale();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            pendingTitle: "正在确认支付结果",
            pendingBody: "支付完成后，系统会自动把权限开通到你当前账户。",
            successTitle: "支付成功，账户已自动开通",
            successBody: "现在可以直接进入控制台并开始使用，无需手动兑换激活码。",
            dashboard: "进入控制台",
            jobs: "查看任务",
          }
        : {
            pendingTitle: "Confirming your payment",
            pendingBody: "After payment completes, access is activated automatically on your current account.",
            successTitle: "Payment successful and account activated",
            successBody: "You can go straight into the studio now. No manual activation-code redemption is needed.",
            dashboard: "Open dashboard",
            jobs: "Open jobs",
          },
    [locale],
  );

  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    let attempts = 0;

    const load = async () => {
      const params = new URLSearchParams({ token, provider });
      if (sessionId) {
        params.set("sessionId", sessionId);
      }

      const result = await apiRequest<OrderPayload>(`/api/payments/orders/${orderId}?${params.toString()}`);
      if (disposed) {
        return;
      }

      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOrder(result.data.order);
      if (result.data.order?.status === "pending" && attempts < 10) {
        attempts += 1;
        timer = window.setTimeout(() => {
          void load();
        }, 3000);
      }
    };

    void load();

    return () => {
      disposed = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [orderId, provider, sessionId, token]);

  const isPaid = order?.status === "paid";

  return (
    <div className="surface-panel stack-lg">
      {loading ? <p className="body-copy large">{copy.pendingBody}</p> : null}
      {error ? <p className="form-status error">{error}</p> : null}
      {!loading && !error ? (
        <>
          <div className="stack-sm">
            <h1 className="page-title">{isPaid ? copy.successTitle : copy.pendingTitle}</h1>
            <p className="body-copy large">{isPaid ? copy.successBody : copy.pendingBody}</p>
          </div>
          <div className="button-row">
            <a href={APP_ROUTES.dashboard} className="button button-primary">
              {copy.dashboard}
            </a>
            <a href={APP_ROUTES.jobs} className="button button-secondary">
              {copy.jobs}
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
