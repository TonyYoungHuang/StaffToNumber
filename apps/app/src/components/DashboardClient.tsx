"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { CheckSealIcon, ClockPulseIcon, UserOrbitIcon, VaultIcon } from "@score/ui";
import { apiRequest } from "../lib/api";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";
import { OperationsPanel } from "./OperationsPanel";
import { useAppLocale } from "./AppLocaleProvider";

type MePayload = {
  user: {
    id: string;
    email: string;
    createdAt: string;
    entitlement: {
      status: "inactive" | "active" | "expired";
      startsAt: string | null;
      endsAt: string | null;
    };
  };
};

export function DashboardClient() {
  const { locale } = useAppLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MePayload["user"] | null>(null);

  const copy =
    locale === "zh-CN"
      ? {
          signInFirst: "请先登录后再查看控制台。",
          loadingEyebrow: "正在读取账户资料",
          loadingTitle: "账户详情加载中...",
          accessEyebrow: "需要登录",
          accessTitle: "这个工作台区域需要有效登录。",
          signIn: "登录",
          createAccount: "创建账户",
          lookupEyebrow: "账户查询",
          lookupTitle: "未找到该账户。",
          metrics: {
            email: "账户邮箱",
            emailBody: "当前已登录，可以继续上传文件或创建任务。",
            entitlement: "授权状态",
            entitlementBody: "一年期访问权限由激活码统一管理。",
            route: "当前转换方向",
            routeValue: "五线谱 -> 简谱",
            routeBody: "当前版本不提供反向转换或移调。",
          },
          profile: { eyebrow: "资料", title: "账户概览", email: "邮箱", created: "创建时间" },
          entitlement: {
            eyebrow: "授权",
            title: "访问有效期",
            starts: "开始时间",
            ends: "结束时间",
            inactive: "尚未生效",
            missing: "暂无授权",
          },
          workflow: {
            eyebrow: "工作流",
            title: "下一步操作建议",
            step1Title: "1. 上传五线谱 PDF",
            step1Body: "当前版本只接收 PDF 作为进入转换管线的源文件。",
            step2Title: "2. 创建转换任务",
            step2Body: "系统会跟踪 queued、processing、completed 和 failed 四种状态。",
            step3Title: "3. 下载正式结果或草稿包",
            step3Body: "低置信度页面会保留在草稿包中，而不会拖累更高质量页面。",
          },
          actions: {
            eyebrow: "操作",
            title: "管理当前工作台",
            checkout: "在线支付开通",
            uploads: "打开上传页",
            jobs: "打开任务页",
            redeem: "兑换新的激活码",
            supportAdmin: "打开工单后台",
            signOut: "退出登录",
          },
        }
      : {
          signInFirst: "Please sign in to view the dashboard.",
          loadingEyebrow: "Fetching profile",
          loadingTitle: "Loading account details...",
          accessEyebrow: "Access required",
          accessTitle: "This studio section needs a valid sign-in.",
          signIn: "Sign in",
          createAccount: "Create account",
          lookupEyebrow: "Account lookup",
          lookupTitle: "Account not found.",
          metrics: {
            email: "Account email",
            emailBody: "Signed in and ready for upload or job creation.",
            entitlement: "Entitlement",
            entitlementBody: "One-year access is managed through activation codes.",
            route: "Current route",
            routeValue: "Staff -> Jianpu",
            routeBody: "No reverse conversion or transposition in this release.",
          },
          profile: { eyebrow: "Profile", title: "Account overview", email: "Email", created: "Created" },
          entitlement: {
            eyebrow: "Entitlement",
            title: "Access window",
            starts: "Starts",
            ends: "Ends",
            inactive: "Not active yet",
            missing: "No entitlement",
          },
          workflow: {
            eyebrow: "Workflow",
            title: "Next operational steps",
            step1Title: "1. Upload staff PDF",
            step1Body: "Source material enters the pipeline only as PDF in the current build.",
            step2Title: "2. Queue conversion job",
            step2Body: "The app tracks queued, processing, completed, and failed states.",
            step3Title: "3. Download final or draft package",
            step3Body: "Weak pages can stay in draft bundles instead of degrading stronger pages.",
          },
          actions: {
            eyebrow: "Actions",
            title: "Manage the studio",
            checkout: "Pay online",
            uploads: "Open uploads",
            jobs: "Open jobs",
            redeem: "Redeem another code",
            supportAdmin: "Open support admin",
            signOut: "Sign out",
          },
        };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      setError(copy.signInFirst);
      return;
    }

    apiRequest<MePayload>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((result) => {
      setLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setProfile(result.data.user);
    });
  }, [copy.signInFirst]);

  const entitlementTone = useMemo(() => {
    if (!profile) return "tone-neutral";
    if (profile.entitlement.status === "active") return "tone-green";
    if (profile.entitlement.status === "expired") return "tone-red";
    return "tone-amber";
  }, [profile]);

  if (loading) {
    return (
      <div className="surface-panel stack-sm">
        <p className="eyebrow">{copy.loadingEyebrow}</p>
        <h2 className="card-title">{copy.loadingTitle}</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.accessEyebrow}</p>
          <h2 className="card-title">{copy.accessTitle}</h2>
          <p className="body-copy">{error}</p>
        </div>
        <div className="button-row">
          <Link href={APP_ROUTES.login} className="button button-primary">
            {copy.signIn}
          </Link>
          <Link href={APP_ROUTES.register} className="button button-secondary">
            {copy.createAccount}
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="surface-panel stack-sm">
        <p className="eyebrow">{copy.lookupEyebrow}</p>
        <h2 className="card-title">{copy.lookupTitle}</h2>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.email}</p>
          <p className="metric-value">{profile.email}</p>
          <p className="helper-copy">{copy.metrics.emailBody}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.entitlement}</p>
          <p className="metric-value">{translateEntitlementStatus(profile.entitlement.status, locale)}</p>
          <p className="helper-copy">{copy.metrics.entitlementBody}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.route}</p>
          <p className="metric-value">{copy.metrics.routeValue}</p>
          <p className="helper-copy">{copy.metrics.routeBody}</p>
        </div>
      </div>

      <div className="split-layout">
        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon">
              <UserOrbitIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">{copy.profile.eyebrow}</p>
              <h2 className="card-title">{copy.profile.title}</h2>
            </div>
          </div>
          <div className="list-grid">
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.profile.email}</p>
              <p className="item-title">{profile.email}</p>
            </div>
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.profile.created}</p>
              <p className="item-title">{formatLocal(profile.createdAt, locale)}</p>
            </div>
          </div>
        </div>

        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon tertiary">
              <VaultIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">{copy.entitlement.eyebrow}</p>
              <h2 className="card-title">{copy.entitlement.title}</h2>
            </div>
          </div>
          <span className={`status-chip ${entitlementTone}`}>{translateEntitlementStatus(profile.entitlement.status, locale)}</span>
          <div className="list-grid">
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.entitlement.starts}</p>
              <p className="item-title">{profile.entitlement.startsAt ? formatLocal(profile.entitlement.startsAt, locale) : copy.entitlement.inactive}</p>
            </div>
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.entitlement.ends}</p>
              <p className="item-title">{profile.entitlement.endsAt ? formatLocal(profile.entitlement.endsAt, locale) : copy.entitlement.missing}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="info-grid">
        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon">
              <ClockPulseIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">{copy.workflow.eyebrow}</p>
              <h2 className="card-title">{copy.workflow.title}</h2>
            </div>
          </div>
          <div className="editorial-points">
            <div className="editorial-point">
              <div>
                <strong>{copy.workflow.step1Title}</strong>
                <p className="helper-copy">{copy.workflow.step1Body}</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>{copy.workflow.step2Title}</strong>
                <p className="helper-copy">{copy.workflow.step2Body}</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>{copy.workflow.step3Title}</strong>
                <p className="helper-copy">{copy.workflow.step3Body}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-panel stack-lg">
          <div className="inline-meta">
            <span className="info-icon tertiary">
              <CheckSealIcon width={20} height={20} />
            </span>
            <div className="stack-xs">
              <p className="eyebrow">{copy.actions.eyebrow}</p>
              <h2 className="card-title">{copy.actions.title}</h2>
            </div>
          </div>
          <div className="button-row">
            <Link href={APP_ROUTES.checkout} className="button button-primary">
              {copy.actions.checkout}
            </Link>
            <Link href={APP_ROUTES.upload} className="button button-primary">
              {copy.actions.uploads}
            </Link>
            <Link href={APP_ROUTES.jobs} className="button button-secondary">
              {copy.actions.jobs}
            </Link>
            {locale === "zh-CN" ? (
              <Link href={APP_ROUTES.activate} className="button button-tertiary">
                {copy.actions.redeem}
              </Link>
            ) : null}
            <Link href={APP_ROUTES.adminSupport} className="button button-tertiary">
              {copy.actions.supportAdmin}
            </Link>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              clearStoredToken();
              window.location.href = APP_ROUTES.login;
            }}
          >
            {copy.actions.signOut}
          </button>
        </div>
      </div>

      <OperationsPanel email={profile.email} />
    </div>
  );
}

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

function translateEntitlementStatus(status: MePayload["user"]["entitlement"]["status"], locale: string) {
  if (locale === "zh-CN") {
    switch (status) {
      case "active":
        return "有效";
      case "expired":
        return "已过期";
      default:
        return "未激活";
    }
  }

  switch (status) {
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    default:
      return "Inactive";
  }
}
