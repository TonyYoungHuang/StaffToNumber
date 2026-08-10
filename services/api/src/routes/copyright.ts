import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { sendTransactionalEmail } from "../lib/email.js";
import {
  COPYRIGHT_COMPLAINT_STATUSES,
  createCopyrightComplaint,
  findCopyrightComplaintById,
  findPublicCopyrightComplaint,
  listCopyrightComplaintEvents,
  listCopyrightComplaints,
  transitionCopyrightComplaint,
  type CopyrightComplaintRow,
  type CopyrightComplaintStatus,
  type CopyrightRightsBasis,
} from "../repositories/copyright-complaint-repository.js";

function trimText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\r\n", "\n").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 160) : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function parseUrls(value: unknown, maxItems: number) {
  const values = Array.isArray(value) ? value : [];
  if (values.length < 1 || values.length > maxItems) return null;
  const urls: string[] = [];
  for (const item of values) {
    if (typeof item !== "string" || item.length > 1000) return null;
    try {
      const url = new URL(item.trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") return null;
      url.hash = "";
      urls.push(url.toString());
    } catch {
      return null;
    }
  }
  return [...new Set(urls)];
}

function targetHostAllowed(value: string) {
  const host = new URL(value).hostname.toLowerCase();
  const configuredHosts = [config.publicSiteUrl, config.publicAppUrl].map((item) => new URL(item).hostname.toLowerCase());
  return configuredHosts.includes(host)
    || host === "scoretransposer.com"
    || host.endsWith(".scoretransposer.com")
    || (config.nodeEnv !== "production" && ["localhost", "127.0.0.1"].includes(host));
}

function isStatus(value: unknown): value is CopyrightComplaintStatus {
  return typeof value === "string" && COPYRIGHT_COMPLAINT_STATUSES.includes(value as CopyrightComplaintStatus);
}

function serializeComplaint(complaint: CopyrightComplaintRow) {
  return {
    id: complaint.id,
    referenceCode: complaint.reference_code,
    locale: complaint.locale,
    claimantName: complaint.claimant_name,
    claimantEmail: complaint.claimant_email,
    organization: complaint.organization,
    rightsBasis: complaint.rights_basis,
    originalWorkDescription: complaint.original_work_description,
    allegedlyInfringingUrls: JSON.parse(complaint.allegedly_infringing_urls_json) as string[],
    evidenceUrls: JSON.parse(complaint.evidence_urls_json) as string[],
    requestedAction: complaint.requested_action,
    signature: complaint.signature,
    status: complaint.status,
    priority: complaint.priority,
    acknowledgedAt: complaint.acknowledged_at,
    responseDueAt: complaint.response_due_at,
    resolvedAt: complaint.resolved_at,
    actionTaken: complaint.action_taken,
    createdAt: complaint.created_at,
    updatedAt: complaint.updated_at,
  };
}

function buildEmail(input: { title: string; lines: string[] }) {
  const text = [input.title, "", ...input.lines].join("\n");
  const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return { text, html: `<pre style="font:14px/1.7 Arial,sans-serif;white-space:pre-wrap">${escaped}</pre>` };
}

export async function copyrightRoutes(app: FastifyInstance) {
  app.post("/copyright/complaints", async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (trimText(body.website, 40)) return reply.code(400).send({ error: "Complaint could not be accepted." });
    const locale = body.locale === "zh-CN" ? "zh-CN" : "en";
    const claimantName = trimText(body.claimantName, 120);
    const claimantEmail = normalizeEmail(body.claimantEmail);
    const organization = trimText(body.organization, 160);
    const rightsBasis = body.rightsBasis as CopyrightRightsBasis;
    const originalWorkDescription = trimText(body.originalWorkDescription, 6000);
    const allegedlyInfringingUrls = parseUrls(body.allegedlyInfringingUrls, 20);
    const rawEvidenceUrls = Array.isArray(body.evidenceUrls) && body.evidenceUrls.length === 0
      ? []
      : parseUrls(body.evidenceUrls, 10);
    const requestedAction = trimText(body.requestedAction, 2000);
    const signature = trimText(body.signature, 120);

    if (!claimantName || claimantName.length < 2) return reply.code(400).send({ error: "Claimant name is required." });
    if (!isEmail(claimantEmail)) return reply.code(400).send({ error: "A valid claimant email is required." });
    if (!(["owner", "authorized_agent"] as const).includes(rightsBasis)) return reply.code(400).send({ error: "Select the claimant's relationship to the copyrighted work." });
    if (!originalWorkDescription || originalWorkDescription.length < 20) return reply.code(400).send({ error: "Describe the original copyrighted work in more detail." });
    if (!allegedlyInfringingUrls || !allegedlyInfringingUrls.every(targetHostAllowed)) return reply.code(400).send({ error: "Provide one to twenty valid ScoreTransposer URLs." });
    if (rawEvidenceUrls === null) return reply.code(400).send({ error: "Evidence links must be valid HTTP or HTTPS URLs." });
    if (!requestedAction || requestedAction.length < 10) return reply.code(400).send({ error: "Describe the requested action." });
    if (body.goodFaithDeclared !== true || body.accuracyDeclared !== true) return reply.code(400).send({ error: "Both legal declarations must be confirmed." });
    if (!signature || signature.length < 2) return reply.code(400).send({ error: "A typed signature is required." });

    const { complaint, accessCode } = createCopyrightComplaint({
      locale,
      claimantName,
      claimantEmail,
      organization,
      rightsBasis,
      originalWorkDescription,
      allegedlyInfringingUrls,
      evidenceUrls: rawEvidenceUrls ?? [],
      requestedAction,
      signature,
      responseHours: config.copyrightResponseHours,
    });
    const statusUrl = `${config.publicSiteUrl.replace(/\/$/u, "")}/copyright-complaint#track`;
    const claimantEmailContent = buildEmail({
      title: locale === "zh-CN" ? "版权投诉已收到" : "Copyright complaint received",
      lines: [
        `${locale === "zh-CN" ? "编号" : "Reference"}: ${complaint.reference_code}`,
        `${locale === "zh-CN" ? "查询码" : "Access code"}: ${accessCode}`,
        `${locale === "zh-CN" ? "首次响应目标" : "Initial response target"}: ${complaint.response_due_at}`,
        `${locale === "zh-CN" ? "查询页面" : "Status page"}: ${statusUrl}`,
        locale === "zh-CN" ? "请妥善保管查询码；平台不会再次在网页中显示。" : "Keep the access code private; it will not be shown on the website again.",
      ],
    });
    const operatorEmailContent = buildEmail({
      title: `[Copyright][${complaint.reference_code}] New complaint`,
      lines: [
        `Claimant: ${claimantName} <${claimantEmail}>`,
        `Rights basis: ${rightsBasis}`,
        `Targets: ${allegedlyInfringingUrls.join(", ")}`,
        `Response due: ${complaint.response_due_at}`,
      ],
    });
    const [confirmation, notification] = await Promise.allSettled([
      sendTransactionalEmail({ to: claimantEmail, subject: `[${complaint.reference_code}] Copyright complaint received`, ...claimantEmailContent, replyTo: config.supportEmail }),
      sendTransactionalEmail({ to: config.supportEmail, subject: `[Copyright][${complaint.reference_code}] New complaint`, ...operatorEmailContent, replyTo: claimantEmail }),
    ]);
    if (confirmation.status === "rejected") app.log.error({ error: confirmation.reason, referenceCode: complaint.reference_code }, "Copyright confirmation email failed");
    if (notification.status === "rejected") app.log.error({ error: notification.reason, referenceCode: complaint.reference_code }, "Copyright notification email failed");

    return reply.code(201).send({
      ok: true,
      referenceCode: complaint.reference_code,
      accessCode,
      responseDueAt: complaint.response_due_at,
      confirmationDelivery: confirmation.status === "fulfilled" ? confirmation.value.mode : "failed",
    });
  });

  app.post("/copyright/complaints/lookup", async (request, reply) => {
    const body = (request.body ?? {}) as { referenceCode?: string; accessCode?: string };
    const referenceCode = trimText(body.referenceCode, 40);
    const accessCode = trimText(body.accessCode, 80);
    if (!referenceCode || !accessCode) return reply.code(400).send({ error: "Reference and access code are required." });
    const complaint = findPublicCopyrightComplaint(referenceCode, accessCode);
    if (!complaint) return reply.code(404).send({ error: "Complaint could not be found with those credentials." });
    const events = listCopyrightComplaintEvents(complaint.id)
      .filter((event) => event.public_message)
      .map((event) => ({ status: event.to_status, message: event.public_message, createdAt: event.created_at }));
    return {
      referenceCode: complaint.reference_code,
      status: complaint.status,
      responseDueAt: complaint.response_due_at,
      acknowledgedAt: complaint.acknowledged_at,
      resolvedAt: complaint.resolved_at,
      actionTaken: complaint.action_taken,
      createdAt: complaint.created_at,
      updatedAt: complaint.updated_at,
      events,
    };
  });

  app.get("/admin/copyright/complaints", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = (request.query ?? {}) as { status?: string; limit?: string };
    if (query.status && !isStatus(query.status)) return reply.code(400).send({ error: "Invalid complaint status." });
    const limit = Number(query.limit ?? 100);
    const items = listCopyrightComplaints({
      status: query.status as CopyrightComplaintStatus | undefined,
      limit: Number.isFinite(limit) ? limit : 100,
    }).map(serializeComplaint);
    return { items, statuses: COPYRIGHT_COMPLAINT_STATUSES };
  });

  app.get("/admin/copyright/complaints/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const complaint = findCopyrightComplaintById(id);
    if (!complaint) return reply.code(404).send({ error: "Copyright complaint not found." });
    return {
      item: serializeComplaint(complaint),
      events: listCopyrightComplaintEvents(id).map((event) => ({
        id: event.id,
        fromStatus: event.from_status,
        toStatus: event.to_status,
        actorType: event.actor_type,
        actorId: event.actor_id,
        publicMessage: event.public_message,
        internalNote: event.internal_note,
        actionTaken: event.action_taken,
        createdAt: event.created_at,
      })),
    };
  });

  app.patch("/admin/copyright/complaints/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (!isStatus(body.status)) return reply.code(400).send({ error: "A valid complaint status is required." });
    const result = transitionCopyrightComplaint({
      id,
      toStatus: body.status,
      actorId: request.adminId ?? "admin-api-key",
      publicMessage: trimText(body.publicMessage, 4000),
      internalNote: trimText(body.internalNote, 4000),
      actionTaken: trimText(body.actionTaken, 2000),
    });
    if (!result.ok) {
      if (result.reason === "not_found") return reply.code(404).send({ error: "Copyright complaint not found." });
      if (result.reason === "invalid_transition") return reply.code(409).send({ error: `Cannot move complaint from ${result.current.status} to ${body.status}.` });
      if (result.reason === "public_message_required") return reply.code(400).send({ error: "A public message is required for this status." });
      if (result.reason === "action_required") return reply.code(400).send({ error: "Document the action taken before marking the complaint actioned." });
      return reply.code(400).send({ error: "Add a public message, internal note, or action before saving." });
    }
    return { ok: true, item: serializeComplaint(result.complaint) };
  });
}
