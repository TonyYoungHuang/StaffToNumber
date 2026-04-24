"use client";

import { useRouter } from "next/navigation";
import { type SupportedLocale } from "@score/shared";
import { useSiteLocale } from "./SiteLocaleProvider";

const locales: SupportedLocale[] = ["en", "zh-CN"];

export function SiteLocaleSwitcher() {
  const router = useRouter();
  const { locale, setLocale } = useSiteLocale();

  return (
    <div className="locale-switcher" role="group" aria-label="Language switcher">
      {locales.map((item) => {
        const isActive = item === locale;
        return (
          <button
            key={item}
            type="button"
            className={`locale-switcher-button${isActive ? " is-active" : ""}`}
            onClick={() => {
              if (item === locale) {
                return;
              }

              setLocale(item);
              router.refresh();
            }}
          >
            {item === "zh-CN" ? "简体中文" : "EN"}
          </button>
        );
      })}
    </div>
  );
}

