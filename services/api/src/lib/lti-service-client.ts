import { createPrivateKey, createPublicKey, randomUUID } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";
import { config } from "../config.js";

export const nrpsScope = "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly";
export const agsScoreScope = "https://purl.imsglobal.org/spec/lti-ags/scope/score";
const deploymentClaim = "https://purl.imsglobal.org/spec/lti/claim/deployment_id";

function privateKeyPem() {
  if (!config.ltiPrivateKeyBase64) throw new Error("LTI service private key is not configured.");
  return Buffer.from(config.ltiPrivateKeyBase64, "base64").toString("utf8");
}

export function ltiToolJwks() {
  const publicKey = createPublicKey(createPrivateKey(privateKeyPem()));
  const jwk = publicKey.export({ format: "jwk" });
  return { keys: [{ ...jwk, kid: config.ltiKeyId, use: "sig", alg: "RS256" }] };
}

export async function requestLtiServiceToken(input: {
  clientId: string;
  deploymentId: string;
  tokenUrl: string;
  scopes: string[];
  fetchImpl?: typeof fetch;
}) {
  const key = await importPKCS8(privateKeyPem(), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ [deploymentClaim]: input.deploymentId })
    .setProtectedHeader({ alg: "RS256", kid: config.ltiKeyId, typ: "JWT" })
    .setIssuer(input.clientId)
    .setSubject(input.clientId)
    .setAudience(input.tokenUrl)
    .setJti(randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
  const response = await (input.fetchImpl ?? fetch)(input.tokenUrl, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: assertion,
      scope: input.scopes.join(" "),
    }),
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; token_type?: string; expires_in?: number; scope?: string } | null;
  if (!response.ok || !payload?.access_token) throw new Error(`LTI token request failed with HTTP ${response.status}.`);
  return payload;
}

export async function fetchLtiRoster(input: {
  clientId: string;
  deploymentId: string;
  tokenUrl: string;
  nrpsUrl: string;
  fetchImpl?: typeof fetch;
}) {
  const token = await requestLtiServiceToken({ ...input, scopes: [nrpsScope] });
  const response = await (input.fetchImpl ?? fetch)(input.nrpsUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: `Bearer ${token.access_token}`,
      accept: "application/vnd.ims.lti-nrps.v2.membershipcontainer+json",
    },
  });
  const payload = await response.json().catch(() => null) as { members?: unknown[] } | null;
  if (!response.ok || !Array.isArray(payload?.members)) throw new Error(`LTI roster request failed with HTTP ${response.status}.`);
  return payload.members;
}

export async function publishLtiScore(input: {
  clientId: string;
  deploymentId: string;
  tokenUrl: string;
  lineitemUrl: string;
  ltiUserId: string;
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string | null;
  fetchImpl?: typeof fetch;
}) {
  const token = await requestLtiServiceToken({ ...input, scopes: [agsScoreScope] });
  const scoreUrl = `${input.lineitemUrl.replace(/\/$/u, "")}/scores`;
  const response = await (input.fetchImpl ?? fetch)(scoreUrl, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: `Bearer ${token.access_token}`,
      "content-type": "application/vnd.ims.lis.v1.score+json",
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      scoreGiven: input.scoreGiven,
      scoreMaximum: input.scoreMaximum,
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
      userId: input.ltiUserId,
      ...(input.comment ? { comment: input.comment } : {}),
    }),
  });
  if (!response.ok) throw new Error(`LTI score publish failed with HTTP ${response.status}.`);
}
