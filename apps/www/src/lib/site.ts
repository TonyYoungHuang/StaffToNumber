import { APP_ROUTES, type CheckoutPlanCode, type SupportedLocale } from "@score/shared";
import { localizePathname } from "@score/i18n";

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

function optionalPublicText(value: string | undefined, max = 240) {
  return value?.trim().slice(0, max) ?? "";
}

function normalizeCountryCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/u.test(normalized) ? normalized : "";
}

function normalizeSameAs(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry || entry.length > 2048) return false;
      try {
        const url = new URL(entry);
        return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
      } catch {
        return false;
      }
    })
    .slice(0, 12);
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
  operator: {
    legalName: optionalPublicText(process.env.NEXT_PUBLIC_OPERATOR_LEGAL_NAME),
    registrationIdentifier: optionalPublicText(process.env.NEXT_PUBLIC_OPERATOR_REGISTRATION_ID, 120),
    addressCountry: normalizeCountryCode(process.env.NEXT_PUBLIC_OPERATOR_COUNTRY_CODE),
    addressRegion: optionalPublicText(process.env.NEXT_PUBLIC_OPERATOR_ADDRESS_REGION, 120),
    addressLocality: optionalPublicText(process.env.NEXT_PUBLIC_OPERATOR_ADDRESS_LOCALITY, 120),
    postalCode: optionalPublicText(process.env.NEXT_PUBLIC_OPERATOR_POSTAL_CODE, 40),
    sameAs: normalizeSameAs(process.env.NEXT_PUBLIC_OPERATOR_SAME_AS),
  },
  title: "ScoreTransposer | Scan, Edit, Transpose & Export Sheet Music",
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

export const publicContentLastUpdated = "2026-08-29";
export const legalLastUpdated = "2026-08-28";

export function getCheckoutUrl(locale: SupportedLocale, planCode?: CheckoutPlanCode) {
  const checkoutPath = planCode ? `${APP_ROUTES.checkout}?plan=${encodeURIComponent(planCode)}` : APP_ROUTES.checkout;
  return getAppLoginUrl(checkoutPath, locale);
}

/** The product root redirects back to the public site, so the score library is the app home. */
export function getAppHomeUrl(locale?: SupportedLocale) {
  return getAppScoreProjectsUrl(locale);
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

export function getSafeAppUrl(source = "site", locale?: SupportedLocale) {
  if (siteConfig.release.productAppAvailable) {
    const scorePath = APP_ROUTES.scores;
    return locale
      ? getAppLocaleHandoffUrl(scorePath, locale)
      : buildUrl(siteConfig.appUrl, scorePath);
  }

  return getSupportUrl("general", `${source}-launch-access`, locale);
}

export function getAppRegisterUrl(locale?: SupportedLocale) {
  if (!siteConfig.release.productAppAvailable) {
    return getSupportUrl("general", "registration-launch-access", locale);
  }

  return locale
    ? getAppLocaleHandoffUrl(APP_ROUTES.register, locale)
    : buildUrl(siteConfig.appUrl, APP_ROUTES.register);
}

export function getAppActivateUrl(locale?: SupportedLocale) {
  return locale
    ? getAppLocaleHandoffUrl(APP_ROUTES.activate, locale)
    : buildUrl(siteConfig.appUrl, APP_ROUTES.activate);
}

export function getAppStartConversionUrl(locale?: SupportedLocale) {
  if (siteConfig.release.productAppAvailable) {
    return getAppLoginUrl(`${APP_ROUTES.scores}#free-scan`, locale);
  }

  return getSupportUrl("general", "upload-launch-access", locale);
}

export function getAppScoreProjectsUrl(locale?: SupportedLocale) {
  const scorePath = APP_ROUTES.scores;
  return locale ? getAppLocaleHandoffUrl(scorePath, locale) : buildUrl(siteConfig.appUrl, scorePath);
}

export function getAppScoreUrl(scoreId: string, locale: SupportedLocale) {
  return getAppLocaleHandoffUrl(`${APP_ROUTES.scores}/${encodeURIComponent(scoreId)}`, locale);
}

export function getSupportUrl(
  category: "payment" | "activation" | "job" | "privacy" | "general",
  source = "site",
  locale?: SupportedLocale,
) {
  const params = new URLSearchParams({
    category,
    source,
  });
  const supportUrl = `/support?${params.toString()}`;
  return locale ? localizePathname(supportUrl, locale) : supportUrl;
}
