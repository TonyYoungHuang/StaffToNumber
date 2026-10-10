import { db } from "../db.js";
import { scorePassForDocument } from "../lib/score-passes.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { config } from "../config.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import { findActiveSessionByToken } from "../repositories/auth-repository.js";
import { readSessionCookie } from "../lib/session-cookie.js";
import { isFreeTrialScoreDocumentForUser } from "../lib/free-trial.js";

declare module "fastify" {
  interface FastifyRequest {
    authUserId?: string;
    sessionToken?: string;
    adminId?: string;
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireScorePreviewAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireScoreEditingAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
    const token = readBearerToken(request) ?? readSessionCookie(request, config.publicApiUrl);

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
    if (!profile || profile.accountStatus !== "active" || profile.entitlement.status !== "active") {
      reply.code(403).send({ error: "An active entitlement is required." });
    }
  });

  app.decorate("requireScorePreviewAccess", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (reply.sent || !request.authUserId) return;

    const profile = getUserProfile(request.authUserId);
    if (!profile || profile.accountStatus !== "active") {
      reply.code(403).send({ error: "An active account is required." });
    }
  });

  app.decorate("requireScoreEditingAccess", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireScorePreviewAccess(request, reply);
    if (reply.sent || !request.authUserId) return;

    const profile = getUserProfile(request.authUserId);
    if (profile?.entitlement.source === "prepaid_credits" && request.routeOptions.url?.includes("/export/") && !/\/export\/(?:jianpu|score-json)$/.test(request.routeOptions.url)) {
      reply.code(409).send({ error: "Use the export menu to queue this score export.", code: "PREPAID_QUEUED_EXPORT_REQUIRED" });
      return;
    }
    if (profile?.entitlement.status === "active") return;

    const documentId = (request.params as { id?: unknown } | null)?.id;
    if (typeof documentId === "string" && scorePassForDocument(db, request.authUserId, documentId)
      && request.routeOptions.url?.includes("/export/")) {
      // The current editor uses /exports, where reservations, failures and
      // retries are metered. Do not allow the legacy synchronous API to bypass it.
      reply.code(409).send({ error: "Use the export menu to queue this score export.", code: "SCORE_PASS_QUEUED_EXPORT_REQUIRED" });
      return;
    }
    if (typeof documentId !== "string" || (!isFreeTrialScoreDocumentForUser(documentId, request.authUserId) && !scorePassForDocument(db, request.authUserId, documentId))) {
      reply.code(403).send({ error: "An active entitlement or this account's free editing project is required." });
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
