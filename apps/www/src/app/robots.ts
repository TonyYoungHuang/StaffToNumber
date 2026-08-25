import type { MetadataRoute } from "next";
import { siteConfig } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  const publicCrawlerRule = {
    allow: "/",
    disallow: ["/seo-audit", "/operations-checklist"],
  };

  return {
    rules: [
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "Google-Extended",
          "PerplexityBot",
          "Perplexity-User",
          "Applebot-Extended",
          "Amazonbot",
          "CCBot",
        ],
        ...publicCrawlerRule,
      },
      {
        userAgent: "*",
        ...publicCrawlerRule,
      },
    ],
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
    host: siteConfig.siteUrl,
  };
}
