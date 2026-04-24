import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import React from "react";
import "@score/ui/sonata.css";
import { PublicChrome } from "../components/PublicChrome";
import { SiteLocaleProvider } from "../components/SiteLocaleProvider";
import { readSiteLocale } from "../lib/locale";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const title = isChinese ? "五线谱 PDF 转简谱工具 | ScoreTransposer" : "Staff PDF to Jianpu Converter | ScoreTransposer";
  const description = isChinese
    ? "把五线谱 PDF 转成简谱的在线工具说明页，覆盖 staff pdf to jianpu、五线谱转简谱、简谱转换器等搜索意图，并说明开通、交付与支持路径。"
    : siteConfig.description;

  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title,
    description,
    applicationName: siteConfig.siteName,
    keywords: [...siteConfig.keywords, "seo music converter", "activation code access", "buy jianpu converter"],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      url: siteConfig.siteUrl,
      siteName: siteConfig.siteName,
      locale: isChinese ? "zh_CN" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await readSiteLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${headlineFont.variable} ${uiFont.variable}`}>
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
          <PublicChrome>{children}</PublicChrome>
        </SiteLocaleProvider>
      </body>
    </html>
  );
}
