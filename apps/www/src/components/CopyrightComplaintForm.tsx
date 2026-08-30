"use client";

import type { SupportedLocale } from "@score/i18n";
import { StatusPill } from "@score/ui";
import { useState } from "react";
import { apiRequest } from "../lib/api";
import type {
  CopyrightComplaintFormCopy,
  CopyrightComplaintStatus,
} from "../lib/support-legal-localization/types";

type SubmitResult = {
  referenceCode: string;
  accessCode: string;
  responseDueAt: string;
  confirmationDelivery: "resend" | "preview" | "failed";
};

type LookupResult = {
  referenceCode: string;
  status: CopyrightComplaintStatus;
  responseDueAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  actionTaken: string | null;
  updatedAt: string;
  events: Array<{ status: CopyrightComplaintStatus; message: string; createdAt: string }>;
};

type CopyrightComplaintFormProps = {
  locale: SupportedLocale;
  copy: CopyrightComplaintFormCopy;
};

function lines(value: string) {
  return value.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean);
}

function statusTone(status: CopyrightComplaintStatus) {
  if (status === "actioned" || status === "closed") return "green" as const;
  if (status === "rejected") return "red" as const;
  return "amber" as const;
}

export function CopyrightComplaintForm({ locale, copy }: CopyrightComplaintFormProps) {
  const [claimantName, setClaimantName] = useState("");
  const [claimantEmail, setClaimantEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [rightsBasis, setRightsBasis] = useState<"owner" | "authorized_agent">("owner");
  const [work, setWork] = useState("");
  const [targets, setTargets] = useState("");
  const [evidence, setEvidence] = useState("");
  const [requestedAction, setRequestedAction] = useState("");
  const [goodFaith, setGoodFaith] = useState(false);
  const [accuracy, setAccuracy] = useState(false);
  const [signature, setSignature] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SubmitResult | null>(null);
  const [referenceCode, setReferenceCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const result = await apiRequest<SubmitResult>("/api/copyright/complaints", {
      method: "POST",
      body: JSON.stringify({
        locale,
        claimantName,
        claimantEmail,
        organization,
        rightsBasis,
        originalWorkDescription: work,
        allegedlyInfringingUrls: lines(targets),
        evidenceUrls: lines(evidence),
        requestedAction,
        goodFaithDeclared: goodFaith,
        accuracyDeclared: accuracy,
        signature,
        website,
      }),
    });
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setReceipt(result.data);
    setReferenceCode(result.data.referenceCode);
    setAccessCode(result.data.accessCode);
    document.getElementById("copyright-receipt")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function track(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookingUp(true);
    setLookupError(null);
    setLookup(null);
    const result = await apiRequest<LookupResult>("/api/copyright/complaints/lookup", {
      method: "POST",
      body: JSON.stringify({ referenceCode, accessCode }),
    });
    setLookingUp(false);
    if (!result.ok) {
      setLookupError(result.error);
      return;
    }
    setLookup(result.data);
  }

  return (
    <div className="stack-xl">
      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <h2 className="card-title">{copy.submitTitle}</h2>
          <p className="body-copy">{copy.submitBody}</p>
        </div>
        <form className="form-grid" onSubmit={submit} aria-label={copy.submitFormAriaLabel} aria-busy={submitting}>
          <div className="field-row">
            <label className="field-group" style={{ flex: 1 }}>
              <span className="field-label">{copy.name}</span>
              <input className="field-control" required maxLength={120} value={claimantName} onChange={(event) => setClaimantName(event.target.value)} />
            </label>
            <label className="field-group" style={{ flex: 1 }}>
              <span className="field-label">{copy.email}</span>
              <input className="field-control" type="email" required maxLength={160} value={claimantEmail} onChange={(event) => setClaimantEmail(event.target.value)} />
            </label>
          </div>
          <div className="field-row">
            <label className="field-group" style={{ flex: 1 }}>
              <span className="field-label">{copy.organization}</span>
              <input className="field-control" maxLength={160} value={organization} onChange={(event) => setOrganization(event.target.value)} />
            </label>
            <label className="field-group" style={{ flex: 1 }}>
              <span className="field-label">{copy.relationship}</span>
              <select className="field-select" value={rightsBasis} onChange={(event) => setRightsBasis(event.target.value as typeof rightsBasis)}>
                <option value="owner">{copy.owner}</option>
                <option value="authorized_agent">{copy.agent}</option>
              </select>
            </label>
          </div>
          <label className="field-group">
            <span className="field-label">{copy.work}</span>
            <textarea className="field-control" required minLength={20} maxLength={6000} rows={6} value={work} onChange={(event) => setWork(event.target.value)} />
            <span className="helper-copy">{copy.workHint}</span>
          </label>
          <label className="field-group">
            <span className="field-label">{copy.targets}</span>
            <textarea className="field-control" required rows={4} value={targets} onChange={(event) => setTargets(event.target.value)} />
            <span className="helper-copy">{copy.targetsHint}</span>
          </label>
          <label className="field-group">
            <span className="field-label">{copy.evidence}</span>
            <textarea className="field-control" rows={3} value={evidence} onChange={(event) => setEvidence(event.target.value)} />
            <span className="helper-copy">{copy.evidenceHint}</span>
          </label>
          <label className="field-group">
            <span className="field-label">{copy.action}</span>
            <textarea className="field-control" required minLength={10} maxLength={2000} rows={4} value={requestedAction} onChange={(event) => setRequestedAction(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{copy.signature}</span>
            <input className="field-control" required maxLength={120} value={signature} onChange={(event) => setSignature(event.target.value)} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={goodFaith} onChange={(event) => setGoodFaith(event.target.checked)} required />
            <span>{copy.goodFaith}</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={accuracy} onChange={(event) => setAccuracy(event.target.checked)} required />
            <span>{copy.accuracy}</span>
          </label>
          <label className="sr-only">
            {copy.honeypotLabel}
            <input value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" />
          </label>
          <button className="public-button primary" type="submit" disabled={submitting}>
            {submitting ? copy.submitting : copy.submit}
          </button>
          {submitError ? <p className="form-status error" role="alert">{submitError}</p> : null}
        </form>
      </section>

      {receipt ? (
        <section id="copyright-receipt" className="surface-panel stack-lg" aria-live="polite" aria-label={copy.receiptAriaLabel}>
          <div className="score-review-toolbar">
            <h2 className="card-title">{copy.receiptTitle}</h2>
            <StatusPill tone="green">{copy.receiptStatus}</StatusPill>
          </div>
          <p className="body-copy">{copy.receiptBody}</p>
          <dl className="detail-list">
            <div><dt>{copy.reference}</dt><dd><strong>{receipt.referenceCode}</strong></dd></div>
            <div><dt>{copy.access}</dt><dd><strong>{receipt.accessCode}</strong></dd></div>
            <div><dt>{copy.due}</dt><dd>{new Date(receipt.responseDueAt).toLocaleString(locale)}</dd></div>
          </dl>
        </section>
      ) : null}

      <section id="track" className="surface-panel stack-lg">
        <div className="stack-sm">
          <h2 className="card-title">{copy.trackTitle}</h2>
          <p className="body-copy">{copy.trackBody}</p>
        </div>
        <form className="form-grid" onSubmit={track} aria-label={copy.trackFormAriaLabel} aria-busy={lookingUp}>
          <div className="field-row">
            <label className="field-group" style={{ flex: 1 }}>
              <span className="field-label">{copy.reference}</span>
              <input className="field-control" required value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} />
            </label>
            <label className="field-group" style={{ flex: 1 }}>
              <span className="field-label">{copy.access}</span>
              <input className="field-control" required type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} />
            </label>
          </div>
          <button className="public-button secondary" type="submit" disabled={lookingUp}>
            {lookingUp ? copy.lookingUp : copy.lookup}
          </button>
          {lookupError ? <p className="form-status error" role="alert">{lookupError}</p> : null}
        </form>
        {lookup ? (
          <div className="stack-lg" aria-live="polite">
            <div className="score-review-toolbar">
              <div><p className="item-title">{lookup.referenceCode}</p><p className="item-meta">{copy.current}</p></div>
              <StatusPill tone={statusTone(lookup.status)}>{copy.statuses[lookup.status]}</StatusPill>
            </div>
            <p className="item-meta">{copy.due}: {new Date(lookup.responseDueAt).toLocaleString(locale)}</p>
            {lookup.actionTaken ? <p className="body-copy"><strong>{copy.actionTaken}:</strong> {lookup.actionTaken}</p> : null}
            <div className="stack-md">
              <h3 className="card-title">{copy.history}</h3>
              {lookup.events.length > 0 ? lookup.events.map((item, index) => (
                <div className="list-item" key={`${item.createdAt}-${index}`}>
                  <div className="score-review-toolbar">
                    <span className="item-title">{copy.statuses[item.status]}</span>
                    <span className="item-meta">{new Date(item.createdAt).toLocaleString(locale)}</span>
                  </div>
                  <p className="body-copy">{item.message}</p>
                </div>
              )) : <p className="helper-copy">{copy.emptyHistory}</p>}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
