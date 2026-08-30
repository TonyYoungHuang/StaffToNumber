import type { SupportedLocale } from "@score/i18n";
import { deScoreDetailMessages } from "./locales/de";
import { enScoreDetailMessages } from "./locales/en";
import { esScoreDetailMessages } from "./locales/es";
import { frScoreDetailMessages } from "./locales/fr";
import { jaScoreDetailMessages } from "./locales/ja";
import { koScoreDetailMessages } from "./locales/ko";
import { ruScoreDetailMessages } from "./locales/ru";
import { zhCNScoreDetailMessages } from "./locales/zh-CN";
import { zhTWScoreDetailMessages } from "./locales/zh-TW";
import type { ScoreDetailMessages } from "./types";

export type { ScoreDetailMessages } from "./types";

export const SCORE_DETAIL_MESSAGE_CATALOGS = {
  en: enScoreDetailMessages,
  "zh-CN": zhCNScoreDetailMessages,
  "zh-TW": zhTWScoreDetailMessages,
  ja: jaScoreDetailMessages,
  ko: koScoreDetailMessages,
  fr: frScoreDetailMessages,
  es: esScoreDetailMessages,
  de: deScoreDetailMessages,
  ru: ruScoreDetailMessages,
} satisfies Record<SupportedLocale, ScoreDetailMessages>;

export function getScoreDetailMessages(locale: SupportedLocale): ScoreDetailMessages {
  return SCORE_DETAIL_MESSAGE_CATALOGS[locale];
}
