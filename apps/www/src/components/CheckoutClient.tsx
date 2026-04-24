"use client";

import { useMemo, useState } from "react";
import type { PaymentProvider } from "@score/shared";
import { MetricCard, Panel, StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { getAppActivateUrl, getSupportUrl } from "../lib/site";
import { useSiteLocale } from "./SiteLocaleProvider";

type CheckoutPayload = {
  provider: PaymentProvider;
  orderId: string;
  token: string;
  url: string;
};

const providers: PaymentProvider[] = ["stripe", "paddle"];

export function CheckoutClient() {
  const { locale } = useSiteLocale();
  const activateUrl = getAppActivateUrl();
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            eyebrow: "安全支付",
            title: "在线付款并开通一年访问权限",
            body: "国际用户可以直接通过 Stripe 或 Paddle 支付。已经通过其他渠道购买激活码的中国大陆用户，可以跳过付款，直接到应用内兑换。",
            email: "联系邮箱（可选）",
            emailPlaceholder: "you@example.com",
            emailHelp: "填写邮箱有助于后续核对支付记录或处理支持请求。",
            provider: "支付渠道",
            stripeTitle: "Stripe",
            stripeBody: "适合国际银行卡、Apple Pay、Google Pay，以及标准托管收银台流程。",
            paddleTitle: "Paddle",
            paddleBody: "适合需要 Merchant of Record、税务处理和 Paddle 托管支付页的场景。",
            button: "继续支付",
            loading: "正在跳转到支付页面...",
            activate: "我已经有激活码",
            badge: "托管支付页",
            accessLabel: "访问时长",
            accessValue: "1 年",
            accessBody: "当前 checkout 流程围绕一年访问权限来设计。",
            deliveryLabel: "支付后",
            deliveryValue: "自动发码",
            deliveryBody: "支付成功页会确认订单状态，并展示这笔订单生成的激活码。",
            supportLabel: "人工支持",
            supportValue: "邮件复核",
            supportBody: "如果支付回跳异常或激活码没有出现，可以由支持团队人工核对订单链路。",
            nextTitle: "继续之前请先确认",
            nextSteps: [
              "支付成功后，系统会自动确认订单并发放一枚一年期激活码。",
              "成功页会同时显示订单状态和激活码，请在离开页面前先保存。",
              "如果你已经通过其他渠道买过激活码，不需要在这里重复付款。",
            ],
            contact: "联系支持",
          }
        : {
            eyebrow: "Secure checkout",
            title: "Pay online and unlock one year of access",
            body: "International customers can pay directly with Stripe or Paddle. Mainland-China customers who already bought an activation code elsewhere can skip checkout and redeem inside the app.",
            email: "Contact email (optional)",
            emailPlaceholder: "you@example.com",
            emailHelp: "Adding an email can make it easier to reconcile payment issues or support follow-up later.",
            provider: "Payment provider",
            stripeTitle: "Stripe",
            stripeBody: "Best for international cards, Apple Pay, Google Pay, and a standard hosted checkout flow.",
            paddleTitle: "Paddle",
            paddleBody: "Best when you want Merchant of Record billing, tax handling, and Paddle-hosted checkout.",
            button: "Continue to payment",
            loading: "Redirecting to the payment page...",
            activate: "I already have an activation code",
            badge: "Hosted payment page",
            accessLabel: "Access term",
            accessValue: "1 year",
            accessBody: "This checkout flow is positioned around one year of access.",
            deliveryLabel: "After payment",
            deliveryValue: "Auto-issued code",
            deliveryBody: "The success page confirms the order and shows the activation code generated for the purchase.",
            supportLabel: "Human support",
            supportValue: "Email review",
            supportBody: "If checkout returns unexpectedly or a code does not appear, support can manually review the order path.",
            nextTitle: "Know this before you continue",
            nextSteps: [
              "After payment succeeds, the system confirms the order and issues a one-year activation code automatically.",
              "The success page shows both order status and the activation code, so save the code before leaving the page.",
              "If you already purchased an activation code through another channel, you do not need to pay here again.",
            ],
            contact: "Contact support",
          },
    [locale],
  );

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const result = await apiRequest<CheckoutPayload>("/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify({
        provider,
        email: email.trim() || undefined,
        locale,
      }),
    });

    if (!result.ok) {
      setLoading(false);
      setStatus(result.error);
      return;
    }

    window.location.href = result.data.url;
  }

  return (
    <div className="surface-panel stack-xl">
      <div className="stack-sm">
        <StatusPill tone="cyan">{copy.badge}</StatusPill>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>

      <form className="form-grid" onSubmit={handleCheckout}>
        <label className="field-group">
          <span className="field-label">{copy.email}</span>
          <input
            className="field-control"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
          />
          <span className="helper-copy">{copy.emailHelp}</span>
        </label>

        <div className="field-group">
          <span className="field-label">{copy.provider}</span>
          <div className="feature-grid">
            {providers.map((item) => {
              const isActive = provider === item;
              const title = item === "stripe" ? copy.stripeTitle : copy.paddleTitle;
              const body = item === "stripe" ? copy.stripeBody : copy.paddleBody;
              return (
                <button
                  key={item}
                  type="button"
                  className={`glass-panel stack-sm ${isActive ? "is-selected" : ""}`}
                  onClick={() => setProvider(item)}
                  style={{ textAlign: "left", border: isActive ? "1px solid rgba(113,236,206,0.6)" : undefined }}
                >
                  <p className="item-title">{title}</p>
                  <p className="body-copy">{body}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="button-row">
          <button type="submit" className="public-button primary" disabled={loading}>
            {loading ? copy.loading : copy.button}
          </button>
          <a href={activateUrl} className="public-button secondary">
            {copy.activate}
          </a>
        </div>
      </form>

      {status ? <p className="form-status error">{status}</p> : null}

      <div className="metric-grid">
        <MetricCard label={copy.accessLabel} value={copy.accessValue} body={copy.accessBody} />
        <MetricCard label={copy.deliveryLabel} value={copy.deliveryValue} body={copy.deliveryBody} />
        <MetricCard label={copy.supportLabel} value={copy.supportValue} body={copy.supportBody} />
      </div>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">{copy.nextTitle}</h2>
        {copy.nextSteps.map((item) => (
          <p key={item} className="body-copy">
            {item}
          </p>
        ))}
        <div className="button-row">
          <a href={getSupportUrl("payment", "checkout")} className="public-button tertiary">
            {copy.contact}
          </a>
        </div>
      </Panel>
    </div>
  );
}
