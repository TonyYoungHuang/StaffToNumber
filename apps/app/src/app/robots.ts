import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.scoretransposer.com";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/llms.txt"],
      disallow: ["/activate", "/admin", "/billing", "/checkout", "/classrooms", "/dashboard", "/forgot-password", "/jobs", "/reset-password", "/scores", "/student"],
    },
    host: appUrl,
  };
}
