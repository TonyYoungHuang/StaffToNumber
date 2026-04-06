import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Online PDF Score Converter",
  description: "SEO website for the Online PDF Score Converter project.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", margin: 0, background: "#f7f4ec", color: "#1a1a1a" }}>
        {children}
      </body>
    </html>
  );
}
