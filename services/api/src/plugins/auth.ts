import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { findActiveSessionByToken } from "../repositories/auth-repository.js";

declare module "fastify" {
  interface FastifyRequest {
    authUserId?: string;
    sessionToken?: string;
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
});
