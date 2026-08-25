import type { Metadata } from "next";
import { Geist } from "next/font/google";
import React from "react";
import "@score/ui/sonata.css";
import "./app-theme.css";
import { AppChrome } from "../components/AppChrome";
import { AppLocaleProvider } from "../components/AppLocaleProvider";
import { ProductAnalytics } from "../components/ProductAnalytics";
import { readAppLocale } from "../lib/locale";

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.scoretransposer.com";
  const title = locale === "zh-CN"
    ? "ScoreTransposer | 五线谱识别、编辑、移调、播放与导出"
    : "ScoreTransposer | Scan, Edit, Transpose & Export Sheet Music";
  const description = locale === "zh-CN"
    ? "上传五线谱 PDF 或图片，在线识别并校对音符，继续完成五线谱与简谱转换、移调、播放练习和常用格式导出。"
    : "Upload sheet-music PDFs or images, review recognized notes, convert staff and numbered notation, transpose, practice, and export common formats.";

  return {
    metadataBase: new URL(appUrl),
    title,
    description,
    applicationName: "ScoreTransposer",
    keywords: locale === "zh-CN"
      ? ["乐谱识别", "五线谱", "简谱转换", "乐谱移调", "PDF 转乐谱", "在线乐谱编辑"]
      : ["sheet music scanner", "music notation converter", "score transposer", "PDF to sheet music", "numbered notation"],
    openGraph: {
      title,
      description,
      url: appUrl,
      siteName: "ScoreTransposer",
      type: "website",
      locale: locale === "zh-CN" ? "zh_CN" : "en_US",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ScoreTransposer online sheet-music workspace" }],
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

  return (
    <html lang={locale} className={geist.variable} suppressHydrationWarning>
      <body>
        <AppLocaleProvider locale={locale}>
          <AppChrome>{children}</AppChrome>
          <ProductAnalytics />
        </AppLocaleProvider>
      </body>
    </html>
  );
}
