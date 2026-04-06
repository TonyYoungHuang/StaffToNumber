"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_ROUTES } from "@score/shared";
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

  if (loading) {
    return <p>Loading account details...</p>;
  }

  if (error) {
    return (
      <div style={{ display: "grid", gap: "12px" }}>
        <p style={{ margin: 0 }}>{error}</p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href={APP_ROUTES.login} style={linkStyle}>
            Sign in
          </Link>
          <Link href={APP_ROUTES.register} style={secondaryLinkStyle}>
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <p>Account not found.</p>;
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <div style={panelStyle}>
        <p style={eyebrowStyle}>Signed in as</p>
        <h2 style={{ margin: "0 0 8px", fontSize: "30px" }}>{profile.email}</h2>
        <p style={{ margin: 0, color: "#516174" }}>Account created: {new Date(profile.createdAt).toLocaleString()}</p>
      </div>
      <div style={panelStyle}>
        <p style={eyebrowStyle}>Entitlement</p>
        <p style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700 }}>Status: {profile.entitlement.status}</p>
        <p style={{ margin: 0, color: "#516174" }}>
          Starts: {profile.entitlement.startsAt ? new Date(profile.entitlement.startsAt).toLocaleString() : "Not active yet"}
        </p>
        <p style={{ margin: "8px 0 0", color: "#516174" }}>
          Ends: {profile.entitlement.endsAt ? new Date(profile.entitlement.endsAt).toLocaleString() : "No entitlement"}
        </p>
      </div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Link href={APP_ROUTES.activate} style={linkStyle}>
          Redeem activation code
        </Link>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => {
            clearStoredToken();
            window.location.href = APP_ROUTES.login;
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 18px 60px rgba(18, 32, 47, 0.1)",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#75869a",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "12px",
};

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: "999px",
  textDecoration: "none",
  background: "#12202f",
  color: "#ffffff",
  fontWeight: 600,
};

const secondaryLinkStyle: React.CSSProperties = {
  ...linkStyle,
  background: "#dfe7ee",
  color: "#12202f",
};

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: "999px",
  padding: "12px 18px",
  background: "#dfe7ee",
  color: "#12202f",
  fontWeight: 600,
  cursor: "pointer",
};
