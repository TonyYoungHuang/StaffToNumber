const defaultSiteUrl = "https://scoretransposer.com";
const defaultAppUrl = "https://app.scoretransposer.com";

export const siteConfig = {
  siteName: "ScoreTransposer",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? defaultAppUrl,
  title: "ScoreTransposer | Staff PDF to Jianpu",
  description:
    "Convert five-line staff PDFs into Jianpu with a focused production workflow, activation-gated access, and draft-safe delivery.",
  keywords: [
    "score transposer",
    "staff pdf to jianpu",
    "music score converter",
    "jianpu converter",
    "numbered notation",
    "five-line staff pdf",
  ],
} as const;

export const legalLastUpdated = "2026-04-22";
