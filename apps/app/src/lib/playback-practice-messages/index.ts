import type { SupportedLocale } from "@score/i18n";
import { dePlaybackPracticeMessages } from "./locales/de";
import { enPlaybackPracticeMessages } from "./locales/en";
import { esPlaybackPracticeMessages } from "./locales/es";
import { frPlaybackPracticeMessages } from "./locales/fr";
import { jaPlaybackPracticeMessages } from "./locales/ja";
import { koPlaybackPracticeMessages } from "./locales/ko";
import { ruPlaybackPracticeMessages } from "./locales/ru";
import { zhCNPlaybackPracticeMessages } from "./locales/zh-CN";
import { zhTWPlaybackPracticeMessages } from "./locales/zh-TW";
import type { PlaybackPracticeMessages } from "./types";

export const PLAYBACK_PRACTICE_MESSAGE_CATALOGS = {
  en: enPlaybackPracticeMessages,
  "zh-CN": zhCNPlaybackPracticeMessages,
  "zh-TW": zhTWPlaybackPracticeMessages,
  ja: jaPlaybackPracticeMessages,
  ko: koPlaybackPracticeMessages,
  fr: frPlaybackPracticeMessages,
  es: esPlaybackPracticeMessages,
  de: dePlaybackPracticeMessages,
  ru: ruPlaybackPracticeMessages,
} satisfies Record<SupportedLocale, PlaybackPracticeMessages>;

export function getPlaybackPracticeMessages(locale: SupportedLocale): PlaybackPracticeMessages {
  return PLAYBACK_PRACTICE_MESSAGE_CATALOGS[locale];
}

export type { PlaybackPracticeMessages } from "./types";
