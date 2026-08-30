import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../locales.ts";
import { enMessages } from "./en.ts";
import { createTranslator } from "./translator.ts";
import type { MessageCatalog, Translator } from "./types.ts";

export { assertMessageCatalogComplete, getMessageCatalogIssues, isMessageCatalogComplete } from "./catalog-validation.ts";
export { enMessages } from "./en.ts";
export { createTranslator, translate, translateMessage } from "./translator.ts";
export type {
  FoundationMessages,
  MessageCatalog,
  MessageInterpolation,
  MessageKey,
  MessagePlaceholder,
  PartialMessageCatalog,
  PlaceholderNames,
  TranslationArguments,
  Translator,
} from "./types.ts";

export const MESSAGE_CATALOG_LOCALES = SUPPORTED_LOCALES;

export type MessageCatalogLocale = (typeof MESSAGE_CATALOG_LOCALES)[number];
export type FoundationMessageLocale = MessageCatalogLocale;

const messageLoaders = {
  en: async () => enMessages,
  "zh-CN": () => import("./zh-CN.ts").then((module) => module.zhCNMessages),
  "zh-TW": () => import("./zh-TW.ts").then((module) => module.zhTWMessages),
  ja: () => import("./ja.ts").then((module) => module.jaMessages),
  ko: () => import("./ko.ts").then((module) => module.koMessages),
  fr: () => import("./fr.ts").then((module) => module.frMessages),
  es: () => import("./es.ts").then((module) => module.esMessages),
  de: () => import("./de.ts").then((module) => module.deMessages),
  ru: () => import("./ru.ts").then((module) => module.ruMessages),
} satisfies Record<MessageCatalogLocale, () => Promise<MessageCatalog>>;

export function hasMessageCatalog(locale: SupportedLocale): locale is MessageCatalogLocale {
  return Object.prototype.hasOwnProperty.call(messageLoaders, locale);
}

export const hasFoundationMessages = hasMessageCatalog;

export function resolveMessageLocale(locale: SupportedLocale): MessageCatalogLocale {
  return hasMessageCatalog(locale) ? locale : DEFAULT_LOCALE;
}

export async function loadMessageCatalog(locale: SupportedLocale): Promise<MessageCatalog> {
  return messageLoaders[resolveMessageLocale(locale)]();
}

export const loadFoundationMessages = loadMessageCatalog;

export async function loadTranslator(locale: SupportedLocale): Promise<Translator> {
  return createTranslator(await loadMessageCatalog(locale));
}
