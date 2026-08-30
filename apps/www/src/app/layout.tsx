import type { Metadata } from "next";
import { Geist } from "next/font/google";
import React from "react";
import { SUPPORTED_LOCALES, getAnalyticsConsentMessages, getLocaleConfig } from "@score/i18n";
import "@score/ui/sonata.css";
import "./public-site.css";
import { PublicChrome } from "../components/PublicChrome";
import { SiteLocaleProvider } from "../components/SiteLocaleProvider";
import { ProductionAnalytics } from "../components/ProductionAnalytics";
import { readSiteLocale } from "../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates } from "../lib/locale-routing";
import { getActivePublicAnnouncement } from "../lib/public-content";
import { getProductMediaPresentation, getWorkspacePreviewProductMedia } from "../lib/product-media";
import { buildOrganizationSchema } from "../lib/organization-schema";
import { siteConfig } from "../lib/site";
import { getSiteLocaleCatalog } from "../lib/site-shell-localization";

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const catalog = getSiteLocaleCatalog(locale).metadata;
  const title = catalog.title;
  const description = catalog.description;
  const canonicalUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale);
  const media = getWorkspacePreviewProductMedia(locale);
  const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, title) : null;

  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title,
    description,
    applicationName: siteConfig.siteName,
    keywords: [...catalog.keywords],
    alternates: getLocalizedAlternates("/", locale),
    robots: {
      index: siteConfig.release.publicLaunchReady,
      follow: siteConfig.release.publicLaunchReady,
      googleBot: {
        index: siteConfig.release.publicLaunchReady,
        follow: siteConfig.release.publicLaunchReady,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: {
        "msvalidate.01": process.env.BING_SITE_VERIFICATION || "",
        "baidu-site-verification": process.env.BAIDU_SITE_VERIFICATION || "",
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: siteConfig.siteName,
      locale: catalog.openGraphLocale,
      alternateLocale: SUPPORTED_LOCALES
        .filter((item) => item !== locale)
        .map((item) => getSiteLocaleCatalog(item).metadata.openGraphLocale),
      type: "website",
      ...(media && mediaPresentation ? { images: [{ url: media.src, width: media.width, height: media.height, alt: mediaPresentation.alt }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(media && mediaPresentation ? { images: [{ url: media.src, alt: mediaPresentation.alt }] } : {}),
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await readSiteLocale();
  const localeConfig = getLocaleConfig(locale);
  const shellCopy = getSiteLocaleCatalog(locale).shell;
  const analyticsCopy = getAnalyticsConsentMessages(locale);
  const announcement = getActivePublicAnnouncement(new Date());

  return (
    <html
      lang={localeConfig.htmlLang}
      dir={localeConfig.direction}
      data-font-group={localeConfig.fontGroup}
      className={geist.variable}
      suppressHydrationWarning
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildOrganizationSchema(siteConfig)),
          }}
        />
        <SiteLocaleProvider locale={locale}>
          <PublicChrome announcement={announcement} copy={shellCopy}>{children}</PublicChrome>
          <ProductionAnalytics copy={analyticsCopy} />
        </SiteLocaleProvider>
      </body>
    </html>
  );
}
