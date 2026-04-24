import { APP_ROUTES, type SupportedLocale } from "@score/shared";

const defaultSiteUrl = "https://scoretransposer.com";
const defaultAppUrl = "https://app.scoretransposer.com";

function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeConfiguredUrl(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    return stripTrailingSlash(new URL(trimmed, fallback).toString());
  } catch {
    return fallback;
  }
}

function buildUrl(baseUrl: string, pathname: string) {
  return new URL(pathname, `${stripTrailingSlash(baseUrl)}/`).toString();
}

const resolvedSiteUrl = normalizeConfiguredUrl(process.env.NEXT_PUBLIC_SITE_URL, defaultSiteUrl);
const resolvedAppUrl = normalizeConfiguredUrl(process.env.NEXT_PUBLIC_APP_URL, defaultAppUrl);
const defaultCheckoutUrl = buildUrl(resolvedSiteUrl, APP_ROUTES.checkout);
const resolvedCheckoutUrl = normalizeConfiguredUrl(process.env.NEXT_PUBLIC_CHECKOUT_URL, defaultCheckoutUrl);
const resolvedChinaCheckoutUrl = normalizeConfiguredUrl(
  process.env.NEXT_PUBLIC_CN_CHECKOUT_URL ?? process.env.NEXT_PUBLIC_CHECKOUT_URL,
  defaultCheckoutUrl,
);

export const siteConfig = {
  siteName: "ScoreTransposer",
  siteUrl: resolvedSiteUrl,
  appUrl: resolvedAppUrl,
  checkoutUrl: resolvedCheckoutUrl,
  chinaCheckoutUrl: resolvedChinaCheckoutUrl,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@scoretransposer.com",
  priceAmount: process.env.NEXT_PUBLIC_PRICE_AMOUNT ?? "",
  priceCurrency: process.env.NEXT_PUBLIC_PRICE_CURRENCY ?? "USD",
  title: "ScoreTransposer | Staff PDF to Jianpu",
  description:
    "Convert five-line staff PDFs into Jianpu with a focused production workflow, activation-gated access, and draft-safe delivery.",
  keywords: [
    "score transposer",
    "staff pdf to jianpu",
    "staff notation to numbered notation",
    "five-line staff to jianpu",
    "music score converter",
    "jianpu converter",
    "numbered notation converter",
    "numbered notation",
    "five-line staff pdf",
    "五线谱转简谱",
    "乐谱 pdf 转简谱",
  ],
} as const;

export const legalLastUpdated = "2026-04-22";

export function getCheckoutUrl(locale: SupportedLocale) {
  return locale === "zh-CN" ? siteConfig.chinaCheckoutUrl : siteConfig.checkoutUrl;
}

export function getAppHomeUrl() {
  return siteConfig.appUrl;
}

export function getAppRegisterUrl() {
  return buildUrl(siteConfig.appUrl, APP_ROUTES.register);
}

export function getAppActivateUrl() {
  return buildUrl(siteConfig.appUrl, APP_ROUTES.activate);
}

export function getAppStartConversionUrl() {
  return buildUrl(siteConfig.appUrl, APP_ROUTES.upload);
}

export function getSupportUrl(category: "payment" | "activation" | "job" | "privacy" | "general", source = "site") {
  const params = new URLSearchParams({
    category,
    source,
  });
  return `/support?${params.toString()}`;
}
