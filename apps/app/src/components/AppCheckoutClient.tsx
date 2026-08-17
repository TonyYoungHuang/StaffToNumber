"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type Organization = { id: string; name: string; currentRole: string };

const providers: PaymentProvider[] = ["stripe", "paddle"];

export function AppCheckoutClient() {
  const { locale } = useAppLocale();
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [planKind, setPlanKind] = useState<"individual" | "school">("individual");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [seatQuantity, setSeatQuantity] = useState(10);
  const checkoutIntent = useRef<{ signature: string; key: string } | null>(null);

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            title: "在线支付开通权限",
            body: "海外用户完成支付后会自动开通，无需手动输入激活码。中国大陆用户仍建议使用电商平台购买激活码后兑换。",
            provider: "支付渠道",
            plan: "订阅类型",
            individual: "个人订阅",
            school: "学校/机构席位",
            organization: "购买机构",
            seats: "席位数量",
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
            plan: "Subscription type",
            individual: "Individual",
            school: "School seats",
            organization: "Billing organization",
            seats: "Seat quantity",
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

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    void apiRequest<{ organizations: Organization[] }>("/api/education/organizations", { headers: { Authorization: `Bearer ${token}` } })
      .then((result) => {
        if (!result.ok) return;
        const manageable = result.data.organizations.filter((organization) => organization.currentRole === "owner" || organization.currentRole === "admin");
        setOrganizations(manageable);
        setOrganizationId((current) => manageable.some((organization) => organization.id === current) ? current : manageable[0]?.id ?? "");
      });
  }, []);

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      setStatus(copy.loginFirst);
      return;
    }

    setLoading(true);
    setStatus(null);

    const signature = JSON.stringify({ provider, locale, planKind, organizationId, seatQuantity });
    if (checkoutIntent.current?.signature !== signature) {
      checkoutIntent.current = { signature, key: crypto.randomUUID() };
    }

    const result = await apiRequest<CheckoutPayload>("/api/payments/checkout/authenticated", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": checkoutIntent.current.key,
      },
      body: JSON.stringify({
        provider,
        locale,
        organizationId: planKind === "school" ? organizationId : undefined,
        seatQuantity: planKind === "school" ? seatQuantity : 1,
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
    <div className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">Checkout</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>

      <form className="form-grid" onSubmit={handleCheckout}>
        <div className="field-group">
          <span className="field-label">{copy.plan}</span>
          <div className="button-row" role="group" aria-label={copy.plan}>
            <button type="button" className={`button ${planKind === "individual" ? "button-primary" : "button-secondary"}`} aria-pressed={planKind === "individual"} onClick={() => setPlanKind("individual")}>{copy.individual}</button>
            <button type="button" className={`button ${planKind === "school" ? "button-primary" : "button-secondary"}`} aria-pressed={planKind === "school"} onClick={() => setPlanKind("school")}>{copy.school}</button>
          </div>
        </div>
        {planKind === "school" ? (
          <div className="form-grid two-column">
            <label className="field-group"><span className="field-label">{copy.organization}</span><select className="field-select" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required><option value="">{copy.organization}</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
            <label className="field-group"><span className="field-label">{copy.seats}</span><input className="field-control" type="number" min={2} max={100000} step={1} value={seatQuantity} onChange={(event) => setSeatQuantity(Math.max(2, Number(event.target.value) || 2))} /></label>
          </div>
        ) : null}
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
          <button type="submit" className="button button-primary" disabled={loading || (planKind === "school" && !organizationId)}>
            {loading ? copy.loading : copy.button}
          </button>
        </div>
      </form>

      {status ? <p className="form-status error">{status}</p> : null}
    </div>
  );
}
