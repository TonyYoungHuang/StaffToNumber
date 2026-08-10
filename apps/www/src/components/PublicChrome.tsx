"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowNorthEastIcon, BrandIcon, sonataCopy } from "@score/ui";
import { platformFeaturePages } from "../lib/platform-feature-pages";
import { getCheckoutUrl, getSafeAppUrl, siteConfig } from "../lib/site";
import { SiteLocaleSwitcher } from "./SiteLocaleSwitcher";
import { useSiteLocale } from "./SiteLocaleProvider";

export function PublicChrome({ children }: { children: ReactNode }) {
  const { locale } = useSiteLocale();
  const appUrl = getSafeAppUrl("public-navigation");
  const checkoutUrl = getCheckoutUrl(locale);
  const homeSections = {
    workflow: "/#workflow",
    useCases: "/#use-cases",
  } as const;
  const primaryFeatureLinks = platformFeaturePages.filter((page) => ["staff-to-jianpu", "pdf-score-scanner", "transpose-score"].includes(page.slug));
  const primaryFeatureLabel = (slug: string) => {
    if (slug === "staff-to-jianpu") return "Jianpu";
    if (slug === "pdf-score-scanner") return "Scanner";
    if (slug === "transpose-score") return "Transpose";
    return "Feature";
  };
  const copy =
    locale === "zh-CN"
      ? {
          workflow: "使用流程",
          useCases: "使用场景",
          features: "功能",
          pricing: "开通",
          faq: "问答",
          about: "关于 / 支持",
          support: "支持",
          terms: "条款",
          privacy: "隐私",
          copyright: "版权投诉",
          app: siteConfig.release.productAppAvailable ? "打开应用" : "上线状态",
          buy: "购买访问",
          brandCaption: "MusicXML 全功能乐谱工作台",
          footerCopy: "这是以 MusicXML 和 Score JSON 为核心的乐谱工作台官网，覆盖导入识别、校对编辑、简谱互换、移调、练习播放、导出与教学流程。",
        }
      : {
          workflow: "How it works",
          useCases: "Use cases",
          features: "Features",
          pricing: "Pricing",
          faq: "FAQ",
          about: "About",
          support: "Support",
          terms: "Terms",
          privacy: "Privacy",
          copyright: "Copyright",
          app: siteConfig.release.productAppAvailable ? "Open app" : "Launch status",
          buy: "Buy access",
          brandCaption: "MusicXML-first score workspace",
          footerCopy: `A public site for the current ${sonataCopy.currentScope.toLowerCase()} release, built to support search discovery, payment routing, activation guidance, and support clarity.`,
        };

  return (
    <div className="public-frame">
      <div className="public-ambient app-ambient-primary" />
      <div className="public-ambient app-ambient-secondary" />
      <div className="public-ambient app-ambient-tertiary" />

      <header className="public-header">
        <div className="public-container header-inner">
          <Link href="/" className="public-brand">
            <span className="brand-mark">
              <BrandIcon width={22} height={22} />
            </span>
            <span className="brand-copy">
              <span className="brand-title">{sonataCopy.productTitle}</span>
              <span className="brand-caption">{copy.brandCaption}</span>
            </span>
          </Link>

          <nav className="public-nav" aria-label="Public">
            <a href={homeSections.workflow} className="nav-link">
              {copy.workflow}
            </a>
            <a href={homeSections.useCases} className="nav-link">
              {copy.useCases}
            </a>
            {primaryFeatureLinks.map((page) => (
              <Link key={page.slug} href={page.canonical} className="nav-link">
                {primaryFeatureLabel(page.slug)}
              </Link>
            ))}
            {siteConfig.release.checkoutAvailable ? <Link href="/pricing" className="nav-link">{copy.pricing}</Link> : null}
            <Link href="/faq" className="nav-link">
              {copy.faq}
            </Link>
            <Link href="/about" className="nav-link">
              {copy.about}
            </Link>
            <Link href="/support" className="nav-link">
              {copy.support}
            </Link>
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
            <a href={homeSections.workflow}>{copy.workflow}</a>
            <a href={homeSections.useCases}>{copy.useCases}</a>
            {siteConfig.release.checkoutAvailable ? <Link href="/pricing">{copy.pricing}</Link> : null}
            {platformFeaturePages
              .filter((page) => page.slug !== "pricing")
              .map((page) => (
                <Link key={page.slug} href={page.canonical}>
                  {page.title}
                </Link>
              ))}
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
