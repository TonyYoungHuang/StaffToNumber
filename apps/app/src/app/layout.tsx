import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import React from "react";
import "@score/ui/sonata.css";
import { AppChrome } from "../components/AppChrome";
import { AppLocaleProvider } from "../components/AppLocaleProvider";
import { readAppLocale } from "../lib/locale";

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
  const locale = await readAppLocale();

  if (locale === "zh-CN") {
    return {
      title: "ScoreTransposer Studio | 简体中文",
      description: "已登录工作台，支持激活码兑换、PDF 上传、转换任务管理与结果下载。",
    };
  }

  return {
    title: "ScoreTransposer Studio",
    description: "Authenticated studio for staff PDF to Jianpu conversion, activation codes, uploads, and job tracking.",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await readAppLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${headlineFont.variable} ${uiFont.variable}`}>
        <AppLocaleProvider locale={locale}>
          <AppChrome>{children}</AppChrome>
        </AppLocaleProvider>
      </body>
    </html>
  );
}
