import React from "react";
import type { SupportedLocale } from "@score/i18n";
import type { PlatformFeaturePage } from "./platform-feature-pages";
import { getFeaturePageUi } from "./feature-page-localization";
import { getFeatureOnPageContent } from "./feature-on-page";

export function FeatureSocialCard({ page, locale }: { page: PlatformFeaturePage; locale: SupportedLocale }) {
  const ui = getFeaturePageUi(locale);
  const heading = getFeatureOnPageContent(page.slug, locale)?.h1 ?? page.title;
  return (
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
        <div style={{ fontSize: 22, color: "#0f766e" }}>{ui.statuses[page.status]}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1000 }}>
        <div style={{ fontSize: 24, color: "#52615e" }}>{page.eyebrow}</div>
        <div style={{ fontSize: 60, lineHeight: 1.05, fontWeight: 700 }}>{heading}</div>
        <div style={{ fontSize: 27, lineHeight: 1.35, color: "#40514d" }}>{page.description}</div>
      </div>
      <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
        {page.modules.slice(0, 4).map((module) => (
          <div key={module} style={{ display: "flex", padding: "12px 18px", border: "2px solid #b9c5c1", borderRadius: 6, fontSize: 18 }}>
            {module}
          </div>
        ))}
      </div>
    </div>
  );
}
