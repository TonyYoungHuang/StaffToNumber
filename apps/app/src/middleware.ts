// Intentionally keep the Edge middleware convention until OpenNext Cloudflare
// supports Next 16's Node.js-only proxy convention.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, readLocaleCookie } from "@score/i18n";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://scoretransposer.com";

export function middleware(request: NextRequest) {
  const locale = readLocaleCookie(request.headers.get("cookie")) ?? DEFAULT_LOCALE;
  const destination = new URL("/api/locale", `${PUBLIC_SITE_URL.replace(/\/$/u, "")}/`);
  destination.searchParams.set("locale", locale);
  destination.searchParams.set("next", "/");

  return NextResponse.redirect(destination, 307);
}

export const config = {
  matcher: "/",
};
