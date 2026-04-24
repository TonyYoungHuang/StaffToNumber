import { PRODUCT_NAME } from "@score/shared";
import { config } from "../config.js";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

type PasswordResetEmailInput = {
  email: string;
  locale?: string | null;
  resetUrl: string;
  expiresHours: number;
};

type SupportConfirmationEmailInput = {
  referenceCode: string;
  locale?: string | null;
  contactName?: string | null;
  contactEmail: string;
  categoryLabel: string;
  subject: string;
  supportUrl: string;
};

type SupportNotificationEmailInput = {
  referenceCode: string;
  locale?: string | null;
  categoryLabel: string;
  contactName?: string | null;
  contactEmail: string;
  accountEmail?: string | null;
  subject: string;
  message: string;
  orderReference?: string | null;
  jobReference?: string | null;
  sourcePage?: string | null;
  sourceContext?: string | null;
  createdAt: string;
};

export function isTransactionalEmailEnabled() {
  return Boolean(config.resendApiKey && config.emailFromAddress);
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput) {
  const isChinese = input.locale === "zh-CN";
  const subject = isChinese
    ? `${PRODUCT_NAME} 密码重置链接`
    : `${PRODUCT_NAME} password reset link`;
  const text = isChinese
    ? [
        `你收到了 ${PRODUCT_NAME} 的密码重置请求。`,
        "",
        `账号邮箱：${input.email}`,
        `重置链接：${input.resetUrl}`,
        `链接有效期：${input.expiresHours} 小时`,
        "",
        `如果不是你本人发起，请忽略这封邮件，或联系 ${config.supportEmail}。`,
      ].join("\n")
    : [
        `You requested a password reset for ${PRODUCT_NAME}.`,
        "",
        `Account email: ${input.email}`,
        `Reset link: ${input.resetUrl}`,
        `This link expires in ${input.expiresHours} hour(s).`,
        "",
        `If you did not request this reset, ignore this email or contact ${config.supportEmail}.`,
      ].join("\n");
  const html = isChinese
    ? `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#111">
        <h2>${PRODUCT_NAME} 密码重置</h2>
        <p>你收到了一个密码重置请求。</p>
        <p><strong>账号邮箱：</strong>${input.email}</p>
        <p><a href="${input.resetUrl}">点击这里重置密码</a></p>
        <p>这个链接将在 ${input.expiresHours} 小时后失效。</p>
        <p>如果不是你本人发起，请忽略这封邮件，或联系 ${config.supportEmail}。</p>
      </div>`
    : `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#111">
        <h2>${PRODUCT_NAME} password reset</h2>
        <p>You requested a password reset.</p>
        <p><strong>Account email:</strong> ${input.email}</p>
        <p><a href="${input.resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in ${input.expiresHours} hour(s).</p>
        <p>If you did not request this reset, ignore this email or contact ${config.supportEmail}.</p>
      </div>`;

  return {
    subject,
    text,
    html,
  };
}

export function buildSupportConfirmationEmail(input: SupportConfirmationEmailInput) {
  const isChinese = input.locale === "zh-CN";
  const greetingName = input.contactName?.trim() || input.contactEmail;
  const subject = isChinese
    ? `[${input.referenceCode}] ${PRODUCT_NAME} 支持请求已收到`
    : `[${input.referenceCode}] ${PRODUCT_NAME} support request received`;
  const text = isChinese
    ? [
        `你好，${greetingName}：`,
        "",
        `我们已经收到你提交到 ${PRODUCT_NAME} 的支持请求。`,
        `工单编号：${input.referenceCode}`,
        `问题分类：${input.categoryLabel}`,
        `主题：${input.subject}`,
        "",
        `我们会根据提交内容继续跟进；如需补充资料，请直接回复本邮件或重新访问：${input.supportUrl}`,
        "",
        `支持邮箱：${config.supportEmail}`,
      ].join("\n")
    : [
        `Hello ${greetingName},`,
        "",
        `We received your support request for ${PRODUCT_NAME}.`,
        `Reference: ${input.referenceCode}`,
        `Category: ${input.categoryLabel}`,
        `Subject: ${input.subject}`,
        "",
        `If you need to add context, reply to this email or revisit ${input.supportUrl}.`,
        "",
        `Support email: ${config.supportEmail}`,
      ].join("\n");
  const html = isChinese
    ? `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#111">
        <h2>${PRODUCT_NAME} 支持请求已收到</h2>
        <p>你好，${escapeHtml(greetingName)}：</p>
        <p>我们已经收到你的支持请求。</p>
        <p><strong>工单编号：</strong>${escapeHtml(input.referenceCode)}</p>
        <p><strong>问题分类：</strong>${escapeHtml(input.categoryLabel)}</p>
        <p><strong>主题：</strong>${escapeHtml(input.subject)}</p>
        <p>如需补充资料，请直接回复本邮件，或访问 <a href="${escapeHtml(input.supportUrl)}">${escapeHtml(input.supportUrl)}</a>。</p>
        <p>支持邮箱：${escapeHtml(config.supportEmail)}</p>
      </div>`
    : `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#111">
        <h2>${PRODUCT_NAME} support request received</h2>
        <p>Hello ${escapeHtml(greetingName)},</p>
        <p>We received your support request.</p>
        <p><strong>Reference:</strong> ${escapeHtml(input.referenceCode)}</p>
        <p><strong>Category:</strong> ${escapeHtml(input.categoryLabel)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
        <p>If you need to add context, reply to this email or revisit <a href="${escapeHtml(input.supportUrl)}">${escapeHtml(input.supportUrl)}</a>.</p>
        <p>Support email: ${escapeHtml(config.supportEmail)}</p>
      </div>`;

  return {
    subject,
    text,
    html,
  };
}

export function buildSupportNotificationEmail(input: SupportNotificationEmailInput) {
  const localeLabel = input.locale === "zh-CN" ? "zh-CN" : "en";
  const subject = `[Support][${input.referenceCode}] ${input.categoryLabel} - ${input.subject}`;
  const lines = [
    `Reference: ${input.referenceCode}`,
    `Category: ${input.categoryLabel}`,
    `Locale: ${localeLabel}`,
    `Contact name: ${input.contactName?.trim() || "-"}`,
    `Contact email: ${input.contactEmail}`,
    `Account email: ${input.accountEmail?.trim() || "-"}`,
    `Order reference: ${input.orderReference?.trim() || "-"}`,
    `Job reference: ${input.jobReference?.trim() || "-"}`,
    `Source page: ${input.sourcePage?.trim() || "-"}`,
    `Source context: ${input.sourceContext?.trim() || "-"}`,
    `Submitted at: ${input.createdAt}`,
    "",
    "Message:",
    input.message,
  ];
  const htmlSections = [
    `<p><strong>Reference:</strong> ${escapeHtml(input.referenceCode)}</p>`,
    `<p><strong>Category:</strong> ${escapeHtml(input.categoryLabel)}</p>`,
    `<p><strong>Locale:</strong> ${escapeHtml(localeLabel)}</p>`,
    `<p><strong>Contact name:</strong> ${escapeHtml(input.contactName?.trim() || "-")}</p>`,
    `<p><strong>Contact email:</strong> ${escapeHtml(input.contactEmail)}</p>`,
    `<p><strong>Account email:</strong> ${escapeHtml(input.accountEmail?.trim() || "-")}</p>`,
    `<p><strong>Order reference:</strong> ${escapeHtml(input.orderReference?.trim() || "-")}</p>`,
    `<p><strong>Job reference:</strong> ${escapeHtml(input.jobReference?.trim() || "-")}</p>`,
    `<p><strong>Source page:</strong> ${escapeHtml(input.sourcePage?.trim() || "-")}</p>`,
    `<p><strong>Source context:</strong> ${escapeHtml(input.sourceContext?.trim() || "-")}</p>`,
    `<p><strong>Submitted at:</strong> ${escapeHtml(input.createdAt)}</p>`,
    `<hr style="border:none;border-top:1px solid #ddd;margin:20px 0" />`,
    `<p><strong>Message</strong></p>`,
    `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;background:#f7f7f7;padding:16px;border-radius:12px">${escapeHtml(input.message)}</pre>`,
  ];

  return {
    subject,
    text: lines.join("\n"),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#111">${htmlSections.join("")}</div>`,
  };
}

export async function sendTransactionalEmail(input: EmailInput) {
  if (!isTransactionalEmailEnabled()) {
    console.log("[email-preview]", JSON.stringify(input, null, 2));
    return { mode: "preview" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.emailFromAddress,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      reply_to: input.replyTo || config.emailReplyTo || undefined,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(payload || "Failed to send transactional email.");
  }

  return { mode: "resend" as const };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
