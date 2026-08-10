import { timingSafeEqual } from "node:crypto";

function matchesSecret(value: string | null | undefined, expected: string) {
  if (!value) return false;
  const candidate = Buffer.from(value);
  const secret = Buffer.from(expected);
  return candidate.length === secret.length && timingSafeEqual(candidate, secret);
}

export function canAccessInternalTools(token?: string | null) {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.INTERNAL_TOOLS_TOKEN?.trim();
  return Boolean(expected && matchesSecret(token, expected));
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return new URL(request.url).searchParams.get("token");
}
