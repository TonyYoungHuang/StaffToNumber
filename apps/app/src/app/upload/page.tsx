import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { UploadManager } from "../../components/UploadManager";

export default function UploadPage() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.1em", color: "#516174" }}>Module 3</p>
          <h1 style={{ fontSize: "44px", margin: "12px 0 24px" }}>File upload and storage</h1>
        </div>
        <Link href={APP_ROUTES.jobs} style={linkStyle}>Go to jobs</Link>
      </div>
      <UploadManager />
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
