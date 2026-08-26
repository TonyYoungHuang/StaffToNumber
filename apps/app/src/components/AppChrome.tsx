"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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
import { getStoredToken } from "../lib/auth-storage";
import { PUBLIC_SITE_URL } from "../lib/support";
import { AppLocaleSwitcher } from "./AppLocaleSwitcher";
import { useAppLocale } from "./AppLocaleProvider";

export function AppChrome({ children }: { children: ReactNode }) {
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

  const copy = locale === "zh-CN"
    ? {
        scores: "我的乐谱", scanner: "扫描识谱", editor: "在线编辑", transpose: "移调", library: "曲库", pricing: "价格",
        classes: "课堂", help: "帮助", guide: "使用指南", contact: "联系我们", billing: "账单", credits: "积分", upgrade: "升级",
        primaryLabel: "免费编辑", menu: "打开导航菜单", closeMenu: "关闭导航菜单",
        caption: "PDF / 图片五线谱识别工作台", footerTitle: "ScoreTransposer",
        footerCopy: "免费从一份完整多页 PDF 或图片创建一个终身乐谱项目，并继续校正、转简谱、移调、播放、分享与导出。",
        footer: { register: "注册账户", activate: "兑换激活码", checkout: "在线支付", scores: "我的乐谱", classes: "课堂管理", about: "关于我们", support: "帮助与联系", privacy: "隐私说明" },
      }
    : {
        scores: "My scores", scanner: "Scanner", editor: "Editor", transpose: "Transpose", library: "Score library", pricing: "Pricing",
        classes: "Classes", help: "Help", guide: "Guide", contact: "Contact us", billing: "Billing", credits: "credits", upgrade: "Upgrade",
        primaryLabel: "Edit for free", menu: "Open navigation menu", closeMenu: "Close navigation menu",
        caption: "PDF and image score scanner", footerTitle: "ScoreTransposer",
        footerCopy: "Create one lifetime free score project from a complete PDF or image, then correct, convert, transpose, play, share, and export it.",
        footer: { register: "Create account", activate: "Redeem code", checkout: "Pay online", scores: "My scores", classes: "Classes", about: "About", support: "Support", privacy: "Privacy" },
      };

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
      : { href: APP_ROUTES.billing, label: `${remainingCredits} ${copy.credits}`, tone: "credit", icon: <SparkIcon width={16} height={16} /> },
    ...(checkoutAvailable ? [{ href: APP_ROUTES.checkout, label: copy.upgrade, tone: "tertiary" as const }] : []),
    { href: primaryHref, label: copy.primaryLabel, tone: "primary", icon: <ArrowNorthEastIcon width={16} height={16} /> },
  ];
  const footerLinks = [
    { href: APP_ROUTES.register, label: copy.footer.register },
    { href: APP_ROUTES.billing, label: copy.billing },
    ...(locale === "zh-CN" ? [{ href: APP_ROUTES.activate, label: copy.footer.activate }] : []),
    ...(checkoutAvailable ? [{ href: APP_ROUTES.checkout, label: copy.footer.checkout }] : []),
    { href: APP_ROUTES.scores, label: copy.footer.scores },
    { href: publicHref("/about"), label: copy.footer.about },
    { href: publicHref("/support"), label: copy.footer.support },
    { href: publicHref("/privacy"), label: copy.footer.privacy },
    ...(teachingAvailable ? [{ href: APP_ROUTES.classrooms, label: copy.footer.classes }] : []),
  ];

  return (
    <div className="app-frame">
      <SiteShellHeader
        brandHref={publicHref("/")}
        brandCaption={copy.caption}
        navItems={navItems}
        actions={actions}
        localeControl={<AppLocaleSwitcher />}
        navLabel={locale === "zh-CN" ? "主导航" : "Primary navigation"}
        openMenuLabel={copy.menu}
        closeMenuLabel={copy.closeMenu}
        linkComponent={Link}
      />
      <main className="app-main">{children}</main>
      <SiteShellFooter
        title={copy.footerTitle}
        description={copy.footerCopy}
        links={footerLinks}
        localeControl={<AppLocaleSwitcher />}
        linkComponent={Link}
      />
    </div>
  );
}
