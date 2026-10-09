"use client";

import { useEffect, useState, type ReactNode } from "react";
import { clearStoredToken, getStoredToken, setStoredToken } from "../lib/auth-storage";
import { useFlowMessages } from "../lib/flow-messages/client";

export function SessionBootstrap({ children }: { children: ReactNode }) {
  // Anonymous visitors must not wait on /api/session. Only block briefly when a
  // local token already exists and we are confirming or replacing it.
  const [ready, setReady] = useState(false);
  const copy = useFlowMessages();
  useEffect(() => {
    let active = true;
    const originalToken = getStoredToken();
    if (!originalToken) setReady(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (active) setReady(true);
    }, 2500);
    void fetch("/api/session", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { "x-score-session": "bootstrap" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!active || getStoredToken() !== originalToken) return;
        if (response.status === 401) {
          clearStoredToken();
          return;
        }
        if (response.status !== 200) return;
        const payload = await response.json();
        if (active && getStoredToken() === originalToken && typeof payload.token === "string") {
          setStoredToken(payload.token);
        }
      })
      .catch(() => {
        /* An existing local session can still be used on a transient network error. */
      })
      .finally(() => {
        if (active) {
          window.clearTimeout(timeout);
          setReady(true);
        }
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);
  return ready ? children : (
    <main className="container app-main" role="status" aria-busy="true">{copy.waitingAccess}</main>
  );
}
