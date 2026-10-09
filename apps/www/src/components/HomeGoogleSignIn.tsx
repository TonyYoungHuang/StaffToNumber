"use client";

import { useEffect, useRef, useState } from "react";
import type { SupportedLocale } from "@score/i18n";
import styles from "../app/home-page.module.css";

// Render the official Google button on the already-authorized editor origin.
// Only this exact frame may return a credential; it never travels in a URL.
export function HomeGoogleSignIn({ appUrl, locale, disabled, label, loadingLabel, errorLabel, onCredential, onError }: {
  appUrl: string; locale: SupportedLocale; disabled: boolean; label: string; loadingLabel: string; errorLabel: string;
  onCredential: (credential: string) => void; onError: (message: string) => void;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const frame = useRef<HTMLIFrameElement>(null);
  const callback = useRef(onCredential); callback.current = onCredential;
  const error = useRef(onError); error.current = onError;
  const blocked = useRef(disabled); blocked.current = disabled;
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!clientId) return;
    const url = new URL("/api/auth/google-button", appUrl);
    url.searchParams.set("parent", window.location.origin);
    url.searchParams.set("locale", locale);
    setReady(false); setFailed(false); setSrc(url.toString());
    const fail = () => { setFailed(true); error.current(errorLabel); };
    const timer = window.setTimeout(fail, 20000);
    const receive = (event: MessageEvent) => {
      if (event.origin !== url.origin || event.source !== frame.current?.contentWindow || event.data?.channel !== "score-google-signin") return;
      if (event.data.type === "ready") { window.clearTimeout(timer); setReady(true); setFailed(false); }
      else if (event.data.type === "error") { window.clearTimeout(timer); fail(); }
      else if (event.data.type === "credential" && !blocked.current && typeof event.data.credential === "string" && event.data.credential.length <= 16384) callback.current(event.data.credential);
    };
    window.addEventListener("message", receive);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", receive); };
  }, [clientId, appUrl, locale, errorLabel]);
  if (!clientId) return null;
  return <section className={styles.googleAuth} aria-label={label}>
    <strong>{label}</strong>
    {!ready && !failed ? <span role="status">{loadingLabel}</span> : null}
    {failed ? <span role="alert">{errorLabel}</span> : null}
    {!failed ? <div className={styles.googleButton} inert={disabled} aria-busy={disabled || !ready}>
      {src ? <iframe ref={frame} src={src} title={label} allow="identity-credentials-get" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" style={{ display: "block", width: "100%", minWidth: 220, height: 46, border: 0 }} onError={() => { setFailed(true); onError(errorLabel); }} /> : null}
    </div> : null}
  </section>;
}
