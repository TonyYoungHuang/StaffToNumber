"use client";

import { useMemo, useRef, useState } from "react";
import type { PaymentProvider } from "@score/shared";
import { MetricCard, Panel, StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getAppActivateUrl, getSupportUrl } from "../lib/site";
import { useSiteLocale } from "./SiteLocaleProvider";

type CheckoutPayload = {
  provider: PaymentProvider;
  orderId: string;
  token: string;
  url: string;
};

const providers = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDERS ?? "stripe")
  .split(",")
  .map((item) => item.trim())
  .filter((item): item is PaymentProvider => item === "stripe" || item === "paddle");

export function CheckoutClient() {
  const { locale } = useSiteLocale();
  const activateUrl = getAppActivateUrl();
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>(providers[0] ?? "stripe");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const checkoutIntent = useRef<{ signature: string; key: string } | null>(null);

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            eyebrow: "安全支付",
            title: "在线订阅并自动开通账户",
            body: "使用已注册账户的邮箱继续支付。付款成功后，订阅与配额会自动归属到该账户。",
            email: "已注册账户邮箱",
            emailPlaceholder: "you@example.com",
            emailHelp: "必须与 ScoreTransposer 注册邮箱一致，避免订阅无法归属。",
            provider: "支付渠道",
            stripeTitle: "Stripe",
            stripeBody: "适合国际银行卡、Apple Pay、Google Pay，以及标准托管收银台流程。",
            paddleTitle: "Paddle",
            paddleBody: "适合需要 Merchant of Record、税务处理和 Paddle 托管支付页的场景。",
            button: "继续支付",
            loading: "正在跳转到支付页面...",
            activate: "我已经有激活码",
            badge: "托管支付页",
            accessLabel: "计费周期",
            accessValue: "按月",
            accessBody: "订阅按月续费，可在账单中心管理付款方式或取消。",
            deliveryLabel: "支付后",
            deliveryValue: "自动开通",
            deliveryBody: "支付成功后订阅、席位与使用配额会自动写入已注册账户。",
            supportLabel: "人工支持",
            supportValue: "邮件复核",
            supportBody: "如果支付回跳异常或账户权益没有出现，可以由支持团队人工核对订单链路。",
            nextTitle: "继续之前请先确认",
            nextSteps: [
              "支付成功后，系统会自动确认订单并为注册账户开通订阅。",
              "同一笔支付即使重复点击或网络重试，也只会创建一个有效订单。",
              "如果你已经通过其他渠道买过激活码，不需要在这里重复付款。",
            ],
            contact: "联系支持",
          }
        : {
            eyebrow: "Secure checkout",
            title: "Subscribe online and unlock your account",
            body: "Continue with the email of an existing ScoreTransposer account. Your subscription and quotas are linked automatically after payment.",
            email: "Registered account email",
            emailPlaceholder: "you@example.com",
            emailHelp: "This must match your ScoreTransposer account so the subscription can be attributed safely.",
            provider: "Payment provider",
            stripeTitle: "Stripe",
            stripeBody: "Best for international cards, Apple Pay, Google Pay, and a standard hosted checkout flow.",
            paddleTitle: "Paddle",
            paddleBody: "Best when you want Merchant of Record billing, tax handling, and Paddle-hosted checkout.",
            button: "Continue to payment",
            loading: "Redirecting to the payment page...",
            activate: "I already have an activation code",
            badge: "Hosted payment page",
            accessLabel: "Billing cycle",
            accessValue: "Monthly",
            accessBody: "The subscription renews monthly and can be managed or canceled from Billing.",
            deliveryLabel: "After payment",
            deliveryValue: "Automatic access",
            deliveryBody: "A successful payment links the subscription, seats, and usage quotas to the registered account.",
            supportLabel: "Human support",
            supportValue: "Email review",
            supportBody: "If checkout returns unexpectedly or account access does not appear, support can manually review the order path.",
            nextTitle: "Know this before you continue",
            nextSteps: [
              "After payment succeeds, the system confirms the order and activates the registered account automatically.",
              "Repeated clicks or network retries reuse the same checkout intent instead of creating duplicate orders.",
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

    const normalizedEmail = email.trim().toLowerCase();
    const signature = JSON.stringify({ provider, locale, email: normalizedEmail });
    if (checkoutIntent.current?.signature !== signature) {
      checkoutIntent.current = { signature, key: crypto.randomUUID() };
    }

    const result = await apiRequest<CheckoutPayload>("/api/payments/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": checkoutIntent.current.key },
      body: JSON.stringify({
        provider,
        email: normalizedEmail,
        locale,
      }),
    });

    if (!result.ok) {
      setLoading(false);
      setStatus(result.error);
      return;
    }

    trackFunnelEvent("begin_checkout", {
      payment_type: provider,
      plan_kind: "individual",
      quantity: 1,
    });
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
            required
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
