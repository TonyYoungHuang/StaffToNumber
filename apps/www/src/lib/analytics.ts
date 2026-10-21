"use client";

import { purchaseAnalyticsStorage, confirmedPurchaseEvent, queueConfirmedPurchase, flushConfirmedPurchases, type ConfirmedPurchaseOrder, type PaymentVerification } from "@score/shared";

export const analyticsConsentKey = "scoretransposer_analytics_consent";
export const analyticsReadyEvent = "scoretransposer:analytics-ready";

export type AnalyticsEventParameters = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function readAnalyticsConsent() {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${analyticsConsentKey}=`));
  const value = cookie?.slice(analyticsConsentKey.length + 1);
  return value === "granted" || value === "denied" ? value : null;
}

export function writeAnalyticsConsent(value: "granted" | "denied") {
  if (typeof document === "undefined") return;
  const configuredDomain = process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN?.trim();
  const normalizedDomain = configuredDomain?.replace(/^\./u, "").toLowerCase();
  const domainAttribute = normalizedDomain && window.location.hostname.toLowerCase().endsWith(normalizedDomain)
    ? `; Domain=.${normalizedDomain}`
    : "";
  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${analyticsConsentKey}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${domainAttribute}${secureAttribute}`;
  window.localStorage.setItem(analyticsConsentKey, value);
}

export function trackFunnelEvent(name: string, parameters: AnalyticsEventParameters = {}) {
  if (typeof window === "undefined") return false;
  // Hosted payment return locators must never reach analytics providers.
  if (/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?checkout(?:\/|$)/iu.test(window.location.pathname)) return false;
  if (!window.gtag) {
    window.addEventListener(analyticsReadyEvent, () => trackFunnelEvent(name, parameters), { once: true });
    return false;
  }
  window.gtag("event", name, parameters);
  window.clarity?.("event", name);
  return true;
}

export function trackFunnelEventOnce(key: string, name: string, parameters: AnalyticsEventParameters = {}) {
  if (typeof window === "undefined") return false;
  if (!window.gtag) {
    window.addEventListener(analyticsReadyEvent, () => trackFunnelEventOnce(key, name, parameters), { once: true });
    return false;
  }
  const storageKey = `scoretransposer_funnel_${key}`;
  try {
    if (window.localStorage.getItem(storageKey) === "sent") return false;
    if (!trackFunnelEvent(name, parameters)) return false;
    window.localStorage.setItem(storageKey, "sent");
    return true;
  } catch {
    return trackFunnelEvent(name, parameters);
  }
}

export function trackConfirmedPurchase(order: ConfirmedPurchaseOrder, verification: PaymentVerification | null) {
  const event = confirmedPurchaseEvent(order, verification);
  if (!event || typeof window === "undefined") return false;
  try { queueConfirmedPurchase(confirmedStorage(), event); } catch { return false; }
  flushPurchaseAnalytics();
  return true;
}

export function flushPurchaseAnalytics() {
  if (typeof window === "undefined" || !window.gtag || readAnalyticsConsent() !== "granted") return;
  try { flushConfirmedPurchases(confirmedStorage(), event => trackFunnelEvent("purchase", event)); } catch { /* Retry on the next analytics-ready page. */ }
}

function confirmedStorage() {
  return purchaseAnalyticsStorage(window.localStorage, document, window.location.hostname.toLowerCase(), window.location.protocol === "https:", process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN || "scoretransposer.com");
}
