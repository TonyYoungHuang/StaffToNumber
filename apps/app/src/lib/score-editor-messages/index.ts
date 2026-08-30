import type { SupportedLocale } from "@score/i18n";
import { deScoreEditorMessages } from "./locales/de";
import { enScoreEditorMessages } from "./locales/en";
import { esScoreEditorMessages } from "./locales/es";
import { frScoreEditorMessages } from "./locales/fr";
import { jaScoreEditorMessages } from "./locales/ja";
import { koScoreEditorMessages } from "./locales/ko";
import { ruScoreEditorMessages } from "./locales/ru";
import { zhCNScoreEditorMessages } from "./locales/zh-CN";
import { zhTWScoreEditorMessages } from "./locales/zh-TW";
import type { ScoreEditorMessages } from "./types";

export type { ScoreEditorMessages } from "./types";

export const SCORE_EDITOR_MESSAGE_CATALOGS = {
  en: enScoreEditorMessages,
  "zh-CN": zhCNScoreEditorMessages,
  "zh-TW": zhTWScoreEditorMessages,
  ja: jaScoreEditorMessages,
  ko: koScoreEditorMessages,
  fr: frScoreEditorMessages,
  es: esScoreEditorMessages,
  de: deScoreEditorMessages,
  ru: ruScoreEditorMessages,
} satisfies Record<SupportedLocale, ScoreEditorMessages>;

export function getScoreEditorMessages(locale: SupportedLocale): ScoreEditorMessages {
  return SCORE_EDITOR_MESSAGE_CATALOGS[locale];
}
