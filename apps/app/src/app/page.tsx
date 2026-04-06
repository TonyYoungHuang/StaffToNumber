import Link from "next/link";
import { APP_ROUTES } from "@score/shared";

export default function AppHomePage() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: "0.1em", color: "#516174" }}>Application shell</p>
      <h1 style={{ fontSize: "44px", margin: "12px 0 16px" }}>Accounts, uploads, and jobs</h1>
      <p style={{ fontSize: "18px", lineHeight: 1.7, maxWidth: "720px", marginBottom: "32px" }}>
        Module 4 adds the unified task layer on top of account access and uploaded PDFs.
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Link href={APP_ROUTES.register} style={linkStyle}>Create account</Link>
        <Link href={APP_ROUTES.login} style={linkStyle}>Sign in</Link>
        <Link href={APP_ROUTES.activate} style={linkStyle}>Redeem code</Link>
        <Link href={APP_ROUTES.dashboard} style={linkStyle}>Open dashboard</Link>
        <Link href={APP_ROUTES.upload} style={linkStyle}>Upload PDFs</Link>
        <Link href={APP_ROUTES.jobs} style={linkStyle}>Manage jobs</Link>
      </div>
    </main>
  );
}

const linkStyle = {
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
