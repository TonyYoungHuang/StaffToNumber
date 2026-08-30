"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import type { AuthMessageCatalog } from "../lib/auth-messages";

export function PasswordResetConfirmForm({ copy }: { copy: AuthMessageCatalog["resetConfirm"] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenStatus, setTokenStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      return;
    }

    apiRequest<{ valid: boolean }>(`/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`).then((result) => {
      if (!result.ok) {
        setVerificationError(result.error);
        setTokenStatus("invalid");
        return;
      }

      if (!result.data.valid) {
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
        <p className="body-copy" role="status" aria-live="polite">{copy.loading}</p>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 className="card-title">{copy.title}</h2>
          <p className="form-status error" role="alert">{verificationError ?? copy.invalid}</p>
        </div>
        <div className="button-row">
          <Link href={APP_ROUTES.forgotPassword} className="button button-primary">
            {copy.requestAgain}
          </Link>
          <Link href={APP_ROUTES.login} className="button button-secondary">
            {copy.backToSignIn}
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
            {copy.backToSignIn}
          </Link>
        </div>
      </form>

      {status && statusKind ? (
        <p className={`form-status ${statusKind}`} role={statusKind === "error" ? "alert" : "status"}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
