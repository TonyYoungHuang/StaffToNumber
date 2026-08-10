"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSiteLocale } from "./SiteLocaleProvider";

const consentKey = "scoretransposer_analytics_consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

function AnalyticsScripts({ gaId, clarityId }: { gaId?: string; clarityId?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    window.gtag?.("event", "page_view", { page_path: pathname });
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a.public-button");
      if (!link) return;
      const destination = link.href;
      const label = link.textContent?.trim() || "unlabeled_cta";
      window.gtag?.("event", "product_cta_click", { link_text: label, link_url: destination, page_path: window.location.pathname });
      window.clarity?.("event", "product_cta_click");
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
            gtag('js', new Date());
            gtag('config', '${gaId}', { send_page_view: false, anonymize_ip: true });
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

export function ProductionAnalytics() {
  const { locale } = useSiteLocale();
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const gaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

  useEffect(() => {
    const stored = window.localStorage.getItem(consentKey);
    setConsent(stored === "granted" || stored === "denied" ? stored : null);
  }, []);

  if (!analyticsEnabled || (!gaId && !clarityId)) return null;
  if (consent === "granted") return <AnalyticsScripts gaId={gaId} clarityId={clarityId} />;
  if (consent === "denied") return null;

  const choose = (value: "granted" | "denied") => {
    window.localStorage.setItem(consentKey, value);
    setConsent(value);
  };

  return (
    <aside className="analytics-consent" aria-label={locale === "zh-CN" ? "分析 Cookie 选择" : "Analytics cookie choice"}>
      <p>
        {locale === "zh-CN" ? "我们仅在你同意后使用匿名分析来改进搜索落地和产品流程。" : "We use analytics only after consent to improve search landing pages and product flows."}{" "}
        <Link href="/privacy">{locale === "zh-CN" ? "隐私说明" : "Privacy details"}</Link>
      </p>
      <div className="button-row">
        <button type="button" className="public-button primary" onClick={() => choose("granted")}>{locale === "zh-CN" ? "同意" : "Accept"}</button>
        <button type="button" className="public-button tertiary" onClick={() => choose("denied")}>{locale === "zh-CN" ? "拒绝" : "Decline"}</button>
      </div>
    </aside>
  );
}
