import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { runInNewContext } from "node:vm";
import { GET } from "./route.js";

function env(t: TestContext, key: string, value: string) {
  const original = process.env[key]; process.env[key] = value;
  t.after(() => { if (original === undefined) delete process.env[key]; else process.env[key] = original; });
}

test("Google button cannot forward a credential to an arbitrary embedding origin", async t => {
  env(t, "NEXT_PUBLIC_SITE_URL", "https://scoretransposer.com");
  for (const parent of ["", "https://evil.example", "https://scoretransposer.com.evil.example", "https://scoretransposer.com/path", "null"]) {
    const response = await GET(new Request(`https://app.scoretransposer.com/api/auth/google-button?parent=${encodeURIComponent(parent)}`));
    assert.equal(response.status, 403);
    assert.equal(await response.text(), "");
  }
});

test("Google button confines embedding, escapes script data and prevents caching/indexing", async t => {
  env(t, "NEXT_PUBLIC_SITE_URL", "https://scoretransposer.com");
  env(t, "NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client</script>");
  const response = await GET(new Request("https://app.scoretransposer.com/api/auth/google-button?parent=https%3A%2F%2Fscoretransposer.com&locale=fr"));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors https:\/\/scoretransposer\.com$/u);
  assert.match(response.headers.get("cache-control") || "", /no-store/u);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(html, /<html lang="fr">/u);
  assert.ok(!html.includes("test-client</script>"));
  assert.match(html, /config\.parent\)/u);
});

async function googleButtonRuntime(t: TestContext, renderBehavior: "success" | "blocked" | "throws") {
  env(t, "NEXT_PUBLIC_SITE_URL", "https://scoretransposer.com");
  env(t, "NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client");
  const response = await GET(new Request("https://app.scoretransposer.com/api/auth/google-button?parent=https%3A%2F%2Fscoretransposer.com"));
  const scriptBody = (await response.text()).match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/u)?.[1];
  assert.ok(scriptBody);
  const messages: { type: string }[] = [];
  const frames: (() => void)[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0, hasFrame = false;
  let script: { onload?: () => void } | undefined;
  const button = { clientWidth: 320, parentElement: { clientWidth: 320 }, replaceChildren() { hasFrame = false; }, querySelector() { return hasFrame ? {} : null; } };
  const google = { accounts: { id: {
    initialize() {},
    renderButton() {
      if (renderBehavior === "throws") throw new Error("GSI blocked");
      hasFrame = renderBehavior === "success";
    },
  } } };
  const observer = class { observe() {} };
  runInNewContext(scriptBody, {
    window: { parent: { postMessage(message: { type: string }) { messages.push(message); } }, google }, google,
    document: { createElement() { return {}; }, getElementById() { return button; }, head: { append(value: typeof script) { script = value; } } },
    requestAnimationFrame(callback: () => void) { frames.push(callback); },
    setTimeout(callback: () => void) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id: number) { timers.delete(id); },
    ResizeObserver: observer, MutationObserver: observer,
  });
  script?.onload?.();
  return { messages, timers, render() { while (frames.length) frames.shift()?.(); } };
}

test("Google button reports ready only after rendering the official Google iframe", async t => {
  const runtime = await googleButtonRuntime(t, "success");
  assert.equal(runtime.messages.length, 0);
  runtime.render();
  assert.equal(runtime.messages.length, 1);
  assert.equal(runtime.messages[0].type, "ready");
  assert.equal(runtime.timers.size, 0);
});

test("blocked Google iframe reports an error after timeout so the parent can open email", async t => {
  const runtime = await googleButtonRuntime(t, "blocked");
  runtime.render();
  assert.equal(runtime.messages.length, 0);
  for (const callback of runtime.timers.values()) callback();
  assert.equal(runtime.messages[0]?.type, "error");
});

test("Google render failure reports an error immediately", async t => {
  const runtime = await googleButtonRuntime(t, "throws");
  runtime.render();
  assert.equal(runtime.messages[0]?.type, "error");
  assert.equal(runtime.timers.size, 0);
});
