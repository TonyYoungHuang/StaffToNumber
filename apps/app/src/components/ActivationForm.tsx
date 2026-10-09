"use client";

import { useState } from "react";
import { useAppAuthModal } from "./AppAuthModal";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { workReturnPath } from "../lib/flow-return";
import { getStoredToken } from "../lib/auth-storage";
import { rawApiErrorOrFallback } from "../lib/billing-messages/client";
import type { ActivationFormCopy } from "../lib/billing-messages/types";

export type ActivationPayload = {
  ok: true;
  entitlement: {
    starts_at: string;
    ends_at: string;
  } | null;
  alreadyRedeemed?: boolean;
};

export function ActivationForm({ copy, returnTo, onActivated, errorMessage }: { copy: ActivationFormCopy; returnTo?: string; onActivated?: (payload: ActivationPayload) => void; errorMessage?: (error: string, status?: number) => string }) {
  const router = useRouter();
  const signIn = useAppAuthModal();
  const demoCode = process.env.NEXT_PUBLIC_DEMO_ACTIVATION_CODE?.trim() ?? "";
  const showDemoSeed = process.env.NODE_ENV !== "production" && Boolean(demoCode);
  const [code, setCode] = useState(showDemoSeed ? demoCode : "");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setStatusKind(null);

    if (!code.trim()) {
      setStatus(copy.required);
      setStatusKind("error");
      return;
    }

    const token = getStoredToken();
    if (!token && !onActivated) {
      setStatus(copy.loginFirst);
      setStatusKind("error");
      signIn();
      return;
    }

    setSubmitting(true);
    const result = await apiRequest<ActivationPayload>("/api/activation/redeem", {
      method: "POST",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : undefined,
      body: JSON.stringify({ code }),
    });
    setSubmitting(false);

    if (!result.ok) {
      setStatus(errorMessage ? errorMessage(result.error, result.status) : rawApiErrorOrFallback(result.error, copy.fallbackError));
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    if (onActivated) { onActivated(result.data); return; }
    router.push(workReturnPath(returnTo));
    router.refresh();
  }

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      {showDemoSeed ? (
        <div className="mini-card stack-sm">
          <p className="metric-label">{copy.devSeed}</p>
          <p className="item-title">{demoCode}</p>
          <p className="micro-copy">{copy.devSeedFootnote}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="form-grid" noValidate>
        <label className="field-group">
          <span className="field-label">{copy.codeLabel}</span>
          <input
            className="field-control"
            name="activationCode"
            autoComplete="one-time-code"
            spellCheck={false}
            autoCapitalize="characters"
            maxLength={128}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={copy.codePlaceholder}
            aria-describedby="activation-code-help"
            aria-invalid={statusKind === "error" && !code.trim()}
            required
          />
        </label>
        <div className="button-row">
          <button type="submit" disabled={submitting} className="button button-primary">
            {submitting ? copy.submitting : copy.submit}
          </button>
          {showDemoSeed ? (
            <button type="button" className="button button-secondary" onClick={() => setCode(demoCode)}>
              {copy.fillDemo}
            </button>
          ) : null}
        </div>
      </form>

      <p id="activation-code-help" className="micro-copy">{copy.footnote}</p>
      {status && statusKind ? (
        <p
          className={`form-status ${statusKind}`}
          role={statusKind === "error" ? "alert" : "status"}
          aria-live={statusKind === "error" ? "assertive" : "polite"}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
