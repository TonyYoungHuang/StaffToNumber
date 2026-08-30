export const DEFAULT_LOCALE = "en" as const;

export const LOCALE_COOKIE_NAME = "score_locale" as const;

export const SUPPORTED_LOCALES = [
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "fr",
  "es",
  "de",
  "ru",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocaleDirection = "ltr";

export type LocaleFontGroup = "latin" | "cyrillic" | "hans" | "hant" | "japanese" | "korean";

export type LocaleConfig = Readonly<{
  code: SupportedLocale;
  htmlLang: string;
  label: string;
  shortLabel: string;
  dateLocale: string;
  numberLocale: string;
  fontGroup: LocaleFontGroup;
  direction: LocaleDirection;
  sitePathPrefix: string;
  fallbackLocale: typeof DEFAULT_LOCALE;
}>;

const localeConfigByCode = {
  en: {
    code: "en",
    htmlLang: "en",
    label: "English",
    shortLabel: "EN",
    dateLocale: "en-US",
    numberLocale: "en-US",
    fontGroup: "latin",
    direction: "ltr",
    sitePathPrefix: "",
    fallbackLocale: "en",
  },
  "zh-CN": {
    code: "zh-CN",
    htmlLang: "zh-CN",
    label: "简体中文",
    shortLabel: "简体",
    dateLocale: "zh-CN",
    numberLocale: "zh-CN",
    fontGroup: "hans",
    direction: "ltr",
    sitePathPrefix: "/zh-cn",
    fallbackLocale: "en",
  },
  "zh-TW": {
    code: "zh-TW",
    htmlLang: "zh-TW",
    label: "繁體中文",
    shortLabel: "繁體",
    dateLocale: "zh-TW",
    numberLocale: "zh-TW",
    fontGroup: "hant",
    direction: "ltr",
    sitePathPrefix: "/zh-tw",
    fallbackLocale: "en",
  },
  ja: {
    code: "ja",
    htmlLang: "ja",
    label: "日本語",
    shortLabel: "日本語",
    dateLocale: "ja-JP",
    numberLocale: "ja-JP",
    fontGroup: "japanese",
    direction: "ltr",
    sitePathPrefix: "/ja",
    fallbackLocale: "en",
  },
  ko: {
    code: "ko",
    htmlLang: "ko",
    label: "한국어",
    shortLabel: "한국어",
    dateLocale: "ko-KR",
    numberLocale: "ko-KR",
    fontGroup: "korean",
    direction: "ltr",
    sitePathPrefix: "/ko",
    fallbackLocale: "en",
  },
  fr: {
    code: "fr",
    htmlLang: "fr",
    label: "Français",
    shortLabel: "FR",
    dateLocale: "fr-FR",
    numberLocale: "fr-FR",
    fontGroup: "latin",
    direction: "ltr",
    sitePathPrefix: "/fr",
    fallbackLocale: "en",
  },
  es: {
    code: "es",
    htmlLang: "es",
    label: "Español",
    shortLabel: "ES",
    dateLocale: "es-ES",
    numberLocale: "es-ES",
    fontGroup: "latin",
    direction: "ltr",
    sitePathPrefix: "/es",
    fallbackLocale: "en",
  },
  de: {
    code: "de",
    htmlLang: "de",
    label: "Deutsch",
    shortLabel: "DE",
    dateLocale: "de-DE",
    numberLocale: "de-DE",
    fontGroup: "latin",
    direction: "ltr",
    sitePathPrefix: "/de",
    fallbackLocale: "en",
  },
  ru: {
    code: "ru",
    htmlLang: "ru",
    label: "Русский",
    shortLabel: "RU",
    dateLocale: "ru-RU",
    numberLocale: "ru-RU",
    fontGroup: "cyrillic",
    direction: "ltr",
    sitePathPrefix: "/ru",
    fallbackLocale: "en",
  },
} as const satisfies Record<SupportedLocale, LocaleConfig>;

export const LOCALE_CONFIGS: readonly LocaleConfig[] = SUPPORTED_LOCALES.map(
  (locale) => localeConfigByCode[locale],
);

export const LOCALE_ROUTE_PREFIXES = Object.freeze(
  Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, localeConfigByCode[locale].sitePathPrefix]),
  ) as Record<SupportedLocale, string>,
);

const supportedLocaleSet = new Set<string>(SUPPORTED_LOCALES);
const localeByRoutePrefix = new Map(
  LOCALE_CONFIGS
    .filter((config) => config.sitePathPrefix)
    .map((config) => [config.sitePathPrefix.toLowerCase(), config.code] as const),
);

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return typeof value === "string" && supportedLocaleSet.has(value);
}

/**
 * Normalizes browser language tags and common aliases to one of the product locales.
 * Unsupported values return undefined so callers can continue their detection chain.
 */
export function normalizeLocale(value: string | null | undefined): SupportedLocale | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().replaceAll("_", "-").toLowerCase();
  if (!normalized) return undefined;

  if (normalized === "zh" || normalized.startsWith("zh-")) {
    const subtags = normalized.split("-");
    return subtags.some((subtag) => ["hant", "tw", "hk", "mo"].includes(subtag)) ? "zh-TW" : "zh-CN";
  }

  const language = normalized.split("-", 1)[0];
  switch (language) {
    case "en":
    case "ja":
    case "ko":
    case "fr":
    case "es":
    case "de":
    case "ru":
      return language;
    default:
      return undefined;
  }
}

export function resolveLocale(
  value: string | null | undefined,
  fallbackLocale: SupportedLocale = DEFAULT_LOCALE,
): SupportedLocale {
  return normalizeLocale(value) ?? fallbackLocale;
}

export function getLocaleConfig(locale: SupportedLocale): LocaleConfig {
  return localeConfigByCode[locale] ?? localeConfigByCode[DEFAULT_LOCALE];
}

export function getLocaleRoutePrefix(locale: SupportedLocale): string {
  return LOCALE_ROUTE_PREFIXES[locale];
}

function splitPathSuffix(path: string) {
  const suffixIndex = path.search(/[?#]/u);
  return suffixIndex < 0
    ? { pathname: path, suffix: "" }
    : { pathname: path.slice(0, suffixIndex), suffix: path.slice(suffixIndex) };
}

function normalizePathname(pathname: string) {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function getLocaleFromPathname(path: string | null | undefined): SupportedLocale | undefined {
  if (typeof path !== "string") return undefined;
  const { pathname } = splitPathSuffix(normalizePathname(path.trim()));
  const firstSegment = pathname.match(/^\/[^/]*/u)?.[0]?.toLowerCase();
  return firstSegment ? localeByRoutePrefix.get(firstSegment) : undefined;
}

export type StrippedLocalePath = {
  locale?: SupportedLocale;
  pathname: string;
};

export function stripLocalePrefix(path: string): StrippedLocalePath {
  const { pathname: rawPathname, suffix } = splitPathSuffix(normalizePathname(path.trim()));
  const locale = getLocaleFromPathname(rawPathname);
  if (!locale) return { pathname: `${rawPathname || "/"}${suffix}` };

  const prefix = getLocaleRoutePrefix(locale);
  const stripped = rawPathname.slice(prefix.length);
  return {
    locale,
    pathname: `${stripped.startsWith("/") ? stripped : `/${stripped}`}${suffix}`,
  };
}

export function localizePathname(path: string, locale: SupportedLocale): string {
  const { pathname } = stripLocalePrefix(path);
  const { pathname: rawPathname, suffix } = splitPathSuffix(pathname);
  const normalizedPathname = normalizePathname(rawPathname);
  const prefix = getLocaleRoutePrefix(locale);
  return `${prefix}${normalizedPathname === "/" && prefix ? "" : normalizedPathname}${suffix}` || "/";
}

export type AcceptedLanguage = {
  tag: string;
  quality: number;
};

export function parseAcceptLanguage(header: string | null | undefined): AcceptedLanguage[] {
  if (!header) return [];

  return header
    .split(",")
    .map((entry, index) => {
      const [rawTag, ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) => parameter.trim().toLowerCase().startsWith("q="));
      const parsedQuality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
      const quality = Number.isFinite(parsedQuality) ? Math.min(Math.max(parsedQuality, 0), 1) : 0;
      return { tag: rawTag?.trim() ?? "", quality, index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index)
    .map(({ tag, quality }) => ({ tag, quality }));
}

export type LocaleDetectionOptions = {
  explicitLocale?: string | null;
  pathname?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  fallbackLocale?: SupportedLocale;
};

export function detectLocale(options: LocaleDetectionOptions = {}): SupportedLocale {
  const explicitLocale = normalizeLocale(options.explicitLocale);
  if (explicitLocale) return explicitLocale;

  const pathLocale = getLocaleFromPathname(options.pathname);
  if (pathLocale) return pathLocale;

  const cookieLocale = normalizeLocale(options.cookieLocale);
  if (cookieLocale) return cookieLocale;

  for (const acceptedLanguage of parseAcceptLanguage(options.acceptLanguage)) {
    const locale = normalizeLocale(acceptedLanguage.tag);
    if (locale) return locale;
  }

  return options.fallbackLocale ?? DEFAULT_LOCALE;
}
