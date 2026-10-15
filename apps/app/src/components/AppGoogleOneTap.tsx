"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { getGoogleLocale, isGoogleAutoSignInAllowed, rememberGoogleAccount } from "@score/shared";
import { getSessionStatus, getServerSessionStatus, restoreSessionFromCookie, subscribeAuthChanges } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";
import { apiRequest } from "../lib/api";

type IntermediateWindow = Window & { google?: { accounts: { id: { initializeIntermediate(options: { src: string; done(): void }): void } } } };

export function AppGoogleOneTap({ paused }: { paused: boolean }) {
  const pathname = usePathname();
  const { locale } = useAppLocale();
  const session = useSyncExternalStore(subscribeAuthChanges, getSessionStatus, getServerSessionStatus);
  const attempted = useRef("");
  useEffect(() => {
    if (paused || session !== "signed-out" || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !isGoogleAutoSignInAllowed(window.location.pathname + window.location.search + window.location.hash)) return;
    const src = new URL("/api/auth/google-one-tap", window.location.origin);
    src.searchParams.set("parent", window.location.origin);
    src.searchParams.set("locale", locale);
    const key = src.toString();
    if (attempted.current === key) return;
    let active = true;
    const initialize = () => {
      const id = (window as IntermediateWindow).google?.accounts.id;
      if (!active || !id?.initializeIntermediate || attempted.current === key) return;
      attempted.current = key;
      id.initializeIntermediate({ src: key, done: () => {
        if (!active || !isGoogleAutoSignInAllowed(window.location.pathname + window.location.search + window.location.hash)) return;
        void restoreSessionFromCookie().then(async status => {
          if (status !== "signed-in") return;
          const result = await apiRequest<{ user: { email: string } }>("/api/auth/me");
          if (result.ok) rememberGoogleAccount(result.data.user.email);
        });
      } });
    };
    let script = document.querySelector<HTMLScriptElement>(`script[data-google-app-intermediate="${locale}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = `https://accounts.google.com/gsi/intermediate?hl=${encodeURIComponent(getGoogleLocale(locale).hl)}`;
      script.async = true;
      script.dataset.googleAppIntermediate = locale;
      document.head.append(script);
    }
    script.addEventListener("load", initialize);
    initialize();
    return () => {
      active = false;
      script?.removeEventListener("load", initialize);
      document.querySelectorAll<HTMLIFrameElement>("iframe").forEach(frame => {
        try {
          const frameUrl = new URL(frame.src);
          if (frameUrl.origin === src.origin && frameUrl.pathname === src.pathname && frameUrl.searchParams.get("parent") === src.searchParams.get("parent")) frame.contentWindow?.postMessage({ channel: "score-one-tap", type: "close" }, src.origin);
        } catch { /* Ignore unrelated frames. */ }
      });
    };
  }, [paused, session, locale, pathname]);
  return null;
}
