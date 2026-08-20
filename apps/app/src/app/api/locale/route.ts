import { NextRequest, NextResponse } from "next/server";
import { isSupportedLocale, LOCALE_COOKIE_NAME } from "@score/shared";

function cookieDomain(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN?.trim().replace(/^\./, "").toLowerCase();
  if (!configured) return undefined;
  const hostname = request.nextUrl.hostname.toLowerCase();
  return hostname === configured || hostname.endsWith(`.${configured}`) ? `.${configured}` : undefined;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { locale?: unknown } | null;
  if (typeof body?.locale !== "string" || !isSupportedLocale(body.locale)) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  const response = NextResponse.json({ locale: body.locale });
  response.cookies.set(LOCALE_COOKIE_NAME, body.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    domain: cookieDomain(request),
  });
  return response;
}
