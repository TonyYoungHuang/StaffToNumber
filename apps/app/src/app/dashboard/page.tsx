import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { DashboardClient } from "../../components/DashboardClient";

export default function DashboardPage() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: "0.1em", color: "#516174" }}>Dashboard</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", margin: "12px 0 24px", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "44px", margin: 0 }}>Account overview</h1>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href={APP_ROUTES.upload} style={linkStyle}>Open uploads</Link>
          <Link href={APP_ROUTES.jobs} style={linkStyle}>Open jobs</Link>
        </div>
      </div>
      <DashboardClient />
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
