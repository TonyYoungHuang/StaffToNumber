"use client";

import { useId, type ChangeEvent } from "react";
import { LOCALE_CONFIGS, type SupportedLocale } from "@score/i18n";
import { useSiteLocale } from "./SiteLocaleProvider";

export function SiteLocaleSwitcher({ label }: { label: string }) {
  const selectId = useId();
  const { locale, setLocale } = useSiteLocale();

  function switchLocale(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.currentTarget.value as SupportedLocale;
    if (nextLocale === locale) return;

    setLocale(nextLocale);
    const handoffUrl = new URL("/api/locale", window.location.origin);
    handoffUrl.searchParams.set("locale", nextLocale);
    handoffUrl.searchParams.set("next", `${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.location.assign(`${handoffUrl.pathname}${handoffUrl.search}`);
  }

  return (
    <label className="locale-switcher" htmlFor={selectId}>
      <span className="sr-only">{label}</span>
      <select
        id={selectId}
        className="locale-switcher-select"
        aria-label={label}
        value={locale}
        onChange={switchLocale}
      >
        {LOCALE_CONFIGS.map((config) => (
          <option key={config.code} value={config.code} lang={config.htmlLang}>
            {config.label}
          </option>
        ))}
      </select>
      <span className="locale-switcher-caret" aria-hidden="true">⌄</span>
    </label>
  );
}

