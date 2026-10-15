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

test("One Tap supports the configured app origin and uses known local hints with auto-select", async () => {
  const previous = { site: process.env.NEXT_PUBLIC_SITE_URL, app: process.env.NEXT_PUBLIC_APP_URL, client: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID };
  process.env.NEXT_PUBLIC_SITE_URL = "https://scoretransposer.com";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.scoretransposer.com";
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test.apps.googleusercontent.com";
  try {
    for (const variant of ["known", "unknown", "expired", "logout"] as const) {
      const response = await GET(new Request("https://app.scoretransposer.com/api/auth/google-one-tap?parent=https://app.scoretransposer.com&locale=zh-CN&login_hint=url-attacker@example.test"));
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-security-policy")!, /frame-ancestors https:\/\/app\.scoretransposer\.com$/u);
      const html = await response.text();
      assert.match(html, /<html lang="zh-CN">/u);
      assert.doesNotMatch(html, /url-attacker|use_fedcm_for_prompt/u);
      const script = html.match(/<script nonce="[^"]+">([\s\S]+)<\/script>/u)![1];
      let options: { auto_select: boolean; login_hint?: string; callback(response: { credential: string }): Promise<void> } | undefined;
      let requests = 0, disabled = 0;
      const loads: string[] = [];
      const parent = {}, google = { accounts: { id: {
        cancel() {}, disableAutoSelect() { disabled++; }, initialize(value: typeof options) { options = value; }, prompt() {},
        intermediate: { verifyParentOrigin(_origin: string, callback: () => void) { callback(); }, notifyParentDone() {}, notifyParentClose() {} },
      } } };
      const document = { cookie: variant === "logout" ? "score_google_logout=1" : "", createElement() { return {}; }, head: { append(element: { src: string; onload(): void }) { loads.push(element.src); element.onload(); } } };
      vm.runInNewContext(script, { window: { parent, google, localStorage: { getItem: () => variant === "known" || variant === "expired" ? JSON.stringify({ email: "known@example.test", expiresAt: Date.now() + (variant === "known" ? 60000 : -60000) }) : null } },
        parent, google, document, addEventListener() {}, fetch: async () => { requests++; return { ok: true }; } });
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(loads.length, 2); assert.ok(loads.every(url => url.endsWith("?hl=zh-CN")));
      if (variant === "logout") { assert.equal(options, undefined); assert.equal(disabled, 1, "the isolated full GIS SDK disables auto-select after logout"); continue; }
      assert.equal(options?.auto_select, true);
      assert.equal(options?.login_hint, variant === "known" ? "known@example.test" : undefined);
      document.cookie = "score_google_logout=1";
      await options!.callback({ credential: "signed-google-fixture" });
      assert.equal(requests, 0, "logout suppression is rechecked before consuming a credential");
    }
  } finally {
    for (const [key, value] of Object.entries({ NEXT_PUBLIC_SITE_URL: previous.site, NEXT_PUBLIC_APP_URL: previous.app, NEXT_PUBLIC_GOOGLE_CLIENT_ID: previous.client })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
