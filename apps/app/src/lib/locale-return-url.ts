import type { NextRequest } from "next/server";
import { appPublicOrigin } from "./public-origin";

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//iu;

function fullyDecodeSafeNextSyntax(value: string) {
  let candidate = value;

  for (let pass = 0; pass < 5; pass += 1) {
    if (
      candidate !== candidate.trim()
      || CONTROL_CHARACTER_PATTERN.test(candidate)
      || candidate.includes("\\")
      || candidate.startsWith("//")
    ) {
      return null;
    }

    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) return candidate;
      candidate = decoded;
    } catch {
      return null;
    }
  }

  return null;
}

export function safeSameOriginNextUrl(request: NextRequest, requestedNext: string | null): URL {
  const origin = appPublicOrigin(request);
  const fallback = new URL("/", origin);
  if (!requestedNext || fullyDecodeSafeNextSyntax(requestedNext) === null) return fallback;

  const isAbsolutePath = requestedNext.startsWith("/") && !requestedNext.startsWith("//");
  if (!isAbsolutePath && !ABSOLUTE_HTTP_URL_PATTERN.test(requestedNext)) return fallback;

  try {
    const destination = new URL(requestedNext, origin);
    if (
      destination.origin !== origin
      || !["http:", "https:"].includes(destination.protocol)
      || destination.username
      || destination.password
    ) {
      return fallback;
    }

    const decodedPathname = fullyDecodeSafeNextSyntax(destination.pathname);
    if (
      decodedPathname === null
      || /^\/(?:api|_next)(?:\/|$)/u.test(decodedPathname)
    ) {
      return fallback;
    }

    return destination;
  } catch {
    return fallback;
  }
}

