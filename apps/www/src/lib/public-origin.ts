import type { NextRequest } from "next/server";

export function sitePublicOrigin(request: NextRequest) {
  // Standalone requests can carry the container origin behind the reverse proxy.
  // Use deployment configuration, never an untrusted forwarded-host header.
  return new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || request.nextUrl.origin).origin;
}
