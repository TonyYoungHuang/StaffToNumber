"use client";

import { suppressGoogleAutoSignIn } from "@score/shared";

const AUTH_TOKEN_KEY = "score-auth-token";
const AUTH_STATE_EVENT = "score-auth-state-changed";
const LOGIN_METHOD_KEY = "score-login-method";
export type SessionStatus = "checking" | "signed-in" | "signed-out";
let sessionStatus: SessionStatus = "checking";
let sessionRevision = 0;
let restoreRequest: Promise<SessionStatus> | undefined;

function notifyAuthChanges() { window.dispatchEvent(new Event(AUTH_STATE_EVENT)); }

export function getSessionStatus(): SessionStatus { return sessionStatus; }
export function getServerSessionStatus(): SessionStatus { return "checking"; }

export function markSessionChecking() {
  sessionStatus = "checking";
  notifyAuthChanges();
}

// Cookie restoration is shared by bootstrap, popup completion and One Tap.
// A stale request must never overwrite a login/logout that happened meanwhile.
export function restoreSessionFromCookie(): Promise<SessionStatus> {
  if (restoreRequest) return restoreRequest;
  const originalToken = getStoredToken();
  const originalRevision = sessionRevision;
  markSessionChecking();
  restoreRequest = (async () => {
    try {
      const response = await fetch("/api/session", {
        credentials: "same-origin", cache: "no-store", headers: { "x-score-session": "bootstrap" },
        signal: AbortSignal.timeout(6000),
      });
      if (sessionRevision !== originalRevision || getStoredToken() !== originalToken) return sessionStatus;
      if (response.status === 401) clearStoredToken();
      else if (response.status === 204) {
        // A local bearer session can predate the shared cookie.
        sessionStatus = originalToken ? "signed-in" : "signed-out";
        notifyAuthChanges();
      } else if (response.status === 200) {
        const payload = await response.json();
        if (sessionRevision === originalRevision && getStoredToken() === originalToken && typeof payload.token === "string") setStoredToken(payload.token);
      } else if (originalToken) {
        sessionStatus = "signed-in";
        notifyAuthChanges();
      }
    } catch {
      if (sessionRevision === originalRevision && getStoredToken() === originalToken && originalToken) {
        sessionStatus = "signed-in";
        notifyAuthChanges();
      }
    }
    return sessionStatus;
  })().finally(() => { restoreRequest = undefined; });
  return restoreRequest;
}

export function setPreferredLoginMethod(method: "email" | "google" | "activation-code") {
  // Remember the method for the account; main-site sign-in always uses /login.
  window.localStorage.setItem(LOGIN_METHOD_KEY, method === "google" ? "google" : method);
}

export function preferredLoginPath(next?: string) {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  return `/login${params.size ? `?${params}` : ""}`;
}

export function subscribeAuthChanges(onChange: () => void) {
  const browserWindow = window;
  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea === window.localStorage && (event.key === AUTH_TOKEN_KEY || event.key === null)) {
      sessionStatus = getStoredToken() ? "signed-in" : "signed-out";
      sessionRevision++;
      onChange();
    }
  };
  browserWindow.addEventListener(AUTH_STATE_EVENT, onChange);
  browserWindow.addEventListener("storage", handleStorage);
  return () => {
    browserWindow.removeEventListener(AUTH_STATE_EVENT, onChange);
    browserWindow.removeEventListener("storage", handleStorage);
  };
}

export function getServerAuthToken() { return null; }

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  sessionRevision++;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStatus = "signed-in";
  notifyAuthChanges();
}

export function clearStoredToken() {
  sessionRevision++;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStatus = "signed-out";
  notifyAuthChanges();
}

export function logoutLocally() {
  suppressGoogleAutoSignIn();
  clearStoredToken();
}
