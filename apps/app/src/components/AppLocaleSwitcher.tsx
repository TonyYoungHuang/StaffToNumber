"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getLocaleConfig,
  isSupportedLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@score/i18n";
import { useAppLocale } from "./AppLocaleProvider";

export function AppLocaleSwitcher({ label, errorMessage }: { label: string; errorMessage: string }) {
  const router = useRouter();
  const { locale, setLocale } = useAppLocale();
  const [pendingLocale, setPendingLocale] = useState<SupportedLocale | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function selectLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale || isPending) return;

    setPendingLocale(nextLocale);
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: nextLocale }),
        });
        if (!response.ok) {
          setError(errorMessage);
          return;
        }

        setLocale(nextLocale);
        router.refresh();
      } catch {
        setError(errorMessage);
      } finally {
        setPendingLocale(null);
      }
    });
  }

  return (
    <span className="locale-switcher-status">
      <label className={`locale-switcher${isPending ? " is-pending" : ""}`} aria-busy={isPending}>
        <span className="sr-only">{label}</span>
        <select
          className="locale-switcher-select"
          aria-label={label}
          value={pendingLocale ?? locale}
          disabled={isPending}
          onChange={(event) => {
            if (isSupportedLocale(event.target.value)) selectLocale(event.target.value);
          }}
        >
          {SUPPORTED_LOCALES.map((item) => (
            <option key={item} value={item} lang={getLocaleConfig(item).htmlLang}>
              {getLocaleConfig(item).label}
            </option>
          ))}
        </select>
      </label>
      {error ? <span className="locale-switcher-error" role="alert">{error}</span> : null}
    </span>
  );
}
