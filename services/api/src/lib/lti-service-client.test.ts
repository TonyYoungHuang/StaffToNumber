import assert from "node:assert/strict";
import test from "node:test";
import { exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import { config } from "../config.js";
import { agsScoreScope, fetchLtiRoster, ltiToolJwks, nrpsScope, publishLtiScore } from "./lti-service-client.js";

const deploymentClaim = "https://purl.imsglobal.org/spec/lti/claim/deployment_id";

test("LTI service client signs scoped client assertions for roster and grade services", async () => {
  const previousKey = config.ltiPrivateKeyBase64;
  const previousKid = config.ltiKeyId;
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  config.ltiPrivateKeyBase64 = Buffer.from(await exportPKCS8(privateKey), "utf8").toString("base64");
  config.ltiKeyId = "test-lti-key";
  const clientId = "client-1";
  const deploymentId = "deployment-1";
  const tokenUrl = "https://lms.example.test/oauth/token";
  const requestedScopes: string[] = [];
  const scoreBodies: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const href = String(url);
    if (href === tokenUrl) {
      const form = new URLSearchParams(String(init?.body));
      const assertion = form.get("client_assertion")!;
      const verified = await jwtVerify(assertion, publicKey, { issuer: clientId, audience: tokenUrl, subject: clientId });
      assert.equal(verified.payload[deploymentClaim], deploymentId);
      requestedScopes.push(form.get("scope")!);
      return new Response(JSON.stringify({ access_token: "service-token", token_type: "Bearer", expires_in: 300 }), { status: 200, headers: { "content-type": "application/json" } });
    }
    assert.equal(init?.headers && new Headers(init.headers).get("authorization"), "Bearer service-token");
    if (href.endsWith("/memberships")) {
      return new Response(JSON.stringify({ members: [{ user_id: "student-1", roles: ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"] }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (href.endsWith("/lineitems/1/scores")) {
      scoreBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  };
  try {
    const roster = await fetchLtiRoster({ clientId, deploymentId, tokenUrl, nrpsUrl: "https://lms.example.test/memberships", fetchImpl });
    assert.equal(roster.length, 1);
    await publishLtiScore({ clientId, deploymentId, tokenUrl, lineitemUrl: "https://lms.example.test/lineitems/1", ltiUserId: "student-1", scoreGiven: 86, scoreMaximum: 100, fetchImpl });
    assert.deepEqual(requestedScopes, [nrpsScope, agsScoreScope]);
    assert.equal(scoreBodies[0]?.userId, "student-1");
    assert.equal(scoreBodies[0]?.gradingProgress, "FullyGraded");
    assert.equal(ltiToolJwks().keys[0].kid, "test-lti-key");
  } finally {
    config.ltiPrivateKeyBase64 = previousKey;
    config.ltiKeyId = previousKid;
  }
});
