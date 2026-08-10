import type { MetadataRoute } from "next";
import { isFeatureIndexable, platformFeaturePages } from "../lib/platform-feature-pages";
import { publicContentLastUpdated, siteConfig } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${publicContentLastUpdated}T00:00:00.000Z`);

  const staticPages: MetadataRoute.Sitemap = [
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
    {
      url: `${siteConfig.siteUrl}/copyright-complaint`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  return [
    ...staticPages,
    ...platformFeaturePages.filter(isFeatureIndexable).map((page) => ({
      url: `${siteConfig.siteUrl}${page.canonical}`,
      lastModified: new Date(`${page.updatedAt}T00:00:00.000Z`),
      changeFrequency: "weekly" as const,
      priority: page.slug === "pricing" ? 0.8 : 0.75,
    })),
  ];
}
