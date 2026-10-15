"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CheckoutReturnContext } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { getCheckoutReturnCopy } from "../lib/checkout-return-copy";
import { useAppLocale } from "./AppLocaleProvider";
export function CheckoutReturnNotice() {
  const { locale } = useAppLocale(); const copy = getCheckoutReturnCopy(locale);
  const pathname = usePathname(); const search = useSearchParams(); const orderId = search.get("checkoutOrderId");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => {
    setNotice(null);
    const token = getStoredToken(); if (!orderId) return;
    const controller = new AbortController();
    void apiRequest<{ order: { status: string; returnContext?: CheckoutReturnContext; continuation?: { result?: { error?: string; code?: string; job?: { id: string } }; available: boolean } } }>(`/api/payments/orders/${encodeURIComponent(orderId)}/owned`, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then(response => {
      if (!response.ok || controller.signal.aborted) return;
      const order = response.data.order; const result = order.continuation?.result;
      if (order.status !== "paid") { setNotice({ text: copy.cancelled, error: false }); return; }
      const failed = Boolean(result?.error || result?.code);
      setNotice({ text: failed ? copy.failed : result?.job ? order.returnContext?.state.panel === "export-center" ? copy.exportQueued : copy.actionQueued : copy.paid, error: failed });
    });
    return () => controller.abort();
  }, [orderId, pathname, copy]);
  return notice ? <p className={`form-status ${notice.error ? "error" : "success"}`} role={notice.error ? "alert" : "status"}>{notice.text}</p> : null;
}
