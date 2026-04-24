"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

export function PasswordResetRequestForm() {
  const { locale } = useAppLocale();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);

  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "找回密码",
          title: "发送密码重置链接",
          body: "输入注册邮箱后，系统会向该账号发送密码重置邮件。如果当前没有配置正式邮件服务，链接会进入 API 预览日志。",
          email: "注册邮箱",
          placeholder: "you@example.com",
          submit: "发送重置邮件",
          submitting: "发送中...",
          back: "返回登录",
          success: "如果该账号存在，密码重置邮件已准备好，请检查收件箱或联系支持。",
        }
      : {
          eyebrow: "Password reset",
          title: "Send a reset link",
          body: "Enter the account email and the system will prepare a password reset email. If transactional email is not configured yet, the link will appear in API preview logs.",
          email: "Account email",
          placeholder: "you@example.com",
          submit: "Send reset email",
          submitting: "Sending...",
          back: "Back to sign in",
          success: "If that account exists, a password reset email has been prepared. Check your inbox or contact support.",
        };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setStatusKind(null);

    const result = await apiRequest<{ ok: true; message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        email,
        locale,
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
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.placeholder}
          />
        </label>

        <div className="button-row">
          <button type="submit" disabled={submitting} className="button button-primary">
            {submitting ? copy.submitting : copy.submit}
          </button>
          <Link href={APP_ROUTES.login} className="button button-secondary">
            {copy.back}
          </Link>
        </div>
      </form>

      {status && statusKind ? <p className={`form-status ${statusKind}`}>{status}</p> : null}
    </div>
  );
}
