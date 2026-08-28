import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest } from "./api.js";

test("GET requests do not add a JSON content type that triggers a CORS preflight", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestInit = init;
    return new Response(JSON.stringify({ user: { id: "user-1", email: "person@example.com" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await apiRequest("/api/auth/me");

  assert.equal(result.ok, true);
  assert.equal(new Headers(requestInit?.headers).has("Content-Type"), false);
  assert.equal(requestInit?.cache, "no-store");
  assert.equal(requestInit?.credentials, "include");
});

test("JSON mutations still send their content type and preserve caller headers", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestInit = init;
    return new Response(JSON.stringify({ user: { id: "user-1", email: "person@example.com" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await apiRequest("/api/auth/login", {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
    body: JSON.stringify({ email: "person@example.com", password: "password" }),
  });

  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(headers.get("Authorization"), "Bearer test-token");
});
