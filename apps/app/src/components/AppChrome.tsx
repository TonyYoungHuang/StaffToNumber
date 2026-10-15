"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { formatNumber } from "@score/i18n";
import { APP_ROUTES, getGoogleAuthCopy, getPurchaseOptionsCopy } from "@score/shared";
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
import { clearStoredToken, getStoredToken, getServerAuthToken, subscribeAuthChanges, preferredLoginPath } from "../lib/auth-storage";
import { upgradePath } from "../lib/flow-return";
import { trackFunnelEvent } from "../lib/analytics";
import { PUBLIC_SITE_URL } from "../lib/support";
import { AppLocaleSwitcher } from "./AppLocaleSwitcher";
import { useAppLocale } from "./AppLocaleProvider";
import { PendingOmrReviewBanner } from "./PendingOmrReviewBanner";
import type { ScoreEntryMessages } from "../lib/score-entry-messages/types";
import { CheckoutReturnNotice } from "./CheckoutReturnNotice";
import { prepareCheckout, checkoutReturnContext } from "../lib/checkout-flow";
import { useAppAuthModal } from "./AppAuthModal";
import { saveAuthIntent } from "../lib/auth-intent";

export function AppChrome({ children, copy, reviewEntryCopy }: { children: ReactNode; copy: AppShellCopy; reviewEntryCopy: ScoreEntryMessages["reviewEntry"] }) {
  const signIn = useAppAuthModal();
  const pathname = usePathname();
  const [returnPath, setReturnPath] = useState(pathname);
  useEffect(() => {
    let busy = false;
    const saveThenNavigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/checkout") return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (busy) return;
      busy = true;
      const navigate = () => { void prepareCheckout().then(saved => {
        if (!saved) return;
        const context = checkoutReturnContext(url.searchParams.get("next") ?? undefined);
        // Use the post-save snapshot; avoid carrying a stale editor revision.
        url.searchParams.set("next", context.returnPath);
        url.searchParams.set("returnState", JSON.stringify(context.returnState));
        window.location.assign(`${url.pathname}${url.search}${url.hash}`);
      }).finally(() => { busy = false; }); };
      if (!getStoredToken()) {
        busy = false;
        signIn("login", navigate, { beforeRedirect: async () => {
          if (!(await prepareCheckout())) throw new Error("Checkout preparation failed");
          const context = checkoutReturnContext(url.searchParams.get("next") ?? undefined);
          url.searchParams.set("next", context.returnPath);
          url.searchParams.set("returnState", JSON.stringify(context.returnState));
          saveAuthIntent("navigation", `${url.pathname}${url.search}${url.hash}`);
        } });
      }
      else navigate();
    };
    document.addEventListener("click", saveThenNavigate, true);
    return () => document.removeEventListener("click", saveThenNavigate, true);
  }, [signIn]);
  useEffect(() => {
    const update = () => setReturnPath(window.location.pathname + window.location.search + window.location.hash);
    update(); window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);
  const { locale } = useAppLocale();
  const token = useSyncExternalStore(subscribeAuthChanges, getStoredToken, getServerAuthToken);
  const [loginHref, setLoginHref] = useState<string>(APP_ROUTES.login);
  useEffect(() => { setLoginHref(preferredLoginPath(returnPath)); }, [returnPath, token]);
  const [balance, setBalance] = useState<{ token: string; remaining: number } | null>(null);
  const isAuthScreen = [APP_ROUTES.login, APP_ROUTES.register, APP_ROUTES.forgotPassword, APP_ROUTES.resetPassword].some(route => pathname === route);
  const remainingCredits = !isAuthScreen && token && balance?.token === token ? balance.remaining : null;
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
    if (isAuthScreen || !token) return;
    let active = true;
    let requestId = 0;
    const controller = new AbortController();

    async function refreshCredits() {
      const currentRequest = ++requestId;
      const result = await apiRequest<{ usage: { jobs: { remaining: number } } }>("/api/payments/billing/usage", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!active || currentRequest !== requestId || getStoredToken() !== token) return;
      if (!result.ok) {
        setBalance(null);
        if (result.status === 401) clearStoredToken();
        return;
      }
      const remaining = result.data?.usage?.jobs?.remaining;
      setBalance(Number.isSafeInteger(remaining) && remaining >= 0 ? { token: token!, remaining } : null);
    }

    const handleFocus = () => { void refreshCredits(); };
    const refreshTimer = window.setInterval(() => { void refreshCredits(); }, 30_000);
    void refreshCredits();
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthScreen, pathname, token]);

  const currentScore = /^\/scores\/(?!new(?:\/|$)|shared(?:\/|$))[^/]+$/.test(pathname) ? pathname : APP_ROUTES.scores;
  const navItems: SiteShellNavItem[] = [
    { href: APP_ROUTES.scores, label: copy.scores, active: isScoresActive },
    { href: primaryHref, label: copy.scanner },
    { href: `${currentScore}#visual-editor`, label: copy.editor },
    { href: `${currentScore}#transpose-score`, label: copy.transpose },
    { label: copy.help, children: [{ href: publicHref("/library"), label: copy.library }, ...(teachingAvailable ? [{ href: APP_ROUTES.classrooms, label: copy.classes }] : []), { href: APP_ROUTES.billing, label: getPurchaseOptionsCopy(locale).manage }, { href: publicHref("/#workflow"), label: copy.guide }, { href: publicHref("/support"), label: copy.contact }] },
  ];
  const actions: SiteShellAction[] = [
    !token
      ? { href: loginHref, label: copy.login, tone: "secondary" }
      : { href: APP_ROUTES.billing, label: remainingCredits === null ? copy.credits : `${copy.credits}: ${formatNumber(remainingCredits, locale)}`, tone: "credit", icon: <SparkIcon width={16} height={16} /> },
    ...(checkoutAvailable ? [{ href: upgradePath(returnPath), label: copy.upgrade, tone: "tertiary" as const, onClick: () => { trackFunnelEvent("upgrade_click", { source: "app_header" }); } }] : []),
    { href: primaryHref, label: copy.primaryAction, tone: "primary", icon: <ArrowNorthEastIcon width={16} height={16} /> },
  ];
  const footerLinks = [
    { href: APP_ROUTES.register, label: copy.register },
    ...(!token ? [{ href: `${preferredLoginPath(returnPath)}&method=email`, label: getGoogleAuthCopy(locale).emailSignIn }] : []),
    { href: APP_ROUTES.billing, label: copy.billing },
    ...(checkoutAvailable ? [{ href: upgradePath(returnPath), label: copy.checkout }] : []),
    { href: APP_ROUTES.scores, label: copy.scores },
    { href: publicHref("/about"), label: copy.about },
    { href: publicHref("/support"), label: copy.support },
    { href: publicHref("/privacy"), label: copy.privacy },
    ...(teachingAvailable ? [{ href: APP_ROUTES.classrooms, label: copy.classes }] : []),
  ];

  return (
    <div className="app-frame">
      <SiteShellHeader
        brandHref={token ? APP_ROUTES.scores : publicHref("/")}
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
      <main className="app-main"><Suspense fallback={null}><CheckoutReturnNotice /></Suspense><PendingOmrReviewBanner copy={reviewEntryCopy} pathname={pathname} />{children}</main>
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
