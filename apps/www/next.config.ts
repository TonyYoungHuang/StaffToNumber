import type { NextConfig } from "next";

// Keep this config module runtime-standalone: Next's config transpiler does not
// resolve the repository's TypeScript workspace aliases. The routing test checks
// these prefixes against @score/i18n so the two declarations cannot drift.
export const publicLocalePrefixes = [
  ["zh-CN", "/zh-cn"],
  ["zh-TW", "/zh-tw"],
  ["ja", "/ja"],
  ["ko", "/ko"],
  ["fr", "/fr"],
  ["es", "/es"],
  ["de", "/de"],
  ["ru", "/ru"],
] as const;

export const publicLocaleRewrites = publicLocalePrefixes.flatMap(([locale, prefix]) => {
  const localeHeader = [{ type: "header" as const, key: "x-score-route-locale", value: locale }];
  return [
    { source: prefix, destination: "/", has: localeHeader },
    { source: `${prefix}/:path*`, destination: "/:path*", has: localeHeader },
  ];
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: publicLocaleRewrites,
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
