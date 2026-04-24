"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { buildSupportTemplates, PUBLIC_SITE_URL, SUPPORT_EMAIL } from "../lib/support";
import { useAppLocale } from "./AppLocaleProvider";

type ServiceStatusItem = {
  key: string;
  label: string;
  status: "ok" | "warning" | "error" | "disabled";
  message: string;
  checkedAt?: string | null;
};

type SystemStatusPayload = {
  overallStatus: "ok" | "warning" | "error";
  checkedAt: string;
  supportEmail: string;
  services: ServiceStatusItem[];
};

export function OperationsPanel({ email: _email }: { email?: string | null }) {
  const { locale } = useAppLocale();
  const token = useMemo(() => getStoredToken(), []);
  const [statusPayload, setStatusPayload] = useState<SystemStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest<SystemStatusPayload>("/api/system/status", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((result) => {
      setLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setStatusPayload(result.data);
    });
  }, [token]);

  const supportTemplates = useMemo(() => buildSupportTemplates(locale), [locale]);
  const copy =
    locale === "zh-CN"
      ? {
          opsEyebrow: "运行状态",
          opsTitle: "基础健康可视化",
          opsLoading: "正在检查 API、存储、Worker、支付和邮件配置状态...",
          opsError: "暂时无法读取当前运行状态。",
          opsChecked: "最近检查",
          supportEyebrow: "支持入口",
          supportTitle: "站内 Support 表单",
          supportBody:
            "这些入口会跳到站内 Support 表单，并把问题类别预先选好。提交后 API 会记录请求，并自动发送支持确认邮件。",
          openForm: "打开表单",
          supportPage: "公开支持页",
        }
      : {
          opsEyebrow: "Operations",
          opsTitle: "Basic health visibility",
          opsLoading: "Checking API, storage, worker, payment, and email status...",
          opsError: "Could not load the current runtime status.",
          opsChecked: "Last checked",
          supportEyebrow: "Support entry",
          supportTitle: "On-site support form",
          supportBody:
            "These links open the on-site support form with the category preselected. Submissions go to the API and automatically trigger a confirmation email.",
          openForm: "Open form",
          supportPage: "Public support page",
        };

  return (
    <div className="info-grid">
      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.opsEyebrow}</p>
          <h2 className="card-title">{copy.opsTitle}</h2>
          {loading ? <p className="body-copy">{copy.opsLoading}</p> : null}
          {error ? <p className="form-status error">{copy.opsError} {error}</p> : null}
          {statusPayload ? (
            <p className="micro-copy">
              {copy.opsChecked}: {formatLocal(statusPayload.checkedAt, locale)}
            </p>
          ) : null}
        </div>

        <div className="list-grid">
          {(statusPayload?.services ?? []).map((service) => (
            <div key={service.key} className="list-item">
              <div className="list-item-content">
                <p className="item-title">{service.label}</p>
                <p className="helper-copy">{service.message}</p>
                {service.checkedAt ? <p className="micro-copy">{formatLocal(service.checkedAt, locale)}</p> : null}
              </div>
              <span className={`status-chip ${mapTone(service.status)}`}>{translateStatus(service.status, locale)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.supportEyebrow}</p>
          <h2 className="card-title">{copy.supportTitle}</h2>
          <p className="body-copy">{copy.supportBody}</p>
        </div>

        <div className="list-grid">
          {supportTemplates.map((template) => (
            <div key={template.key} className="list-item">
              <div className="list-item-content">
                <p className="item-title">{template.title}</p>
                <p className="helper-copy">{template.description}</p>
                <p className="micro-copy">{SUPPORT_EMAIL}</p>
              </div>
              <a href={template.href} className="button button-secondary button-ghost">
                {copy.openForm}
              </a>
            </div>
          ))}
        </div>

        <div className="button-row">
          <a href={`${PUBLIC_SITE_URL}/support`} className="button button-tertiary">
            {copy.supportPage}
          </a>
        </div>
      </section>
    </div>
  );
}

function mapTone(status: ServiceStatusItem["status"]) {
  switch (status) {
    case "ok":
      return "tone-green";
    case "warning":
      return "tone-amber";
    case "error":
      return "tone-red";
    default:
      return "tone-neutral";
  }
}

function translateStatus(status: ServiceStatusItem["status"], locale: string) {
  if (locale === "zh-CN") {
    switch (status) {
      case "ok":
        return "正常";
      case "warning":
        return "注意";
      case "error":
        return "异常";
      default:
        return "关闭";
    }
  }

  switch (status) {
    case "ok":
      return "OK";
    case "warning":
      return "Warning";
    case "error":
      return "Error";
    default:
      return "Disabled";
  }
}

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}
