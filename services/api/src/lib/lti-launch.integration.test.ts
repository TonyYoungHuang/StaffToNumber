import assert from "node:assert/strict";
import test from "node:test";
import formbody from "@fastify/formbody";
import Fastify from "fastify";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { config } from "../config.js";
import { db, initDb } from "../db.js";
import { ltiRoutes } from "../routes/lti.js";

const deploymentClaim = "https://purl.imsglobal.org/spec/lti/claim/deployment_id";
const messageTypeClaim = "https://purl.imsglobal.org/spec/lti/claim/message_type";
const versionClaim = "https://purl.imsglobal.org/spec/lti/claim/version";
const targetLinkClaim = "https://purl.imsglobal.org/spec/lti/claim/target_link_uri";
const contextClaim = "https://purl.imsglobal.org/spec/lti/claim/context";
const nrpsClaim = "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice";
const agsClaim = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint";

test("LTI 1.3 login and signed launch verify deployment and consume state once", async () => {
  initDb();
  const previousEnabled = config.ltiEnabled;
  const previousApiUrl = config.publicApiUrl;
  const previousAppUrl = config.publicAppUrl;
  config.ltiEnabled = true;
  config.publicApiUrl = "https://api.example.test";
  config.publicAppUrl = "https://app.example.test";
  const app = Fastify({ logger: false });
  await app.register(formbody);
  await app.register(ltiRoutes);
  const suffix = crypto.randomUUID();
  const now = new Date().toISOString();
  const issuer = `https://lms-${suffix}.example.test`;
  const clientId = `client-${suffix}`;
  const deploymentId = `deployment-${suffix}`;
  const classroomId = `class-${suffix}`;
  const connectionId = `lti-${suffix}`;
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = `kid-${suffix}`;
  jwk.alg = "RS256";
  db.prepare("INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at, account_status) VALUES (?, ?, 'hash', 'salt', ?, ?, 'active')")
    .run(`owner-${suffix}`, `owner-${suffix}@example.test`, now, now);
  db.prepare("INSERT INTO score_classrooms (id, owner_user_id, name, description, created_at, updated_at, archived_at) VALUES (?, ?, 'LTI class', NULL, ?, ?, NULL)")
    .run(classroomId, `owner-${suffix}`, now, now);
  db.prepare(`
    INSERT INTO score_lms_connections (
      id, classroom_id, provider, base_url, course_ref, status, issuer, client_id, deployment_id,
      oidc_auth_url, token_url, jwks_url, platform_jwks_json, created_at, updated_at
    ) VALUES (?, ?, 'canvas', ?, 'course-1', 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(connectionId, classroomId, issuer, issuer, clientId, deploymentId, `${issuer}/oidc/auth`, `${issuer}/oauth/token`, `${issuer}/jwks`, JSON.stringify({ keys: [jwk] }), now, now);

  try {
    const targetLinkUri = `${config.publicApiUrl}/api/lti/launch`;
    const login = await app.inject({
      method: "GET",
      url: `/lti/login?${new URLSearchParams({ iss: issuer, login_hint: "opaque-login", target_link_uri: targetLinkUri, client_id: clientId, lti_deployment_id: deploymentId, lti_message_hint: "opaque-message" })}`,
    });
    assert.equal(login.statusCode, 302);
    const authorization = new URL(login.headers.location!);
    assert.equal(authorization.origin + authorization.pathname, `${issuer}/oidc/auth`);
    assert.equal(authorization.searchParams.get("response_mode"), "form_post");
    assert.equal(authorization.searchParams.get("lti_message_hint"), "opaque-message");
    const state = authorization.searchParams.get("state")!;
    const nonce = authorization.searchParams.get("nonce")!;
    const idToken = await new SignJWT({
      nonce,
      [deploymentClaim]: deploymentId,
      [messageTypeClaim]: "LtiResourceLinkRequest",
      [versionClaim]: "1.3.0",
      [targetLinkClaim]: targetLinkUri,
      [contextClaim]: { id: "context-1", title: "Music theory" },
      [nrpsClaim]: { context_memberships_url: `${issuer}/api/memberships`, service_versions: ["2.0"] },
      [agsClaim]: { lineitems: `${issuer}/api/line_items`, lineitem: `${issuer}/api/line_items/1`, scope: [] },
    }).setProtectedHeader({ alg: "RS256", kid: jwk.kid }).setIssuer(issuer).setAudience(clientId).setSubject("platform-user-1").setIssuedAt().setExpirationTime("5m").sign(privateKey);
    const launch = await app.inject({
      method: "POST",
      url: "/lti/launch",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: new URLSearchParams({ state, id_token: idToken }).toString(),
    });
    assert.equal(launch.statusCode, 302);
    assert.equal(new URL(launch.headers.location!).searchParams.get("lti"), "connected");
    const connection = db.prepare("SELECT status, lti_context_id AS contextId, nrps_url AS nrpsUrl, ags_lineitem_url AS lineitemUrl FROM score_lms_connections WHERE id = ?")
      .get(connectionId) as { status: string; contextId: string; nrpsUrl: string; lineitemUrl: string };
    assert.equal(connection.status, "verified");
    assert.equal(connection.contextId, "context-1");
    assert.equal(connection.nrpsUrl, `${issuer}/api/memberships`);
    assert.equal(connection.lineitemUrl, `${issuer}/api/line_items/1`);

    const replay = await app.inject({
      method: "POST",
      url: "/lti/launch",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: new URLSearchParams({ state, id_token: idToken }).toString(),
    });
    assert.equal(replay.statusCode, 400);
  } finally {
    config.ltiEnabled = previousEnabled;
    config.publicApiUrl = previousApiUrl;
    config.publicAppUrl = previousAppUrl;
    await app.close();
  }
});
