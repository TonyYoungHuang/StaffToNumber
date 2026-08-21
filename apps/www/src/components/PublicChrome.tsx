"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowNorthEastIcon,
  SiteShellFooter,
  SiteShellHeader,
  sonataCopy,
  type SiteShellAction,
  type SiteShellNavItem,
} from "@score/ui";
import type { PublicAnnouncement } from "../lib/public-content";
import { getAppLoginUrl, getAppStartConversionUrl, getCheckoutUrl, siteConfig } from "../lib/site";
import { SiteLocaleSwitcher } from "./SiteLocaleSwitcher";
import { useSiteLocale } from "./SiteLocaleProvider";

type NavigatorWithPerformanceSignals = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

export function PublicChrome({ children, announcement }: { children: ReactNode; announcement: PublicAnnouncement | null }) {
  const { locale } = useSiteLocale();
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const appUrl = getAppStartConversionUrl(locale);
  const loginUrl = getAppLoginUrl(undefined, locale);
  const checkoutUrl = getCheckoutUrl(locale);
  const homeSections = { workflow: "/#workflow", useCases: "/#cases", pricing: "/#pricing" } as const;
  const copy = locale === "zh-CN"
    ? {
        scanner: "扫描识谱", editor: "在线编辑", transpose: "移调", education: "教学", pricing: "价格",
        help: "帮助", guide: "使用指南", contact: "联系我们", discord: "Discord 社群", login: "登录",
        faq: "问答", about: "关于 / 支持", support: "支持", terms: "条款", privacy: "隐私", copyright: "版权投诉",
        menu: "打开导航菜单", closeMenu: "关闭导航菜单",
        app: siteConfig.release.productAppAvailable ? "免费识别一页" : "上线状态", buy: "升级套餐",
        brandCaption: "PDF / 图片五线谱识别工作台",
        footerCopy: "上传一页五线谱 PDF 或图片，先查看可校对的 OMR 候选；开通后继续编辑、简谱互换、移调、播放与完整导出。",
      }
    : {
        scanner: "Scanner", editor: "Editor", transpose: "Transpose", education: "Education", pricing: "Pricing",
        help: "Help", guide: "Guide", contact: "Contact us", discord: "Discord", login: "Sign in",
        faq: "FAQ", about: "About", support: "Support", terms: "Terms", privacy: "Privacy", copyright: "Copyright",
        menu: "Open navigation menu", closeMenu: "Close navigation menu",
        app: siteConfig.release.productAppAvailable ? "Scan one page free" : "Launch status", buy: "Upgrade",
        brandCaption: "PDF and image score scanner",
        footerCopy: `Scan one staff-score PDF page or image into a reviewable OMR candidate, then unlock correction, conversion, transposition, playback, and export in the ${sonataCopy.currentScope.toLowerCase()}.`,
      };

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
    { href: "/pdf-score-scanner", label: copy.scanner },
    { href: "/score-editor", label: copy.editor },
    { href: "/transpose-score", label: copy.transpose },
    { href: homeSections.pricing, label: copy.pricing },
    { label: copy.help, children: [{ href: homeSections.workflow, label: copy.guide }, { href: "/support", label: copy.contact }] },
    ...(siteConfig.release.teachingAvailable ? [{ href: "/teaching", label: copy.education }] : []),
    ...(siteConfig.discordInviteUrl ? [{ href: siteConfig.discordInviteUrl, label: copy.discord, external: true }] : []),
    { href: loginUrl, label: copy.login },
  ];
  const actions: SiteShellAction[] = [
    ...(siteConfig.discordInviteUrl ? [{ href: siteConfig.discordInviteUrl, label: copy.discord, external: true, desktopOnly: true }] : []),
    { href: loginUrl, label: copy.login, tone: "secondary", desktopOnly: true },
    ...(siteConfig.release.checkoutAvailable ? [{ href: checkoutUrl, label: copy.buy, tone: "tertiary" as const }] : []),
    { href: appUrl, label: copy.app, tone: "primary", icon: <ArrowNorthEastIcon width={16} height={16} /> },
  ];
  const footerLinks = [
    { href: homeSections.workflow, label: locale === "zh-CN" ? "使用流程" : "How it works" },
    { href: homeSections.useCases, label: locale === "zh-CN" ? "使用场景" : "Use cases" },
    { href: homeSections.pricing, label: copy.pricing },
    { href: "/faq", label: copy.faq },
    { href: "/about", label: copy.about },
    { href: "/support", label: copy.support },
    { href: "/privacy", label: copy.privacy },
    { href: "/terms", label: copy.terms },
    { href: "/copyright-complaint", label: copy.copyright },
    ...(siteConfig.release.checkoutAvailable ? [{ href: checkoutUrl, label: copy.buy }] : []),
    { href: appUrl, label: copy.app },
  ];
  const announcementCopy = announcement?.copy[locale];

  return (
    <div className="public-frame">
      {announcement && announcementCopy && announcementVisible ? (
        <aside className="public-announcement" role="status" aria-label={locale === "zh-CN" ? "活动公告" : "Event announcement"}>
          <div className="public-container public-announcement-inner">
            <span className="public-announcement-label">{locale === "zh-CN" ? "限时活动" : "Live event"}</span>
            <p>{announcementCopy.label}</p>
            <a href={announcement.href}>{announcementCopy.action}<ArrowNorthEastIcon width={14} height={14} /></a>
            <button type="button" onClick={dismissAnnouncement} aria-label={locale === "zh-CN" ? "关闭活动公告" : "Dismiss event announcement"}>×</button>
          </div>
        </aside>
      ) : null}
      <SiteShellHeader
        brandHref="/"
        brandCaption={copy.brandCaption}
        navItems={navItems}
        actions={actions}
        localeControl={<SiteLocaleSwitcher />}
        navLabel={locale === "zh-CN" ? "主导航" : "Primary navigation"}
        openMenuLabel={copy.menu}
        closeMenuLabel={copy.closeMenu}
        linkComponent={Link}
      />
      <main className="public-main">{children}</main>
      <SiteShellFooter
        title={sonataCopy.productTitle}
        description={copy.footerCopy}
        links={footerLinks}
        localeControl={<SiteLocaleSwitcher />}
        linkComponent={Link}
      />
    </div>
  );
}
