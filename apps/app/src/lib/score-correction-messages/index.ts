import type { SupportedLocale } from "@score/i18n";
import { deScoreCorrectionMessages } from "./locales/de";
import { enScoreCorrectionMessages } from "./locales/en";
import { esScoreCorrectionMessages } from "./locales/es";
import { frScoreCorrectionMessages } from "./locales/fr";
import { jaScoreCorrectionMessages } from "./locales/ja";
import { koScoreCorrectionMessages } from "./locales/ko";
import { ruScoreCorrectionMessages } from "./locales/ru";
import { zhCNScoreCorrectionMessages } from "./locales/zh-CN";
import { zhTWScoreCorrectionMessages } from "./locales/zh-TW";
import type { ScoreCorrectionMessages } from "./types";

export type { ScoreCorrectionMessages } from "./types";

export const SCORE_CORRECTION_MESSAGE_CATALOGS = {
  en: enScoreCorrectionMessages,
  "zh-CN": zhCNScoreCorrectionMessages,
  "zh-TW": zhTWScoreCorrectionMessages,
  ja: jaScoreCorrectionMessages,
  ko: koScoreCorrectionMessages,
  fr: frScoreCorrectionMessages,
  es: esScoreCorrectionMessages,
  de: deScoreCorrectionMessages,
  ru: ruScoreCorrectionMessages,
} satisfies Record<SupportedLocale, ScoreCorrectionMessages>;

export function getScoreCorrectionMessages(locale: SupportedLocale): ScoreCorrectionMessages {
  return SCORE_CORRECTION_MESSAGE_CATALOGS[locale];
}
