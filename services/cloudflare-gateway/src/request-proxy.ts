export async function withProxyHeaders(request: Request) {
  const headers = new Headers(request.headers);
  const requestId = headers.get("x-request-id") || crypto.randomUUID();
  headers.set("x-request-id", requestId);
  headers.set("x-forwarded-proto", "https");
  headers.set("x-forwarded-host", new URL(request.url).host);

  const url = new URL(request.url);
  if (url.pathname !== "/webhooks/stripe" && url.pathname !== "/webhooks/paddle") {
    return new Request(request, { headers });
  }

  url.pathname = `/api${url.pathname}`;
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.arrayBuffer();
  headers.delete("content-length");

  return new Request(url.toString(), {
    method: request.method,
    headers,
    body,
    redirect: request.redirect,
  });
}
