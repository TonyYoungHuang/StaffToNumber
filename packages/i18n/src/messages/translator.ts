import { formatMessage, type MessageVariables } from "../formatters.ts";
import { enMessages } from "./en.ts";
import type {
  MessageCatalog,
  MessageKey,
  PartialMessageCatalog,
  TranslationArguments,
  Translator,
} from "./types.ts";

export function translateMessage<K extends MessageKey>(
  catalog: PartialMessageCatalog,
  key: K,
  ...args: TranslationArguments<K>
): string {
  const template = catalog[key] ?? enMessages[key];
  return formatMessage(template, (args[0] ?? {}) as MessageVariables);
}

export const translate = translateMessage;

export function createTranslator(
  catalog: PartialMessageCatalog,
  fallbackCatalog: MessageCatalog = enMessages,
): Translator {
  return (<K extends MessageKey>(key: K, ...args: TranslationArguments<K>) => {
    const template = catalog[key] ?? fallbackCatalog[key];
    return formatMessage(template, (args[0] ?? {}) as MessageVariables);
  }) as Translator;
}
