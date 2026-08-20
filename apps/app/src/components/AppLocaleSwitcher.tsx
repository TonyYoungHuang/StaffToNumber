"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { type SupportedLocale } from "@score/shared";
import { useAppLocale } from "./AppLocaleProvider";

const locales: SupportedLocale[] = ["en", "zh-CN"];

export function AppLocaleSwitcher() {
  const router = useRouter();
  const { locale, setLocale } = useAppLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`locale-switcher${isPending ? " is-pending" : ""}`} role="group" aria-label="Language switcher" aria-busy={isPending}>
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
              startTransition(async () => {
                try {
                  const response = await fetch("/api/locale", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ locale: item }),
                  });
                  if (!response.ok) {
                    setLocale(locale);
                    return;
                  }
                  router.refresh();
                } catch {
                  setLocale(locale);
                }
              });
            }}
            aria-pressed={isActive}
          >
            {item === "zh-CN" ? "简体中文" : "EN"}
          </button>
        );
      })}
    </div>
  );
}

