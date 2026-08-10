import type { Metadata } from "next";
import React from "react";
import "@score/ui/sonata.css";
import { AppChrome } from "../components/AppChrome";
import { AppLocaleProvider } from "../components/AppLocaleProvider";
import { readAppLocale } from "../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();

  if (locale === "zh-CN") {
    return {
      title: "ScoreTransposer Studio | 简体中文",
      description: "基于 MusicXML 与 Score JSON 的乐谱工作台，支持扫描校对、简谱互换、移调、图形编辑、播放练习和多格式导出。",
    };
  }

  return {
    title: "ScoreTransposer Studio",
    description: "MusicXML-first score workspace for scanning, correction, Jianpu conversion, transposition, visual editing, practice playback, and multi-format export.",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await readAppLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <AppLocaleProvider locale={locale}>
          <AppChrome>{children}</AppChrome>
        </AppLocaleProvider>
      </body>
    </html>
  );
}
