"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocalizedValue } from "@score/i18n";
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
import { getAppLoginUrl, getAppStartConversionUrl, getCheckoutUrl, siteConfig } from "../lib/site";
import { SiteLocaleSwitcher } from "./SiteLocaleSwitcher";
import { useSiteLocale } from "./SiteLocaleProvider";

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
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const appUrl = localizePublicHref(getAppStartConversionUrl(locale), locale);
  const homepageScanUrl = localizePublicHref("/#home-workbench", locale);
  const loginUrl = getAppLoginUrl(undefined, locale);
  const checkoutUrl = getCheckoutUrl(locale);
  const homeSections = {
    workflow: localizePublicHref("/#workflow", locale),
    useCases: localizePublicHref("/#cases", locale),
    pricing: localizePublicHref("/#pricing", locale),
  } as const;
  const primaryActionLabel = siteConfig.release.productAppAvailable ? copy.editForFree : copy.launchStatus;

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
    { href: localizePublicHref("/pdf-score-scanner", locale), label: copy.scanner },
    { href: localizePublicHref("/features", locale), label: copy.features },
    { href: localizePublicHref("/library", locale), label: copy.library },
    { href: homeSections.pricing, label: copy.pricing },
    { label: copy.help, children: [{ href: localizePublicHref("/how-to-read-sheet-music", locale), label: copy.guide }, { href: localizePublicHref("/numbered-notation-converter", locale), label: copy.numberedNotation }, { href: localizePublicHref("/support", locale), label: copy.contact }] },
    ...(siteConfig.release.teachingAvailable ? [{ href: localizePublicHref("/teaching", locale), label: copy.education }] : []),
    ...(siteConfig.discordInviteUrl ? [{ href: siteConfig.discordInviteUrl, label: copy.discord, external: true }] : []),
    { href: loginUrl, label: copy.login },
  ];
  const actions: SiteShellAction[] = [
    ...(siteConfig.discordInviteUrl ? [{ href: siteConfig.discordInviteUrl, label: copy.discord, external: true, desktopOnly: true }] : []),
    { href: loginUrl, label: copy.login, tone: "secondary", desktopOnly: true },
    ...(siteConfig.release.checkoutAvailable ? [{ href: checkoutUrl, label: copy.upgrade, tone: "tertiary" as const }] : []),
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
    <div className="public-frame">
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
