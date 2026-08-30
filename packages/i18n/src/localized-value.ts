import { DEFAULT_LOCALE, getLocaleConfig, type SupportedLocale } from "./locales.ts";

export type LocalizedValue<T> = Readonly<
  Record<typeof DEFAULT_LOCALE, T> & Partial<Record<SupportedLocale, T>>
>;

export function getLocalizedValue<T>(value: LocalizedValue<T>, locale: SupportedLocale): T {
  return value[locale] ?? value[getLocaleConfig(locale).fallbackLocale] ?? value[DEFAULT_LOCALE];
}
