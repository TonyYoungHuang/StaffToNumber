"use client";

const AUTH_TOKEN_KEY = "score-auth-token";
const AUTH_STATE_EVENT = "score-auth-state-changed";
const LOGIN_METHOD_KEY = "score-login-method";

export function setPreferredLoginMethod(method: "email" | "google" | "activation-code") {
  // Google and email both land on /login; activation-code keeps the redeem path.
  window.localStorage.setItem(LOGIN_METHOD_KEY, method === "google" ? "google" : method);
}

export function preferredLoginPath(next?: string) {
  const codeLogin = typeof window !== "undefined" && window.localStorage.getItem(LOGIN_METHOD_KEY) === "activation-code";
  const params = new URLSearchParams(codeLogin ? { shop: "1" } : {});
  if (next) params.set("next", next);
  return `${codeLogin ? "/activate" : "/login"}${params.size ? `?${params}` : ""}`;
}

export function subscribeAuthChanges(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea === window.localStorage && (event.key === AUTH_TOKEN_KEY || event.key === null)) onChange();
  };
  window.addEventListener(AUTH_STATE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(AUTH_STATE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
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
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}

export function clearStoredToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}
