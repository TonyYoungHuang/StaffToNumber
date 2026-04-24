"use client";

import { useMemo, useState } from "react";
import type { PaymentProvider } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

type CheckoutPayload = {
  provider: PaymentProvider;
  orderId: string;
  token: string;
  url: string;
};

const providers: PaymentProvider[] = ["stripe", "paddle"];

export function AppCheckoutClient() {
  const { locale } = useAppLocale();
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            title: "在线支付开通权限",
            body: "海外用户完成支付后会自动开通，无需手动输入激活码。中国大陆用户仍建议使用电商平台购买激活码后兑换。",
            provider: "支付渠道",
            stripeTitle: "Stripe",
            stripeBody: "适合国际银行卡和钱包支付。",
            paddleTitle: "Paddle",
            paddleBody: "适合需要 Merchant of Record 的海外收款。",
            button: "继续支付",
            loading: "正在跳转支付页面...",
            loginFirst: "请先登录。",
          }
        : {
            title: "Pay online and unlock access automatically",
            body: "After payment succeeds, your registered account is activated automatically. No manual activation code step is required for international customers.",
            provider: "Payment provider",
            stripeTitle: "Stripe",
            stripeBody: "Best for international cards and wallet payments.",
            paddleTitle: "Paddle",
            paddleBody: "Best for Merchant of Record billing and tax handling.",
            button: "Continue to payment",
            loading: "Redirecting to the payment page...",
            loginFirst: "Please sign in first.",
          },
    [locale],
  );

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      setStatus(copy.loginFirst);
      return;
    }

    setLoading(true);
    setStatus(null);

    const result = await apiRequest<CheckoutPayload>("/api/payments/checkout/authenticated", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider, locale }),
    });

    if (!result.ok) {
      setLoading(false);
      setStatus(result.error);
      return;
    }

    window.location.href = result.data.url;
  }

  return (
    <div className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">Checkout</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>

      <form className="form-grid" onSubmit={handleCheckout}>
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
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? copy.loading : copy.button}
          </button>
        </div>
      </form>

      {status ? <p className="form-status error">{status}</p> : null}
    </div>
  );
}
