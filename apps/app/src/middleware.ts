import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://scoretransposer.com";

export function middleware(request: NextRequest) {
  const locale = request.cookies.get("score_locale")?.value === "zh-CN" ? "zh-CN" : "en";
  const destination = new URL("/api/locale", `${PUBLIC_SITE_URL.replace(/\/$/u, "")}/`);
  destination.searchParams.set("locale", locale);
  destination.searchParams.set("next", "/");

  return NextResponse.redirect(destination, 307);
}

export const config = {
  matcher: "/",
};
