import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { generateActivationCodes, listActivationCodes, mapActivationCodeForAdmin } from "../repositories/auth-repository.js";

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
      const query = (request.query ?? {}) as { limit?: string };
      const limit = query.limit ? Number(query.limit) : 100;

      return {
        adminEnabled: Boolean(config.adminApiKey),
        codes: listActivationCodes(Number.isFinite(limit) ? limit : 100).map(mapActivationCodeForAdmin),
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
        quantity?: number;
        entitlementDays?: number;
        prefix?: string;
        note?: string;
        expiresAt?: string | null;
      };

      const quantity = Number(body.quantity ?? 1);
      const entitlementDays = Number(body.entitlementDays ?? config.entitlementDays);
      const expiresAt = parseExpiresAt(body.expiresAt);

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) {
        return reply.code(400).send({ error: "Quantity must be an integer between 1 and 200." });
      }

      if (!Number.isInteger(entitlementDays) || entitlementDays < 1 || entitlementDays > 3650) {
        return reply.code(400).send({ error: "Entitlement days must be an integer between 1 and 3650." });
      }

      if (body.expiresAt && !expiresAt) {
        return reply.code(400).send({ error: "Expires at must be a valid ISO date." });
      }

      const result = generateActivationCodes({
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
}
