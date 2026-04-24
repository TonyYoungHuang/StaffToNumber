import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import {
  buildSupportConfirmationEmail,
  buildSupportNotificationEmail,
  sendTransactionalEmail,
} from "../lib/email.js";
import {
  createSupportRequest,
  listSupportRequests,
  type SupportRequestStatus,
  updateSupportRequestStatus,
} from "../repositories/support-repository.js";

const SUPPORT_CATEGORY_LABELS = {
  payment: {
    en: "Payment and order review",
    zh: "支付与订单核查",
  },
  activation: {
    en: "Activation and entitlement issue",
    zh: "激活与权限问题",
  },
  job: {
    en: "Upload or result issue",
    zh: "上传与结果问题",
  },
  privacy: {
    en: "Privacy or deletion request",
    zh: "隐私或删除请求",
  },
  general: {
    en: "General support",
    zh: "一般支持",
  },
} as const;

type SupportCategory = keyof typeof SUPPORT_CATEGORY_LABELS;
const SUPPORT_STATUSES: SupportRequestStatus[] = ["open", "in_review", "resolved", "closed"];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function trimToNull(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function sanitizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replaceAll("\r\n", "\n").trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 4000);
}

function resolveLocale(value: unknown) {
  return value === "zh-CN" ? "zh-CN" : "en";
}

function isSupportCategory(value: unknown): value is SupportCategory {
  return typeof value === "string" && value in SUPPORT_CATEGORY_LABELS;
}

function isSupportStatus(value: unknown): value is SupportRequestStatus {
  return typeof value === "string" && SUPPORT_STATUSES.includes(value as SupportRequestStatus);
}

function getSupportCategoryLabel(category: SupportCategory, locale: "en" | "zh-CN") {
  return locale === "zh-CN" ? SUPPORT_CATEGORY_LABELS[category].zh : SUPPORT_CATEGORY_LABELS[category].en;
}

export async function supportRoutes(app: FastifyInstance) {
  app.get(
    "/admin/support-requests",
    {
      preHandler: app.requireAdmin,
    },
    async (request, reply) => {
      const query = (request.query ?? {}) as { limit?: string; status?: string };
      const limit = query.limit ? Number(query.limit) : 100;

      if (query.status && !isSupportStatus(query.status)) {
        return reply.code(400).send({ error: "Invalid support status filter." });
      }

      const items = listSupportRequests({
        limit: Number.isFinite(limit) ? limit : 100,
        status: query.status && isSupportStatus(query.status) ? query.status : null,
      }).map((item) => ({
        id: item.id,
        referenceCode: item.reference_code,
        category: item.category,
        locale: item.locale,
        contactName: item.contact_name,
        contactEmail: item.contact_email,
        accountEmail: item.account_email,
        subject: item.subject,
        message: item.message,
        orderReference: item.order_reference,
        jobReference: item.job_reference,
        sourcePage: item.source_page,
        sourceContext: item.source_context,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      return {
        items,
        statuses: SUPPORT_STATUSES,
      };
    },
  );

  app.patch(
    "/admin/support-requests/:id",
    {
      preHandler: app.requireAdmin,
    },
    async (request, reply) => {
      const params = (request.params ?? {}) as { id?: string };
      const body = (request.body ?? {}) as { status?: string };

      if (!params.id?.trim()) {
        return reply.code(400).send({ error: "Support request id is required." });
      }

      if (!isSupportStatus(body.status)) {
        return reply.code(400).send({ error: "Please choose a valid support status." });
      }

      const updated = updateSupportRequestStatus(params.id.trim(), body.status);
      if (!updated) {
        return reply.code(404).send({ error: "Support request not found." });
      }

      return {
        ok: true,
        item: {
          id: updated.id,
          referenceCode: updated.reference_code,
          category: updated.category,
          locale: updated.locale,
          contactName: updated.contact_name,
          contactEmail: updated.contact_email,
          accountEmail: updated.account_email,
          subject: updated.subject,
          message: updated.message,
          orderReference: updated.order_reference,
          jobReference: updated.job_reference,
          sourcePage: updated.source_page,
          sourceContext: updated.source_context,
          status: updated.status,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        },
      };
    },
  );

  app.post("/support/requests", async (request, reply) => {
    const body = (request.body ?? {}) as {
      category?: string;
      locale?: string;
      contactName?: string;
      contactEmail?: string;
      accountEmail?: string;
      subject?: string;
      message?: string;
      orderReference?: string;
      jobReference?: string;
      sourcePage?: string;
      sourceContext?: string;
      website?: string;
    };

    if (trimToNull(body.website, 40)) {
      return reply.code(400).send({ error: "Request could not be accepted." });
    }

    if (!isSupportCategory(body.category)) {
      return reply.code(400).send({ error: "Please choose a valid support category." });
    }

    const locale = resolveLocale(body.locale);
    const contactName = trimToNull(body.contactName, 120);
    const contactEmail = typeof body.contactEmail === "string" ? normalizeEmail(body.contactEmail) : "";
    const accountEmail = trimToNull(body.accountEmail, 160);
    const subject = trimToNull(body.subject, 160);
    const message = sanitizeMessage(body.message);
    const orderReference = trimToNull(body.orderReference, 120);
    const jobReference = trimToNull(body.jobReference, 120);
    const sourcePage = trimToNull(body.sourcePage, 240);
    const sourceContext = trimToNull(body.sourceContext, 120);

    if (!contactEmail || !contactEmail.includes("@")) {
      return reply.code(400).send({ error: "Please enter a valid contact email address." });
    }

    if (accountEmail && !accountEmail.includes("@")) {
      return reply.code(400).send({ error: "Please enter a valid account email address." });
    }

    if (!subject || subject.length < 4) {
      return reply.code(400).send({ error: "Please enter a short subject so support can triage the request." });
    }

    if (!message || message.length < 10) {
      return reply.code(400).send({ error: "Please describe the issue in a bit more detail." });
    }

    const created = createSupportRequest({
      category: body.category,
      locale,
      contactName,
      contactEmail,
      accountEmail,
      subject,
      message,
      orderReference,
      jobReference,
      sourcePage,
      sourceContext,
    });

    if (!created) {
      return reply.code(500).send({ error: "Could not save the support request." });
    }

    const categoryLabel = getSupportCategoryLabel(body.category, locale);
    const supportUrl = `${config.publicSiteUrl.replace(/\/$/, "")}/support`;

    const notificationEmail = buildSupportNotificationEmail({
      referenceCode: created.reference_code,
      locale,
      categoryLabel,
      contactName,
      contactEmail,
      accountEmail,
      subject,
      message,
      orderReference,
      jobReference,
      sourcePage,
      sourceContext,
      createdAt: created.created_at,
    });

    const confirmationEmail = buildSupportConfirmationEmail({
      referenceCode: created.reference_code,
      locale,
      contactName,
      contactEmail,
      categoryLabel,
      subject,
      supportUrl,
    });

    const [supportDelivery, confirmationDelivery] = await Promise.allSettled([
      sendTransactionalEmail({
        to: config.supportEmail,
        subject: notificationEmail.subject,
        text: notificationEmail.text,
        html: notificationEmail.html,
        replyTo: contactEmail,
      }),
      sendTransactionalEmail({
        to: contactEmail,
        subject: confirmationEmail.subject,
        text: confirmationEmail.text,
        html: confirmationEmail.html,
        replyTo: config.supportEmail,
      }),
    ]);

    if (supportDelivery.status === "rejected") {
      app.log.error({ error: supportDelivery.reason, referenceCode: created.reference_code }, "Failed to send support notification email");
    }

    if (confirmationDelivery.status === "rejected") {
      app.log.error(
        { error: confirmationDelivery.reason, referenceCode: created.reference_code },
        "Failed to send support confirmation email",
      );
    }

    return reply.code(201).send({
      ok: true,
      referenceCode: created.reference_code,
      supportDelivery:
        supportDelivery.status === "fulfilled" ? supportDelivery.value.mode : "failed",
      confirmationDelivery:
        confirmationDelivery.status === "fulfilled" ? confirmationDelivery.value.mode : "failed",
    });
  });
}
