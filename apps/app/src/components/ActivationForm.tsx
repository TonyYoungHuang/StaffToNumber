"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

  const statusTone = useMemo(() => {
    if (!status) return null;
    return status.toLowerCase().includes("redirecting") ? "success" : "error";
  }, [status]);

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
    <div className="stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">Redeem code</p>
        <h2 className="card-title">Turn purchase into one year of access</h2>
        <p className="body-copy">
          Enter the exclusive activation code that ships with your purchase. The code binds access after account creation.
        </p>
      </div>

      <div className="mini-card stack-sm">
        <p className="metric-label">Development seed</p>
        <p className="item-title">DEMO-1YEAR-ACCESS</p>
        <p className="micro-copy">Keep this only for local development and test redemptions.</p>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <label className="field-group">
          <span className="field-label">Activation code</span>
          <input className="field-control" value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <div className="button-row">
          <button type="submit" disabled={submitting} className="button button-primary">
            {submitting ? "Redeeming..." : "Redeem code"}
          </button>
          <button type="button" className="button button-secondary" onClick={() => setCode("DEMO-1YEAR-ACCESS")}>
            Fill demo code
          </button>
        </div>
      </form>

      <p className="micro-copy">If the code is valid, the dashboard should immediately show active entitlement dates.</p>
      {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}
    </div>
  );
}
