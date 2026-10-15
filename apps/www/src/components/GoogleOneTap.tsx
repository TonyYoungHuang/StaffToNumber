"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { SupportedLocale } from "@score/i18n";
import { getGoogleLocale, isGoogleAutoSignInAllowed, isInAppBrowser } from "@score/shared";
import { siteConfig } from "../lib/site";

type IntermediateWindow = Window & {
  google?: { accounts: { id: { initializeIntermediate: (options: { src: string; done: () => void }) => void } } };
};

// Google owns the account prompt. A returning account never leaves this page;
// the authorized editor origin consumes the credential and sets the session.
export function GoogleOneTap({ enabled, locale, onDone }: {
  enabled: boolean; locale: SupportedLocale; onDone: () => void;
}) {
  const pathname = usePathname();
  const attempted = useRef(false);
  const attemptedLocale = useRef(locale);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (attemptedLocale.current !== locale) { attempted.current = false; attemptedLocale.current = locale; }
    if (!enabled || attempted.current || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      || !isGoogleAutoSignInAllowed(`${window.location.pathname}${window.location.search}${window.location.hash}`)
      || isInAppBrowser(navigator.userAgent)) return;
    let active = true;
    const src = new URL("/api/auth/google-one-tap", siteConfig.appUrl);
    src.searchParams.set("parent", window.location.origin);
    src.searchParams.set("locale", locale);
    const initialize = () => {
      const api = (window as IntermediateWindow).google?.accounts.id;
      if (!active || !api?.initializeIntermediate || attempted.current) return;
      attempted.current = true;
      api.initializeIntermediate({ src: src.toString(), done: () => done.current() });
    };
    let script = document.querySelector<HTMLScriptElement>(`script[data-google-intermediate="${locale}"]`);
    if (!script) {
      document.querySelectorAll('script[data-google-intermediate]').forEach(previous => previous.remove());
      script = document.createElement("script");
      script.src = `https://accounts.google.com/gsi/intermediate?hl=${encodeURIComponent(getGoogleLocale(locale).hl)}`;
      script.async = true;
      script.dataset.googleIntermediate = locale;
      document.head.append(script);
    }
    script.addEventListener("load", initialize);
    initialize();
    return () => {
      active = false;
      script?.removeEventListener("load", initialize);
      // Close the official prompt when the user opens the regular auth modal.
      document.querySelectorAll<HTMLIFrameElement>("iframe").forEach(frame => {
        if (frame.src === src.toString()) frame.contentWindow?.postMessage({ channel: "score-one-tap", type: "close" }, src.origin);
      });
    };
  }, [enabled, locale, pathname]);
  return null;
}
