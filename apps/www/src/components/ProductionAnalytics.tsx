"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AnalyticsConsentMessages } from "@score/i18n";
import {
  analyticsConsentKey,
  analyticsReadyEvent,
  readAnalyticsConsent,
  trackFunnelEvent,
  writeAnalyticsConsent,
} from "../lib/analytics";
import { useSiteLocale } from "./SiteLocaleProvider";
import { localizePublicHref, stripPublicLocalePrefix } from "../lib/locale-routing";

const seoLandingPaths = new Set([
  "/staff-to-jianpu",
  "/jianpu-to-staff",
  "/transpose-score",
  "/score-editor",
  "/score-to-audio",
  "/musicxml-midi",
  "/pdf-score-scanner",
  "/pdf-to-musicxml",
  "/how-to-read-sheet-music",
  "/numbered-notation-converter",
  "/pricing",
]);

function AnalyticsScripts({ gaId, clarityId }: { gaId?: string; clarityId?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const sendPageEvents = () => {
      trackFunnelEvent("page_view", {
        page_location: window.location.href,
        page_path: pathname,
        page_title: document.title,
        page_hostname: window.location.hostname,
        site_area: "public_site",
      });
      if (seoLandingPaths.has(stripPublicLocalePrefix(pathname))) {
        trackFunnelEvent("seo_landing_view", {
          landing_path: pathname,
          page_location: window.location.href,
          page_title: document.title,
        });
      }
    };

    if (window.gtag) sendPageEvents();
    else window.addEventListener(analyticsReadyEvent, sendPageEvents, { once: true });
    return () => window.removeEventListener(analyticsReadyEvent, sendPageEvents);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a.public-button");
      if (!link) return;
      const destination = link.href;
      const label = link.textContent?.trim() || "unlabeled_cta";
      trackFunnelEvent("product_cta_click", {
        link_text: label,
        link_url: destination,
        page_path: window.location.pathname,
      });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <>
      {gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
          <Script id="scoretransposer-ga4" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied'
            });
            gtag('consent', 'update', { analytics_storage: 'granted' });
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              send_page_view: false,
              anonymize_ip: true,
              cookie_domain: 'scoretransposer.com'
            });
            window.dispatchEvent(new Event('${analyticsReadyEvent}'));
          `}</Script>
        </>
      ) : null}
      {clarityId ? <Script id="scoretransposer-clarity" strategy="afterInteractive">{`
        (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, 'clarity', 'script', '${clarityId}');
      `}</Script> : null}
    </>
  );
}

export function ProductionAnalytics({ copy }: { copy: AnalyticsConsentMessages }) {
  const { locale } = useSiteLocale();
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const configuredGaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
  const configuredClarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
  const gaId = configuredGaId && /^G-[A-Z0-9]+$/u.test(configuredGaId) ? configuredGaId : undefined;
  const clarityId = configuredClarityId && /^[a-z0-9]+$/u.test(configuredClarityId) ? configuredClarityId : undefined;

  useEffect(() => {
    const cookieConsent = readAnalyticsConsent();
    const stored = window.localStorage.getItem(analyticsConsentKey);
    const resolved = cookieConsent ?? (stored === "granted" || stored === "denied" ? stored : null);
    if (resolved && !cookieConsent) writeAnalyticsConsent(resolved);
    setConsent(resolved);
  }, []);

  if (!analyticsEnabled || (!gaId && !clarityId)) return null;
  if (consent === "granted") return <AnalyticsScripts gaId={gaId} clarityId={clarityId} />;
  if (consent === "denied") return null;

  const choose = (value: "granted" | "denied") => {
    writeAnalyticsConsent(value);
    setConsent(value);
  };

  return (
    <aside className="analytics-consent" aria-label={copy.ariaLabel}>
      <p>
        {copy.body}{" "}
        <Link href={localizePublicHref("/privacy", locale)}>{copy.privacy}</Link>
      </p>
      <div className="button-row">
        <button type="button" className="public-button primary" onClick={() => choose("granted")}>{copy.accept}</button>
        <button type="button" className="public-button tertiary" onClick={() => choose("denied")}>{copy.decline}</button>
      </div>
    </aside>
  );
}
