"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  analyticsConsentKey,
  analyticsReadyEvent,
  readAnalyticsConsent,
  trackFunnelEvent,
  writeAnalyticsConsent,
} from "../lib/analytics";
import { useAppLocale } from "./AppLocaleProvider";

function AnalyticsScripts({ gaId, clarityId }: { gaId?: string; clarityId?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const sendPageView = () => {
      trackFunnelEvent("page_view", {
        page_location: window.location.href,
        page_path: pathname,
        page_title: document.title,
        page_hostname: window.location.hostname,
        site_area: "product_app",
      });
    };
    if (window.gtag) sendPageView();
    else window.addEventListener(analyticsReadyEvent, sendPageView, { once: true });
    return () => window.removeEventListener(analyticsReadyEvent, sendPageView);
  }, [pathname]);

  return (
    <>
      {gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
          <Script id="scoretransposer-app-ga4" strategy="afterInteractive">{`
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
      {clarityId ? <Script id="scoretransposer-app-clarity" strategy="afterInteractive">{`
        (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, 'clarity', 'script', '${clarityId}');
      `}</Script> : null}
    </>
  );
}

export function ProductAnalytics() {
  const { locale } = useAppLocale();
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const configuredGaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
  const configuredClarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
  const gaId = configuredGaId && /^G-[A-Z0-9]+$/u.test(configuredGaId) ? configuredGaId : undefined;
  const clarityId = configuredClarityId && /^[a-z0-9]+$/u.test(configuredClarityId) ? configuredClarityId : undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://scoretransposer.com";

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
    <aside className="analytics-consent" aria-label={locale === "zh-CN" ? "分析 Cookie 选择" : "Analytics cookie choice"}>
      <p>
        {locale === "zh-CN" ? "我们仅在你同意后使用匿名分析来改进免费识谱与升级流程。" : "We use analytics only after consent to improve the free scan and upgrade flow."}{" "}
        <a href={`${siteUrl.replace(/\/$/u, "")}/privacy`}>{locale === "zh-CN" ? "隐私说明" : "Privacy details"}</a>
      </p>
      <div className="button-row">
        <button type="button" className="button button-primary" onClick={() => choose("granted")}>{locale === "zh-CN" ? "同意" : "Accept"}</button>
        <button type="button" className="button button-tertiary" onClick={() => choose("denied")}>{locale === "zh-CN" ? "拒绝" : "Decline"}</button>
      </div>
    </aside>
  );
}
