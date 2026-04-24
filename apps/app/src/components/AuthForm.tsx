"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { setStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

type AuthPayload = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

export function AuthForm({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const { locale } = useAppLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: mode === "register" ? "创建账户" : "登录",
          title: mode === "register" ? "先锁定你的工作台席位" : "回到你的转换工作台",
          body:
            mode === "register"
              ? "先用邮箱和密码注册。海外用户随后在线支付即可自动开通；中国大陆用户可继续兑换激活码。"
              : "登录后可以管理权限、在线支付、上传五线谱 PDF，并追踪输出结果。",
          email: "邮箱",
          emailPlaceholder: "you@example.com",
          password: "密码",
          passwordPlaceholder: "至少 8 个字符",
          submitWaiting: "请稍候...",
          submit: mode === "register" ? "创建账户" : "登录",
          switch: mode === "register" ? "已有账户" : "还没有账户",
          footnote:
            mode === "register"
              ? "海外用户注册后可直接支付开通；中国大陆用户仍可通过激活码解锁权限。"
              : "如你通过电商渠道购买了激活码，可在登录后继续兑换。",
          redeem: "兑换激活码（中国大陆）",
          forgot: "忘记密码",
          registerSuccess: "账户已创建，正在跳转...",
          loginSuccess: "登录成功，正在跳转...",
        }
      : {
          eyebrow: mode === "register" ? "Create account" : "Sign in",
          title: mode === "register" ? "Secure your studio seat" : "Return to your conversion studio",
          body:
            mode === "register"
              ? "Register with email and password first. International users then pay online and get activated automatically; mainland-China users can still redeem activation codes."
              : "Sign in to manage access, pay online, upload staff PDFs, and track output packages.",
          email: "Email",
          emailPlaceholder: "you@example.com",
          password: "Password",
          passwordPlaceholder: "At least 8 characters",
          submitWaiting: "Please wait...",
          submit: mode === "register" ? "Create account" : "Sign in",
          switch: mode === "register" ? "Already have an account" : "Need an account",
          footnote:
            mode === "register"
              ? "After registration, international users can pay online for instant activation. Activation codes remain available for mainland-China sales."
              : "If you bought an activation code through a mainland-China sales channel, redeem it after signing in.",
          redeem: "Redeem activation code (Mainland China)",
          forgot: "Forgot password",
          registerSuccess: "Account created. Redirecting...",
          loginSuccess: "Signed in. Redirecting...",
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

    const result = await apiRequest<AuthPayload>(`/api/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStoredToken(result.data.token);
    setStatus(mode === "register" ? copy.registerSuccess : copy.loginSuccess);
    setStatusKind("success");
    const nextRoute = locale === "zh-CN" ? APP_ROUTES.activate : APP_ROUTES.checkout;
    router.push(nextRoute);
    router.refresh();
  }

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
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
        </label>
        <label className="field-group">
          <span className="field-label">{copy.password}</span>
          <input
            className="field-control"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            required
            minLength={8}
          />
        </label>

        <div className="button-row">
          <button type="submit" disabled={submitting} className="button button-primary">
            {submitting ? copy.submitWaiting : copy.submit}
          </button>
          <Link href={mode === "register" ? APP_ROUTES.login : APP_ROUTES.register} className="button button-secondary">
            {copy.switch}
          </Link>
        </div>
      </form>

      <p className="micro-copy">{copy.footnote}</p>
      {mode === "login" ? (
        <div className="button-row">
          <Link href={APP_ROUTES.activate} className="button button-tertiary">
            {copy.redeem}
          </Link>
          <Link href={APP_ROUTES.forgotPassword} className="button button-secondary">
            {copy.forgot}
          </Link>
        </div>
      ) : null}
      {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}
    </div>
  );
}
