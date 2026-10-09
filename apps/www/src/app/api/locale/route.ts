import { NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type SupportedLocale,
} from "@score/i18n";
import { localizePublicHref } from "../../../lib/locale-routing";
import { sitePublicOrigin } from "../../../lib/public-origin";

function cookieDomain(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN?.trim().replace(/^\./, "").toLowerCase();
  if (!configured) return undefined;
  const hostname = new URL(sitePublicOrigin(request)).hostname.toLowerCase();
  return hostname === configured || hostname.endsWith(`.${configured}`) ? `.${configured}` : undefined;
}

function localeCookieOptions(request: NextRequest) {
  return {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
    secure: new URL(sitePublicOrigin(request)).protocol === "https:",
    domain: cookieDomain(request),
  };
}

function fullyDecodeSafeNextSyntax(value: string) {
  let candidate = value;
  for (let pass = 0; pass < 5; pass += 1) {
    if (candidate !== candidate.trim() || /[\\\u0000-\u001f\u007f]/u.test(candidate) || candidate.startsWith("//")) {
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

function safeLocalizedNext(request: NextRequest, requestedNext: string | null, locale: SupportedLocale) {
  if (!requestedNext) {
    return localizePublicHref("/", locale);
  }

  const decodedNext = fullyDecodeSafeNextSyntax(requestedNext);
  const isAbsolutePath = requestedNext.startsWith("/") && !requestedNext.startsWith("//");
  const isAbsoluteHttpUrl = /^https?:\/\//iu.test(requestedNext);
  if (decodedNext === null || (!isAbsolutePath && !isAbsoluteHttpUrl)) {
    return localizePublicHref("/", locale);
  }

  try {
    const origin = sitePublicOrigin(request);
    const target = new URL(requestedNext, origin);
    const decodedTarget = new URL(decodedNext, origin);
    if (
      target.origin !== origin
      || target.username
      || target.password
      || decodedTarget.origin !== origin
      || /^\/(?:api|_next)(?:\/|$)/u.test(decodedTarget.pathname)
    ) {
      return localizePublicHref("/", locale);
    }
    return localizePublicHref(`${target.pathname}${target.search}${target.hash}`, locale);
  } catch {
    return localizePublicHref("/", locale);
  }
}

export async function GET(request: NextRequest) {
  const locale = normalizeLocale(request.nextUrl.searchParams.get("locale"));
  if (!locale) {
    return NextResponse.redirect(new URL("/", sitePublicOrigin(request)));
  }

  const requestedNext = request.nextUrl.searchParams.get("next");
  const safeNext = safeLocalizedNext(request, requestedNext, locale);
  const response = NextResponse.redirect(new URL(safeNext, sitePublicOrigin(request)));
  response.cookies.set(LOCALE_COOKIE_NAME, locale, localeCookieOptions(request));
  return response;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { locale?: unknown } | null;
  const locale = typeof body?.locale === "string" ? normalizeLocale(body.locale) : undefined;
  if (!locale) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE_NAME, locale, localeCookieOptions(request));
  return response;
}
