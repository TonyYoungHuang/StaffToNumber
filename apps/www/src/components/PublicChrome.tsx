"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { getAppLoginUrl, getAppStartConversionUrl, getCheckoutUrl, siteConfig } from "../lib/site";
import { SiteLocaleSwitcher } from "./SiteLocaleSwitcher";
import { useSiteLocale } from "./SiteLocaleProvider";

type NavigatorWithPerformanceSignals = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

export function PublicChrome({ children, announcement }: { children: ReactNode; announcement: PublicAnnouncement | null }) {
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
  const copy = locale === "zh-CN"
    ? {
        scanner: "扫描识谱", features: "功能", library: "曲库", education: "教学", pricing: "价格",
        help: "帮助", guide: "五线谱入门", pdfGuides: "PDF 与 MusicXML 指南", numberedNotation: "五线谱与简谱转换", contact: "联系我们", discord: "Discord 社群", login: "登录",
        faq: "问答", about: "关于 / 支持", support: "支持", terms: "条款", privacy: "隐私", copyright: "版权投诉",
        menu: "打开导航菜单", closeMenu: "关闭导航菜单",
        app: siteConfig.release.productAppAvailable ? "免费编辑" : "上线状态", buy: "升级套餐",
        brandLabel: "ScoreTransposer 首页",
        brandCaption: "PDF / 图片五线谱识别工作台",
        footerCopy: "上传一份完整多页五线谱 PDF 或图片，免费创建一个可校正、播放、转换、分享与导出的乐谱项目。",
      }
    : {
        scanner: "Sheet music scanner", features: "Features", library: "Score library", education: "Education", pricing: "Pricing",
        help: "Help", guide: "How to read sheet music", pdfGuides: "PDF & MusicXML guides", numberedNotation: "Numbered notation converter", contact: "Contact us", discord: "Discord", login: "Sign in",
        faq: "FAQ", about: "About", support: "Support", terms: "Terms", privacy: "Privacy", copyright: "Copyright",
        menu: "Open navigation menu", closeMenu: "Close navigation menu",
        app: siteConfig.release.productAppAvailable ? "Edit for free" : "Launch status", buy: "Upgrade",
        brandLabel: "ScoreTransposer home",
        brandCaption: "PDF and image score scanner",
        footerCopy: `Create one free project from a complete staff-score PDF or image, then correct, convert, transpose, play, share, and export it in the ${sonataCopy.currentScope.toLowerCase()}.`,
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
    { href: localizePublicHref("/pdf-score-scanner", locale), label: copy.scanner },
    { href: localizePublicHref("/features", locale), label: copy.features },
    { href: localizePublicHref("/library", locale), label: copy.library },
    { href: homeSections.pricing, label: copy.pricing },
    { label: copy.help, children: [{ href: localizePublicHref("/guides", locale), label: copy.pdfGuides }, { href: localizePublicHref("/how-to-read-sheet-music", locale), label: copy.guide }, { href: localizePublicHref("/numbered-notation-converter", locale), label: copy.numberedNotation }, { href: localizePublicHref("/support", locale), label: copy.contact }] },
    ...(siteConfig.release.teachingAvailable ? [{ href: localizePublicHref("/teaching", locale), label: copy.education }] : []),
    ...(siteConfig.discordInviteUrl ? [{ href: siteConfig.discordInviteUrl, label: copy.discord, external: true }] : []),
    { href: loginUrl, label: copy.login },
  ];
  const actions: SiteShellAction[] = [
    ...(siteConfig.discordInviteUrl ? [{ href: siteConfig.discordInviteUrl, label: copy.discord, external: true, desktopOnly: true }] : []),
    { href: loginUrl, label: copy.login, tone: "secondary", desktopOnly: true },
    ...(siteConfig.release.checkoutAvailable ? [{ href: checkoutUrl, label: copy.buy, tone: "tertiary" as const }] : []),
    {
      href: homepageScanUrl,
      label: copy.app,
      tone: "primary",
      icon: <ArrowNorthEastIcon width={16} height={16} />,
      onClick: pathname === localizePublicPath("/", locale) ? (event) => {
        event.preventDefault();
        window.dispatchEvent(new Event("scoretransposer:start-free-scan"));
      } : undefined,
    },
  ];
  const footerLinks = [
    { href: homeSections.workflow, label: locale === "zh-CN" ? "使用流程" : "How it works" },
    { href: homeSections.useCases, label: locale === "zh-CN" ? "使用场景" : "Use cases" },
    { href: homeSections.pricing, label: copy.pricing },
    { href: localizePublicHref("/features", locale), label: copy.features },
    { href: localizePublicHref("/pdf-to-musicxml", locale), label: locale === "zh-CN" ? "PDF 转 MusicXML" : "PDF to MusicXML" },
    { href: localizePublicHref("/guides", locale), label: copy.pdfGuides },
    { href: localizePublicHref("/library", locale), label: copy.library },
    { href: localizePublicHref("/faq", locale), label: copy.faq },
    { href: localizePublicHref("/how-to-read-sheet-music", locale), label: copy.guide },
    { href: localizePublicHref("/numbered-notation-converter", locale), label: copy.numberedNotation },
    { href: localizePublicHref("/about", locale), label: copy.about },
    { href: localizePublicHref("/support", locale), label: copy.support },
    { href: localizePublicHref("/privacy", locale), label: copy.privacy },
    { href: localizePublicHref("/terms", locale), label: copy.terms },
    { href: localizePublicHref("/copyright-complaint", locale), label: copy.copyright },
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
            <a href={localizePublicHref(announcement.href, locale)}>{announcementCopy.action}<ArrowNorthEastIcon width={14} height={14} /></a>
            <button type="button" onClick={dismissAnnouncement} aria-label={locale === "zh-CN" ? "关闭活动公告" : "Dismiss event announcement"}>×</button>
          </div>
        </aside>
      ) : null}
      <SiteShellHeader
        brandHref={localizePublicPath("/", locale)}
        brandLabel={copy.brandLabel}
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
