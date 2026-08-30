import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  type SupportedLocale,
} from "@score/i18n";

export function rawApiErrorOrFallback(error: string | null | undefined, fallback: string) {
  return error?.trim() ? error : fallback;
}

export function formatBillingDateTime(value: string, locale: SupportedLocale) {
  return formatDateTime(value, locale);
}

export function formatBillingMoney(
  amountMinor: number | null,
  currency: string | null,
  locale: SupportedLocale,
  fallback: string,
) {
  if (amountMinor === null || !currency?.trim()) return fallback;
  const normalizedCurrency = currency.trim().toUpperCase();
  try {
    return formatCurrency(amountMinor / 100, normalizedCurrency, locale);
  } catch {
    return `${normalizedCurrency} ${formatNumber(amountMinor / 100, locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function formatBillingBytes(value: number, locale: SupportedLocale) {
  const units = ["B", "KB", "MB", "GB"] as const;
  let amount = Math.max(0, value);
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${formatNumber(amount, locale, unitIndex === 0 ? { maximumFractionDigits: 0 } : { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}

export function mappedBillingStatus<TStatus extends string>(
  status: string,
  labels: Partial<Record<TStatus, string>>,
) {
  return labels[status as TStatus] ?? status;
}
