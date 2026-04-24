"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { APP_ROUTES } from "@score/shared";
import { ArrowNorthEastIcon, BrandIcon, DotIcon, sonataCopy } from "@score/ui";
import { AppLocaleSwitcher } from "./AppLocaleSwitcher";
import { useAppLocale } from "./AppLocaleProvider";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useAppLocale();
  const primaryHref = pathname === APP_ROUTES.upload ? APP_ROUTES.jobs : APP_ROUTES.upload;

  const copy =
    locale === "zh-CN"
      ? {
          navItems: [
            { href: APP_ROUTES.home, label: "工作台" },
            { href: APP_ROUTES.dashboard, label: "账户" },
            { href: APP_ROUTES.checkout, label: "在线支付" },
            { href: APP_ROUTES.upload, label: "上传" },
            { href: APP_ROUTES.jobs, label: "任务" },
            { href: APP_ROUTES.activate, label: "兑换激活码" },
            { href: APP_ROUTES.adminCodes, label: "激活码后台" },
            { href: APP_ROUTES.adminSupport, label: "工单后台" },
          ],
          scope: "当前仅开放已上线功能",
          primaryLabel: pathname === APP_ROUTES.upload ? "查看任务" : "开始转换",
          footerTitle: "The Digital Score",
          footerCopy:
            "当前正式环境仅支持五线谱 PDF 转简谱。反向转换、站内手工编辑和移调仍在后续版本规划中。",
          footerLinks: {
            register: "注册账户",
            activate: "兑换激活码",
            checkout: "在线支付",
            upload: "上传乐谱",
            jobs: "查看任务",
            admin: "激活码后台",
            supportAdmin: "工单后台",
          },
          caption: "五线谱 PDF 转简谱工作台",
        }
      : {
          navItems: [
            { href: APP_ROUTES.home, label: "Studio" },
            { href: APP_ROUTES.dashboard, label: "Account" },
            { href: APP_ROUTES.checkout, label: "Checkout" },
            { href: APP_ROUTES.upload, label: "Uploads" },
            { href: APP_ROUTES.jobs, label: "Jobs" },
            { href: APP_ROUTES.adminSupport, label: "Support admin" },
          ],
          scope: "Current scope only",
          primaryLabel: pathname === APP_ROUTES.upload ? "Open Jobs" : "Start Conversion",
          footerTitle: "The Digital Score",
          footerCopy:
            "Current live workflow only supports five-line staff PDF to numbered notation. Reverse conversion, in-browser manual editing, and transposition stay in later modules.",
          footerLinks: {
            register: "Create account",
            activate: "Redeem code",
            checkout: "Pay online",
            upload: "Upload score",
            jobs: "Track jobs",
            admin: "Admin codes",
            supportAdmin: "Support admin",
          },
          caption: `${sonataCopy.currentScope} studio`,
        };

  return (
    <div className="app-frame">
      <div className="app-ambient app-ambient-primary" />
      <div className="app-ambient app-ambient-secondary" />
      <div className="app-ambient app-ambient-tertiary" />

      <header className="app-header">
        <div className="container header-inner">
          <Link href={APP_ROUTES.home} className="brand">
            <span className="brand-mark">
              <BrandIcon width={22} height={22} />
            </span>
            <span className="brand-copy">
              <span className="brand-title">The Digital Score</span>
              <span className="brand-caption">{copy.caption}</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {copy.navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-link${isActive ? " is-active" : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="header-actions">
            <span className="status-chip tone-cyan">
              <DotIcon width={10} height={10} />
              {copy.scope}
            </span>
            <AppLocaleSwitcher />
            <Link href={primaryHref} className="button button-primary">
              {copy.primaryLabel}
              <ArrowNorthEastIcon width={16} height={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="container footer-shell">
          <div>
            <p className="footer-title">{copy.footerTitle}</p>
            <p className="footer-copy">{copy.footerCopy}</p>
          </div>
          <div className="footer-links">
            <Link href={APP_ROUTES.register}>{copy.footerLinks.register}</Link>
            {locale === "zh-CN" ? <Link href={APP_ROUTES.activate}>{copy.footerLinks.activate}</Link> : null}
            <Link href={APP_ROUTES.checkout}>{copy.footerLinks.checkout}</Link>
            <Link href={APP_ROUTES.upload}>{copy.footerLinks.upload}</Link>
            <Link href={APP_ROUTES.jobs}>{copy.footerLinks.jobs}</Link>
            {locale === "zh-CN" ? <Link href={APP_ROUTES.adminCodes}>{copy.footerLinks.admin}</Link> : null}
            <Link href={APP_ROUTES.adminSupport}>{copy.footerLinks.supportAdmin}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
