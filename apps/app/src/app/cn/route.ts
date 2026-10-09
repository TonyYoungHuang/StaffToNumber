import { NextRequest, NextResponse } from "next/server";
import { appPublicOrigin } from "../../lib/public-origin";

export function GET(request: NextRequest) {
  const target = new URL("/api/locale", appPublicOrigin(request));
  target.searchParams.set("locale", "zh-CN");
  target.searchParams.set("next", "/activate?shop=1");
  return NextResponse.redirect(target);
}
