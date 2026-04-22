"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { CheckSealIcon, ClockPulseIcon, UserOrbitIcon, VaultIcon } from "@score/ui";
import { apiRequest } from "../lib/api";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";

type MePayload = {
  user: {
    id: string;
    email: string;
    createdAt: string;
    entitlement: {
      status: "inactive" | "active" | "expired";
      startsAt: string | null;
      endsAt: string | null;
    };
  };
};

export function DashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MePayload["user"] | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      setError("Please sign in to view the dashboard.");
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
  }, []);

  const entitlementTone = useMemo(() => {
    if (!profile) return "tone-neutral";
    if (profile.entitlement.status === "active") return "tone-green";
    if (profile.entitlement.status === "expired") return "tone-red";
    return "tone-amber";
  }, [profile]);

  if (loading) {
    return (
      <div className="surface-panel stack-sm">
        <p className="eyebrow">Fetching profile</p>
        <h2 className="card-title">Loading account details...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">Access required</p>
          <h2 className="card-title">This studio section needs a valid sign-in.</h2>
          <p className="body-copy">{error}</p>
        </div>
        <div className="button-row">
          <Link href={APP_ROUTES.login} className="button button-primary">
            Sign in
          </Link>
          <Link href={APP_ROUTES.register} className="button button-secondary">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="surface-panel stack-sm">
        <p className="eyebrow">Account lookup</p>
        <h2 className="card-title">Account not found.</h2>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">Account email</p>
          <p className="metric-value">{profile.email}</p>
          <p className="helper-copy">Signed in and ready for upload or job creation.</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Entitlement</p>
          <p className="metric-value">{profile.entitlement.status}</p>
          <p className="helper-copy">One-year access window is managed through activation codes.</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Current route</p>
          <p className="metric-value">Staff {"->"} Jianpu</p>
          <p className="helper-copy">No reverse conversion or transposition in this release.</p>
        </div>
      </div>

      <div className="split-layout">
        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon">
              <UserOrbitIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">Profile</p>
              <h2 className="card-title">Account overview</h2>
            </div>
          </div>
          <div className="list-grid">
            <div className="mini-card stack-sm">
              <p className="metric-label">Email</p>
              <p className="item-title">{profile.email}</p>
            </div>
            <div className="mini-card stack-sm">
              <p className="metric-label">Created</p>
              <p className="item-title">{formatLocal(profile.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon tertiary">
              <VaultIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">Entitlement</p>
              <h2 className="card-title">Access window</h2>
            </div>
          </div>
          <span className={`status-chip ${entitlementTone}`}>{profile.entitlement.status}</span>
          <div className="list-grid">
            <div className="mini-card stack-sm">
              <p className="metric-label">Starts</p>
              <p className="item-title">{profile.entitlement.startsAt ? formatLocal(profile.entitlement.startsAt) : "Not active yet"}</p>
            </div>
            <div className="mini-card stack-sm">
              <p className="metric-label">Ends</p>
              <p className="item-title">{profile.entitlement.endsAt ? formatLocal(profile.entitlement.endsAt) : "No entitlement"}</p>
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
              <p className="eyebrow">Workflow</p>
              <h2 className="card-title">Next operational steps</h2>
            </div>
          </div>
          <div className="editorial-points">
            <div className="editorial-point">
              <div>
                <strong>1. Upload staff PDF</strong>
                <p className="helper-copy">Source material enters the pipeline only as PDF in the current build.</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>2. Queue conversion job</strong>
                <p className="helper-copy">The app tracks queued, processing, completed, and failed states.</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>3. Download final or draft package</strong>
                <p className="helper-copy">Weak pages can stay in draft bundles instead of degrading stronger pages.</p>
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
              <p className="eyebrow">Actions</p>
              <h2 className="card-title">Manage the studio</h2>
            </div>
          </div>
          <div className="button-row">
            <Link href={APP_ROUTES.upload} className="button button-primary">
              Open uploads
            </Link>
            <Link href={APP_ROUTES.jobs} className="button button-secondary">
              Open jobs
            </Link>
            <Link href={APP_ROUTES.activate} className="button button-tertiary">
              Redeem another code
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
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function formatLocal(value: string) {
  return new Date(value).toLocaleString();
}
