import { formatNumber, type SupportedLocale } from "@score/i18n";

export function rawPlaybackErrorOrFallback(error: string | null | undefined, fallback: string) {
  return error?.trim() ? error : fallback;
}

export function formatPlaybackNumber(
  value: number,
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions,
) {
  return formatNumber(value, locale, options);
}

export function formatPlaybackPercent(value: number, locale: SupportedLocale) {
  return formatNumber(value, locale, { style: "percent", maximumFractionDigits: 0 });
}

export function formatPlaybackDuration(totalSeconds: number, locale: SupportedLocale) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${formatNumber(minutes, locale, { useGrouping: false })}:${formatNumber(remainder, locale, {
    minimumIntegerDigits: 2,
    maximumFractionDigits: 0,
    useGrouping: false,
  })}`;
}

export function formatSignedPlaybackNumber(value: number, locale: SupportedLocale) {
  return formatNumber(value, locale, { maximumFractionDigits: 0, signDisplay: "always" });
}
