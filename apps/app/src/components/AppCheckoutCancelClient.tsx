"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readCheckoutReturn } from "../lib/flow-return";
import { useFlowMessages } from "../lib/flow-messages/client";
import { useAppLocale } from "./AppLocaleProvider";
import { useRouter } from "next/navigation";
import type { CheckoutReturnContext, PaymentVerification } from "@score/shared";
import { apiRequest } from "../lib/api";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";
import { PUBLIC_SITE_URL } from "../lib/support";
import { useAppAuthModal } from "./AppAuthModal";
import { getCheckoutReturnCopy } from "../lib/checkout-return-copy";
export function AppCheckoutCancelClient({ orderId, token = "", returnToken, provider = "stripe", title, body }: { orderId: string; token?: string; returnToken?: string; provider?: "stripe" | "paddle"; title: string; body: string }) {
 const { locale } = useAppLocale(); const copy = useFlowMessages();
 const [target, setTarget] = useState({ next: "/scores", retry: "/checkout", createdAt: 0 });
 const router = useRouter(); const signIn = useAppAuthModal(); const [attempt, setAttempt] = useState(0);
 const [error, setError] = useState<string | null>(null);
 const [checked, setChecked] = useState(!orderId);
 useEffect(() => {
   let disposed = false;
   setChecked(false);
   const fallback = readCheckoutReturn(orderId); setTarget(fallback);
   if (!orderId) { setChecked(true); return; }
   const authToken = getStoredToken();
   const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
   void apiRequest<{ token?: string; verification?: PaymentVerification; order: { status: string; planCode?: string; billingKind?: string; passMode?: string; returnContext?: CheckoutReturnContext } }>(`/api/payments/orders/${encodeURIComponent(orderId)}/owned`, { headers }).then(async result => {
     if (disposed) return;
     if (!result.ok) { if (result.status === 401) { if (getStoredToken() === authToken) clearStoredToken(); signIn("login", () => setAttempt(value => value + 1), { interactive: false }); } else setError(result.error); return; }
     if (result.data.order.status === "paid" || ["waiting_fulfillment", "fulfillment_failed", "verification_failed"].includes(result.data.verification?.status ?? "")) { router.replace(`/checkout/success?${new URLSearchParams({ order_id: orderId, token: token || result.data.token || "", provider, ...(returnToken ? { return_token: returnToken } : {}) })}`); return; }
     const handoff = await apiRequest<{ returnContext: CheckoutReturnContext }>(`/api/payments/orders/${encodeURIComponent(orderId)}/return`, { method: "POST", headers, body: JSON.stringify(returnToken ? { returnToken } : {}) });
     if (disposed) return;
     if (!handoff.ok && handoff.status !== 409) { setError(handoff.error); return; }
     const context = handoff.ok ? handoff.data.returnContext : result.data.order.returnContext;
     setChecked(true);
     const next = new URL(context?.path ?? fallback.next, "https://app.scoretransposer.com");
     next.searchParams.set("checkoutOrderId", orderId); next.searchParams.set("checkoutResult", "cancelled");
     if (result.data.order.planCode) next.searchParams.set("checkoutPlan", result.data.order.planCode);
     if (result.data.order.billingKind) next.searchParams.set("checkoutBilling", result.data.order.billingKind);
     next.searchParams.set("checkoutProvider", provider);
     if (result.data.order.passMode) next.searchParams.set("checkoutPassMode", result.data.order.passMode);
     const path = `${next.pathname}${next.search}${next.hash}`;
     setTarget(current => ({ ...current, next: path }));
     if (context?.site === "www") window.location.assign(new URL(path, PUBLIC_SITE_URL).toString());
     else router.replace(path);
   });
   return () => { disposed = true; };
 }, [orderId, token, returnToken, provider, attempt, router, signIn]);
 return <div className="surface-panel stack-lg">{checked ? <><h1 className="page-title">{title}</h1><p>{orderId ? body : getCheckoutReturnCopy(locale).missing}</p><div className="button-row">{orderId ? <Link href={target.retry} className="button button-primary">{copy.retry}</Link> : null}<Link href={target.next} className="button button-secondary">{copy.back}</Link></div></> : <p role="status">{copy.waitingAccess}</p>}{error ? <p role="alert">{error}</p> : null}</div>;
}
