import type { FastifyInstance } from "fastify";
import { redeemActivationCode } from "../repositories/auth-repository.js";

export async function activationRoutes(app: FastifyInstance) {
  app.post(
    "/activation/redeem",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { code?: string };
      const code = body.code?.trim();

      if (!code) {
        return reply.code(400).send({ error: "Activation code is required." });
      }

      const result = redeemActivationCode(request.authUserId!, code);

      if (!result.ok) {
        const errorMessage = result.reason === "not_found" ? "Activation code not found." : "Activation code already used.";
        return reply.code(409).send({ error: errorMessage });
      }

      return reply.send({
        ok: true,
        entitlement: result.entitlement,
      });
    },
  );
}
