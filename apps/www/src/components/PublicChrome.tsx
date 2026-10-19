"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocalizedValue } from "@score/i18n";
import { getGoogleAuthCopy } from "@score/shared";
import {
  ArrowNorthEastIcon,
  SiteShellFooter,
  SiteShellHeader,
  sonataCopy,
  type SiteShellAction,
  type SiteShellNavItem,
} from "@score/ui";
import type { PublicAnnouncement } from "../lib/public-content";
import { localizePublicHref, localizePublicPath } from "../lib/locale-routing";
import type { SiteShellCopy } from "../lib/site-shell-localization";
import { getAppLoginUrl, getAppScoreProjectsUrl, getAppStartConversionUrl, getCheckoutUrl, siteConfig } from "../lib/site";
import { usePurchaseFlow } from "./PurchaseFlowProvider";
import { SiteLocaleSwitcher } from "./SiteLocaleSwitcher";
import { useSiteLocale } from "./SiteLocaleProvider";
import { isPublicPricingDestination, withPurchaseOrigin } from "../lib/checkout-return";

type NavigatorWithPerformanceSignals = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

export function PublicChrome({
  children,
  announcement,
  copy,
}: {
  children: ReactNode;
  announcement: PublicAnnouncement | null;
  copy: SiteShellCopy;
}) {
  const pathname = usePathname();
  const { locale } = useSiteLocale();
  const purchaseFlow = usePurchaseFlow();
  const googleCopy = getGoogleAuthCopy(locale);
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const appUrl = localizePublicHref(getAppStartConversionUrl(locale), locale);
  const homepageScanUrl = localizePublicHref("/#home-workbench", locale);
  const loginUrl = /工作台|工作臺/u.test(copy.login) ? getAppScoreProjectsUrl(locale) : getAppLoginUrl(undefined, locale);
  const checkoutUrl = getCheckoutUrl(locale);
  const homeSections = {
    workflow: localizePublicHref("/#workflow", locale),
    useCases: localizePublicHref("/#cases", locale),
    pricing: localizePublicHref("/#pricing", locale),
  } as const;
  const primaryActionLabel = siteConfig.release.productAppAvailable ? copy.editForFree : copy.launchStatus;

  useEffect(() => {
    const carryOrigin = () => {
      for (const link of document.querySelectorAll<HTMLAnchorElement>(".public-frame a[href]")) {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin || !isPublicPricingDestination(url.pathname, url.hash)) continue;
        const href = withPurchaseOrigin(`${url.pathname}${url.search}${url.hash}`, window.location);
        if (link.getAttribute("href") !== href) link.setAttribute("href", href);
      }
    };
    carryOrigin();
    const observer = new MutationObserver(carryOrigin);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    window.addEventListener("hashchange", carryOrigin);
    window.addEventListener("popstate", carryOrigin);
    return () => { observer.disconnect(); window.removeEventListener("hashchange", carryOrigin); window.removeEventListener("popstate", carryOrigin); };
  }, [pathname]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      const navigatorSignals = navigator as NavigatorWithPerformanceSignals;
      const reduced = Boolean(
        reducedMotion.matches
        || navigatorSignals.connection?.saveData
        || (navigatorSignals.deviceMemory !== undefined && navigatorSignals.deviceMemory <= 2)
        || navigator.hardwareConcurrency <= 2,
      );
      document.documentElement.dataset.visualEffects = reduced ? "reduced" : "full";
    };
    updatePreference();
    reducedMotion.addEventListener("change", updatePreference);
    return () => reducedMotion.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!announcement) {
      setAnnouncementVisible(false);
      return;
    }
    try {
      setAnnouncementVisible(localStorage.getItem(`scoretransposer:announcement:${announcement.id}`) !== "dismissed");
    } catch {
      setAnnouncementVisible(true);
    }
  }, [announcement]);

  function dismissAnnouncement() {
    if (!announcement) return;
    try {
      localStorage.setItem(`scoretransposer:announcement:${announcement.id}`, "dismissed");
    } catch {
      // The bar can still be dismissed for the current page when storage is unavailable.
    }
    setAnnouncementVisible(false);
  }

  const navItems: SiteShellNavItem[] = [
    { href: localizePublicHref("/sheet-music-scanner", locale), label: copy.scanner },
    { href: localizePublicHref("/features", locale), label: copy.features },
    { href: localizePublicHref("/library", locale), label: copy.library },
    { href: homeSections.pricing, label: copy.pricing },
    { label: copy.help, children: [{ href: localizePublicHref("/how-to-read-sheet-music", locale), label: copy.guide }, { href: localizePublicHref("/numbered-notation-converter", locale), label: copy.numberedNotation }, { href: localizePublicHref("/support", locale), label: copy.contact }] },
    ...(siteConfig.release.teachingAvailable ? [{ href: localizePublicHref("/teaching", locale), label: copy.education }] : []),
    ...(siteConfig.discordInviteUrl ? [{ href: siteConfig.discordInviteUrl, label: copy.discord, external: true }] : []),
    { href: purchaseFlow.user ? getAppScoreProjectsUrl(locale) : loginUrl, label: purchaseFlow.user?.email.split("@")[0] ?? copy.login },
  ];
  const actions: SiteShellAction[] = [
    ...(siteConfig.discordInviteUrl ? [{ href: siteConfig.discordInviteUrl, label: copy.discord, external: true, desktopOnly: true }] : []),
    { href: purchaseFlow.user ? getAppScoreProjectsUrl(locale) : loginUrl, label: purchaseFlow.user?.email.split("@")[0] ?? copy.login, tone: "secondary", desktopOnly: true,
      onClick: purchaseFlow.user ? undefined : event => { event.preventDefault(); purchaseFlow.signIn("login", { destination: loginUrl }); } },
    ...(siteConfig.release.checkoutAvailable ? [{ href: homeSections.pricing, label: copy.pricing, tone: "tertiary" as const }] : []),
    {
      href: homepageScanUrl,
      label: primaryActionLabel,
      tone: "primary",
      icon: <ArrowNorthEastIcon width={16} height={16} />,
      onClick: pathname === localizePublicPath("/", locale) ? (event) => {
        event.preventDefault();
        window.dispatchEvent(new Event("scoretransposer:start-free-scan"));
      } : undefined,
    },
  ];
  const footerLinks = [
    { href: homeSections.workflow, label: copy.workflow },
    { href: homeSections.useCases, label: copy.useCases },
    { href: homeSections.pricing, label: copy.pricing },
    { href: localizePublicHref("/features", locale), label: copy.features },
    { href: localizePublicHref("/library", locale), label: copy.library },
    { href: localizePublicHref("/faq", locale), label: copy.faq },
    { href: localizePublicHref("/how-to-read-sheet-music", locale), label: copy.guide },
    { href: localizePublicHref("/numbered-notation-converter", locale), label: copy.numberedNotation },
    { href: localizePublicHref("/about", locale), label: copy.about },
    { href: localizePublicHref("/support", locale), label: copy.support },
    { href: localizePublicHref("/privacy", locale), label: copy.privacy },
    { href: localizePublicHref("/terms", locale), label: copy.terms },
    { href: localizePublicHref("/copyright-complaint", locale), label: copy.copyright },
    ...(siteConfig.release.checkoutAvailable ? [{ href: checkoutUrl, label: copy.upgrade }] : []),
    { href: appUrl, label: primaryActionLabel },
  ];
  const announcementCopy = announcement ? getLocalizedValue(announcement.copy, locale) : undefined;

  return (
    <div className="public-frame" onClickCapture={event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link) return;
      if (link.target === "_blank") return;
      const target = new URL(link.href, window.location.href);
      // Next Link uses its React href when navigating. Intercept ordinary
      // pricing navigation as well as publishing the real href for new tabs.
      if (target.origin === window.location.origin && isPublicPricingDestination(target.pathname, target.hash)
        && !link.closest("[data-plan]") && !link.hasAttribute("data-pricing-pass")) {
        event.preventDefault(); event.stopPropagation();
        window.location.assign(withPurchaseOrigin(`${target.pathname}${target.search}${target.hash}`, window.location));
        return;
      }
      if (purchaseFlow.user) return;
      if (target.origin !== new URL(siteConfig.appUrl).origin) return;
      const path = target.pathname === "/api/locale" ? target.searchParams.get("next") || "" : target.pathname;
      const registration = /^\/register(?:[?#]|$)/u.test(path);
      const authentication = registration || /^\/login(?:[?#]|$)/u.test(path);
      const workspace = /^\/(?:scores|dashboard|jobs|classrooms|student|billing|activate)(?:[/?#]|$)/u.test(path);
      if (!authentication && !workspace) return;
      event.preventDefault(); event.stopPropagation(); purchaseFlow.signIn(registration ? "register" : "login", { destination: target.toString() });
    }}>
      {announcement && announcementCopy && announcementVisible ? (
        <aside className="public-announcement" role="status" aria-label={copy.eventAnnouncement}>
          <div className="public-container public-announcement-inner">
            <span className="public-announcement-label">{copy.liveEvent}</span>
            <p>{announcementCopy.label}</p>
            <a href={localizePublicHref(announcement.href, locale)}>{announcementCopy.action}<ArrowNorthEastIcon width={14} height={14} /></a>
            <button type="button" onClick={dismissAnnouncement} aria-label={copy.dismissAnnouncement}>×</button>
          </div>
        </aside>
      ) : null}
      <SiteShellHeader
        brandHref={localizePublicPath("/", locale)}
        brandLabel={copy.brandLabel}
        brandCaption={copy.brandCaption}
        navItems={navItems}
        actions={actions}
        localeControl={<SiteLocaleSwitcher label={copy.languageSwitcher} />}
        navLabel={copy.primaryNavigation}
        openMenuLabel={copy.openMenu}
        closeMenuLabel={copy.closeMenu}
        linkComponent={Link}
      />
      <main className="public-main">{children}</main>
      {purchaseFlow.session === "signed-out" ? <div className="public-container"><button type="button" className="public-email-signin" onClick={purchaseFlow.emailSignIn}>{googleCopy.emailSignIn}</button></div> : null}
      <SiteShellFooter
        title={sonataCopy.productTitle}
        description={copy.footerCopy}
        links={footerLinks}
        localeControl={<SiteLocaleSwitcher label={copy.languageSwitcher} />}
        linkComponent={Link}
      />
    </div>
  );
}
