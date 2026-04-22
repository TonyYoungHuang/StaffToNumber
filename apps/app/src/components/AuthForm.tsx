"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { setStoredToken } from "../lib/auth-storage";

type AuthPayload = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

export function AuthForm({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const statusTone = useMemo(() => {
    if (!status) return null;
    return status.toLowerCase().includes("redirecting") ? "success" : "error";
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const result = await apiRequest<AuthPayload>(`/api/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.error);
      return;
    }

    setStoredToken(result.data.token);
    setStatus(mode === "register" ? "Account created. Redirecting..." : "Signed in. Redirecting...");
    router.push(APP_ROUTES.dashboard);
    router.refresh();
  }

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{mode === "register" ? "Create account" : "Sign in"}</p>
        <h2 className="card-title">{mode === "register" ? "Secure your studio seat" : "Return to your conversion studio"}</h2>
        <p className="body-copy">
          {mode === "register"
            ? "Register with email and password first, then redeem the activation code from your purchase."
            : "Sign in to manage your one-year access, upload staff PDFs, and track output packages."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <label className="field-group">
          <span className="field-label">Email</span>
          <input
            className="field-control"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="field-group">
          <span className="field-label">Password</span>
          <input
            className="field-control"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </label>

        <div className="button-row">
          <button type="submit" disabled={submitting} className="button button-primary">
            {submitting ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
          </button>
          <Link href={mode === "register" ? APP_ROUTES.login : APP_ROUTES.register} className="button button-secondary">
            {mode === "register" ? "Already have an account" : "Need an account"}
          </Link>
        </div>
      </form>

      <p className="micro-copy">
        {mode === "register"
          ? "After registration, use your dedicated activation code to unlock one full year of access."
          : "If your purchase is complete but access is still locked, redeem the activation code next."}
      </p>
      {mode === "login" ? (
        <Link href={APP_ROUTES.activate} className="button button-tertiary">
          Redeem activation code
        </Link>
      ) : null}
      {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}
    </div>
  );
}
