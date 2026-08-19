import type { Metadata } from "next";
import { Geist } from "next/font/google";
import React from "react";
import "@score/ui/sonata.css";
import "./public-site.css";
import { PublicChrome } from "../components/PublicChrome";
import { SiteLocaleProvider } from "../components/SiteLocaleProvider";
import { ProductionAnalytics } from "../components/ProductionAnalytics";
import { readSiteLocale } from "../lib/locale";
import { getActivePublicAnnouncement } from "../lib/public-content";
import { siteConfig } from "../lib/site";

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

export async function generateMetadata(): Promise<Metadata> {
  const title = siteConfig.title;
  const description = siteConfig.description;

  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title,
    description,
    applicationName: siteConfig.siteName,
    keywords: [...siteConfig.keywords],
    alternates: {
      canonical: "/",
    },
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
      url: siteConfig.siteUrl,
      siteName: siteConfig.siteName,
      locale: "en_US",
      type: "website",
      images: [{ url: "/product/score-preview-output-real.png", width: 1265, height: 712, alt: "ScoreTransposer rendered score workspace output" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/product/score-preview-output-real.png"],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await readSiteLocale();
  const announcement = getActivePublicAnnouncement(new Date());

  return (
    <html lang={locale} className={geist.variable} suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: siteConfig.siteName,
              url: siteConfig.siteUrl,
              email: siteConfig.supportEmail,
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  email: siteConfig.supportEmail,
                  availableLanguage: ["English", "Chinese"],
                },
              ],
            }),
          }}
        />
        <SiteLocaleProvider locale={locale}>
          <PublicChrome announcement={announcement}>{children}</PublicChrome>
          <ProductionAnalytics />
        </SiteLocaleProvider>
      </body>
    </html>
  );
}
