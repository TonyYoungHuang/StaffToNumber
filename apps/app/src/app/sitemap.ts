import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // The authenticated app is intentionally noindex. Public acquisition pages
  // belong in the www sitemap instead of advertising noindex or redirect URLs.
  return [];
}
