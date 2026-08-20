"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getStoredToken, setStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

type AuthPayload = {
  token: string;
  user: {
    id: string;
    email: string;
    entitlement: { status: "inactive" | "active" | "expired" };
  };
  isNewUser?: boolean;
};

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
          renderButton(
            parent: HTMLElement,
            options: { theme: "outline"; size: "large"; shape: "rectangular"; text: "continue_with"; width: number },
          ): void;
        };
      };
    };
  }
}

export function AuthForm({ mode, redirectTo }: { mode: "register" | "login"; redirectTo?: string }) {
  const router = useRouter();
  const { locale } = useAppLocale();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: mode === "register" ? "创建账户" : "登录",
          title: mode === "register" ? "创建你的乐谱账户" : "欢迎回来",
          body:
            mode === "register"
              ? "使用 Google，或用邮箱和密码创建账户。注册后可以免费识别一页乐谱。"
              : "使用 Google 或邮箱登录，继续查看、修改和导出你的乐谱。",
          googleDivider: "或使用邮箱",
          email: "邮箱",
          emailPlaceholder: "you@example.com",
          password: "密码",
          passwordPlaceholder: "至少 8 个字符",
          submitWaiting: "请稍候...",
          submit: mode === "register" ? "创建账户" : "登录",
          switch: mode === "register" ? "已有账户" : "还没有账户",
          footnote:
            mode === "register"
              ? "免费预览不包含下载；多页识谱、再次处理、校对和完整导出需要开通权限。"
              : "如你通过电商渠道购买了激活码，可在登录后继续兑换。",
          redeem: "兑换激活码（中国大陆）",
          forgot: "忘记密码",
          registerSuccess: "账户已创建，正在跳转...",
          loginSuccess: "登录成功，正在跳转...",
          googleFailed: "Google 登录没有完成，请重试。",
        }
      : {
          eyebrow: mode === "register" ? "Create account" : "Sign in",
          title: mode === "register" ? "Create your score account" : "Welcome back",
          body:
            mode === "register"
              ? "Continue with Google, or create an account with email and password. Your first one-page score scan is free."
              : "Continue with Google or email to view, edit, and export your scores.",
          googleDivider: "or use email",
          email: "Email",
          emailPlaceholder: "you@example.com",
          password: "Password",
          passwordPlaceholder: "At least 8 characters",
          submitWaiting: "Please wait...",
          submit: mode === "register" ? "Create account" : "Sign in",
          switch: mode === "register" ? "Already have an account" : "Need an account",
          footnote:
            mode === "register"
              ? "The free preview does not include downloads. More pages, correction, and full exports require access."
              : "If you bought an activation code through a mainland-China sales channel, redeem it after signing in.",
          redeem: "Redeem activation code (Mainland China)",
          forgot: "Forgot password",
          registerSuccess: "Account created. Redirecting...",
          loginSuccess: "Signed in. Redirecting...",
          googleFailed: "Google sign-in did not finish. Please try again.",
        };

  const statusTone = status ? statusKind : null;

  const completeAuthentication = useCallback((payload: AuthPayload, method: "email" | "google") => {
    setStoredToken(payload.token);
    trackFunnelEvent(payload.isNewUser || mode === "register" ? "sign_up" : "login", { method });
    setStatus(payload.isNewUser || mode === "register" ? copy.registerSuccess : copy.loginSuccess);
    setStatusKind("success");
    const nextRoute = redirectTo ?? (payload.isNewUser || mode === "register" || payload.user.entitlement.status !== "active"
      ? `${APP_ROUTES.scores}/new/scan`
      : APP_ROUTES.dashboard);
    router.push(nextRoute);
    router.refresh();
  }, [copy.loginSuccess, copy.registerSuccess, mode, redirectTo, router]);

  useEffect(() => {
    if (!redirectTo || !getStoredToken()) {
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }, [redirectTo, router]);

  useEffect(() => {
    if (!googleClientId || !googleReady || !window.google || !googleButtonRef.current) return;

    const button = googleButtonRef.current;
    button.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (!response.credential) {
          setStatus(copy.googleFailed);
          setStatusKind("error");
          return;
        }
        setSubmitting(true);
        setStatus(null);
        setStatusKind(null);
        void apiRequest<AuthPayload>("/api/auth/google", {
          method: "POST",
          body: JSON.stringify({ credential: response.credential }),
        }).then((result) => {
          setSubmitting(false);
          if (!result.ok) {
            setStatus(result.error);
            setStatusKind("error");
            return;
          }
          completeAuthentication(result.data, "google");
        });
      },
    });
    window.google.accounts.id.renderButton(button, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      width: 320,
    });
  }, [completeAuthentication, copy.googleFailed, googleClientId, googleReady]);

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

    completeAuthentication(result.data, "email");
  }

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      {googleClientId ? (
        <div className="stack-sm">
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onLoad={() => setGoogleReady(true)}
            onReady={() => setGoogleReady(true)}
          />
          <div ref={googleButtonRef} className="google-auth-button" aria-live="polite" />
          <div className="auth-divider"><span>{copy.googleDivider}</span></div>
        </div>
      ) : null}

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
