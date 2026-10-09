import { NextRequest, NextResponse } from "next/server";
import { buildLocaleCookie, isSupportedLocale, type SupportedLocale } from "@score/i18n";

import { safeSameOriginNextUrl } from "../../../lib/locale-return-url";
import { appPublicOrigin } from "../../../lib/public-origin";

function cookieDomain(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN?.trim().replace(/^\./u, "").toLowerCase();
  if (!configured) return undefined;

  const hostname = new URL(appPublicOrigin(request)).hostname.toLowerCase();
  return hostname === configured || hostname.endsWith(`.${configured}`) ? `.${configured}` : undefined;
}

function setLocaleCookie(response: NextResponse, request: NextRequest, locale: SupportedLocale) {
  const domain = cookieDomain(request);
  // Remove a legacy host-only preference, which otherwise takes precedence
  // over the shared domain cookie and can keep /cn in English.
  if (domain) response.headers.append("Set-Cookie", "score_locale=; Path=/; Max-Age=0; SameSite=Lax; Secure");
  response.headers.append("Set-Cookie", buildLocaleCookie(locale, {
    domain,
    secure: new URL(appPublicOrigin(request)).protocol === "https:",
  }));
}

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  if (!isSupportedLocale(locale)) {
    return NextResponse.redirect(new URL("/", appPublicOrigin(request)));
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
