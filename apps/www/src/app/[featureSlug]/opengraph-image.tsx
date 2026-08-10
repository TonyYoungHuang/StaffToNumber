import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { findPlatformFeaturePage } from "../../lib/platform-feature-pages";

export const alt = "ScoreTransposer sheet music tool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ featureSlug: string }> }) {
  const { featureSlug } = await params;
  const page = findPlatformFeaturePage(featureSlug);
  if (!page) {
    notFound();
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#f7f8f5",
        color: "#14211f",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 700 }}>ScoreTransposer</div>
        <div style={{ fontSize: 22, color: "#0f766e" }}>{page.status}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1000 }}>
        <div style={{ fontSize: 24, color: "#52615e" }}>{page.eyebrow}</div>
        <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 700 }}>{page.title}</div>
        <div style={{ fontSize: 27, lineHeight: 1.35, color: "#40514d" }}>{page.description}</div>
      </div>
      <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
        {page.modules.slice(0, 4).map((module) => (
          <div key={module} style={{ display: "flex", padding: "12px 18px", border: "2px solid #b9c5c1", borderRadius: 6, fontSize: 18 }}>
            {module}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
