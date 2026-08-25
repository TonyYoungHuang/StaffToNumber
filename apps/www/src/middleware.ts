import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCanonicalPublicUrl } from "./lib/canonical-host";
import { localeFromPublicPath, localizePublicPath, ROUTE_LOCALE_HEADER, stripPublicLocalePrefix } from "./lib/locale-routing";

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

  const locale = localeFromPublicPath(pathname);
  if (locale === "zh-CN") {
    const canonicalLocalePath = localizePublicPath(pathname, locale);
    if (pathname !== canonicalLocalePath) {
      const canonicalLocaleUrl = request.nextUrl.clone();
      canonicalLocaleUrl.pathname = canonicalLocalePath;
      return NextResponse.redirect(canonicalLocaleUrl, 308);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ROUTE_LOCALE_HEADER, locale);

  if (locale === "zh-CN") {
    const rewrittenUrl = request.nextUrl.clone();
    rewrittenUrl.pathname = stripPublicLocalePrefix(pathname);
    return NextResponse.rewrite(rewrittenUrl, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/:path*"],
};
