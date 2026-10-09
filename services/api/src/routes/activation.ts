import type { FastifyInstance } from "fastify";
import { redeemActivationCode } from "../repositories/auth-repository.js";

export async function activationRoutes(app: FastifyInstance) {
  app.post(
    "/activation/redeem",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { code?: unknown };
      const code = typeof body.code === "string" ? body.code.trim() : "";

      if (!code || code.length > 128) {
        return reply.code(400).send({ error: "Activation code is required." });
      }

      const result = redeemActivationCode(request.authUserId!, code);

      if (!result.ok) {
        const errorMessage =
          result.reason === "not_found"
            ? "Activation code not found."
            : result.reason === "expired"
              ? "Activation code has expired."
              : result.reason === "disabled"
                ? "Activation code has been disabled."
                : "Activation code already used.";
        return reply.code(409).send({ error: errorMessage, code: `ACTIVATION_${result.reason.toUpperCase()}` });
      }

      return reply.send({
        ok: true,
        entitlement: result.entitlement,
        alreadyRedeemed: result.alreadyRedeemed,
      });
    },
  );
}
