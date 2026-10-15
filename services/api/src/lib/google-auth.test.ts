import assert from "node:assert/strict";
import test from "node:test";
import { googleAccountFromClaims, googleCredentialRequestError } from "./google-auth.js";
import { verifyGoogleCredential } from "./google-auth.js";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import Fastify from "fastify";
import formbody from "@fastify/formbody";

test("Google claims require a verified email and normalize the account", () => {
  assert.deepEqual(
    googleAccountFromClaims({
      sub: "google-user-1",
      email: "  Friend@Example.com ",
      email_verified: true,
      name: "  Example Friend ",
      picture: "https://example.com/avatar.png",
    }),
    {
      subject: "google-user-1",
      email: "friend@example.com",
      name: "Example Friend",
      picture: "https://example.com/avatar.png",
    },
  );

  assert.throws(
    () => googleAccountFromClaims({ sub: "google-user-2", email: "friend@example.com", email_verified: false }),
    /verified email/u,
  );
});

test("Legacy GIS JSON callers remain allowed while foreign origins and HTML forms cannot issue a session", async () => {
  const origins = new Set(["https://scoretransposer.com", "https://www.scoretransposer.com", "https://app.scoretransposer.com"]);
  for (const origin of [...origins, undefined]) {
    assert.equal(googleCredentialRequestError({ origin, "content-type": "application/json; charset=utf-8" }, origins), null);
  }
  for (const origin of ["https://evil.test", "https://app.scoretransposer.com.evil.test", "null"]) {
    assert.equal(googleCredentialRequestError({ origin, "content-type": "application/json" }, origins)?.status, 403);
  }
  for (const type of ["application/x-www-form-urlencoded", "text/plain", "multipart/form-data", "application/jsonx", undefined]) {
    assert.equal(googleCredentialRequestError({ "content-type": type }, origins)?.status, 415);
  }
  const app = Fastify();
  let sessions = 0;
  await app.register(formbody); // Same global parser as the actual API.
  app.post("/api/auth/google", async (request, reply) => {
    const error = googleCredentialRequestError(request.headers, origins);
    if (error) return reply.code(error.status).send({ error: error.error });
    sessions++;
    return { ok: true };
  });
  try {
    for (const origin of ["https://evil.test", undefined]) {
      const form = await app.inject({ method: "POST", url: "/api/auth/google", headers: { ...(origin ? { origin } : {}), "content-type": "application/x-www-form-urlencoded" }, payload: "credential=attacker-google-id-token" });
      assert.ok([403, 415].includes(form.statusCode));
    }
    const forgedJson = await app.inject({ method: "POST", url: "/api/auth/google", headers: { origin: "https://evil.test" }, payload: { credential: "attacker-google-id-token" } });
    assert.equal(forgedJson.statusCode, 403);
    assert.equal(sessions, 0);
    const actualGis = await app.inject({ method: "POST", url: "/api/auth/google", headers: { origin: "https://app.scoretransposer.com" }, payload: { credential: "verified-token-fixture" } });
    assert.equal(actualGis.statusCode, 200);
    assert.equal(sessions, 1);
  } finally { await app.close(); }
});

test("Google OIDC verification requires signature, client audience, issuer, expiry, verified email and transaction nonce", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwks = createLocalJWKSet({ keys: [{ ...await exportJWK(publicKey), kid: "unit-test-key", alg: "RS256" }] });
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: "google-account", email: "known@example.invalid", email_verified: true, nonce: "transaction-nonce", iss: "https://accounts.google.com", aud: "same-existing-client-id", exp: now + 300 };
  const sign = (overrides: Record<string, unknown> = {}) => new SignJWT({ ...claims, ...overrides }).setProtectedHeader({ alg: "RS256", kid: "unit-test-key" }).sign(privateKey);
  const token = await sign();
  assert.equal((await verifyGoogleCredential(token, claims.aud, claims.nonce, jwks)).email, claims.email);
  // Legacy GIS credentials still work without an OAuth nonce expectation.
  assert.equal((await verifyGoogleCredential(await sign({ nonce: undefined }), claims.aud, undefined, jwks)).subject, claims.sub);
  for (const overrides of [{ aud: "other-client" }, { iss: "https://evil.test" }, { exp: now - 1 }, { exp: undefined }, { nonce: "other-nonce" }, { nonce: undefined }, { email_verified: false }, { sub: undefined }, { azp: "other-client" }]) {
    await assert.rejects(() => sign(overrides).then(value => verifyGoogleCredential(value, claims.aud, claims.nonce, jwks)));
  }
  const parts = token.split(".");
  parts[1] = Buffer.from(JSON.stringify({ ...claims, email: "attacker@example.invalid" })).toString("base64url");
  await assert.rejects(() => verifyGoogleCredential(parts.join("."), claims.aud, claims.nonce, jwks));
});
