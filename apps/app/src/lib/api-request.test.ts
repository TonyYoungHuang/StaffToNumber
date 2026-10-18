import assert from "node:assert/strict";
import test from "node:test";
import { localizeApiError, SUPPORTED_LOCALES } from "@score/i18n";
import { apiRequest } from "./api.ts";

test("email sign-in failures arrive translated for the current document locale", async () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  try {
    globalThis.fetch = async () => Response.json({ error: "Invalid email or password." }, { status: 401 });
    for (const locale of SUPPORTED_LOCALES) {
      Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { lang: locale } } });
      const result = await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "local@example.test", password: "wrong-password" }) });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.status, 401);
        assert.equal(result.error, localizeApiError({ error: "Invalid email or password.", status: 401 }, locale));
        if (locale === "en") assert.doesNotMatch(result.error, /[\u4e00-\u9fff]/u);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

test("jobs response body timeout releases single-flight state and recovers on next poll", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, status: 200, json: () => new Promise(() => undefined) }) as unknown as Response;
    const first = await apiRequest("/api/scores/one/jobs", { timeoutMs: 10 });
    assert.equal(first.ok, false);
    if (!first.ok) assert.equal(first.code, "API_REQUEST_TIMEOUT");
    globalThis.fetch = async () => Response.json({ jobs: [] });
    const next = await apiRequest<{ jobs: unknown[] }>("/api/scores/one/jobs", { timeoutMs: 10 });
    assert.deepEqual(next, { ok: true, data: { jobs: [] } });
  } finally { globalThis.fetch = originalFetch; }
});

test("a 200 HTML or truncated response is a recoverable failure", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("<html>proxy</html>", { status: 200 });
    const result = await apiRequest("/api/payments/orders/order", { timeoutMs: 50 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "API_INVALID_RESPONSE");
    globalThis.fetch = async () => Response.json(false);
    const scalar = await apiRequest("/api/payments/orders/order", { timeoutMs: 50 });
    assert.equal(scalar.ok, false);
    if (!scalar.ok) assert.equal(scalar.code, "API_INVALID_RESPONSE");
  } finally { globalThis.fetch = originalFetch; }
});
