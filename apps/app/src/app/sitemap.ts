import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.scoretransposer.com";
  return [
    {
      url: appUrl,
      lastModified: new Date("2026-08-19T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/login`,
      lastModified: new Date("2026-08-19T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${appUrl}/register`,
      lastModified: new Date("2026-08-19T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
