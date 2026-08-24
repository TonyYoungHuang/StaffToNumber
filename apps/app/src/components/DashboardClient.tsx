"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { CheckSealIcon, ClockPulseIcon, DownloadIcon, UserOrbitIcon, VaultIcon } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { clearStoredToken, getStoredToken } from "../lib/auth-storage";
import { accountActivationRoute, checkoutAvailable } from "../lib/release";
import { OperationsPanel } from "./OperationsPanel";
import { useAppLocale } from "./AppLocaleProvider";

type MePayload = {
  user: {
    id: string;
    email: string;
    createdAt: string;
    accountStatus: "active" | "deletion_pending";
    deletionRequestedAt: string | null;
    scheduledDeletionAt: string | null;
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
  const [privacyBusy, setPrivacyBusy] = useState<"export" | "delete" | "cancel" | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [privacyPassword, setPrivacyPassword] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");

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
            route: "乐谱工作台",
            routeValue: "扫描、编辑、互换与移调",
            routeBody: "所有流程统一基于 MusicXML 与 Score JSON，并支持播放、练习和多格式导出。",
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
            step1Title: "1. 导入或创建乐谱",
            step1Body: "可从 PDF、图片、MusicXML、MIDI、简谱或音频进入结构化乐谱流程。",
            step2Title: "2. 校对、编辑与练习",
            step2Body: "在统一修订历史中完成识别校对、图形编辑、移调、播放和分声部练习。",
            step3Title: "3. 导出交付版本",
            step3Body: "按当前正式修订生成 MusicXML、MIDI、PDF、图片或高质量音频。",
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
          privacy: {
            eyebrow: "隐私与数据",
            title: "管理你的数据副本和账户生命周期",
            body: "数据导出不包含密码、会话令牌、重置令牌或分享密钥。账户删除有 14 天宽限期，到期后删除乐谱、课堂和文件，并对必须保留的支付审计记录去标识化。",
            export: "下载数据副本",
            exporting: "正在生成数据副本...",
            password: "当前密码",
            confirmation: "输入 DELETE 确认",
            schedule: "申请删除账户",
            scheduling: "正在提交删除申请...",
            pending: "账户删除已进入宽限期",
            pendingBody: "计划删除时间",
            cancel: "取消账户删除",
            cancelling: "正在取消...",
            required: "请输入当前密码，并准确输入 DELETE。",
            scheduled: "删除申请已提交。当前会话已退出，可在宽限期内重新登录取消。",
            cancelled: "账户删除申请已取消。",
            exportReady: "数据副本已下载。",
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
            route: "Score studio",
            routeValue: "Scan, edit, convert, transpose",
            routeBody: "MusicXML and Score JSON power notation, playback, practice, and multi-format export.",
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
            step1Title: "1. Import or create a score",
            step1Body: "Start from PDF, images, MusicXML, MIDI, Jianpu, or audio and enter the structured score workflow.",
            step2Title: "2. Correct, edit, and practice",
            step2Body: "Use one revision history for OMR correction, visual editing, transposition, playback, and part practice.",
            step3Title: "3. Export a delivery version",
            step3Body: "Render the accepted revision as MusicXML, MIDI, PDF, images, or high-quality audio.",
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
          privacy: {
            eyebrow: "Privacy and data",
            title: "Manage your data copy and account lifecycle",
            body: "Exports exclude passwords, session tokens, reset tokens, and share secrets. Account deletion has a 14-day grace period, then removes scores, classroom data, and files while de-identifying payment audit records that must be retained.",
            export: "Download my data",
            exporting: "Preparing data export...",
            password: "Current password",
            confirmation: "Type DELETE to confirm",
            schedule: "Request account deletion",
            scheduling: "Scheduling deletion...",
            pending: "Account deletion is in its grace period",
            pendingBody: "Scheduled deletion",
            cancel: "Cancel account deletion",
            cancelling: "Cancelling...",
            required: "Enter your current password and type DELETE exactly.",
            scheduled: "Deletion is scheduled. This session is signed out; sign in again during the grace period to cancel.",
            cancelled: "Account deletion has been cancelled.",
            exportReady: "Your data copy has been downloaded.",
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

  async function downloadDataExport() {
    const token = getStoredToken();
    if (!token) return setPrivacyMessage(copy.signInFirst);
    setPrivacyBusy("export");
    setPrivacyMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/account/data-export`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Data export failed.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `scoretransposer-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setPrivacyMessage(copy.privacy.exportReady);
    } catch (error) {
      setPrivacyMessage(error instanceof Error ? error.message : "Data export failed.");
    } finally {
      setPrivacyBusy(null);
    }
  }

  async function scheduleDeletion() {
    const token = getStoredToken();
    if (!token) return setPrivacyMessage(copy.signInFirst);
    if (!privacyPassword || deletionConfirmation !== "DELETE") {
      setPrivacyMessage(copy.privacy.required);
      return;
    }
    setPrivacyBusy("delete");
    setPrivacyMessage(null);
    const result = await apiRequest<{ lifecycle: { scheduledDeletionAt: string | null } }>("/api/account/deletion", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: privacyPassword, confirmation: deletionConfirmation }),
    });
    setPrivacyBusy(null);
    if (!result.ok) return setPrivacyMessage(result.error);
    setProfile((current) => current ? {
      ...current,
      accountStatus: "deletion_pending",
      scheduledDeletionAt: result.data.lifecycle.scheduledDeletionAt,
      deletionRequestedAt: new Date().toISOString(),
    } : current);
    setPrivacyPassword("");
    setDeletionConfirmation("");
    clearStoredToken();
    setPrivacyMessage(copy.privacy.scheduled);
  }

  async function cancelDeletion() {
    const token = getStoredToken();
    if (!token) return setPrivacyMessage(copy.signInFirst);
    if (!privacyPassword) return setPrivacyMessage(copy.privacy.required);
    setPrivacyBusy("cancel");
    setPrivacyMessage(null);
    const result = await apiRequest<{ lifecycle: { status: "active" } }>("/api/account/deletion/cancel", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: privacyPassword }),
    });
    setPrivacyBusy(null);
    if (!result.ok) return setPrivacyMessage(result.error);
    setProfile((current) => current ? {
      ...current,
      accountStatus: "active",
      scheduledDeletionAt: null,
      deletionRequestedAt: null,
    } : current);
    setPrivacyPassword("");
    setPrivacyMessage(copy.privacy.cancelled);
  }

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
          <p className="helper-copy">{profile.entitlement.status === "active" ? copy.metrics.emailBody : (locale === "zh-CN" ? "当前已登录，可使用一次免费单页识谱并查看候选结果。" : "Signed in. You can use one free single-page scan and view its candidate result.")}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.entitlement}</p>
          <p className="metric-value">{translateEntitlementStatus(profile.entitlement.status, locale)}</p>
          <p className="helper-copy">{copy.metrics.entitlementBody}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.route}</p>
          <p className="metric-value">{profile.entitlement.status === "active" ? copy.metrics.routeValue : (locale === "zh-CN" ? "免费单页识谱" : "Free single-page scan")}</p>
          <p className="helper-copy">{profile.entitlement.status === "active" ? copy.metrics.routeBody : (locale === "zh-CN" ? "免费层不包含再次识别、校对、任务处理或导出。" : "Free access does not include another scan, correction, job processing, or export.")}</p>
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
                <p className="helper-copy">{profile.entitlement.status === "active" ? copy.workflow.step1Body : (locale === "zh-CN" ? "上传一页 PDF 或一张乐谱图片，生成可查看的识别候选。" : "Upload one PDF page or score image to create a viewable recognition candidate.")}</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>{copy.workflow.step2Title}</strong>
                <p className="helper-copy">{profile.entitlement.status === "active" ? copy.workflow.step2Body : (locale === "zh-CN" ? "在“我的乐谱”查看候选；完整校对和编辑需要有效权限。" : "View the candidate in My Scores. Full correction and editing require active access.")}</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>{copy.workflow.step3Title}</strong>
                <p className="helper-copy">{profile.entitlement.status === "active" ? copy.workflow.step3Body : (locale === "zh-CN" ? "需要继续处理时，可兑换已购买的激活码；当前不提供在线付款。" : "Redeem a purchased activation code when you need full processing. Online checkout is not currently available.")}</p>
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
            <Link href={accountActivationRoute} className="button button-primary">
              {checkoutAvailable ? copy.actions.checkout : copy.actions.redeem}
            </Link>
            <Link href={`${APP_ROUTES.scores}#free-scan`} className="button button-primary">
              {profile.entitlement.status === "active" ? copy.actions.uploads : (locale === "zh-CN" ? "打开免费编辑" : "Open free editing")}
            </Link>
            {profile.entitlement.status === "active" ? <Link href={APP_ROUTES.jobs} className="button button-secondary">{copy.actions.jobs}</Link> : null}
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

      <div className="surface-panel stack-lg">
        <div className="inline-meta">
          <span className="info-icon tertiary">
            <VaultIcon width={20} height={20} />
          </span>
          <div className="stack-xs">
            <p className="eyebrow">{copy.privacy.eyebrow}</p>
            <h2 className="card-title">{copy.privacy.title}</h2>
          </div>
        </div>
        <p className="body-copy">{copy.privacy.body}</p>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={() => void downloadDataExport()} disabled={privacyBusy !== null}>
            <DownloadIcon width={18} height={18} />
            {privacyBusy === "export" ? copy.privacy.exporting : copy.privacy.export}
          </button>
        </div>

        {profile.accountStatus === "deletion_pending" ? (
          <div className="mini-card stack-md">
            <div className="stack-xs">
              <span className="status-chip tone-amber">{copy.privacy.pending}</span>
              <p className="helper-copy">
                {copy.privacy.pendingBody}: {profile.scheduledDeletionAt ? formatLocal(profile.scheduledDeletionAt, locale) : "-"}
              </p>
            </div>
            <label className="field-group">
              <span className="field-label">{copy.privacy.password}</span>
              <input
                className="field-control"
                type="password"
                value={privacyPassword}
                onChange={(event) => setPrivacyPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <div className="button-row">
              <button type="button" className="button button-primary" onClick={() => void cancelDeletion()} disabled={privacyBusy !== null}>
                {privacyBusy === "cancel" ? copy.privacy.cancelling : copy.privacy.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="mini-card stack-md">
            <div className="field-row">
              <label className="field-group">
                <span className="field-label">{copy.privacy.password}</span>
                <input
                  className="field-control"
                  type="password"
                  value={privacyPassword}
                  onChange={(event) => setPrivacyPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="field-group">
                <span className="field-label">{copy.privacy.confirmation}</span>
                <input
                  className="field-control"
                  value={deletionConfirmation}
                  onChange={(event) => setDeletionConfirmation(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="button button-secondary" onClick={() => void scheduleDeletion()} disabled={privacyBusy !== null}>
                {privacyBusy === "delete" ? copy.privacy.scheduling : copy.privacy.schedule}
              </button>
            </div>
          </div>
        )}
        {privacyMessage ? <p className="helper-copy" role="status">{privacyMessage}</p> : null}
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
