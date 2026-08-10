import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { config } from "../config.js";
import { db } from "../db.js";
import { ltiToolJwks } from "../lib/lti-service-client.js";

const deploymentClaim = "https://purl.imsglobal.org/spec/lti/claim/deployment_id";
const messageTypeClaim = "https://purl.imsglobal.org/spec/lti/claim/message_type";
const versionClaim = "https://purl.imsglobal.org/spec/lti/claim/version";
const targetLinkClaim = "https://purl.imsglobal.org/spec/lti/claim/target_link_uri";
const contextClaim = "https://purl.imsglobal.org/spec/lti/claim/context";
const nrpsClaim = "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice";
const agsClaim = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint";

type LtiConnection = {
  id: string;
  classroomId: string;
  issuer: string;
  clientId: string;
  deploymentId: string;
  oidcAuthUrl: string;
  jwksUrl: string | null;
  platformJwksJson: string | null;
};

function first(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function requiredText(value: unknown, label: string, maxLength = 2000) {
  const candidate = first(value);
  if (typeof candidate !== "string" || !candidate.trim()) throw new Error(`${label} is required.`);
  return candidate.trim().slice(0, maxLength);
}

function findConnection(issuer: string, clientId: string, deploymentId?: string | null) {
  const deploymentClause = deploymentId ? "AND deployment_id = ?" : "";
  const values = deploymentId ? [issuer, clientId, deploymentId] : [issuer, clientId];
  return db.prepare(`
    SELECT id, classroom_id AS classroomId, issuer, client_id AS clientId, deployment_id AS deploymentId,
           oidc_auth_url AS oidcAuthUrl, jwks_url AS jwksUrl, platform_jwks_json AS platformJwksJson
    FROM score_lms_connections
    WHERE issuer = ? AND client_id = ? ${deploymentClause}
      AND status IN ('draft', 'verified')
    ORDER BY datetime(updated_at) DESC LIMIT 1
  `).get(...values) as LtiConnection | undefined;
}

function assertLaunchUrl(value: string) {
  const expected = `${config.publicApiUrl.replace(/\/$/u, "")}/api/lti/launch`;
  if (value !== expected) throw new Error("LTI target link URI is not registered for this tool.");
}

function stateInput(request: FastifyRequest) {
  return request.method === "GET" ? request.query as Record<string, unknown> : request.body as Record<string, unknown>;
}

export async function ltiRoutes(app: FastifyInstance) {
  app.get("/lti/jwks", async (_request, reply) => {
    if (!config.ltiEnabled) return reply.code(503).send({ error: "LTI is not enabled." });
    try {
      return reply.header("cache-control", "public, max-age=300").send(ltiToolJwks());
    } catch {
      return reply.code(503).send({ error: "LTI signing key is not configured." });
    }
  });

  const loginHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!config.ltiEnabled) return reply.code(503).send({ error: "LTI is not enabled." });
    try {
      const input = stateInput(request);
      const issuer = requiredText(input.iss, "Issuer", 1000);
      const loginHint = requiredText(input.login_hint, "Login hint", 2000);
      const targetLinkUri = requiredText(input.target_link_uri, "Target link URI", 2000);
      const clientId = requiredText(input.client_id, "Client ID", 500);
      const deploymentId = typeof first(input.lti_deployment_id) === "string" ? String(first(input.lti_deployment_id)) : null;
      assertLaunchUrl(targetLinkUri);
      const connection = findConnection(issuer, clientId, deploymentId);
      if (!connection) return reply.code(404).send({ error: "LTI registration not found." });
      const state = randomBytes(32).toString("base64url");
      const nonce = randomBytes(32).toString("base64url");
      const now = new Date();
      db.prepare("DELETE FROM lti_oidc_states WHERE datetime(expires_at) <= datetime('now') OR consumed_at IS NOT NULL").run();
      db.prepare(`
        INSERT INTO lti_oidc_states (state, connection_id, nonce, target_link_uri, expires_at, consumed_at, created_at)
        VALUES (?, ?, ?, ?, ?, NULL, ?)
      `).run(state, connection.id, nonce, targetLinkUri, new Date(now.valueOf() + 10 * 60_000).toISOString(), now.toISOString());
      const destination = new URL(connection.oidcAuthUrl);
      destination.searchParams.set("scope", "openid");
      destination.searchParams.set("response_type", "id_token");
      destination.searchParams.set("response_mode", "form_post");
      destination.searchParams.set("prompt", "none");
      destination.searchParams.set("client_id", connection.clientId);
      destination.searchParams.set("redirect_uri", targetLinkUri);
      destination.searchParams.set("login_hint", loginHint);
      destination.searchParams.set("state", state);
      destination.searchParams.set("nonce", nonce);
      const messageHint = first(input.lti_message_hint);
      if (typeof messageHint === "string" && messageHint) destination.searchParams.set("lti_message_hint", messageHint);
      return reply.redirect(destination.toString());
    } catch (error) {
      request.log.warn({ event: "lti.login_rejected", error });
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid LTI login request." });
    }
  };

  app.get("/lti/login", loginHandler);
  app.post("/lti/login", loginHandler);

  app.post("/lti/launch", async (request, reply) => {
    if (!config.ltiEnabled) return reply.code(503).send({ error: "LTI is not enabled." });
    const input = request.body as Record<string, unknown>;
    const stateValue = typeof input.state === "string" ? input.state : "";
    const idToken = typeof input.id_token === "string" ? input.id_token : "";
    if (!stateValue || !idToken) return reply.code(400).send({ error: "LTI state and id_token are required." });
    const state = db.prepare(`
      SELECT states.connection_id AS connectionId, states.nonce, states.target_link_uri AS targetLinkUri,
             connections.classroom_id AS classroomId, connections.issuer, connections.client_id AS clientId,
             connections.deployment_id AS deploymentId, connections.jwks_url AS jwksUrl,
             connections.platform_jwks_json AS platformJwksJson
      FROM lti_oidc_states states JOIN score_lms_connections connections ON connections.id = states.connection_id
      WHERE states.state = ? AND states.consumed_at IS NULL AND datetime(states.expires_at) > datetime('now')
    `).get(stateValue) as (LtiConnection & { connectionId: string; nonce: string; targetLinkUri: string }) | undefined;
    if (!state) return reply.code(400).send({ error: "LTI state is invalid or expired." });
    db.prepare("UPDATE lti_oidc_states SET consumed_at = ? WHERE state = ? AND consumed_at IS NULL").run(new Date().toISOString(), stateValue);
    try {
      const keySet = state.platformJwksJson
        ? createLocalJWKSet(JSON.parse(state.platformJwksJson) as JSONWebKeySet)
        : state.jwksUrl
          ? createRemoteJWKSet(new URL(state.jwksUrl))
          : null;
      if (!keySet) throw new Error("LTI platform key set is not configured.");
      const { payload } = await jwtVerify(idToken, keySet, {
        issuer: state.issuer,
        audience: state.clientId,
        clockTolerance: 5,
        maxTokenAge: "5m",
      });
      if (payload.nonce !== state.nonce) throw new Error("LTI nonce does not match.");
      if (payload[deploymentClaim] !== state.deploymentId) throw new Error("LTI deployment does not match.");
      if (payload[targetLinkClaim] !== state.targetLinkUri) throw new Error("LTI target link does not match.");
      if (payload[messageTypeClaim] !== "LtiResourceLinkRequest") throw new Error("Unsupported LTI message type.");
      if (payload[versionClaim] !== "1.3.0") throw new Error("Unsupported LTI version.");
      const context = typeof payload[contextClaim] === "object" && payload[contextClaim] ? payload[contextClaim] as Record<string, unknown> : {};
      const nrps = typeof payload[nrpsClaim] === "object" && payload[nrpsClaim] ? payload[nrpsClaim] as Record<string, unknown> : {};
      const ags = typeof payload[agsClaim] === "object" && payload[agsClaim] ? payload[agsClaim] as Record<string, unknown> : {};
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE score_lms_connections
        SET status = 'verified', lti_context_id = ?, nrps_url = ?, ags_lineitems_url = ?, ags_lineitem_url = ?,
            verified_at = ?, last_error = NULL, updated_at = ? WHERE id = ?
      `).run(
        typeof context.id === "string" ? context.id : null,
        typeof nrps.context_memberships_url === "string" ? nrps.context_memberships_url : null,
        typeof ags.lineitems === "string" ? ags.lineitems : null,
        typeof ags.lineitem === "string" ? ags.lineitem : null,
        now,
        now,
        state.connectionId,
      );
      const destination = new URL("/classrooms", config.publicAppUrl);
      destination.searchParams.set("lti", "connected");
      destination.searchParams.set("classroom", state.classroomId);
      return reply.redirect(destination.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid LTI launch.";
      db.prepare("UPDATE score_lms_connections SET last_error = ?, updated_at = ? WHERE id = ?")
        .run(message.slice(0, 1000), new Date().toISOString(), state.connectionId);
      request.log.warn({ event: "lti.launch_rejected", connectionId: state.connectionId, error });
      return reply.code(400).send({ error: "LTI launch verification failed." });
    }
  });
}
