"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { APP_ROUTES } from "@score/shared";
import { ArrowNorthEastIcon, BrandIcon, sonataCopy } from "@score/ui";
import { AppLocaleSwitcher } from "./AppLocaleSwitcher";
import { useAppLocale } from "./AppLocaleProvider";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useAppLocale();
  const primaryHref = `${APP_ROUTES.scores}#omr-import`;
  const checkoutAvailable = process.env.NEXT_PUBLIC_CHECKOUT_AVAILABLE === "true";
  const teachingAvailable = process.env.NEXT_PUBLIC_TEACHING_AVAILABLE === "true";

  const copy =
    locale === "zh-CN"
      ? {
          navItems: [
            { href: APP_ROUTES.home, label: "工作台" },
            { href: APP_ROUTES.scores, label: "乐谱工程" },
            ...(teachingAvailable ? [{ href: APP_ROUTES.classrooms, label: "课堂" }] : []),
          ],
          scope: "PDF / 图片乐谱工作台",
          primaryLabel: "免费识别一页",
          billing: "账单",
          upgrade: "升级",
          footerTitle: "The Digital Score",
          footerCopy:
            "先免费识别一页 PDF 或图片；开通后在同一份 Score JSON 中继续修谱、移调、播放与导出。",
          footerLinks: {
            register: "注册账户",
            activate: "兑换激活码",
            checkout: "在线支付",
            scores: "乐谱工程",
            classrooms: "课堂管理",
            student: "学生中心",
            upload: "上传乐谱",
            jobs: "查看任务",
            billing: "账单与用量",
          },
          caption: "MusicXML 全功能乐谱工作台",
        }
      : {
          navItems: [
            { href: APP_ROUTES.home, label: "Studio" },
            { href: APP_ROUTES.scores, label: "Scores" },
            ...(teachingAvailable ? [{ href: APP_ROUTES.classrooms, label: "Classes" }] : []),
          ],
          scope: "PDF and image score workspace",
          primaryLabel: "Scan one page free",
          billing: "Billing",
          upgrade: "Upgrade",
          footerTitle: "The Digital Score",
          footerCopy:
            "Scan one PDF page or image for free, then continue correction, transposition, playback, and export from the same Score JSON project.",
          footerLinks: {
            register: "Create account",
            activate: "Redeem code",
            checkout: "Pay online",
            scores: "Score projects",
            classrooms: "Classes",
            student: "Student hub",
            upload: "Upload score",
            jobs: "Track jobs",
            billing: "Billing and usage",
          },
          caption: `${sonataCopy.currentScope} studio`,
        };

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="container header-inner">
          <Link href={APP_ROUTES.home} className="brand">
            <span className="brand-mark">
              <BrandIcon width={22} height={22} />
            </span>
            <span className="brand-copy">
              <span className="brand-title">ScoreTransposer</span>
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
            <AppLocaleSwitcher />
            <Link href={APP_ROUTES.billing} className="button button-secondary">{copy.billing}</Link>
            {checkoutAvailable ? <Link href={APP_ROUTES.checkout} className="button button-tertiary">{copy.upgrade}</Link> : null}
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
            <Link href={APP_ROUTES.billing}>{copy.footerLinks.billing}</Link>
            {locale === "zh-CN" ? <Link href={APP_ROUTES.activate}>{copy.footerLinks.activate}</Link> : null}
            {checkoutAvailable ? <Link href={APP_ROUTES.checkout}>{copy.footerLinks.checkout}</Link> : null}
            <Link href={APP_ROUTES.scores}>{copy.footerLinks.scores}</Link>
            {teachingAvailable ? <Link href={APP_ROUTES.classrooms}>{copy.footerLinks.classrooms}</Link> : null}
            {teachingAvailable ? <Link href={APP_ROUTES.student}>{copy.footerLinks.student}</Link> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
