import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

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

export function googleAccountFromClaims(payload: JWTPayload): GoogleAccount {
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!payload.sub || !email || payload.email_verified !== true) {
    throw new Error("Google account does not provide a verified email address.");
  }

  return {
    subject: payload.sub,
    email,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null,
    picture: typeof payload.picture === "string" && payload.picture.trim() ? payload.picture.trim() : null,
  };
}

export async function verifyGoogleCredential(credential: string, clientId: string) {
  if (!clientId) {
    throw new Error("Google sign-in is not configured.");
  }

  const { payload } = await jwtVerify(credential, googleJwks, {
    audience: clientId,
    issuer: GOOGLE_ISSUERS,
  });

  return googleAccountFromClaims(payload);
}
