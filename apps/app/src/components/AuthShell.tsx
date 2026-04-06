import Link from "next/link";
import React from "react";
import { APP_ROUTES } from "@score/shared";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <Link href={APP_ROUTES.home} style={backLinkStyle}>
          Back
        </Link>
        <h1 style={{ fontSize: "34px", marginBottom: "12px" }}>{title}</h1>
        <p style={{ fontSize: "16px", lineHeight: 1.6, color: "#435364", marginBottom: "24px" }}>{description}</p>
        {children}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 20px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "560px",
  background: "#ffffff",
  borderRadius: "24px",
  boxShadow: "0 24px 80px rgba(18, 32, 47, 0.12)",
  padding: "32px",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: "24px",
  color: "#516174",
  textDecoration: "none",
};
