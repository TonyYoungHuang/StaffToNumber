"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@score/i18n";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { buildPublicSiteHandoffHref, buildSupportTemplates, SUPPORT_EMAIL } from "../lib/support";
import { useAppLocale } from "./AppLocaleProvider";
import type { WorkspaceMessages } from "../lib/workspace-messages/types";

type ServiceStatusItem = {
  key: string;
  label: string;
  status: "ok" | "warning" | "error" | "disabled";
  message: string;
  checkedAt?: string | null;
};

type SystemStatusPayload = {
  overallStatus: "ok" | "warning" | "error";
  checkedAt: string;
  supportEmail: string;
  services: ServiceStatusItem[];
};

export function OperationsPanel({
  email: _email,
  copy,
}: {
  email?: string | null;
  copy: WorkspaceMessages["operations"];
}) {
  const { locale } = useAppLocale();
  const token = useMemo(() => getStoredToken(), []);
  const [statusPayload, setStatusPayload] = useState<SystemStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest<SystemStatusPayload>("/api/system/status", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((result) => {
      setLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setStatusPayload(result.data);
    });
  }, [token]);

  const supportTemplates = useMemo(() => buildSupportTemplates(locale), [locale]);

  return (
    <div className="info-grid">
      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.operations.eyebrow}</p>
          <h2 className="card-title">{copy.operations.title}</h2>
          {loading ? <p className="body-copy" role="status">{copy.operations.loading}</p> : null}
          {error ? (
            <div className="stack-xs">
              <p className="form-status error">{copy.operations.error}</p>
              <details className="technical-details"><summary>{copy.operations.technicalDetails}</summary><p className="micro-copy">{error}</p></details>
            </div>
          ) : null}
          {statusPayload ? (
            <p className="micro-copy">
              {copy.operations.checked}: {formatDateTime(statusPayload.checkedAt, locale)}
            </p>
          ) : null}
        </div>

        <div className="list-grid" role="list" aria-label={copy.operations.servicesAria}>
          {(statusPayload?.services ?? []).map((service) => (
            <div key={service.key} className="list-item" role="listitem">
              <div className="list-item-content">
                <p className="item-title">{serviceLabel(service, copy.serviceLabels)}</p>
                <p className="helper-copy">{copy.serviceMessages[service.status]}</p>
                {service.message ? <details className="technical-details"><summary>{copy.operations.technicalDetails}</summary><p className="micro-copy">{service.message}</p></details> : null}
                {service.checkedAt ? <p className="micro-copy">{formatDateTime(service.checkedAt, locale)}</p> : null}
              </div>
              <span className={`status-chip ${mapTone(service.status)}`}>{copy.statuses[service.status]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.support.eyebrow}</p>
          <h2 className="card-title">{copy.support.title}</h2>
          <p className="body-copy">{copy.support.body}</p>
        </div>

        <div className="list-grid">
          {supportTemplates.map((template) => {
            const templateCopy = copy.support.templates[template.key];
            return (
            <div key={template.key} className="list-item">
              <div className="list-item-content">
                <p className="item-title">{templateCopy.title}</p>
                <p className="helper-copy">{templateCopy.description}</p>
                <p className="micro-copy">{SUPPORT_EMAIL}</p>
              </div>
              <a href={template.href} className="button button-secondary button-ghost">
                {copy.support.openForm}
              </a>
            </div>
            );
          })}
        </div>

        <div className="button-row">
          <a href={buildPublicSiteHandoffHref("/support", locale)} className="button button-tertiary">
            {copy.support.publicPage}
          </a>
        </div>
      </section>
    </div>
  );
}

function mapTone(status: ServiceStatusItem["status"]) {
  switch (status) {
    case "ok":
      return "tone-green";
    case "warning":
      return "tone-amber";
    case "error":
      return "tone-red";
    default:
      return "tone-neutral";
  }
}

function serviceLabel(service: ServiceStatusItem, copy: WorkspaceMessages["operations"]["serviceLabels"]) {
  const key = `${service.key} ${service.label}`.toLowerCase();
  if (key.includes("api")) return copy.api;
  if (key.includes("database") || key.includes("db")) return copy.database;
  if (key.includes("storage")) return copy.storage;
  if (key.includes("worker")) return copy.worker;
  if (key.includes("payment") || key.includes("stripe") || key.includes("paddle")) return copy.payment;
  if (key.includes("mail") || key.includes("email")) return copy.email;
  return copy.unknown;
}
