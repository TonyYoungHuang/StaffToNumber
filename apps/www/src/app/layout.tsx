import type { Metadata } from "next";
import { Geist } from "next/font/google";
import React from "react";
import "@score/ui/sonata.css";
import "./public-site.css";
import { PublicChrome } from "../components/PublicChrome";
import { SiteLocaleProvider } from "../components/SiteLocaleProvider";
import { ProductionAnalytics } from "../components/ProductionAnalytics";
import { readSiteLocale } from "../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates } from "../lib/locale-routing";
import { getActivePublicAnnouncement } from "../lib/public-content";
import { buildOrganizationSchema } from "../lib/organization-schema";
import { siteConfig } from "../lib/site";

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const title = locale === "zh-CN" ? `在线五线谱编辑、识别、移调与导出 | ${siteConfig.siteName}` : siteConfig.title;
  const description = locale === "zh-CN"
    ? "在线识别、校正、编辑、移调、播放并导出五线谱与简谱；以 MusicXML 和结构化乐谱工程连接 PDF、图片、MIDI 与音频工作流。"
    : siteConfig.description;
  const canonicalUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale);

  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title,
    description,
    applicationName: siteConfig.siteName,
    keywords: [...siteConfig.keywords],
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
      locale: locale === "zh-CN" ? "zh_CN" : "en_US",
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
            __html: JSON.stringify(buildOrganizationSchema(siteConfig)),
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
