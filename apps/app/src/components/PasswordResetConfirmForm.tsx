"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

export function PasswordResetConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useAppLocale();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenStatus, setTokenStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "重置密码",
          title: "设置新密码",
          body: "这个页面会验证重置链接是否仍然有效。提交后，旧登录会话会被撤销，需要重新登录。",
          loading: "正在检查重置链接...",
          invalid: "这个重置链接无效或已过期，请重新申请。",
          password: "新密码",
          confirm: "确认新密码",
          placeholder: "至少 8 个字符",
          submit: "保存新密码",
          submitting: "保存中...",
          back: "重新申请链接",
          mismatch: "两次输入的密码不一致。",
          success: "密码已更新，正在跳转到登录页...",
        }
      : {
          eyebrow: "Reset password",
          title: "Set a new password",
          body: "This page verifies that the reset link is still valid. Submitting a new password revokes previous sign-in sessions and requires a fresh login.",
          loading: "Checking the reset link...",
          invalid: "This reset link is invalid or expired. Request a new one.",
          password: "New password",
          confirm: "Confirm new password",
          placeholder: "At least 8 characters",
          submit: "Save new password",
          submitting: "Saving...",
          back: "Request a new link",
          mismatch: "The two passwords do not match.",
          success: "Password updated. Redirecting to sign in...",
        };

  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      return;
    }

    apiRequest<{ valid: boolean }>(`/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`).then((result) => {
      if (!result.ok || !result.data.valid) {
        setTokenStatus("invalid");
        return;
      }

      setTokenStatus("valid");
    });
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setStatus(copy.mismatch);
      setStatusKind("error");
      return;
    }

    setSubmitting(true);
    setStatus(null);
    setStatusKind(null);

    const result = await apiRequest<{ ok: true }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token,
        password,
      }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    router.push(APP_ROUTES.login);
  }

  if (tokenStatus === "loading") {
    return (
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.loading}</p>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 className="card-title">{copy.title}</h2>
          <p className="form-status error">{copy.invalid}</p>
        </div>
        <div className="button-row">
          <Link href={APP_ROUTES.forgotPassword} className="button button-primary">
            {copy.back}
          </Link>
          <Link href={APP_ROUTES.login} className="button button-secondary">
            {locale === "zh-CN" ? "返回登录" : "Back to sign in"}
          </Link>
        </div>
      </div>
    );
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
          <span className="field-label">{copy.password}</span>
          <input
            className="field-control"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.placeholder}
          />
        </label>
        <label className="field-group">
          <span className="field-label">{copy.confirm}</span>
          <input
            className="field-control"
            type="password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={copy.placeholder}
          />
        </label>

        <div className="button-row">
          <button type="submit" disabled={submitting} className="button button-primary">
            {submitting ? copy.submitting : copy.submit}
          </button>
          <Link href={APP_ROUTES.login} className="button button-secondary">
            {locale === "zh-CN" ? "返回登录" : "Back to sign in"}
          </Link>
        </div>
      </form>

      {status && statusKind ? <p className={`form-status ${statusKind}`}>{status}</p> : null}
    </div>
  );
}
