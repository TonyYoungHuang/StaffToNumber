import type { FastifyInstance } from "fastify";
import { verifyPassword } from "../lib/auth.js";
import { findUserById } from "../repositories/auth-repository.js";
import {
  buildAccountDataExport,
  cancelAccountDeletion,
  getAccountLifecycle,
  scheduleAccountDeletion,
} from "../repositories/account-lifecycle-repository.js";

function passwordMatches(userId: string, password: unknown) {
  if (typeof password !== "string" || password.length < 8) return false;
  const user = findUserById(userId);
  return Boolean(user && verifyPassword(password, user.password_salt, user.password_hash));
}

export async function accountRoutes(app: FastifyInstance) {
  app.get("/account/lifecycle", { preHandler: app.requireAuth }, async (request, reply) => {
    const lifecycle = getAccountLifecycle(request.authUserId!);
    if (!lifecycle) return reply.code(404).send({ error: "Account not found." });
    return reply.send({ lifecycle });
  });

  app.get("/account/data-export", { preHandler: app.requireAuth }, async (request, reply) => {
    const exported = buildAccountDataExport(request.authUserId!);
    if (!exported) return reply.code(404).send({ error: "Account not found." });
    const date = new Date().toISOString().slice(0, 10);
    reply.header("Content-Type", "application/json; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="scoretransposer-data-export-${date}.json"`);
    reply.header("Cache-Control", "private, no-store");
    return reply.send(exported);
  });

  app.post("/account/deletion", { preHandler: app.requireAuth }, async (request, reply) => {
    const body = (request.body ?? {}) as { password?: unknown; confirmation?: unknown };
    if (body.confirmation !== "DELETE") {
      return reply.code(400).send({ error: "Type DELETE to confirm account deletion.", code: "DELETION_CONFIRMATION_REQUIRED" });
    }
    if (!passwordMatches(request.authUserId!, body.password)) {
      return reply.code(401).send({ error: "The current password is incorrect.", code: "PASSWORD_VERIFICATION_FAILED" });
    }

    const lifecycle = scheduleAccountDeletion(request.authUserId!);
    return reply.send({
      ok: true,
      lifecycle,
      message: "Account deletion is scheduled. Sign in again during the grace period to cancel it.",
    });
  });

  app.post("/account/deletion/cancel", { preHandler: app.requireAuth }, async (request, reply) => {
    const body = (request.body ?? {}) as { password?: unknown };
    if (!passwordMatches(request.authUserId!, body.password)) {
      return reply.code(401).send({ error: "The current password is incorrect.", code: "PASSWORD_VERIFICATION_FAILED" });
    }
    const lifecycle = cancelAccountDeletion(request.authUserId!);
    if (!lifecycle) return reply.code(409).send({ error: "This account does not have a pending deletion request." });
    return reply.send({ ok: true, lifecycle });
  });
}
