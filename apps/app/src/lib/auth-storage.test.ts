import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { clearStoredToken, getSessionStatus, getStoredToken, logoutLocally, restoreSessionFromCookie, setStoredToken, subscribeAuthChanges } from "./auth-storage";
import { consumeAuthIntent, saveAuthIntent } from "./auth-intent";

function storage(): Storage {
  const values = new Map<string, string>();
  return { length: 0, key: () => null, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); }, clear: () => values.clear() };
}
function browser(t: TestContext) {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
  const events = new EventTarget();
  const win = { localStorage: storage(), sessionStorage: storage(), location: new URL("https://app.scoretransposer.com/scores/one?tab=edit#visual-editor"),
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) };
  globalThis.window = win as unknown as Window & typeof globalThis;
  globalThis.document = { cookie: "" } as Document;
  clearStoredToken();
  t.after(() => { globalThis.window = previous.window; globalThis.document = previous.document; globalThis.fetch = previous.fetch; });
  return win;
}

test("cookie-only restoration keeps checking separate and notifies mounted subscribers", async t => {
  browser(t);
  const snapshots: Array<{ status: string; token: string | null }> = [];
  const unsubscribe = subscribeAuthChanges(() => snapshots.push({ status: getSessionStatus(), token: getStoredToken() }));
  t.after(unsubscribe);
  let respond: (response: Response) => void = () => {};
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.credentials, "same-origin");
    assert.equal(new Headers(options?.headers).get("x-score-session"), "bootstrap");
    return new Promise<Response>(resolve => { respond = resolve; });
  };
  const restoring = restoreSessionFromCookie();
  assert.equal(getSessionStatus(), "checking");
  assert.equal(getStoredToken(), null);
  respond(Response.json({ token: "restored-random-session-fixture" }));
  assert.equal(await restoring, "signed-in");
  assert.equal(getStoredToken(), "restored-random-session-fixture");
  assert.deepEqual(snapshots.map(item => item.status), ["checking", "signed-in"]);
});

test("logout during an anonymous restoration rejects the stale signed-in response", async t => {
  browser(t);
  let respond: (response: Response) => void = () => {};
  globalThis.fetch = async () => new Promise<Response>(resolve => { respond = resolve; });
  const restoring = restoreSessionFromCookie();
  logoutLocally();
  respond(Response.json({ token: "stale-cookie-session" }));
  assert.equal(await restoring, "signed-out");
  assert.equal(getStoredToken(), null);
  assert.match(document.cookie, /score_google_logout=1/u);
});

test("restoration cannot replace a newer login and transient failures remain checking", async t => {
  browser(t);
  let respond: (response: Response) => void = () => {};
  globalThis.fetch = async () => new Promise<Response>(resolve => { respond = resolve; });
  const restoring = restoreSessionFromCookie();
  setStoredToken("newer-random-session");
  respond(Response.json({ token: "older-random-session" }));
  assert.equal(await restoring, "signed-in");
  assert.equal(getStoredToken(), "newer-random-session");
  clearStoredToken();
  globalThis.fetch = async () => new Response(null, { status: 503 });
  assert.equal(await restoreSessionFromCookie(), "checking");
  assert.equal(getStoredToken(), null);
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await restoreSessionFromCookie(), "signed-out");
});

test("activation and purchase continuations are per-tab, short-lived and single-use", t => {
  const win = browser(t);
  saveAuthIntent("activation", { code: "local-code-fixture" });
  assert.deepEqual(consumeAuthIntent("activation"), { code: "local-code-fixture" });
  assert.equal(consumeAuthIntent("activation"), undefined);
  saveAuthIntent("purchase", { planCode: "single-score", passMode: "top_up" });
  win.location.pathname = "/billing";
  assert.equal(consumeAuthIntent("purchase"), undefined);
  win.sessionStorage.setItem("score-auth-intent:expired", JSON.stringify({ path: "/billing", savedAt: Date.now() - 600001, value: "expired" }));
  assert.equal(consumeAuthIntent("expired"), undefined);
  win.sessionStorage.setItem("score-auth-intent:future", JSON.stringify({ path: "/billing", savedAt: Date.now() + 10000, value: "future" }));
  assert.equal(consumeAuthIntent("future"), undefined);
});
