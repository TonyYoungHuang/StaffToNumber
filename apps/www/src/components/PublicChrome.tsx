"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PRODUCT_NAME } from "@score/shared";
import { ArrowNorthEastIcon, BrandIcon, sonataCopy } from "@score/ui";
import { getAppHomeUrl, getCheckoutUrl } from "../lib/site";
import { SiteLocaleSwitcher } from "./SiteLocaleSwitcher";
import { useSiteLocale } from "./SiteLocaleProvider";

export function PublicChrome({ children }: { children: ReactNode }) {
  const { locale } = useSiteLocale();
  const appUrl = getAppHomeUrl();
  const checkoutUrl = getCheckoutUrl(locale);
  const homeSections = {
    methods: "/#methods",
    deliverables: "/#deliverables",
    pricing: "/#pricing",
  } as const;
  const copy =
    locale === "zh-CN"
      ? {
          methods: "方法",
          deliverables: "结果",
          pricing: "开通",
          faq: "问答",
          about: "关于 / 支持",
          support: "支持",
          operations: "运营",
          terms: "条款",
          privacy: "隐私",
          app: "打开应用",
          buy: "购买访问",
          footerCopy: "这是围绕“五线谱 PDF 转简谱”当前公开范围搭建的官网，用于承接搜索流量、支付分流、激活说明和支持入口。",
        }
      : {
          methods: "Methods",
          deliverables: "Deliverables",
          pricing: "Pricing",
          faq: "FAQ",
          about: "About",
          support: "Support",
          operations: "Ops",
          terms: "Terms",
          privacy: "Privacy",
          app: "Open app",
          buy: "Buy access",
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
              <span className="brand-caption">{PRODUCT_NAME}</span>
            </span>
          </Link>

          <nav className="public-nav" aria-label="Public">
            <a href={homeSections.methods} className="nav-link">
              {copy.methods}
            </a>
            <a href={homeSections.deliverables} className="nav-link">
              {copy.deliverables}
            </a>
            <a href={homeSections.pricing} className="nav-link">
              {copy.pricing}
            </a>
            <Link href="/faq" className="nav-link">
              {copy.faq}
            </Link>
            <Link href="/about" className="nav-link">
              {copy.about}
            </Link>
            <Link href="/support" className="nav-link">
              {copy.support}
            </Link>
            <Link href="/operations-checklist" className="nav-link">
              {copy.operations}
            </Link>
          </nav>

          <SiteLocaleSwitcher />
          <a href={checkoutUrl} className="public-button secondary">
            {copy.buy}
          </a>
          <a href={appUrl} className="public-button primary">
            {copy.app}
            <ArrowNorthEastIcon width={16} height={16} />
          </a>
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
            <a href={homeSections.methods}>{copy.methods}</a>
            <a href={homeSections.deliverables}>{copy.deliverables}</a>
            <a href={homeSections.pricing}>{copy.pricing}</a>
            <Link href="/faq">{copy.faq}</Link>
            <Link href="/about">{copy.about}</Link>
            <Link href="/support">{copy.support}</Link>
            <Link href="/operations-checklist">{copy.operations}</Link>
            <Link href="/privacy">{copy.privacy}</Link>
            <Link href="/terms">{copy.terms}</Link>
            <a href={checkoutUrl}>{copy.buy}</a>
            <a href={appUrl}>{copy.app}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
