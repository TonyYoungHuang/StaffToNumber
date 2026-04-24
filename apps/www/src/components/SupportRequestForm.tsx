"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { apiRequest } from "../lib/api";

type SupportCategory = "payment" | "activation" | "job" | "privacy" | "general";

type SupportRequestResponse = {
  ok: true;
  referenceCode: string;
  supportDelivery: "resend" | "preview" | "failed";
  confirmationDelivery: "resend" | "preview" | "failed";
};

type SupportRequestFormProps = {
  locale: string;
  supportEmail: string;
};

const VALID_CATEGORIES: SupportCategory[] = ["payment", "activation", "job", "privacy", "general"];

function parseCategory(value: string | null): SupportCategory {
  return value && VALID_CATEGORIES.includes(value as SupportCategory) ? (value as SupportCategory) : "general";
}

export function SupportRequestForm({ locale, supportEmail }: SupportRequestFormProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<SupportCategory>(parseCategory(searchParams.get("category")));
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [jobReference, setJobReference] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [subjectDirty, setSubjectDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);

  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "提交支持请求",
          title: "站内 Support 表单",
          body:
            "直接在站内提交支持请求。表单会发送到 API，系统会记录工单，并自动向你的联系邮箱发送确认邮件。",
          categoryLabel: "问题类别",
          nameLabel: "联系人姓名（可选）",
          contactEmailLabel: "联系邮箱",
          accountEmailLabel: "账号邮箱（可选）",
          orderReferenceLabel: "订单号 / 支付参考（可选）",
          jobReferenceLabel: "任务号 / 文件名（可选）",
          subjectLabel: "主题",
          messageLabel: "问题描述",
          messageHint: "请尽量写清楚触发步骤、出现时间、报错现象，以及你已经尝试过的操作。",
          submitting: "提交中...",
          submit: "提交支持请求",
          reset: "切换到公开支持邮箱",
          fallback: `若自动邮件暂时不可用，仍可直接写信到 ${supportEmail}`,
          successSent: (referenceCode: string) =>
            `已收到你的请求，编号 ${referenceCode}。支持确认邮件已经发送，请留意收件箱。`,
          successPreview: (referenceCode: string) =>
            `已收到你的请求，编号 ${referenceCode}。当前环境未启用正式邮件服务，确认邮件内容已写入 API 预览日志。`,
          successFailed: (referenceCode: string) =>
            `已收到你的请求，编号 ${referenceCode}。但确认邮件暂时发送失败，可直接引用该编号联系支持。`,
          categories: {
            payment: {
              label: "支付 / 订单",
              helper: "支付成功但没看到激活码、回跳异常、重复扣款等。",
              subject: "支付 / 订单核查请求",
            },
            activation: {
              label: "激活 / 权限",
              helper: "激活码无法兑换、权限未生效、到期时间异常等。",
              subject: "激活 / 权限问题",
            },
            job: {
              label: "上传 / 结果",
              helper: "PDF 上传失败、任务卡住、结果下载异常、final / draft 争议。",
              subject: "上传 / 结果支持请求",
            },
            privacy: {
              label: "隐私 / 删除",
              helper: "删除数据、导出数据或隐私相关人工处理。",
              subject: "隐私 / 删除请求",
            },
            general: {
              label: "其他",
              helper: "不属于以上分类，或需要人工判断该走哪条支持流程。",
              subject: "一般支持请求",
            },
          },
        }
      : {
          eyebrow: "Submit a request",
          title: "On-site support form",
          body:
            "Submit support directly on the site. The form posts to the API, creates a tracked request, and automatically sends a confirmation email to your contact inbox.",
          categoryLabel: "Support category",
          nameLabel: "Contact name (optional)",
          contactEmailLabel: "Contact email",
          accountEmailLabel: "Account email (optional)",
          orderReferenceLabel: "Order id / payment reference (optional)",
          jobReferenceLabel: "Job id / file name (optional)",
          subjectLabel: "Subject",
          messageLabel: "Issue details",
          messageHint: "Include the trigger steps, approximate time, visible error or symptom, and anything you already tried.",
          submitting: "Submitting...",
          submit: "Submit support request",
          reset: "Use public support email",
          fallback: `If automated email is temporarily unavailable, you can still write directly to ${supportEmail}`,
          successSent: (referenceCode: string) =>
            `Your request has been received as ${referenceCode}. The confirmation email has been sent.`,
          successPreview: (referenceCode: string) =>
            `Your request has been received as ${referenceCode}. Transactional email is not configured in this environment, so the confirmation was written to API preview logs.`,
          successFailed: (referenceCode: string) =>
            `Your request has been received as ${referenceCode}, but the confirmation email could not be sent automatically. Use this reference if you contact support directly.`,
          categories: {
            payment: {
              label: "Payment / order",
              helper: "Successful checkout without activation code, return-path issues, duplicate charge concerns, or manual review.",
              subject: "Payment / order review request",
            },
            activation: {
              label: "Activation / access",
              helper: "Redemption fails, access is missing, or entitlement dates look wrong.",
              subject: "Activation / entitlement issue",
            },
            job: {
              label: "Upload / result",
              helper: "Upload failures, stalled jobs, broken downloads, or final-versus-draft questions.",
              subject: "Upload / result support request",
            },
            privacy: {
              label: "Privacy / deletion",
              helper: "Deletion, export, or another privacy-related manual review.",
              subject: "Privacy / deletion request",
            },
            general: {
              label: "General",
              helper: "Anything else, or when you want support to route the issue for you.",
              subject: "General support request",
            },
          },
        };

  const selectedCategory = copy.categories[category];
  const sourceContext = useMemo(() => {
    const source = searchParams.get("source")?.trim();
    return source ? source.slice(0, 120) : "public-site";
  }, [searchParams]);

  useEffect(() => {
    const queryCategory = parseCategory(searchParams.get("category"));
    setCategory((current) => (current === queryCategory ? current : queryCategory));
  }, [searchParams]);

  useEffect(() => {
    if (!subjectDirty) {
      setSubject(selectedCategory.subject);
    }
  }, [selectedCategory.subject, subjectDirty]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setStatusKind(null);

    const result = await apiRequest<SupportRequestResponse>("/api/support/requests", {
      method: "POST",
      body: JSON.stringify({
        category,
        locale,
        contactName,
        contactEmail,
        accountEmail,
        orderReference,
        jobReference,
        subject,
        message,
        sourcePage: pathname,
        sourceContext,
        website,
      }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    const payload = result.data;
    if (payload.confirmationDelivery === "resend") {
      setStatus(copy.successSent(payload.referenceCode));
    } else if (payload.confirmationDelivery === "preview") {
      setStatus(copy.successPreview(payload.referenceCode));
    } else {
      setStatus(copy.successFailed(payload.referenceCode));
    }

    setStatusKind("success");
    setOrderReference("");
    setJobReference("");
    setMessage("");
    setSubjectDirty(false);
    setSubject(selectedCategory.subject);
    setWebsite("");
  }

  return (
    <section id="support-form" className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      <div className="stack-sm">
        <span className="field-label">{copy.categoryLabel}</span>
        <div className="button-row">
          {VALID_CATEGORIES.map((item) => {
            const categoryCopy = copy.categories[item];
            const isActive = item === category;

            return (
              <button
                key={item}
                type="button"
                className={`button ${isActive ? "button-tertiary" : "button-secondary"}`}
                onClick={() => {
                  setCategory(item);
                  if (!subjectDirty) {
                    setSubject(copy.categories[item].subject);
                  }
                }}
              >
                {categoryCopy.label}
              </button>
            );
          })}
        </div>
        <p className="helper-copy">{selectedCategory.helper}</p>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="field-row">
          <label className="field-group" style={{ flex: 1 }}>
            <span className="field-label">{copy.nameLabel}</span>
            <input
              className="field-control"
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              maxLength={120}
            />
          </label>
          <label className="field-group" style={{ flex: 1 }}>
            <span className="field-label">{copy.contactEmailLabel}</span>
            <input
              className="field-control"
              type="email"
              required
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              maxLength={160}
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field-group" style={{ flex: 1 }}>
            <span className="field-label">{copy.accountEmailLabel}</span>
            <input
              className="field-control"
              type="email"
              value={accountEmail}
              onChange={(event) => setAccountEmail(event.target.value)}
              maxLength={160}
            />
          </label>
          <label className="field-group" style={{ flex: 1 }}>
            <span className="field-label">{copy.orderReferenceLabel}</span>
            <input
              className="field-control"
              type="text"
              value={orderReference}
              onChange={(event) => setOrderReference(event.target.value)}
              maxLength={120}
            />
          </label>
        </div>

        <label className="field-group">
          <span className="field-label">{copy.jobReferenceLabel}</span>
          <input
            className="field-control"
            type="text"
            value={jobReference}
            onChange={(event) => setJobReference(event.target.value)}
            maxLength={120}
          />
        </label>

        <label className="field-group">
          <span className="field-label">{copy.subjectLabel}</span>
          <input
            className="field-control"
            type="text"
            required
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setSubjectDirty(true);
            }}
            maxLength={160}
          />
        </label>

        <label className="field-group">
          <span className="field-label">{copy.messageLabel}</span>
          <textarea
            className="field-control"
            required
            rows={7}
            style={{ minHeight: 180, resize: "vertical" }}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={4000}
          />
          <p className="helper-copy">{copy.messageHint}</p>
        </label>

        <label className="sr-only">
          Website
          <input type="text" value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" />
        </label>

        <div className="button-row">
          <button type="submit" disabled={submitting} className="public-button primary">
            {submitting ? copy.submitting : copy.submit}
          </button>
          <a href={`mailto:${supportEmail}`} className="public-button secondary">
            {copy.reset}
          </a>
        </div>
      </form>

      <p className="helper-copy">{copy.fallback}</p>
      {status && statusKind ? <p className={`form-status ${statusKind}`}>{status}</p> : null}
    </section>
  );
}
