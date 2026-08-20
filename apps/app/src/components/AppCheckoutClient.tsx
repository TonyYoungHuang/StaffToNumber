"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTES, type PaymentProvider } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

type CheckoutPayload = {
  provider: PaymentProvider;
  orderId: string;
  token: string;
  url: string;
  code?: "PAYMENT_PROVIDER_BUILDING" | "CHECKOUT_INTENT_NOTIFICATION_FAILED";
  intentNotified?: boolean;
};

type Organization = { id: string; name: string; currentRole: string };

const providers = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDERS ?? "paddle,stripe")
  .split(",")
  .map((item) => item.trim())
  .filter((item): item is PaymentProvider => item === "stripe" || item === "paddle");
const liveProviders = new Set(
  (process.env.NEXT_PUBLIC_LIVE_PAYMENT_PROVIDERS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is PaymentProvider => item === "stripe" || item === "paddle"),
);
const schoolCheckoutAvailable = process.env.NEXT_PUBLIC_SCHOOL_CHECKOUT_AVAILABLE === "true";

export function AppCheckoutClient() {
  const router = useRouter();
  const { locale } = useAppLocale();
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "redirecting">("checking");
  const [provider, setProvider] = useState<PaymentProvider>(providers[0] ?? "stripe");
  const [status, setStatus] = useState<{ message: string; tone: "success" | "error" } | null>(null);
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
            stripeLiveBody: "适合国际银行卡和钱包支付。",
            stripeBuildingBody: "正式版尚未接入，当前只记录付款需求，不会扣款。",
            paddleTitle: "Paddle",
            paddleLiveBody: "由 Paddle 处理海外付款、税务与订阅。",
            paddleBuildingBody: "正式商户仍待验收，当前只记录付款需求，不会扣款。",
            available: "已开通",
            building: "正在建设",
            waiting: "等待正式商户验收",
            button: "继续到安全支付",
            intentButton: "通知站长我的付款需求",
            loading: "正在跳转支付页面...",
            loginFirst: "请先登录。",
            checking: "正在检查登录状态...",
            redirecting: "请先使用 Google 或邮箱登录，正在前往登录页...",
            accountNote: "Google 账户用于确认订阅归属；银行卡、Google Pay 或其他付款方式由所选支付渠道提供。",
            intentNote: "点击按钮后，后台会先向站长发送一封付款意向邮件。只有已经正式开通的渠道才会继续跳转；建设中的渠道不会扣款。",
            providerBuilding: (name: string) => `${name} 正式支付正在建设。你的付款需求已经通知站长，当前没有产生扣款。`,
            notificationFailed: "暂时无法把付款需求通知站长，请稍后重试。没有产生扣款。",
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
            stripeLiveBody: "Best for international cards and wallet payments.",
            stripeBuildingBody: "Live checkout is not connected yet. This currently records demand without charging you.",
            paddleTitle: "Paddle",
            paddleLiveBody: "Paddle handles international billing, tax, and subscriptions.",
            paddleBuildingBody: "The live merchant account still awaits approval. This records demand without charging you.",
            available: "Live",
            building: "In development",
            waiting: "Awaiting live merchant approval",
            button: "Continue to secure payment",
            intentButton: "Notify the owner of my purchase request",
            loading: "Redirecting to the payment page...",
            loginFirst: "Please sign in first.",
            checking: "Checking your sign-in status...",
            redirecting: "Sign in with Google or email first. Redirecting to sign in...",
            accountNote: "Your Google account identifies who receives the subscription. Cards, Google Pay, and other payment methods are offered by the selected payment provider.",
            intentNote: "The server emails the owner before continuing. Only a live provider redirects to checkout; a provider under construction never charges you.",
            providerBuilding: (name: string) => `${name} live checkout is under construction. The owner received your purchase request and no charge was created.`,
            notificationFailed: "The owner could not be notified. Please try again later. No charge was created.",
          },
    [locale],
  );

  const loginUrl = `${APP_ROUTES.login}?${new URLSearchParams({ next: APP_ROUTES.checkout }).toString()}`;

  useEffect(() => {
    if (!getStoredToken()) {
      setSessionState("redirecting");
      router.replace(loginUrl);
      return;
    }
    setSessionState("ready");
  }, [loginUrl, router]);

  useEffect(() => {
    if (!schoolCheckoutAvailable) return;
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
      setStatus({ message: copy.loginFirst, tone: "error" });
      setSessionState("redirecting");
      router.replace(loginUrl);
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
      if (result.status === 401) {
        clearStoredToken();
        setSessionState("redirecting");
        router.replace(loginUrl);
        return;
      }
      if (result.data?.code === "PAYMENT_PROVIDER_BUILDING") {
        const providerName = provider === "stripe" ? copy.stripeTitle : copy.paddleTitle;
        setStatus({ message: copy.providerBuilding(providerName), tone: "success" });
        return;
      }
      if (result.data?.code === "CHECKOUT_INTENT_NOTIFICATION_FAILED") {
        setStatus({ message: copy.notificationFailed, tone: "error" });
        return;
      }
      setStatus({ message: result.error, tone: "error" });
      return;
    }

    trackFunnelEvent("begin_checkout", {
      payment_type: provider,
      plan_kind: planKind,
      quantity: planKind === "school" ? seatQuantity : 1,
    });
    window.location.href = result.data.url;
  }

  if (sessionState !== "ready") {
    return (
      <div className="surface-panel stack-lg" aria-live="polite">
        <p className="eyebrow">Checkout</p>
        <h1 className="page-title">{sessionState === "checking" ? copy.checking : copy.redirecting}</h1>
      </div>
    );
  }

  return (
    <div className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">Checkout</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
        <p className="helper-copy">{copy.accountNote}</p>
        <p className="helper-copy">{copy.intentNote}</p>
      </div>

      <form className="form-grid" onSubmit={handleCheckout}>
        {schoolCheckoutAvailable ? <div className="field-group">
          <span className="field-label">{copy.plan}</span>
          <div className="button-row" role="group" aria-label={copy.plan}>
            <button type="button" className={`button ${planKind === "individual" ? "button-primary" : "button-secondary"}`} aria-pressed={planKind === "individual"} onClick={() => setPlanKind("individual")}>{copy.individual}</button>
            <button type="button" className={`button ${planKind === "school" ? "button-primary" : "button-secondary"}`} aria-pressed={planKind === "school"} onClick={() => setPlanKind("school")}>{copy.school}</button>
          </div>
        </div> : null}
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
              const isLive = liveProviders.has(item);
              const title = item === "stripe" ? copy.stripeTitle : copy.paddleTitle;
              const body = item === "stripe"
                ? isLive ? copy.stripeLiveBody : copy.stripeBuildingBody
                : isLive ? copy.paddleLiveBody : copy.paddleBuildingBody;
              const statusLabel = isLive ? copy.available : item === "stripe" ? copy.building : copy.waiting;
              return (
                <button
                  key={item}
                  type="button"
                  className={`glass-panel stack-sm ${isActive ? "is-selected" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setProvider(item)}
                  style={{ textAlign: "left", border: isActive ? "1px solid rgba(113,236,206,0.6)" : undefined }}
                >
                  <p className="item-title">{title} <span className={`status-chip ${isLive ? "tone-green" : "tone-amber"}`}>{statusLabel}</span></p>
                  <p className="body-copy">{body}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="button-row">
          <button type="submit" className="button button-primary" disabled={loading || (planKind === "school" && !organizationId)}>
            {loading ? copy.loading : liveProviders.has(provider) ? copy.button : copy.intentButton}
          </button>
        </div>
      </form>

      {status ? (
        <p className={`form-status ${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
