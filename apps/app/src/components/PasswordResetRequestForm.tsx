"use client";

import Link from "next/link";
import { useState } from "react";
import type { SupportedLocale } from "@score/i18n";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import type { AuthMessageCatalog } from "../lib/auth-messages";

export function PasswordResetRequestForm({
  locale,
  copy,
}: {
  locale: SupportedLocale;
  copy: AuthMessageCatalog["resetRequest"];
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
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

      {status && statusKind ? (
        <p className={`form-status ${statusKind}`} role={statusKind === "error" ? "alert" : "status"}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
