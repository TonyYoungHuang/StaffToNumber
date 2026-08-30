import { NextRequest, NextResponse } from "next/server";
import { buildLocaleCookie, isSupportedLocale, type SupportedLocale } from "@score/i18n";

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

function cookieDomain(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN?.trim().replace(/^\./u, "").toLowerCase();
  if (!configured) return undefined;

  const hostname = request.nextUrl.hostname.toLowerCase();
  return hostname === configured || hostname.endsWith(`.${configured}`) ? `.${configured}` : undefined;
}

function setLocaleCookie(response: NextResponse, request: NextRequest, locale: SupportedLocale) {
  response.headers.append("Set-Cookie", buildLocaleCookie(locale, {
    domain: cookieDomain(request),
    secure: request.nextUrl.protocol === "https:",
  }));
}

export function safeSameOriginNextUrl(request: NextRequest, requestedNext: string | null): URL {
  const fallback = new URL("/", request.nextUrl.origin);
  if (!requestedNext || fullyDecodeSafeNextSyntax(requestedNext) === null) return fallback;

  const isAbsolutePath = requestedNext.startsWith("/") && !requestedNext.startsWith("//");
  if (!isAbsolutePath && !ABSOLUTE_HTTP_URL_PATTERN.test(requestedNext)) return fallback;

  try {
    const destination = new URL(requestedNext, request.nextUrl.origin);
    if (
      destination.origin !== request.nextUrl.origin
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

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  if (!isSupportedLocale(locale)) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  const destination = safeSameOriginNextUrl(request, request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(destination);
  setLocaleCookie(response, request, locale);
  return response;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { locale?: unknown } | null;
  if (typeof body?.locale !== "string" || !isSupportedLocale(body.locale)) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  const response = NextResponse.json({ locale: body.locale });
  setLocaleCookie(response, request, body.locale);
  return response;
}
