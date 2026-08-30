import type { MessageVariableValue, MessageVariables } from "../formatters.ts";
import type { enMessages } from "./en.ts";

export type MessageKey = keyof typeof enMessages;

export type MessageCatalog = Readonly<Record<MessageKey, string>>;

export type PartialMessageCatalog = Readonly<Partial<Record<MessageKey, string>>>;

export type FoundationMessages = MessageCatalog;

export type PlaceholderNames<Template extends string> =
  Template extends `${string}{${infer Name}}${infer Rest}`
    ? Name | PlaceholderNames<Rest>
    : never;

export type MessagePlaceholder<K extends MessageKey> = PlaceholderNames<(typeof enMessages)[K]>;

export type MessageInterpolation<K extends MessageKey> =
  [MessagePlaceholder<K>] extends [never]
    ? MessageVariables
    : Readonly<Record<MessagePlaceholder<K>, MessageVariableValue>>;

export type TranslationArguments<K extends MessageKey> =
  [MessagePlaceholder<K>] extends [never]
    ? [variables?: MessageInterpolation<K>]
    : [variables: MessageInterpolation<K>];

export type Translator = <K extends MessageKey>(key: K, ...args: TranslationArguments<K>) => string;
