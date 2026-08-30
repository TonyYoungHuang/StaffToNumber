import type { SupportedLocale } from "@score/i18n";
import { deScoreEntryMessages } from "./locales/de";
import { enScoreEntryMessages } from "./locales/en";
import { esScoreEntryMessages } from "./locales/es";
import { frScoreEntryMessages } from "./locales/fr";
import { jaScoreEntryMessages } from "./locales/ja";
import { koScoreEntryMessages } from "./locales/ko";
import { ruScoreEntryMessages } from "./locales/ru";
import { zhCNScoreEntryMessages } from "./locales/zh-CN";
import { zhTWScoreEntryMessages } from "./locales/zh-TW";
import type { ScoreEntryMessages } from "./types";

export type { ScoreEntryMessages } from "./types";

export const SCORE_ENTRY_MESSAGE_CATALOGS = {
  en: enScoreEntryMessages,
  "zh-CN": zhCNScoreEntryMessages,
  "zh-TW": zhTWScoreEntryMessages,
  ja: jaScoreEntryMessages,
  ko: koScoreEntryMessages,
  fr: frScoreEntryMessages,
  es: esScoreEntryMessages,
  de: deScoreEntryMessages,
  ru: ruScoreEntryMessages,
} satisfies Record<SupportedLocale, ScoreEntryMessages>;

export function getScoreEntryMessages(locale: SupportedLocale): ScoreEntryMessages {
  return SCORE_ENTRY_MESSAGE_CATALOGS[locale];
}
