import { ImageResponse } from "next/og";

export const alt = "ScoreTransposer online sheet-music scanner, editor, and transposer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "#171a2c",
          background: "linear-gradient(135deg, #f7f8ff 0%, #ffffff 55%, #e7e4ff 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: 34, fontWeight: 700 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 18, color: "white", background: "#5b4ee8" }}>♪</div>
          ScoreTransposer
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: 950 }}>
          <div style={{ fontSize: 64, lineHeight: 1.08, fontWeight: 800 }}>Scan, edit, transpose, and practice sheet music online.</div>
          <div style={{ fontSize: 28, color: "#59627d" }}>PDF & images → reviewable notation → Jianpu, playback, and export</div>
        </div>
      </div>
    ),
    size,
  );
}
