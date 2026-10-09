import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { GET } from "./route";

test("One Tap restricts embedding, consumes credentials on the authorized origin, and notifies completion without reloading", async () => {
  const original = { ...process.env };
  process.env.NEXT_PUBLIC_SITE_URL = "https://scoretransposer.com";
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.scoretransposer.com";
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test.apps.googleusercontent.com";
  try {
    assert.equal((await GET(new Request("https://app.scoretransposer.com/api/auth/google-one-tap?parent=https://evil.example"))).status, 403);
    const response = await GET(new Request("https://app.scoretransposer.com/api/auth/google-one-tap?parent=https://scoretransposer.com&locale=es"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-security-policy")!, /frame-ancestors https:\/\/scoretransposer.com$/);
    const html = await response.text();
    assert.ok(!html.includes("location."));
    const source = html.match(/<script nonce="[^"]+">([\s\S]+)<\/script>/)![1];
    let options: { callback: (response: { credential: string }) => Promise<void> } | undefined;
    let verified = false, prompted = 0, done = 0, closed = 0;
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const parent = {}, google = { accounts: { id: {
      cancel() {}, initialize(value: typeof options) { assert.equal(verified, true); options = value; }, prompt() { prompted++; },
      intermediate: { verifyParentOrigin(origin: string, callback: () => void) { assert.equal(origin, "https://scoretransposer.com"); verified = true; callback(); },
        notifyParentDone() { done++; }, notifyParentClose() { closed++; } },
    } } };
    const context = { window: { parent, google }, parent, google, addEventListener() {},
      document: { createElement() { return {}; }, head: { append(script: { onload: () => void }) { script.onload(); } } },
      fetch: async (url: string, init: RequestInit) => { requests.push({ url, init }); return { ok: true }; } };
    vm.runInNewContext(source, context);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(prompted, 1);
    await options!.callback({ credential: "signed-google-token-fixture" });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://api.scoretransposer.com/api/auth/google");
    assert.equal(requests[0].init.credentials, "include");
    assert.equal(done, 1); assert.equal(closed, 0);
  } finally { process.env = original; }
});
