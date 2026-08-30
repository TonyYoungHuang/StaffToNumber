import type { SupportedLocale } from "@score/i18n";

const SUPPORT_TEMPLATE_KEYS = ["payment", "activation", "job", "privacy"] as const;

export type SupportTemplateKey = (typeof SUPPORT_TEMPLATE_KEYS)[number];

export type SupportTemplate = {
  key: SupportTemplateKey;
  href: string;
};

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@scoretransposer.com";
export const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scoretransposer.com";

export function buildPublicSiteHandoffHref(nextPath: string, locale: SupportedLocale) {
  const base = PUBLIC_SITE_URL.endsWith("/") ? PUBLIC_SITE_URL.slice(0, -1) : PUBLIC_SITE_URL;
  const handoff = new URL("/api/locale", `${base}/`);
  handoff.searchParams.set("locale", locale);
  handoff.searchParams.set("next", nextPath);
  return handoff.toString();
}

export function buildSupportTemplates(locale: SupportedLocale): SupportTemplate[] {
  return SUPPORT_TEMPLATE_KEYS.map((key) => ({
    key,
    href: buildPublicSiteHandoffHref(`/support?category=${encodeURIComponent(key)}&source=app`, locale),
  }));
}
