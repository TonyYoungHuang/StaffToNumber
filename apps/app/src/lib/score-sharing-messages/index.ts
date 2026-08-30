import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { deScoreSharingMessages } from "./locales/de";
import { enScoreSharingMessages } from "./locales/en";
import { esScoreSharingMessages } from "./locales/es";
import { frScoreSharingMessages } from "./locales/fr";
import { jaScoreSharingMessages } from "./locales/ja";
import { koScoreSharingMessages } from "./locales/ko";
import { ruScoreSharingMessages } from "./locales/ru";
import { zhCNScoreSharingMessages } from "./locales/zh-CN";
import { zhTWScoreSharingMessages } from "./locales/zh-TW";
import type { ScoreSharingMessages } from "./types";

export const SCORE_SHARING_MESSAGE_CATALOGS = {
  en: enScoreSharingMessages,
  "zh-CN": zhCNScoreSharingMessages,
  "zh-TW": zhTWScoreSharingMessages,
  ja: jaScoreSharingMessages,
  ko: koScoreSharingMessages,
  fr: frScoreSharingMessages,
  es: esScoreSharingMessages,
  de: deScoreSharingMessages,
  ru: ruScoreSharingMessages,
} satisfies Record<SupportedLocale, ScoreSharingMessages>;

if (Object.keys(SCORE_SHARING_MESSAGE_CATALOGS).length !== SUPPORTED_LOCALES.length) {
  throw new Error("Score sharing message catalogs must match the supported locale registry.");
}

export function getScoreSharingMessages(locale: SupportedLocale): ScoreSharingMessages {
  return SCORE_SHARING_MESSAGE_CATALOGS[locale];
}

export type { ScoreSharingMessages } from "./types";
