import type { SupportedLocale } from "@score/i18n";
import { deSupportLegal } from "./locales/de";
import { enSupportLegal } from "./locales/en";
import { esSupportLegal } from "./locales/es";
import { frSupportLegal } from "./locales/fr";
import { jaSupportLegal } from "./locales/ja";
import { koSupportLegal } from "./locales/ko";
import { ruSupportLegal } from "./locales/ru";
import { zhCNSupportLegal } from "./locales/zh-CN";
import { zhTWSupportLegal } from "./locales/zh-TW";
import type { SupportLegalLocalization } from "./types";

export { SUPPORT_LEGAL_MEDIA_SOURCE_LOCALES, getSupportLegalMedia } from "./media";
export type {
  CopyrightComplaintFormCopy,
  CopyrightComplaintStatus,
  SupportCategory,
  SupportFormCopy,
  SupportLegalLocalization,
} from "./types";

export const SUPPORT_LEGAL_LOCALIZATIONS = {
  en: enSupportLegal,
  "zh-CN": zhCNSupportLegal,
  "zh-TW": zhTWSupportLegal,
  ja: jaSupportLegal,
  ko: koSupportLegal,
  fr: frSupportLegal,
  es: esSupportLegal,
  de: deSupportLegal,
  ru: ruSupportLegal,
} as const satisfies Readonly<Record<SupportedLocale, SupportLegalLocalization>>;

export function getSupportLegalLocalization(locale: SupportedLocale): SupportLegalLocalization {
  return SUPPORT_LEGAL_LOCALIZATIONS[locale];
}
