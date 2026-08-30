"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { formatNumber } from "@score/i18n";
import { APP_ROUTES } from "@score/shared";
import {
  ArrowNorthEastIcon,
  SiteShellFooter,
  SiteShellHeader,
  SparkIcon,
  type SiteShellAction,
  type SiteShellNavItem,
} from "@score/ui";
import { apiRequest } from "../lib/api";
import type { AppShellCopy } from "../lib/app-messages";
import { getStoredToken } from "../lib/auth-storage";
import { PUBLIC_SITE_URL } from "../lib/support";
import { AppLocaleSwitcher } from "./AppLocaleSwitcher";
import { useAppLocale } from "./AppLocaleProvider";

export function AppChrome({ children, copy }: { children: ReactNode; copy: AppShellCopy }) {
  const pathname = usePathname();
  const { locale } = useAppLocale();
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const primaryHref = `${APP_ROUTES.scores}#free-scan`;
  const publicSiteUrl = PUBLIC_SITE_URL.replace(/\/$/u, "");
  const publicHref = (path: string) => {
    const handoffUrl = new URL("/api/locale", `${publicSiteUrl}/`);
    handoffUrl.searchParams.set("locale", locale);
    handoffUrl.searchParams.set("next", path);
    return handoffUrl.toString();
  };
  const checkoutAvailable = process.env.NEXT_PUBLIC_CHECKOUT_AVAILABLE === "true";
  const teachingAvailable = process.env.NEXT_PUBLIC_TEACHING_AVAILABLE === "true";
  const isScoresActive = pathname === APP_ROUTES.scores || pathname.startsWith(`${APP_ROUTES.scores}/`);

  useEffect(() => {
    let active = true;

    async function refreshCredits() {
      const token = getStoredToken();
      if (!token) {
        if (active) setRemainingCredits(null);
        return;
      }
      const result = await apiRequest<{ usage: { jobs: { remaining: number } } }>("/api/payments/billing/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (active) setRemainingCredits(result.ok ? result.data.usage.jobs.remaining : null);
    }

    const handleFocus = () => { void refreshCredits(); };
    const refreshTimer = window.setInterval(() => { void refreshCredits(); }, 30_000);
    void refreshCredits();
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [pathname]);

  const navItems: SiteShellNavItem[] = [
    { href: APP_ROUTES.scores, label: copy.scores, active: isScoresActive },
    { href: publicHref("/pdf-score-scanner"), label: copy.scanner },
    { href: publicHref("/score-editor"), label: copy.editor },
    { href: publicHref("/transpose-score"), label: copy.transpose },
    { href: publicHref("/library"), label: copy.library },
    { href: publicHref("/#pricing"), label: copy.pricing },
    { label: copy.help, children: [{ href: publicHref("/#workflow"), label: copy.guide }, { href: publicHref("/support"), label: copy.contact }] },
    ...(teachingAvailable ? [{ href: APP_ROUTES.classrooms, label: copy.classes, active: pathname.startsWith(APP_ROUTES.classrooms) }] : []),
  ];
  const actions: SiteShellAction[] = [
    remainingCredits === null
      ? { href: APP_ROUTES.billing, label: copy.billing, tone: "secondary", desktopOnly: true }
      : { href: APP_ROUTES.billing, label: `${copy.credits}: ${formatNumber(remainingCredits, locale)}`, tone: "credit", icon: <SparkIcon width={16} height={16} /> },
    ...(checkoutAvailable ? [{ href: APP_ROUTES.checkout, label: copy.upgrade, tone: "tertiary" as const }] : []),
    { href: primaryHref, label: copy.primaryAction, tone: "primary", icon: <ArrowNorthEastIcon width={16} height={16} /> },
  ];
  const footerLinks = [
    { href: APP_ROUTES.register, label: copy.register },
    { href: APP_ROUTES.billing, label: copy.billing },
    { href: APP_ROUTES.activate, label: copy.activate },
    ...(checkoutAvailable ? [{ href: APP_ROUTES.checkout, label: copy.checkout }] : []),
    { href: APP_ROUTES.scores, label: copy.scores },
    { href: publicHref("/about"), label: copy.about },
    { href: publicHref("/support"), label: copy.support },
    { href: publicHref("/privacy"), label: copy.privacy },
    ...(teachingAvailable ? [{ href: APP_ROUTES.classrooms, label: copy.classes }] : []),
  ];

  return (
    <div className="app-frame">
      <SiteShellHeader
        brandHref={publicHref("/")}
        brandLabel={copy.brandHomeLabel}
        brandCaption={copy.brandCaption}
        navItems={navItems}
        actions={actions}
        localeControl={<AppLocaleSwitcher label={copy.localeSwitcherLabel} errorMessage={copy.localeSwitcherError} />}
        navLabel={copy.primaryNavigationLabel}
        openMenuLabel={copy.openMenu}
        closeMenuLabel={copy.closeMenu}
        linkComponent={Link}
      />
      <main className="app-main">{children}</main>
      <SiteShellFooter
        title="ScoreTransposer"
        description={copy.footerDescription}
        links={footerLinks}
        localeControl={<AppLocaleSwitcher label={copy.localeSwitcherLabel} errorMessage={copy.localeSwitcherError} />}
        linkComponent={Link}
      />
    </div>
  );
}
