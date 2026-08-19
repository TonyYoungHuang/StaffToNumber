import { APP_ROUTES, type SupportedLocale } from "@score/shared";

const defaultSiteUrl = "https://scoretransposer.com";
const defaultAppUrl = "https://app.scoretransposer.com";

function enabled(value: string | undefined, fallback = false) {
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

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
  title: "Sheet Music Converter, Editor & Transposer | ScoreTransposer",
  description:
    "Convert, correct, transpose, play, and export staff notation and Jianpu in a MusicXML-first online sheet music workspace.",
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
    "online sheet music editor",
    "transpose sheet music",
    "musicxml editor",
    "score to audio",
    "五线谱转简谱",
    "乐谱 pdf 转简谱",
  ],
  release: {
    publicLaunchReady: enabled(process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_READY, true),
    productAppAvailable: enabled(process.env.NEXT_PUBLIC_PRODUCT_APP_AVAILABLE),
    checkoutAvailable: enabled(process.env.NEXT_PUBLIC_CHECKOUT_AVAILABLE),
    omrAvailable: enabled(process.env.NEXT_PUBLIC_OMR_AVAILABLE),
    audioTranscriptionAvailable: enabled(process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE),
    teachingAvailable: enabled(process.env.NEXT_PUBLIC_TEACHING_AVAILABLE),
  },
} as const;

export const publicContentLastUpdated = "2026-08-19";
export const legalLastUpdated = "2026-08-10";

export function getCheckoutUrl(locale: SupportedLocale) {
  if (!siteConfig.release.checkoutAvailable) {
    return getSupportUrl("payment", "checkout-unavailable");
  }

  return locale === "zh-CN" ? siteConfig.chinaCheckoutUrl : siteConfig.checkoutUrl;
}

export function getAppHomeUrl() {
  return siteConfig.appUrl;
}

export function getSafeAppUrl(source = "site") {
  if (siteConfig.release.productAppAvailable) {
    return siteConfig.appUrl;
  }

  return getSupportUrl("general", `${source}-launch-access`);
}

export function getAppRegisterUrl() {
  if (!siteConfig.release.productAppAvailable) {
    return getSupportUrl("general", "registration-launch-access");
  }

  return buildUrl(siteConfig.appUrl, APP_ROUTES.register);
}

export function getAppActivateUrl() {
  return buildUrl(siteConfig.appUrl, APP_ROUTES.activate);
}

export function getAppStartConversionUrl() {
  if (siteConfig.release.productAppAvailable) {
    return `${buildUrl(siteConfig.appUrl, APP_ROUTES.scores)}#omr-import`;
  }

  return getSupportUrl("general", "upload-launch-access");
}

export function getSupportUrl(category: "payment" | "activation" | "job" | "privacy" | "general", source = "site") {
  const params = new URLSearchParams({
    category,
    source,
  });
  return `/support?${params.toString()}`;
}
