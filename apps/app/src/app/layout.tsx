import type { Metadata } from "next";
import { Geist } from "next/font/google";
import React from "react";
import { getAnalyticsConsentMessages, getLocaleConfig } from "@score/i18n";
import "@score/ui/sonata.css";
import "./app-theme.css";
import { AppChrome } from "../components/AppChrome";
import { AppLocaleProvider } from "../components/AppLocaleProvider";
import { ProductAnalytics } from "../components/ProductAnalytics";
import { getAppMessages } from "../lib/app-messages";
import { readAppLocale } from "../lib/locale";

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();
  const messages = getAppMessages(locale);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.scoretransposer.com";
  const { title, description } = messages.metadata;

  return {
    metadataBase: new URL(appUrl),
    title,
    description,
    applicationName: "ScoreTransposer",
    keywords: [...messages.metadata.keywords],
    openGraph: {
      title,
      description,
      url: appUrl,
      siteName: "ScoreTransposer",
      type: "website",
      locale: messages.metadata.openGraphLocale,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: messages.openGraph.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        "max-image-preview": "none",
        "max-snippet": 0,
        "max-video-preview": 0,
      },
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await readAppLocale();
  const localeConfig = getLocaleConfig(locale);
  const shellCopy = getAppMessages(locale).shell;
  const analyticsCopy = getAnalyticsConsentMessages(locale);

  return (
    <html
      lang={localeConfig.htmlLang}
      dir={localeConfig.direction}
      data-font-group={localeConfig.fontGroup}
      className={geist.variable}
      suppressHydrationWarning
    >
      <body>
        <AppLocaleProvider locale={locale}>
          <AppChrome copy={shellCopy}>{children}</AppChrome>
          <ProductAnalytics copy={analyticsCopy} />
        </AppLocaleProvider>
      </body>
    </html>
  );
}
