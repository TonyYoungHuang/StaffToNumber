import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import React from "react";
import "@score/ui/sonata.css";
import { PublicChrome } from "../components/PublicChrome";
import { siteConfig } from "../lib/site";

const headlineFont = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-headline",
});

const uiFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: siteConfig.title,
  description: siteConfig.description,
  applicationName: siteConfig.siteName,
  keywords: [...siteConfig.keywords],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.siteUrl,
    siteName: siteConfig.siteName,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${headlineFont.variable} ${uiFont.variable}`}>
        <PublicChrome appUrl={siteConfig.appUrl}>{children}</PublicChrome>
      </body>
    </html>
  );
}
