"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";

type ActivationPayload = {
  ok: true;
  entitlement: {
    starts_at: string;
    ends_at: string;
  } | null;
};

export function ActivationForm() {
  const router = useRouter();
  const [code, setCode] = useState("DEMO-1YEAR-ACCESS");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const token = getStoredToken();
    if (!token) {
      setSubmitting(false);
      setStatus("Please sign in first.");
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
      return;
    }

    setStatus("Activation code redeemed. Redirecting...");
    router.push(APP_ROUTES.dashboard);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <label style={labelStyle}>
        <span>Activation code</span>
        <input value={code} onChange={(event) => setCode(event.target.value)} required style={inputStyle} />
      </label>
      <button type="submit" disabled={submitting} style={buttonStyle}>
        {submitting ? "Redeeming..." : "Redeem code"}
      </button>
      <p style={{ margin: 0, color: "#516174" }}>
        Dev seed code: <code>DEMO-1YEAR-ACCESS</code>
      </p>
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
