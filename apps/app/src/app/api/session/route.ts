import { NextRequest, NextResponse } from "next/server";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", Vary: "Cookie" };

// The public site uses the shared HttpOnly session cookie. The editor still
// authenticates its requests with a bearer token, so validate and restore that
// token over a same-origin request, never through a redirect or URL parameter.
export async function GET(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site" || request.headers.get("x-score-session") !== "bootstrap") {
    return new NextResponse(null, { status: 403, headers: privateHeaders });
  }
  const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const name = new URL(apiOrigin).hostname.includes("staging") ? "score_session_staging" : "score_session";
  const token = request.cookies.get(name)?.value;
  if (!token) return new NextResponse(null, { status: 204, headers: privateHeaders });
  if (!/^[a-zA-Z0-9_-]{32,256}$/u.test(token)) return new NextResponse(null, { status: 401, headers: privateHeaders });
  try {
    const response = await fetch(`${apiOrigin}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return new NextResponse(null, { status: response.status === 401 ? 401 : 503, headers: privateHeaders });
    const payload = await response.json();
    if (!payload?.user?.id) return new NextResponse(null, { status: 503, headers: privateHeaders });
    return NextResponse.json({ token }, { headers: privateHeaders });
  } catch {
    return new NextResponse(null, { status: 503, headers: privateHeaders });
  }
}
