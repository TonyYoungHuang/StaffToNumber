import { LOCALE_COOKIE_NAME, normalizeLocale, type SupportedLocale } from "./locales.ts";

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const LOCALE_COOKIE_PATH = "/" as const;
export const LOCALE_COOKIE_SAME_SITE = "Lax" as const;

export type LocaleCookieSameSite = "Lax" | "Strict" | "None";

export type LocaleCookieOptions = {
  domain?: string;
  path?: string;
  maxAge?: number;
  sameSite?: LocaleCookieSameSite;
  secure?: boolean;
};

function cleanAttribute(value: string, attribute: string) {
  const cleaned = value.trim();
  if (!cleaned || /[;\r\n]/u.test(cleaned)) {
    throw new TypeError(`Invalid locale cookie ${attribute}.`);
  }
  return cleaned;
}

export function buildLocaleCookie(locale: SupportedLocale, options: LocaleCookieOptions = {}): string {
  const path = cleanAttribute(options.path ?? LOCALE_COOKIE_PATH, "path");
  const maxAge = options.maxAge ?? LOCALE_COOKIE_MAX_AGE_SECONDS;
  if (!Number.isFinite(maxAge) || maxAge < 0) {
    throw new TypeError("Invalid locale cookie maxAge.");
  }

  const parts = [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    `Path=${path}`,
    `Max-Age=${Math.floor(maxAge)}`,
    `SameSite=${options.sameSite ?? LOCALE_COOKIE_SAME_SITE}`,
  ];

  if (options.domain !== undefined) {
    parts.push(`Domain=${cleanAttribute(options.domain, "domain")}`);
  }

  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function readLocaleCookie(cookieHeader: string | null | undefined): SupportedLocale | undefined {
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0) continue;
    const name = cookie.slice(0, separatorIndex).trim();
    if (name !== LOCALE_COOKIE_NAME) continue;

    const rawValue = cookie.slice(separatorIndex + 1).trim();
    try {
      return normalizeLocale(decodeURIComponent(rawValue));
    } catch {
      return undefined;
    }
  }

  return undefined;
}
