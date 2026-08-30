import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { isFeatureIndexable, platformFeaturePages } from "../lib/platform-feature-pages";
import { getLocalizedAbsoluteUrl } from "../lib/locale-routing";
import { publicContentLastUpdated, siteConfig } from "../lib/site";
import { publicScoreLibrary } from "../lib/public-score-library";

function addLocalizedEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  return entries.flatMap((entry) => {
    const pathname = new URL(entry.url).pathname;
    const localizedUrls = Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [locale, getLocalizedAbsoluteUrl(siteConfig.siteUrl, pathname, locale)]),
    ) as Record<SupportedLocale, string>;
    const alternates = {
      languages: {
        ...localizedUrls,
        "x-default": localizedUrls[DEFAULT_LOCALE],
      },
    };

    return SUPPORTED_LOCALES.map((locale) => ({ ...entry, url: localizedUrls[locale], alternates }));
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteConfig.release.publicLaunchReady) return [];

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
      url: `${siteConfig.siteUrl}/how-to-read-sheet-music`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.siteUrl}/numbered-notation-converter`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.siteUrl}/features`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteConfig.siteUrl}/library`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
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

  return addLocalizedEntries([
    ...staticPages,
    ...platformFeaturePages.filter(isFeatureIndexable).map((page) => ({
      url: `${siteConfig.siteUrl}${page.canonical}`,
      lastModified: new Date(`${page.updatedAt}T00:00:00.000Z`),
      changeFrequency: "weekly" as const,
      priority: page.slug === "pricing" ? 0.8 : 0.75,
    })),
    ...publicScoreLibrary.map((score) => ({
      url: `${siteConfig.siteUrl}/library/${score.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: score.featured ? 0.75 : 0.65,
    })),
  ]);
}
