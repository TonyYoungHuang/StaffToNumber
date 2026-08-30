import {
  SUPPORTED_LOCALES,
  formatNumber,
  getLocaleConfig,
  getLocalizedValue,
  type SupportedLocale,
} from "@score/i18n";
import { deLibraryCatalog } from "./locales/de";
import { enLibraryCatalog } from "./locales/en";
import { esLibraryCatalog } from "./locales/es";
import { frLibraryCatalog } from "./locales/fr";
import { jaLibraryCatalog } from "./locales/ja";
import { koLibraryCatalog } from "./locales/ko";
import { ruLibraryCatalog } from "./locales/ru";
import { zhCNLibraryCatalog } from "./locales/zh-CN";
import { zhTWLibraryCatalog } from "./locales/zh-TW";
import type {
  LibraryAssetLicense,
  LibraryAssetStatus,
  LibraryCatalog,
  LibraryDifficulty,
  LibraryEnsemble,
  LibraryEra,
  LibraryFormat,
  LibraryInstrument,
  LibraryLocalizedValue,
  LibraryWorkRights,
} from "./types";

const libraryCatalogs = {
  en: enLibraryCatalog,
  "zh-CN": zhCNLibraryCatalog,
  "zh-TW": zhTWLibraryCatalog,
  ja: jaLibraryCatalog,
  ko: koLibraryCatalog,
  fr: frLibraryCatalog,
  es: esLibraryCatalog,
  de: deLibraryCatalog,
  ru: ruLibraryCatalog,
} satisfies Record<SupportedLocale, LibraryCatalog>;

export const LIBRARY_OPEN_GRAPH_LOCALES = {
  en: "en_US",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
  ja: "ja_JP",
  ko: "ko_KR",
  fr: "fr_FR",
  es: "es_ES",
  de: "de_DE",
  ru: "ru_RU",
} as const satisfies Record<SupportedLocale, string>;

export const LIBRARY_TEXT_FALLBACK_POLICY = {
  title: {
    fallbackLocale: "en",
    reason: "Use the attested English or original-language work title when no trustworthy localized title is recorded.",
  },
  composer: {
    fallbackLocale: "en",
    reason: "Preserve the attested proper name when a trustworthy localized form is not recorded.",
  },
  description: {
    fallbackLocale: "en",
    reason: "Use the rights-reviewed English description instead of inventing unsupported work facts.",
  },
} as const satisfies Record<"title" | "composer" | "description", { fallbackLocale: "en"; reason: string }>;

export function getLibraryCatalog(locale: SupportedLocale): LibraryCatalog {
  return libraryCatalogs[locale];
}

export function getLibraryLocalizedText(value: LibraryLocalizedValue, locale: SupportedLocale): string {
  return getLocalizedValue(value, locale);
}

export function getLibraryEraLabel(value: LibraryEra, locale: SupportedLocale) {
  return getLibraryCatalog(locale).values.eras[value];
}

export function getLibraryInstrumentLabel(value: LibraryInstrument, locale: SupportedLocale) {
  return getLibraryCatalog(locale).values.instruments[value];
}

export function getLibraryEnsembleLabel(value: LibraryEnsemble, locale: SupportedLocale) {
  return getLibraryCatalog(locale).values.ensembles[value];
}

export function getLibraryDifficultyLabel(value: LibraryDifficulty, locale: SupportedLocale) {
  return getLibraryCatalog(locale).values.difficulties[value];
}

export function getLibraryFormatLabel(value: LibraryFormat, locale: SupportedLocale) {
  return getLibraryCatalog(locale).values.formats[value];
}

export function getLibraryAssetStatusLabel(value: LibraryAssetStatus, locale: SupportedLocale) {
  return getLibraryCatalog(locale).values.assetStatuses[value];
}

export function getLibraryWorkRightsLabel(value: LibraryWorkRights, locale: SupportedLocale) {
  return getLibraryCatalog(locale).values.workRights[value];
}

export function getLibraryAssetLicense(value: LibraryAssetLicense, locale: SupportedLocale) {
  return getLibraryCatalog(locale).values.assetLicenses[value];
}

export function formatLibraryComposerDates(value: string, locale: SupportedLocale) {
  const match = /^(c\.)?(\d{4})(?:–(\d{4}))?$/u.exec(value);
  if (!match) return value;

  const formatYear = (year: string) => formatNumber(Number(year), locale, { useGrouping: false });
  const prefix = match[1] ? getLibraryCatalog(locale).detail.circaPrefix : "";
  const start = formatYear(match[2]);
  const end = match[3] ? `–${formatYear(match[3])}` : "";
  return `${prefix}${start}${end}`;
}

export function getLibrarySearchLabels(input: {
  era: LibraryEra;
  instruments: readonly LibraryInstrument[];
  ensemble: LibraryEnsemble;
  difficulty: LibraryDifficulty;
  formats: readonly LibraryFormat[];
  assetStatus: LibraryAssetStatus;
  workRights: LibraryWorkRights;
  assetLicenseKey: LibraryAssetLicense;
}) {
  return SUPPORTED_LOCALES.flatMap((locale) => {
    const catalog = getLibraryCatalog(locale);
    return [
      catalog.values.eras[input.era],
      ...input.instruments.map((instrument) => catalog.values.instruments[instrument]),
      catalog.values.ensembles[input.ensemble],
      catalog.values.difficulties[input.difficulty],
      ...input.formats.map((format) => catalog.values.formats[format]),
      catalog.values.assetStatuses[input.assetStatus],
      catalog.values.workRights[input.workRights],
      catalog.values.assetLicenses[input.assetLicenseKey],
    ];
  });
}

export function getLibraryCollator(locale: SupportedLocale) {
  return new Intl.Collator(getLocaleConfig(locale).dateLocale, { sensitivity: "base" });
}

export type {
  LibraryAssetLicense,
  LibraryAssetStatus,
  LibraryCatalog,
  LibraryDifficulty,
  LibraryEnsemble,
  LibraryEra,
  LibraryFormat,
  LibraryInstrument,
  LibraryLocalizedValue,
  LibraryWorkRights,
} from "./types";
