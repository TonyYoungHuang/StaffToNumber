import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Converter App",
  description: "Authenticated web app shell for the converter.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Segoe UI, sans-serif", margin: 0, background: "#f3f5f7", color: "#12202f" }}>
        {children}
      </body>
    </html>
  );
}
