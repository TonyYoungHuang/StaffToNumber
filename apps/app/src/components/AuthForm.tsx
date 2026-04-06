"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <form onSubmit={handleSubmit} style={formStyle}>
      <label style={labelStyle}>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          style={inputStyle}
        />
      </label>
      <label style={labelStyle}>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          style={inputStyle}
        />
      </label>
      <button type="submit" disabled={submitting} style={buttonStyle}>
        {submitting ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
      </button>
      {status ? <p style={statusStyle}>{status}</p> : null}
    </form>
  );
}

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #c9d4df",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "16px",
};

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: "14px",
  padding: "14px 16px",
  background: "#12202f",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
};

const statusStyle: React.CSSProperties = {
  margin: 0,
  color: "#3c4f61",
};
