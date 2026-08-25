"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { type SupportedLocale } from "@score/shared";
import { localizePublicPath } from "../lib/locale-routing";
import { useSiteLocale } from "./SiteLocaleProvider";

const locales: SupportedLocale[] = ["en", "zh-CN"];

export function SiteLocaleSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useSiteLocale();
  const query = searchParams.toString();

  return (
    <nav className="locale-switcher" aria-label={locale === "zh-CN" ? "语言切换" : "Language switcher"}>
      {locales.map((item) => {
        const isActive = item === locale;
        return (
          <a
            key={item}
            href={`${localizePublicPath(pathname, item)}${query ? `?${query}` : ""}`}
            hrefLang={item}
            lang={item}
            className={`locale-switcher-button${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {item === "zh-CN" ? "简体中文" : "EN"}
          </a>
        );
      })}
    </nav>
  );
}

