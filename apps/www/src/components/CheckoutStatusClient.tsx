"use client";

import { useEffect, useMemo, useState } from "react";
import type { PaymentProvider, PaymentOrderStatus } from "@score/shared";
import { MetricCard, Panel, StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { getAppActivateUrl, getSupportUrl, siteConfig } from "../lib/site";
import { useSiteLocale } from "./SiteLocaleProvider";

type PublicOrder = {
  id: string;
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  activationCode: string | null;
  customerEmail: string | null;
  paidAt: string | null;
};

type OrderPayload = {
  order: PublicOrder | null;
};

export function CheckoutStatusClient({
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
  const { locale } = useSiteLocale();
  const activateUrl = getAppActivateUrl();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            pendingBadge: "订单确认中",
            paidBadge: "支付已确认",
            stalledBadge: "可能需要人工复核",
            pendingTitle: "正在确认你的付款",
            pendingBody: "如果你刚刚完成支付，系统正在核对支付渠道返回并自动发放激活码。请先保留此页面。",
            paidTitle: "支付成功，激活码已发放",
            paidBody: "你的订单已确认。请先保存激活码，然后到应用内完成兑换。",
            stalledTitle: "这笔订单暂未自动确认",
            stalledBody: "这不一定代表扣款失败。有时支付回跳信息不完整，需要再次校验或人工处理。",
            missingTitle: "暂时没有找到可确认的订单",
            missingBody: "支付成功页已回跳，但我们还没有找到能自动核对的订单记录。请保留支付截图、邮箱和时间，然后联系支持人工处理。",
            errorTitle: "暂时无法读取支付状态",
            errorBody: "网站暂时无法自动获取订单状态。你可以稍后刷新，或联系支持进行人工核查。",
            activationCode: "激活码",
            orderStatus: "订单状态",
            provider: "支付渠道",
            email: "联系邮箱",
            redeem: "前往应用兑换",
            retry: "返回重新支付",
            home: "返回首页",
            contact: "联系支持",
            nextTitle: "建议的下一步",
            paidSteps: [
              "先复制并保存激活码，再离开当前页面。",
              "打开应用并兑换激活码，即可开通一年访问权限。",
              "如果兑换失败，请把激活码和订单信息一起发给支持团队。",
            ],
            pendingSteps: [
              "先不要立刻发起第二次付款。",
              "保留当前页面，让系统继续刷新并校验支付返回。",
              "如果仍未确认，请保留付款凭证并联系支持。",
            ],
            stalledSteps: [
              "先确认支付渠道是否已经完整回跳到这个成功页。",
              "保留付款截图、邮箱和购买时间，方便人工复核。",
              "如果你已经通过其他渠道拿到激活码，也可以直接走兑换路径。",
            ],
          }
        : {
            pendingBadge: "Order confirmation in progress",
            paidBadge: "Payment confirmed",
            stalledBadge: "Manual review may be needed",
            pendingTitle: "Confirming your payment",
            pendingBody: "If you just paid, we are checking the provider response and issuing your activation code automatically. Keep this page open for a moment.",
            paidTitle: "Payment successful and activation code issued",
            paidBody: "Your order is confirmed. Save the activation code first, then redeem it inside the app.",
            stalledTitle: "This order was not auto-confirmed yet",
            stalledBody: "That does not always mean the charge failed. Sometimes the provider return is incomplete and needs another check or manual review.",
            missingTitle: "We could not find a confirmed order yet",
            missingBody: "The success page returned without an order we can verify. Keep your payment screenshot, email, and timestamp, then contact support for manual review.",
            errorTitle: "We could not check the payment status",
            errorBody: "The site could not read the order state automatically. Refresh shortly or contact support for a manual check.",
            activationCode: "Activation code",
            orderStatus: "Order status",
            provider: "Payment provider",
            email: "Contact email",
            redeem: "Redeem in app",
            retry: "Return to checkout",
            home: "Back to homepage",
            contact: "Contact support",
            nextTitle: "Recommended next steps",
            paidSteps: [
              "Copy and save the activation code before leaving this page.",
              "Open the app and redeem the code to unlock one year of access.",
              "If redemption fails, send the code and order details to support.",
            ],
            pendingSteps: [
              "Do not start a second payment yet.",
              "Let the page refresh and re-check the provider response.",
              "If confirmation still does not appear, keep your payment proof and contact support.",
            ],
            stalledSteps: [
              "Check whether the provider fully returned you to this success page.",
              "Keep the payment screenshot, email, and purchase time for manual review.",
              "If you already have an activation code from another channel, you can use that path instead.",
            ],
          },
    [locale],
  );

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const load = async () => {
      const params = new URLSearchParams({ token, provider });
      if (sessionId) {
        params.set("sessionId", sessionId);
      }

      const result = await apiRequest<OrderPayload>(`/api/payments/orders/${orderId}?${params.toString()}`);
      if (cancelled) {
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
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [orderId, provider, sessionId, token]);

  const isPaid = order?.status === "paid" && Boolean(order.activationCode);
  const isStalled = order?.status === "cancelled" || order?.status === "failed";
  const badge = isPaid ? copy.paidBadge : isStalled ? copy.stalledBadge : copy.pendingBadge;
  const title = isPaid ? copy.paidTitle : isStalled ? copy.stalledTitle : copy.pendingTitle;
  const body = isPaid ? copy.paidBody : isStalled ? copy.stalledBody : copy.pendingBody;
  const steps = isPaid ? copy.paidSteps : isStalled ? copy.stalledSteps : copy.pendingSteps;

  return (
    <div className="surface-panel stack-xl">
      <div className="stack-sm">
        <StatusPill tone={isPaid ? "green" : isStalled ? "amber" : "cyan"}>{badge}</StatusPill>
        {loading ? <p className="body-copy">{copy.pendingBody}</p> : null}
        {error ? (
          <>
            <h1 className="page-title">{copy.errorTitle}</h1>
            <p className="body-copy large">{copy.errorBody}</p>
          </>
        ) : null}
        {!loading && !error && order ? (
          <>
            <h1 className="page-title">{title}</h1>
            <p className="body-copy large">{body}</p>
          </>
        ) : null}
        {!loading && !error && !order ? (
          <>
            <h1 className="page-title">{copy.missingTitle}</h1>
            <p className="body-copy large">{copy.missingBody}</p>
          </>
        ) : null}
      </div>

      {!loading && !error && order ? (
        <div className="metric-grid">
          <MetricCard label={copy.orderStatus} value={translateStatus(order.status, locale)} body={isPaid ? copy.paidBody : body} />
          <MetricCard label={copy.provider} value={translateProvider(order.provider, locale)} body={order.paidAt ?? order.id} />
          {order.customerEmail ? <MetricCard label={copy.email} value={order.customerEmail} body={siteConfig.supportEmail} /> : null}
          {isPaid && order.activationCode ? <MetricCard label={copy.activationCode} value={order.activationCode} body={copy.paidSteps[0]} /> : null}
        </div>
      ) : null}

      {!loading && !error ? (
        <Panel variant="sunken" className="stack-md">
          <h2 className="card-title">{copy.nextTitle}</h2>
          {steps.map((item) => (
            <p key={item} className="body-copy">
              {item}
            </p>
          ))}
          <div className="button-row">
            {isPaid ? (
              <a href={activateUrl} className="public-button primary">
                {copy.redeem}
              </a>
            ) : (
              <a href="/checkout" className="public-button primary">
                {copy.retry}
              </a>
            )}
            <a href={getSupportUrl("payment", "checkout-success")} className="public-button tertiary">
              {copy.contact}
            </a>
            <a href="/" className="public-button secondary">
              {copy.home}
            </a>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function translateStatus(status: PaymentOrderStatus, locale: string) {
  if (locale === "zh-CN") {
    switch (status) {
      case "paid":
        return "已支付";
      case "cancelled":
        return "已取消";
      case "failed":
        return "失败";
      default:
        return "处理中";
    }
  }

  switch (status) {
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

function translateProvider(provider: PaymentProvider, locale: string) {
  if (provider === "paddle") {
    return locale === "zh-CN" ? "Paddle 收银台" : "Paddle checkout";
  }

  return locale === "zh-CN" ? "Stripe 收银台" : "Stripe checkout";
}
