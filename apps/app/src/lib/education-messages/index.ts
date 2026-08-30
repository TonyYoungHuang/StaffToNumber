import type { SupportedLocale } from "@score/i18n";
import { deEducationMessages } from "./locales/de";
import { enEducationMessages } from "./locales/en";
import { esEducationMessages } from "./locales/es";
import { frEducationMessages } from "./locales/fr";
import { jaEducationMessages } from "./locales/ja";
import { koEducationMessages } from "./locales/ko";
import { ruEducationMessages } from "./locales/ru";
import { zhCNEducationMessages } from "./locales/zh-CN";
import { zhTWEducationMessages } from "./locales/zh-TW";
import type { EducationMessages } from "./types";

export const EDUCATION_MESSAGE_CATALOGS = {
  en: enEducationMessages,
  "zh-CN": zhCNEducationMessages,
  "zh-TW": zhTWEducationMessages,
  ja: jaEducationMessages,
  ko: koEducationMessages,
  fr: frEducationMessages,
  es: esEducationMessages,
  de: deEducationMessages,
  ru: ruEducationMessages,
} satisfies Record<SupportedLocale, EducationMessages>;

export function getEducationMessages(locale: SupportedLocale): EducationMessages {
  return EDUCATION_MESSAGE_CATALOGS[locale];
}

export type { EducationMessages } from "./types";
