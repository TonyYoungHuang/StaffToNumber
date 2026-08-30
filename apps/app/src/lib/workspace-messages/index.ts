import type { SupportedLocale } from "@score/i18n";
import { deWorkspaceMessages } from "./locales/de";
import { enWorkspaceMessages } from "./locales/en";
import { esWorkspaceMessages } from "./locales/es";
import { frWorkspaceMessages } from "./locales/fr";
import { jaWorkspaceMessages } from "./locales/ja";
import { koWorkspaceMessages } from "./locales/ko";
import { ruWorkspaceMessages } from "./locales/ru";
import { zhCNWorkspaceMessages } from "./locales/zh-CN";
import { zhTWWorkspaceMessages } from "./locales/zh-TW";
import type { WorkspaceMessages } from "./types";

export type { WorkspaceMessages } from "./types";

export const WORKSPACE_MESSAGE_CATALOGS = {
  en: enWorkspaceMessages,
  "zh-CN": zhCNWorkspaceMessages,
  "zh-TW": zhTWWorkspaceMessages,
  ja: jaWorkspaceMessages,
  ko: koWorkspaceMessages,
  fr: frWorkspaceMessages,
  es: esWorkspaceMessages,
  de: deWorkspaceMessages,
  ru: ruWorkspaceMessages,
} satisfies Record<SupportedLocale, WorkspaceMessages>;

export function getWorkspaceMessages(locale: SupportedLocale): WorkspaceMessages {
  return WORKSPACE_MESSAGE_CATALOGS[locale];
}
