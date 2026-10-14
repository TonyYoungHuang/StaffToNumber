import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest } from "./api";

test("malformed HTTP 200 responses are rejected instead of being treated as a successful payment", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>upstream interrupted</html>", { status: 200 }));
  const response = await apiRequest("/api/payments/orders/local?token=local");
  assert.equal(response.ok, false);
  if (!response.ok) assert.equal(response.code, "API_INVALID_RESPONSE");
});

test("checkout deadline covers a stalled response body, and cleanup releases its timer", async t => {
  const realSetTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, "setTimeout", (callback: () => void, delay: number) => realSetTimeout(callback, delay === 60_000 ? 5 : delay));
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => ({
    ok: true, status: 200,
    text: () => new Promise<never>((_, reject) => {
      options.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }),
  }));
  const response = await apiRequest("/api/payments/checkout", { method: "POST" });
  assert.equal(response.ok, false);
  if (!response.ok) assert.equal(response.code, "API_REQUEST_TIMEOUT");
});

test("leaving a status page cancels its request instead of keeping it pending", async t => {
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => new Promise<never>((_, reject) => {
    options.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));
  const controller = new AbortController();
  const pending = apiRequest("/api/payments/orders/local?token=local", { signal: controller.signal });
  controller.abort();
  const response = await pending;
  assert.equal(response.ok, false);
  if (!response.ok) assert.equal(response.code, "API_REQUEST_CANCELLED");
});
