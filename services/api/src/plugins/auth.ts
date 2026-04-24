import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { config } from "../config.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import { findActiveSessionByToken } from "../repositories/auth-repository.js";

declare module "fastify" {
  interface FastifyRequest {
    authUserId?: string;
    sessionToken?: string;
    adminId?: string;
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireActiveEntitlement: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function readBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length).trim();
}

export const authPlugin = fp(async (app) => {
  app.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = readBearerToken(request);

    if (!token) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    const session = findActiveSessionByToken(token);
    if (!session) {
      reply.code(401).send({ error: "Session not found" });
      return;
    }

    if (new Date(session.expires_at) <= new Date()) {
      reply.code(401).send({ error: "Session expired" });
      return;
    }

    request.authUserId = session.user_id;
    request.sessionToken = token;
  });

  app.decorate("requireActiveEntitlement", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (reply.sent || !request.authUserId) {
      return;
    }

    const profile = getUserProfile(request.authUserId);
    if (!profile || profile.entitlement.status !== "active") {
      reply.code(403).send({ error: "An active entitlement is required." });
    }
  });

  app.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!config.adminApiKey) {
      reply.code(503).send({ error: "Admin routes are disabled." });
      return;
    }

    const adminKey = request.headers["x-admin-api-key"];
    const providedKey = Array.isArray(adminKey) ? adminKey[0] : adminKey;

    if (providedKey !== config.adminApiKey) {
      reply.code(401).send({ error: "Invalid admin API key." });
      return;
    }

    request.adminId = "admin-api";
  });
});
