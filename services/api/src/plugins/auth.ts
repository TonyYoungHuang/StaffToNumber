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
    authDenied?: boolean;
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>;
    requireScorePreviewAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>;
    requireScoreEditingAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>;
    requireActiveEntitlement: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>;
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
      request.authDenied = true;
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const session = findActiveSessionByToken(token);
    if (!session) {
      request.authDenied = true;
      return reply.code(401).send({ error: "Session not found" });
    }

    if (new Date(session.expires_at) <= new Date()) {
      request.authDenied = true;
      return reply.code(401).send({ error: "Session expired" });
    }

    request.authUserId = session.user_id;
    request.sessionToken = token;
  });

  app.decorate("requireActiveEntitlement", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (request.authDenied || !request.authUserId) {
      return reply;
    }

    const profile = getUserProfile(request.authUserId);
    if (!profile || profile.accountStatus !== "active" || profile.entitlement.status !== "active") {
      request.authDenied = true;
      return reply.code(403).send({ error: "An active entitlement is required." });
    }
  });

  app.decorate("requireScorePreviewAccess", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (request.authDenied || !request.authUserId) return reply;

    const profile = getUserProfile(request.authUserId);
    if (!profile || profile.accountStatus !== "active") {
      request.authDenied = true;
      return reply.code(403).send({ error: "An active account is required." });
    }
  });

  app.decorate("requireScoreEditingAccess", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireScorePreviewAccess(request, reply);
    // A reply is thenable, so awaiting a child hook does not preserve its return
    // value. Carry denial explicitly instead of depending on reply.sent timing.
    if (request.authDenied || !request.authUserId) return reply;

    const profile = getUserProfile(request.authUserId);
    const documentId = (request.params as { id?: unknown } | null)?.id;
    const boundPass = typeof documentId === "string" ? scorePassForDocument(db, request.authUserId, documentId) : null;
    const route = request.routeOptions.url ?? "";
    const paidExport = (route.includes("/export/") && !/\/export\/(?:jianpu|score-json)$/.test(route)) || route.endsWith("/exports");
    if (paidExport && profile?.entitlement.status !== "active" && !boundPass) {
      request.authDenied = true;
      return reply.code(403).send({ error: "Choose a $2.99 One Score Pass or Starter to export this score.", code: "SCORE_PASS_REQUIRED" });
    }
    if (profile?.entitlement.source === "prepaid_credits" && request.routeOptions.url?.includes("/export/") && !/\/export\/(?:jianpu|score-json)$/.test(request.routeOptions.url)) {
      request.authDenied = true;
      return reply.code(409).send({ error: "Use the export menu to queue this score export.", code: "PREPAID_QUEUED_EXPORT_REQUIRED" });
    }
    if (profile?.entitlement.status === "active") return;

    if (typeof documentId === "string" && scorePassForDocument(db, request.authUserId, documentId)
      && request.routeOptions.url?.includes("/export/") && !/\/export\/(?:jianpu|score-json)$/.test(request.routeOptions.url)) {
      // The current editor uses /exports, where reservations, failures and
      // retries are metered. Do not allow the legacy synchronous API to bypass it.
      request.authDenied = true;
      return reply.code(409).send({ error: "Use the export menu to queue this score export.", code: "SCORE_PASS_QUEUED_EXPORT_REQUIRED" });
    }
    if (typeof documentId !== "string" || (!isFreeTrialScoreDocumentForUser(documentId, request.authUserId) && !scorePassForDocument(db, request.authUserId, documentId))) {
      request.authDenied = true;
      return reply.code(403).send({ error: "An active entitlement or this account's free editing project is required." });
    }
  });

  app.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!config.adminApiKey) {
      request.authDenied = true;
      return reply.code(503).send({ error: "Admin routes are disabled." });
    }

    const adminKey = request.headers["x-admin-api-key"];
    const providedKey = Array.isArray(adminKey) ? adminKey[0] : adminKey;

    if (providedKey !== config.adminApiKey) {
      request.authDenied = true;
      return reply.code(401).send({ error: "Invalid admin API key." });
    }

    request.adminId = "admin-api";
  });
});
