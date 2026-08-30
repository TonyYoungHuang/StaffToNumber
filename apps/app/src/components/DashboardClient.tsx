"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { formatDateTime } from "@score/i18n";
import { CheckSealIcon, ClockPulseIcon, DownloadIcon, UserOrbitIcon, VaultIcon } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";
import { accountActivationRoute, checkoutAvailable } from "../lib/release";
import { OperationsPanel } from "./OperationsPanel";
import { useAppLocale } from "./AppLocaleProvider";
import type { WorkspaceMessages } from "../lib/workspace-messages/types";

type MePayload = {
  user: {
    id: string;
    email: string;
    createdAt: string;
    accountStatus: "active" | "deletion_pending";
    deletionRequestedAt: string | null;
    scheduledDeletionAt: string | null;
    entitlement: {
      status: "inactive" | "active" | "expired";
      startsAt: string | null;
      endsAt: string | null;
    };
  };
};

export function DashboardClient({
  copy,
  operationsCopy,
}: {
  copy: WorkspaceMessages["dashboard"];
  operationsCopy: WorkspaceMessages["operations"];
}) {
  const { locale } = useAppLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MePayload["user"] | null>(null);
  const [privacyBusy, setPrivacyBusy] = useState<"export" | "delete" | "cancel" | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [privacyPassword, setPrivacyPassword] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");


  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      setError(copy.signInFirst);
      return;
    }

    apiRequest<MePayload>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((result) => {
      setLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setProfile(result.data.user);
    });
  }, [copy.signInFirst]);

  async function downloadDataExport() {
    const token = getStoredToken();
    if (!token) return setPrivacyMessage(copy.signInFirst);
    setPrivacyBusy("export");
    setPrivacyMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/account/data-export`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? copy.privacy.exportFailed);
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `scoretransposer-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setPrivacyMessage(copy.privacy.exportReady);
    } catch (error) {
      setPrivacyMessage(error instanceof Error ? error.message : copy.privacy.exportFailed);
    } finally {
      setPrivacyBusy(null);
    }
  }

  async function scheduleDeletion() {
    const token = getStoredToken();
    if (!token) return setPrivacyMessage(copy.signInFirst);
    if (!privacyPassword || deletionConfirmation !== "DELETE") {
      setPrivacyMessage(copy.privacy.required);
      return;
    }
    setPrivacyBusy("delete");
    setPrivacyMessage(null);
    const result = await apiRequest<{ lifecycle: { scheduledDeletionAt: string | null } }>("/api/account/deletion", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: privacyPassword, confirmation: deletionConfirmation }),
    });
    setPrivacyBusy(null);
    if (!result.ok) return setPrivacyMessage(result.error);
    setProfile((current) => current ? {
      ...current,
      accountStatus: "deletion_pending",
      scheduledDeletionAt: result.data.lifecycle.scheduledDeletionAt,
      deletionRequestedAt: new Date().toISOString(),
    } : current);
    setPrivacyPassword("");
    setDeletionConfirmation("");
    clearStoredToken();
    setPrivacyMessage(copy.privacy.scheduled);
  }

  async function cancelDeletion() {
    const token = getStoredToken();
    if (!token) return setPrivacyMessage(copy.signInFirst);
    if (!privacyPassword) return setPrivacyMessage(copy.privacy.required);
    setPrivacyBusy("cancel");
    setPrivacyMessage(null);
    const result = await apiRequest<{ lifecycle: { status: "active" } }>("/api/account/deletion/cancel", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: privacyPassword }),
    });
    setPrivacyBusy(null);
    if (!result.ok) return setPrivacyMessage(result.error);
    setProfile((current) => current ? {
      ...current,
      accountStatus: "active",
      scheduledDeletionAt: null,
      deletionRequestedAt: null,
    } : current);
    setPrivacyPassword("");
    setPrivacyMessage(copy.privacy.cancelled);
  }

  const entitlementTone = useMemo(() => {
    if (!profile) return "tone-neutral";
    if (profile.entitlement.status === "active") return "tone-green";
    if (profile.entitlement.status === "expired") return "tone-red";
    return "tone-amber";
  }, [profile]);

  if (loading) {
    return (
      <div className="surface-panel stack-sm">
        <p className="eyebrow">{copy.loadingEyebrow}</p>
        <h2 className="card-title">{copy.loadingTitle}</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.accessEyebrow}</p>
          <h2 className="card-title">{copy.accessTitle}</h2>
          <p className="body-copy">{error}</p>
        </div>
        <div className="button-row">
          <Link href={APP_ROUTES.login} className="button button-primary">
            {copy.signIn}
          </Link>
          <Link href={APP_ROUTES.register} className="button button-secondary">
            {copy.createAccount}
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="surface-panel stack-sm">
        <p className="eyebrow">{copy.lookupEyebrow}</p>
        <h2 className="card-title">{copy.lookupTitle}</h2>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.email}</p>
          <p className="metric-value">{profile.email}</p>
          <p className="helper-copy">{profile.entitlement.status === "active" ? copy.metrics.emailBody : copy.metrics.freeEmailBody}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.entitlement}</p>
          <p className="metric-value">{copy.statuses[profile.entitlement.status]}</p>
          <p className="helper-copy">{copy.metrics.entitlementBody}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.route}</p>
          <p className="metric-value">{profile.entitlement.status === "active" ? copy.metrics.routeValue : copy.metrics.freeRouteValue}</p>
          <p className="helper-copy">{profile.entitlement.status === "active" ? copy.metrics.routeBody : copy.metrics.freeRouteBody}</p>
        </div>
      </div>

      <div className="split-layout">
        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon">
              <UserOrbitIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">{copy.profile.eyebrow}</p>
              <h2 className="card-title">{copy.profile.title}</h2>
            </div>
          </div>
          <div className="list-grid">
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.profile.email}</p>
              <p className="item-title">{profile.email}</p>
            </div>
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.profile.created}</p>
              <p className="item-title">{formatDateTime(profile.createdAt, locale)}</p>
            </div>
          </div>
        </div>

        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon tertiary">
              <VaultIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">{copy.entitlement.eyebrow}</p>
              <h2 className="card-title">{copy.entitlement.title}</h2>
            </div>
          </div>
          <span className={`status-chip ${entitlementTone}`}>{copy.statuses[profile.entitlement.status]}</span>
          <div className="list-grid">
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.entitlement.starts}</p>
              <p className="item-title">{profile.entitlement.startsAt ? formatDateTime(profile.entitlement.startsAt, locale) : copy.entitlement.inactive}</p>
            </div>
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.entitlement.ends}</p>
              <p className="item-title">{profile.entitlement.endsAt ? formatDateTime(profile.entitlement.endsAt, locale) : copy.entitlement.missing}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="info-grid">
        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon">
              <ClockPulseIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">{copy.workflow.eyebrow}</p>
              <h2 className="card-title">{copy.workflow.title}</h2>
            </div>
          </div>
          <div className="editorial-points">
            <div className="editorial-point">
              <div>
                <strong>{copy.workflow.step1Title}</strong>
                <p className="helper-copy">{profile.entitlement.status === "active" ? copy.workflow.step1Body : copy.workflow.step1FreeBody}</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>{copy.workflow.step2Title}</strong>
                <p className="helper-copy">{profile.entitlement.status === "active" ? copy.workflow.step2Body : copy.workflow.step2FreeBody}</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>{copy.workflow.step3Title}</strong>
                <p className="helper-copy">{profile.entitlement.status === "active" ? copy.workflow.step3Body : copy.workflow.step3FreeBody}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon tertiary">
              <CheckSealIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">{copy.actions.eyebrow}</p>
              <h2 className="card-title">{copy.actions.title}</h2>
            </div>
          </div>
          <div className="button-row">
            <Link href={accountActivationRoute} className="button button-primary">
              {checkoutAvailable ? copy.actions.checkout : copy.actions.redeem}
            </Link>
            <Link href={`${APP_ROUTES.scores}#free-scan`} className="button button-primary">
              {profile.entitlement.status === "active" ? copy.actions.uploads : copy.actions.freeEditing}
            </Link>
            {profile.entitlement.status === "active" ? <Link href={APP_ROUTES.jobs} className="button button-secondary">{copy.actions.jobs}</Link> : null}
            <Link href={APP_ROUTES.activate} className="button button-tertiary">
              {copy.actions.redeem}
            </Link>
            <Link href={APP_ROUTES.adminSupport} className="button button-tertiary">
              {copy.actions.supportAdmin}
            </Link>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              clearStoredToken();
              window.location.href = APP_ROUTES.login;
            }}
          >
            {copy.actions.signOut}
          </button>
        </div>
      </div>

      <div className="surface-panel stack-lg">
        <div className="inline-meta">
          <span className="info-icon tertiary">
            <VaultIcon width={20} height={20} />
          </span>
          <div className="stack-xs">
            <p className="eyebrow">{copy.privacy.eyebrow}</p>
            <h2 className="card-title">{copy.privacy.title}</h2>
          </div>
        </div>
        <p className="body-copy">{copy.privacy.body}</p>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={() => void downloadDataExport()} disabled={privacyBusy !== null}>
            <DownloadIcon width={18} height={18} />
            {privacyBusy === "export" ? copy.privacy.exporting : copy.privacy.export}
          </button>
        </div>

        {profile.accountStatus === "deletion_pending" ? (
          <div className="mini-card stack-md">
            <div className="stack-xs">
              <span className="status-chip tone-amber">{copy.privacy.pending}</span>
              <p className="helper-copy">
                {copy.privacy.pendingBody}: {profile.scheduledDeletionAt ? formatDateTime(profile.scheduledDeletionAt, locale) : "-"}
              </p>
            </div>
            <label className="field-group">
              <span className="field-label">{copy.privacy.password}</span>
              <input
                className="field-control"
                type="password"
                value={privacyPassword}
                onChange={(event) => setPrivacyPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <div className="button-row">
              <button type="button" className="button button-primary" onClick={() => void cancelDeletion()} disabled={privacyBusy !== null}>
                {privacyBusy === "cancel" ? copy.privacy.cancelling : copy.privacy.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="mini-card stack-md">
            <div className="field-row">
              <label className="field-group">
                <span className="field-label">{copy.privacy.password}</span>
                <input
                  className="field-control"
                  type="password"
                  value={privacyPassword}
                  onChange={(event) => setPrivacyPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="field-group">
                <span className="field-label">{copy.privacy.confirmation}</span>
                <input
                  className="field-control"
                  value={deletionConfirmation}
                  onChange={(event) => setDeletionConfirmation(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="button button-secondary" onClick={() => void scheduleDeletion()} disabled={privacyBusy !== null}>
                {privacyBusy === "delete" ? copy.privacy.scheduling : copy.privacy.schedule}
              </button>
            </div>
          </div>
        )}
        {privacyMessage ? <p className="helper-copy" role="status" aria-label={copy.privacy.statusAria}>{privacyMessage}</p> : null}
      </div>

      <OperationsPanel email={profile.email} copy={operationsCopy} />
    </div>
  );
}
