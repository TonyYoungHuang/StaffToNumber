"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowNorthEastIcon, BrandIcon, sonataCopy } from "@score/ui";
import { getAppStartConversionUrl, getCheckoutUrl, siteConfig } from "../lib/site";
import { SiteLocaleSwitcher } from "./SiteLocaleSwitcher";
import { useSiteLocale } from "./SiteLocaleProvider";

export function PublicChrome({ children }: { children: ReactNode }) {
  const { locale } = useSiteLocale();
  const appUrl = getAppStartConversionUrl();
  const checkoutUrl = getCheckoutUrl(locale);
  const homeSections = { workflow: "/#workflow", useCases: "/#use-cases" } as const;
  const copy =
    locale === "zh-CN"
      ? {
          scanner: "扫描识谱",
          editor: "在线编辑",
          transpose: "移调",
          education: "教学",
          pricing: "开通",
          faq: "问答",
          about: "关于 / 支持",
          support: "支持",
          terms: "条款",
          privacy: "隐私",
          copyright: "版权投诉",
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
          faq: "FAQ",
          about: "About",
          support: "Support",
          terms: "Terms",
          privacy: "Privacy",
          copyright: "Copyright",
          app: siteConfig.release.productAppAvailable ? "Scan one page free" : "Launch status",
          buy: "Upgrade",
          brandCaption: "PDF and image score scanner",
          footerCopy: `Scan one staff-score PDF page or image into a reviewable OMR candidate, then unlock correction, conversion, transposition, playback, and export in the ${sonataCopy.currentScope.toLowerCase()} workspace.`,
        };

  return (
    <div className="public-frame">
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

          <nav className="public-nav" aria-label="Public">
            <Link href="/pdf-score-scanner" className="nav-link">{copy.scanner}</Link>
            <Link href="/score-editor" className="nav-link">{copy.editor}</Link>
            <Link href="/transpose-score" className="nav-link">{copy.transpose}</Link>
            {siteConfig.release.checkoutAvailable ? <Link href="/pricing" className="nav-link">{copy.pricing}</Link> : null}
            {siteConfig.release.teachingAvailable ? <Link href="/teaching" className="nav-link">{copy.education}</Link> : null}
          </nav>

          <div className="header-actions">
            <SiteLocaleSwitcher />
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button secondary">{copy.buy}</a> : null}
            <a href={appUrl} className="public-button primary">
              {copy.app}
              <ArrowNorthEastIcon width={16} height={16} />
            </a>
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
            {siteConfig.release.checkoutAvailable ? <Link href="/pricing">{copy.pricing}</Link> : null}
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
