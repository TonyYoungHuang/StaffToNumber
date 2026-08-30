"use client";

import { useId, type ChangeEvent } from "react";
import { LOCALE_CONFIGS, type SupportedLocale } from "@score/i18n";
import { getPublicLocaleSwitchHref } from "../lib/locale-routing";
import { useSiteLocale } from "./SiteLocaleProvider";

export function SiteLocaleSwitcher({ label }: { label: string }) {
  const selectId = useId();
  const { locale, setLocale } = useSiteLocale();

  async function switchLocale(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.currentTarget.value as SupportedLocale;
    if (nextLocale === locale) return;

    const nextHref = getPublicLocaleSwitchHref(window.location, nextLocale);
    setLocale(nextLocale);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
    } finally {
      // Cloudflare strips URL fragments from HTTP redirect Location headers, so
      // navigate directly after the cookie handoff to preserve in-page state.
      window.location.assign(nextHref);
    }
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

