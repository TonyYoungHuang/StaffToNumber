import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), {
  cooldownDuration: 5 * 60_000,
  timeoutDuration: 5_000,
});

export type GoogleAccount = {
  subject: string;
  email: string;
  name: string | null;
  picture: string | null;
};

/** GIS callbacks send JSON. A cross-site HTML form must never establish a session. */
export function googleCredentialRequestError(headers: { origin?: string; "content-type"?: string }, allowedOrigins: ReadonlySet<string>): { status: 403 | 415; error: string } | null {
  if (headers.origin !== undefined && !allowedOrigins.has(headers.origin)) {
    return { status: 403, error: "Google sign-in must start from this site." };
  }
  if (headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return { status: 415, error: "Google sign-in requires a JSON request." };
  }
  return null;
}

export function googleAccountFromClaims(payload: JWTPayload): GoogleAccount {
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (typeof payload.sub !== "string" || !payload.sub || !email || payload.email_verified !== true) {
    throw new Error("Google account does not provide a verified email address.");
  }

  return {
    subject: payload.sub,
    email,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null,
    picture: typeof payload.picture === "string" && payload.picture.trim() ? payload.picture.trim() : null,
  };
}

export async function verifyGoogleCredential(credential: string, clientId: string, expectedNonce?: string, jwks: JWTVerifyGetKey = googleJwks) {
  if (!clientId) {
    throw new Error("Google sign-in is not configured.");
  }

  const { payload } = await jwtVerify(credential, jwks, {
    audience: clientId,
    issuer: GOOGLE_ISSUERS,
    requiredClaims: ["exp", "sub"],
  });
  if (payload.azp !== undefined && payload.azp !== clientId) throw new Error("Google authorized party did not match.");

  if (expectedNonce !== undefined) {
    const actual = Buffer.from(typeof payload.nonce === "string" ? payload.nonce : "");
    const expected = Buffer.from(expectedNonce);
    if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new Error("Google sign-in nonce did not match.");
    }
  }

  return googleAccountFromClaims(payload);
}
