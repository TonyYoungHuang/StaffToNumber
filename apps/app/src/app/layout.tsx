import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import React from "react";
import "@score/ui/sonata.css";
import { AppChrome } from "../components/AppChrome";

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
  title: "ScoreTransposer Studio",
  description: "Authenticated studio for staff PDF to Jianpu conversion, activation codes, uploads, and job tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${headlineFont.variable} ${uiFont.variable}`}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
