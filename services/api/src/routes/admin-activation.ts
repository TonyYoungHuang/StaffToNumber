import type { FastifyInstance } from "fastify";
import { isCheckoutPlanCode, type CheckoutPlanCode } from "@score/shared";
import { config } from "../config.js";
import { disableUnusedActivationCode, generateActivationCodes, listActivationCodes, mapActivationCodeForAdmin } from "../repositories/auth-repository.js";

function parseExpiresAt(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export async function adminActivationRoutes(app: FastifyInstance) {
  app.get(
    "/admin/activation-codes",
    {
      preHandler: app.requireAdmin,
    },
    async (request) => {
      const query = (request.query ?? {}) as { limit?: string; search?: string };
      const limit = query.limit ? Number(query.limit) : 100;

      return {
        adminEnabled: Boolean(config.adminApiKey),
        codes: listActivationCodes(Number.isFinite(limit) ? Math.floor(limit) : 100, typeof query.search === "string" ? query.search.slice(0, 200) : "").map(mapActivationCodeForAdmin),
      };
    },
  );

  app.post(
    "/admin/activation-codes/generate",
    {
      preHandler: app.requireAdmin,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        planCode?: CheckoutPlanCode;
        quantity?: number;
        entitlementDays?: number;
        prefix?: string;
        note?: string;
        expiresAt?: string | null;
      };

      const quantity = Number(body.quantity ?? 1);
      if (body.planCode != null && !isCheckoutPlanCode(body.planCode)) {
        return reply.code(400).send({ error: "Unknown activation plan." });
      }
      const entitlementDays = body.planCode ? (body.planCode.endsWith("annual") ? 365 : 30) : Number(body.entitlementDays ?? config.entitlementDays);
      const expiresAt = parseExpiresAt(body.expiresAt);

      if ((body.prefix != null && (typeof body.prefix !== "string" || !/^[A-Za-z0-9]{0,8}$/.test(body.prefix))) ||
          (body.note != null && (typeof body.note !== "string" || body.note.length > 500))) {
        return reply.code(400).send({ error: "Invalid prefix or note." });
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) {
        return reply.code(400).send({ error: "Quantity must be an integer between 1 and 200." });
      }

      if (!Number.isInteger(entitlementDays) || entitlementDays < 1 || entitlementDays > 3650) {
        return reply.code(400).send({ error: "Entitlement days must be an integer between 1 and 3650." });
      }

      if (body.expiresAt && !expiresAt) {
        return reply.code(400).send({ error: "Expires at must be a valid ISO date." });
      }

      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
        return reply.code(400).send({ error: "Redemption deadline must be in the future." });
      }

      const result = generateActivationCodes({
        planCode: body.planCode,
        quantity,
        entitlementDays,
        prefix: body.prefix,
        note: body.note?.trim() || null,
        expiresAt,
        createdBy: request.adminId ?? "admin-api",
      });

      return reply.code(201).send({
        batchId: result.batchId,
        codes: result.codes.map(mapActivationCodeForAdmin),
      });
    },
  );

  app.post("/admin/activation-codes/:id/disable", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!disableUnusedActivationCode(id)) return reply.code(409).send({ error: "Only unused activation codes can be disabled." });
    return { ok: true };
  });
}
