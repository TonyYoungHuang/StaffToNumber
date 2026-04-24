"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

type ActivationPayload = {
  ok: true;
  entitlement: {
    starts_at: string;
    ends_at: string;
  } | null;
};

export function ActivationForm() {
  const router = useRouter();
  const { locale } = useAppLocale();
  const demoCode = process.env.NEXT_PUBLIC_DEMO_ACTIVATION_CODE?.trim() ?? "";
  const showDemoSeed = process.env.NODE_ENV !== "production" && Boolean(demoCode);
  const [code, setCode] = useState(showDemoSeed ? demoCode : "");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "兑换激活码",
          title: "把购买记录兑换成一年访问权限",
          body: "输入随购买提供的专属激活码。请先注册账号，再完成兑换绑定。",
          devSeed: "开发演示码",
          devSeedFootnote: "仅用于本地开发或测试环境，不会在正式线上公开展示。",
          codeLabel: "激活码",
          submit: "兑换激活码",
          submitting: "兑换中...",
          fillDemo: "填入演示码",
          loginFirst: "请先登录。",
          success: "激活成功，正在跳转...",
          footnote: "如果激活码有效，控制台应立即显示新的授权起止时间。",
        }
      : {
          eyebrow: "Redeem code",
          title: "Turn purchase into one year of access",
          body: "Enter the exclusive activation code that ships with your purchase. The code binds access after account creation.",
          devSeed: "Development demo code",
          devSeedFootnote: "Shown only in local development or explicit test environments.",
          codeLabel: "Activation code",
          submit: "Redeem code",
          submitting: "Redeeming...",
          fillDemo: "Fill demo code",
          loginFirst: "Please sign in first.",
          success: "Activation code redeemed. Redirecting...",
          footnote: "If the code is valid, the dashboard should immediately show active entitlement dates.",
        };

  const statusTone = useMemo(() => {
    if (!status) return null;
    return statusKind;
  }, [status, statusKind]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setStatusKind(null);

    const token = getStoredToken();
    if (!token) {
      setSubmitting(false);
      setStatus(copy.loginFirst);
      setStatusKind("error");
      router.push(APP_ROUTES.login);
      return;
    }

    const result = await apiRequest<ActivationPayload>("/api/activation/redeem", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    router.push(APP_ROUTES.dashboard);
    router.refresh();
  }

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      {showDemoSeed ? (
        <div className="mini-card stack-sm">
          <p className="metric-label">{copy.devSeed}</p>
          <p className="item-title">{demoCode}</p>
          <p className="micro-copy">{copy.devSeedFootnote}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="form-grid">
        <label className="field-group">
          <span className="field-label">{copy.codeLabel}</span>
          <input className="field-control" value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <div className="button-row">
          <button type="submit" disabled={submitting} className="button button-primary">
            {submitting ? copy.submitting : copy.submit}
          </button>
          {showDemoSeed ? (
            <button type="button" className="button button-secondary" onClick={() => setCode(demoCode)}>
              {copy.fillDemo}
            </button>
          ) : null}
        </div>
      </form>

      <p className="micro-copy">{copy.footnote}</p>
      {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}
    </div>
  );
}
