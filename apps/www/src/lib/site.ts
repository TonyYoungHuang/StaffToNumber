import { APP_ROUTES, type CheckoutPlanCode, type SupportedLocale } from "@score/shared";

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

function normalizeDiscordInviteUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !["discord.gg", "discord.com", "www.discord.com"].includes(hostname)) return "";
    return url.toString();
  } catch {
    return "";
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
  discordInviteUrl: normalizeDiscordInviteUrl(process.env.NEXT_PUBLIC_DISCORD_INVITE_URL),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@scoretransposer.com",
  title: "Sheet Music Converter, Editor & Transposer | ScoreTransposer",
  description:
    "Convert, correct, transpose, play, and export staff notation and Jianpu in a MusicXML-first online sheet music workspace.",
  keywords: [
    "score transposer",
    "sheet music maker",
    "sheet music editor",
    "music score maker",
    "music notation software",
    "sheet music scanner",
    "pdf to musicxml",
    "image to musicxml",
    "sheet music player",
    "audio to sheet music",
    "how to read sheet music",
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

export const publicContentLastUpdated = "2026-08-25";
export const legalLastUpdated = "2026-08-10";

export function getCheckoutUrl(locale: SupportedLocale, planCode?: CheckoutPlanCode) {
  const checkoutPath = planCode ? `${APP_ROUTES.checkout}?plan=${encodeURIComponent(planCode)}` : APP_ROUTES.checkout;
  return getAppLoginUrl(checkoutPath, locale);
}

export function getAppHomeUrl() {
  return siteConfig.appUrl;
}

function getAppLocaleHandoffUrl(nextPath: string, locale: SupportedLocale) {
  const handoffUrl = new URL("/api/locale", `${siteConfig.appUrl}/`);
  handoffUrl.searchParams.set("locale", locale);
  handoffUrl.searchParams.set("next", nextPath);
  return handoffUrl.toString();
}

export function getAppLoginUrl(nextPath?: string, locale?: SupportedLocale) {
  const loginUrl = new URL(APP_ROUTES.login, `${siteConfig.appUrl}/`);
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
    loginUrl.searchParams.set("next", nextPath);
  }
  const loginPath = `${loginUrl.pathname}${loginUrl.search}`;
  return locale ? getAppLocaleHandoffUrl(loginPath, locale) : loginUrl.toString();
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

export function getAppStartConversionUrl(locale?: SupportedLocale) {
  if (siteConfig.release.productAppAvailable) {
    return getAppLoginUrl(`${APP_ROUTES.scores}#free-scan`, locale);
  }

  return getSupportUrl("general", "upload-launch-access");
}

export function getAppScoreProjectsUrl(locale?: SupportedLocale) {
  const scorePath = APP_ROUTES.scores;
  return locale ? getAppLocaleHandoffUrl(scorePath, locale) : buildUrl(siteConfig.appUrl, scorePath);
}

export function getSupportUrl(category: "payment" | "activation" | "job" | "privacy" | "general", source = "site") {
  const params = new URLSearchParams({
    category,
    source,
  });
  return `/support?${params.toString()}`;
}
