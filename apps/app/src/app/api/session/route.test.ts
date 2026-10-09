import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route.js";

const token = "a".repeat(64);
const req = (headers: Record<string, string> = {}) => new NextRequest("https://app.scoretransposer.com/api/session", { headers: { "x-score-session": "bootstrap", ...headers } });

test("session restore rejects cross-site and non-bootstrap requests; no cookie needs no API request", async () => {
  assert.equal((await GET(req({ "sec-fetch-site": "cross-site", cookie: `score_session=${token}` }))).status, 403);
  assert.equal((await GET(req({ "x-score-session": "" }))).status, 403);
  assert.equal((await GET(req())).status, 204);
  assert.equal((await GET(req({ cookie: "score_session=invalid" }))).status, 401);
});

test("only a verified cookie session is restored and its response cannot be cached", async t => {
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    assert.equal((init.headers as Record<string, string>).Authorization, `Bearer ${token}`);
    return Response.json({ user: { id: "verified-user" } });
  });
  const response = await GET(req({ cookie: `score_session=${token}` }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/u);
  assert.deepEqual(await response.json(), { token });
});

test("expired cookies and backend outages do not disclose or restore a token", async t => {
  const mocked = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  assert.equal((await GET(req({ cookie: `score_session=${token}` }))).status, 401);
  mocked.mock.mockImplementation(async () => new Response(null, { status: 502 }));
  const response = await GET(req({ cookie: `score_session=${token}` }));
  assert.equal(response.status, 503);
  assert.equal(await response.text(), "");
});
