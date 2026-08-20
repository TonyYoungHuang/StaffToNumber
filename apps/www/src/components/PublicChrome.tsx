"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowNorthEastIcon, BrandIcon, sonataCopy } from "@score/ui";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const appUrl = getAppStartConversionUrl(locale);
  const loginUrl = getAppLoginUrl(undefined, locale);
  const checkoutUrl = getCheckoutUrl(locale);
  const homeSections = { workflow: "/#workflow", useCases: "/#cases", pricing: "/#pricing" } as const;
  const copy =
    locale === "zh-CN"
      ? {
          scanner: "扫描识谱",
          editor: "在线编辑",
          transpose: "移调",
          education: "教学",
          pricing: "价格",
          help: "帮助",
          guide: "使用指南",
          contact: "联系我们",
          discord: "Discord 社群",
          login: "登录",
          faq: "问答",
          about: "关于 / 支持",
          support: "支持",
          terms: "条款",
          privacy: "隐私",
          copyright: "版权投诉",
          menu: "打开导航菜单",
          closeMenu: "关闭导航菜单",
          app: siteConfig.release.productAppAvailable ? "免费识别一页" : "上线状态",
          buy: "升级套餐",
          brandCaption: "PDF / 图片五线谱识别工作台",
          footerCopy: "上传一页五线谱 PDF 或图片，先查看可校对的 OMR 候选；开通后继续编辑、简谱互换、移调、播放与完整导出。",
        }
      : {
          scanner: "Scanner",
          editor: "Editor",
          transpose: "Transpose",
          education: "Education",
          pricing: "Pricing",
          help: "Help",
          guide: "Guide",
          contact: "Contact us",
          discord: "Discord",
          login: "Sign in",
          faq: "FAQ",
          about: "About",
          support: "Support",
          terms: "Terms",
          privacy: "Privacy",
          copyright: "Copyright",
          menu: "Open navigation menu",
          closeMenu: "Close navigation menu",
          app: siteConfig.release.productAppAvailable ? "Scan one page free" : "Launch status",
          buy: "Upgrade",
          brandCaption: "PDF and image score scanner",
          footerCopy: `Scan one staff-score PDF page or image into a reviewable OMR candidate, then unlock correction, conversion, transposition, playback, and export in the ${sonataCopy.currentScope.toLowerCase()} workspace.`,
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

  const announcementCopy = announcement?.copy[locale];

  return (
    <div className="public-frame">
      {announcement && announcementCopy && announcementVisible ? (
        <aside className="public-announcement" role="status" aria-label={locale === "zh-CN" ? "活动公告" : "Event announcement"}>
          <div className="public-container public-announcement-inner">
            <span className="public-announcement-label">{locale === "zh-CN" ? "限时活动" : "Live event"}</span>
            <p>{announcementCopy.label}</p>
            <Link href={announcement.href}>{announcementCopy.action}<ArrowNorthEastIcon width={14} height={14} /></Link>
            <button type="button" onClick={dismissAnnouncement} aria-label={locale === "zh-CN" ? "关闭活动公告" : "Dismiss event announcement"}>×</button>
          </div>
        </aside>
      ) : null}
      <header className="public-header">
        <div className="public-container header-inner">
          <Link href="/" className="public-brand">
            <span className="brand-mark">
              <BrandIcon width={22} height={22} />
            </span>
            <span className="brand-copy">
              <span className="brand-title">ScoreTransposer</span>
              <span className="brand-caption">{copy.brandCaption}</span>
            </span>
          </Link>

          <nav id="public-primary-navigation" className={`public-nav${menuOpen ? " is-open" : ""}`} aria-label="Public">
            <Link href="/pdf-score-scanner" className="nav-link" onClick={() => setMenuOpen(false)}>{copy.scanner}</Link>
            <Link href="/score-editor" className="nav-link" onClick={() => setMenuOpen(false)}>{copy.editor}</Link>
            <Link href="/transpose-score" className="nav-link" onClick={() => setMenuOpen(false)}>{copy.transpose}</Link>
            <Link href={homeSections.pricing} className="nav-link" onClick={() => setMenuOpen(false)}>{copy.pricing}</Link>
            <details className="public-nav-help">
              <summary className="nav-link">{copy.help}<span aria-hidden="true">⌄</span></summary>
              <div className="public-nav-help-menu">
                <a href={homeSections.workflow} onClick={() => setMenuOpen(false)}>{copy.guide}</a>
                <Link href="/support" onClick={() => setMenuOpen(false)}>{copy.contact}</Link>
              </div>
            </details>
            {siteConfig.release.teachingAvailable ? <Link href="/teaching" className="nav-link" onClick={() => setMenuOpen(false)}>{copy.education}</Link> : null}
            {siteConfig.discordInviteUrl ? <a href={siteConfig.discordInviteUrl} target="_blank" rel="noreferrer" className="nav-link public-nav-discord" onClick={() => setMenuOpen(false)}>{copy.discord}</a> : null}
            <a href={loginUrl} className="nav-link public-nav-auth" onClick={() => setMenuOpen(false)}>{copy.login}</a>
          </nav>

          <div className="header-actions">
            <SiteLocaleSwitcher />
            {siteConfig.discordInviteUrl ? <a href={siteConfig.discordInviteUrl} target="_blank" rel="noreferrer" className="public-button secondary public-discord-link">{copy.discord}</a> : null}
            <a href={loginUrl} className="public-button secondary public-login-link">{copy.login}</a>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button secondary">{copy.buy}</a> : null}
            <a href={appUrl} className="public-button primary">
              {copy.app}
              <ArrowNorthEastIcon width={16} height={16} />
            </a>
            <button
              type="button"
              className="public-menu-toggle"
              aria-controls="public-primary-navigation"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? copy.closeMenu : copy.menu}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <main className="public-main">{children}</main>

      <footer className="public-footer">
        <div className="public-container footer-shell">
          <div>
            <p className="footer-title">{sonataCopy.productTitle}</p>
            <p className="footer-copy">{copy.footerCopy}</p>
          </div>
          <div className="footer-links">
            <a href={homeSections.workflow}>{locale === "zh-CN" ? "使用流程" : "How it works"}</a>
            <a href={homeSections.useCases}>{locale === "zh-CN" ? "使用场景" : "Use cases"}</a>
            <Link href={homeSections.pricing}>{copy.pricing}</Link>
            <Link href="/faq">{copy.faq}</Link>
            <Link href="/about">{copy.about}</Link>
            <Link href="/support">{copy.support}</Link>
            <Link href="/privacy">{copy.privacy}</Link>
            <Link href="/terms">{copy.terms}</Link>
            <Link href="/copyright-complaint">{copy.copyright}</Link>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl}>{copy.buy}</a> : null}
            <a href={appUrl}>{copy.app}</a>
          </div>
          <div className="footer-locale">
            <SiteLocaleSwitcher />
          </div>
        </div>
      </footer>
    </div>
  );
}
