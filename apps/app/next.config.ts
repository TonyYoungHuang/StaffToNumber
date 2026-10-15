import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.SCORE_SELF_HOSTED === "true" ? { output: "standalone", experimental: { cpus: 1 } } : {}),
  reactStrictMode: true,
  async headers() {
    return [{ source: "/checkout/:path*", headers: [
      { key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" },
    ] }];
  },
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean),
};

export default nextConfig;
