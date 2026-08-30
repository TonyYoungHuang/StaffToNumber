// Intentionally keep the Edge middleware convention until OpenNext Cloudflare
// supports Next 16's Node.js-only proxy convention.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE } from "@score/i18n";
import { getCanonicalPublicUrl } from "./lib/canonical-host";
import { localeFromPublicPath, localizePublicPath, ROUTE_LOCALE_HEADER } from "./lib/locale-routing";

function getCloudflareVisitorProtocol(value: string | null) {
  if (!value) return null;

  try {
    const visitor = JSON.parse(value) as { scheme?: unknown };
    return typeof visitor.scheme === "string" ? visitor.scheme : null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const canonicalUrl = getCanonicalPublicUrl(request.nextUrl, {
    hostname: request.headers.get("host") ?? request.headers.get("x-forwarded-host"),
    protocol: getCloudflareVisitorProtocol(request.headers.get("cf-visitor"))
      ?? request.headers.get("x-forwarded-proto"),
  });
  if (canonicalUrl) return NextResponse.redirect(canonicalUrl, 308);

  const pathname = request.nextUrl.pathname;
  if (
    /^\/(?:api|_next)(?:\/|$)/u.test(pathname)
    || /^\/(?:favicon\.ico|icon\.svg|robots\.txt|sitemap\.xml)$/u.test(pathname)
    || /\/[^/]+\.[^/]+$/u.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (/^\/en(?:\/|$)/iu.test(pathname)) {
    const canonicalEnglishUrl = request.nextUrl.clone();
    canonicalEnglishUrl.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(canonicalEnglishUrl, 308);
  }

  const locale = localeFromPublicPath(pathname);
  if (locale !== DEFAULT_LOCALE) {
    const canonicalLocalePath = localizePublicPath(pathname, locale);
    if (pathname !== canonicalLocalePath) {
      const canonicalLocaleUrl = request.nextUrl.clone();
      canonicalLocaleUrl.pathname = canonicalLocalePath;
      return NextResponse.redirect(canonicalLocaleUrl, 308);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ROUTE_LOCALE_HEADER, locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/:path*"],
};
