import type { FastifyRequest } from "fastify";

export const SESSION_COOKIE_NAME = "score_session";

export function getSessionCookieName(publicApiUrl: string) {
  try {
    return new URL(publicApiUrl).hostname.toLowerCase().includes("staging")
      ? `${SESSION_COOKIE_NAME}_staging`
      : SESSION_COOKIE_NAME;
  } catch {
    return SESSION_COOKIE_NAME;
  }
}

function cookieDomain(publicApiUrl: string) {
  try {
    const hostname = new URL(publicApiUrl).hostname.toLowerCase();
    if (hostname === "scoretransposer.com" || hostname.endsWith(".scoretransposer.com")) {
      return "scoretransposer.com";
    }
  } catch {
    // A malformed public URL is handled by the runtime configuration checks.
  }
  return null;
}

export function buildSessionCookie(input: { token: string; publicApiUrl: string; sessionDays: number }) {
  const domain = cookieDomain(input.publicApiUrl);
  const name = getSessionCookieName(input.publicApiUrl);
  const secure = input.publicApiUrl.startsWith("https://");
  const maxAge = Math.max(1, Math.floor(input.sessionDays * 24 * 60 * 60));
  return [
    `${name}=${encodeURIComponent(input.token)}`,
    "Path=/",
    ...(domain ? [`Domain=${domain}`] : []),
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function buildExpiredSessionCookie(publicApiUrl: string) {
  const domain = cookieDomain(publicApiUrl);
  const name = getSessionCookieName(publicApiUrl);
  return [
    `${name}=`,
    "Path=/",
    ...(domain ? [`Domain=${domain}`] : []),
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
    ...(publicApiUrl.startsWith("https://") ? ["Secure"] : []),
  ].join("; ");
}

export function readSessionCookie(request: FastifyRequest, publicApiUrl: string) {
  const header = request.headers.cookie;
  if (!header) return undefined;
  const name = getSessionCookieName(publicApiUrl);

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    const rawValue = part.slice(separator + 1).trim();
    if (!rawValue) return undefined;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
