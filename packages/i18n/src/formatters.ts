import { getLocaleConfig, type SupportedLocale } from "./locales.ts";

export type DateInput = Date | number | string;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: DateInput,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(getLocaleConfig(locale).dateLocale, options).format(toDate(value));
}

export function formatDateTime(
  value: DateInput,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat(getLocaleConfig(locale).dateLocale, options).format(toDate(value));
}

export function formatNumber(
  value: number | bigint,
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocaleConfig(locale).numberLocale, options).format(value);
}

export function formatCurrency(
  value: number | bigint,
  currency: string,
  locale: SupportedLocale,
  options: Omit<Intl.NumberFormatOptions, "style" | "currency"> = {},
): string {
  return formatNumber(value, locale, { ...options, style: "currency", currency });
}

export type MessageVariableValue = string | number | bigint | boolean | Date | null | undefined;
export type MessageVariables = Readonly<Record<string, MessageVariableValue>>;

export function formatMessage(template: string, variables: MessageVariables = {}): string {
  return template.replace(/\{([a-zA-Z][\w]*)\}/gu, (placeholder, key: string) => (
    Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : placeholder
  ));
}

export function formatPlural(
  locale: SupportedLocale,
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
): string {
  const category = new Intl.PluralRules(getLocaleConfig(locale).numberLocale).select(count);
  return formatMessage(forms[category] ?? forms.other, { count });
}
