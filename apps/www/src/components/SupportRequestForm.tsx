"use client";

import type { SupportedLocale } from "@score/i18n";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { apiRequest } from "../lib/api";
import type { SupportCategory, SupportFormCopy } from "../lib/support-legal-localization/types";

type SupportRequestResponse = {
  ok: true;
  referenceCode: string;
  supportDelivery: "resend" | "preview" | "failed";
  confirmationDelivery: "resend" | "preview" | "failed";
};

type SupportRequestFormProps = {
  locale: SupportedLocale;
  supportEmail: string;
  copy: SupportFormCopy;
};

const VALID_CATEGORIES: SupportCategory[] = ["payment", "activation", "job", "privacy", "general"];

function parseCategory(value: string | null): SupportCategory {
  return value && VALID_CATEGORIES.includes(value as SupportCategory) ? (value as SupportCategory) : "general";
}

function interpolate(template: string, values: Readonly<Record<string, string>>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  );
}

export function SupportRequestForm({ locale, supportEmail, copy }: SupportRequestFormProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<SupportCategory>(parseCategory(searchParams.get("category")));
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [jobReference, setJobReference] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [subjectDirty, setSubjectDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const selectedCategory = copy.categories[category];
  const sourceContext = useMemo(() => {
    const source = searchParams.get("source")?.trim();
    return source ? source.slice(0, 120) : "public-site";
  }, [searchParams]);

  useEffect(() => {
    const queryCategory = parseCategory(searchParams.get("category"));
    setCategory((current) => (current === queryCategory ? current : queryCategory));
  }, [searchParams]);

  useEffect(() => {
    if (!subjectDirty) {
      setSubject(selectedCategory.subject);
    }
  }, [selectedCategory.subject, subjectDirty]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setStatusKind(null);

    const result = await apiRequest<SupportRequestResponse>("/api/support/requests", {
      method: "POST",
      body: JSON.stringify({
        category,
        locale,
        contactName,
        contactEmail,
        accountEmail,
        orderReference,
        jobReference,
        subject,
        message,
        sourcePage: pathname,
        sourceContext,
        website,
      }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    const payload = result.data;
    const template = payload.confirmationDelivery === "resend"
      ? copy.successSent
      : payload.confirmationDelivery === "preview"
        ? copy.successPreview
        : copy.successFailed;
    setStatus(interpolate(template, { referenceCode: payload.referenceCode }));
    setStatusKind("success");
    setOrderReference("");
    setJobReference("");
    setMessage("");
    setSubjectDirty(false);
    setSubject(selectedCategory.subject);
    setWebsite("");
  }

  return (
    <section id="support-form" className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      <div className="stack-sm">
        <span className="field-label">{copy.categoryLabel}</span>
        <div className="button-row" role="group" aria-label={copy.categoryAriaLabel}>
          {VALID_CATEGORIES.map((item) => {
            const categoryCopy = copy.categories[item];
            const isActive = item === category;

            return (
              <button
                key={item}
                type="button"
                aria-pressed={isActive}
                className={`button ${isActive ? "button-tertiary" : "button-secondary"}`}
                onClick={() => {
                  setCategory(item);
                  if (!subjectDirty) {
                    setSubject(copy.categories[item].subject);
                  }
                }}
              >
                {categoryCopy.label}
              </button>
            );
          })}
        </div>
        <p className="helper-copy">{selectedCategory.helper}</p>
      </div>

      <form onSubmit={handleSubmit} className="form-grid" aria-label={copy.title} aria-busy={submitting}>
        <div className="field-row">
          <label className="field-group" style={{ flex: 1 }}>
            <span className="field-label">{copy.nameLabel}</span>
            <input className="field-control" type="text" value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={120} />
          </label>
          <label className="field-group" style={{ flex: 1 }}>
            <span className="field-label">{copy.contactEmailLabel}</span>
            <input className="field-control" type="email" required value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={160} />
          </label>
        </div>

        <div className="field-row">
          <label className="field-group" style={{ flex: 1 }}>
            <span className="field-label">{copy.accountEmailLabel}</span>
            <input className="field-control" type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} maxLength={160} />
          </label>
          <label className="field-group" style={{ flex: 1 }}>
            <span className="field-label">{copy.orderReferenceLabel}</span>
            <input className="field-control" type="text" value={orderReference} onChange={(event) => setOrderReference(event.target.value)} maxLength={120} />
          </label>
        </div>

        <label className="field-group">
          <span className="field-label">{copy.jobReferenceLabel}</span>
          <input className="field-control" type="text" value={jobReference} onChange={(event) => setJobReference(event.target.value)} maxLength={120} />
        </label>

        <label className="field-group">
          <span className="field-label">{copy.subjectLabel}</span>
          <input
            className="field-control"
            type="text"
            required
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setSubjectDirty(true);
            }}
            maxLength={160}
          />
        </label>

        <label className="field-group">
          <span className="field-label">{copy.messageLabel}</span>
          <textarea
            className="field-control"
            required
            rows={7}
            style={{ minHeight: 180, resize: "vertical" }}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={4000}
          />
          <p className="helper-copy">{copy.messageHint}</p>
        </label>

        <label className="sr-only">
          {copy.honeypotLabel}
          <input type="text" value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" />
        </label>

        <div className="button-row">
          <button type="submit" disabled={submitting} className="public-button primary">
            {submitting ? copy.submitting : copy.submit}
          </button>
          <a href={`mailto:${supportEmail}`} className="public-button secondary">{copy.emailAction}</a>
        </div>
      </form>

      <p className="helper-copy">{interpolate(copy.emailFallback, { supportEmail })}</p>
      {status && statusKind ? (
        <p
          className={`form-status ${statusKind}`}
          role={statusKind === "error" ? "alert" : "status"}
          aria-live={statusKind === "error" ? "assertive" : "polite"}
        >
          {status}
        </p>
      ) : null}
    </section>
  );
}
