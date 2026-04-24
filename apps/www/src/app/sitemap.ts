import type { MetadataRoute } from "next";
import { siteConfig } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-04-22T00:00:00.000Z");

  return [
    {
      url: siteConfig.siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.siteUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteConfig.siteUrl}/faq`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteConfig.siteUrl}/support`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteConfig.siteUrl}/operations-checklist`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteConfig.siteUrl}/privacy`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteConfig.siteUrl}/terms`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
