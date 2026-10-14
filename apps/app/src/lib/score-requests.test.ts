import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { fetchScorePreflight, retryAfterMilliseconds, scorePreflightFileKey, sharedInFlightRequest } from "../../../../packages/shared/src/client-request";
import { apiRequest } from "./api";

test("shared reads run once and cancel one consumer without interrupting another", async () => {
  const first = new AbortController(), second = new AbortController();
  let calls = 0, finish!: (value: string) => void;
  let signal!: AbortSignal;
  const execute = (sharedSignal: AbortSignal) => { calls += 1; signal = sharedSignal; return new Promise<string>(resolve => { finish = resolve; }); };
  const a = sharedInFlightRequest("consumer-test", execute, first.signal);
  const b = sharedInFlightRequest("consumer-test", execute, second.signal);
  const cancelled = assert.rejects(a, { name: "AbortError" });
  await setImmediate(); first.abort(); await cancelled;
  assert.equal(calls, 1); assert.equal(signal.aborted, false);
  finish("same response"); assert.equal(await b, "same response");
  assert.equal(await sharedInFlightRequest("consumer-test", async () => "fresh"), "fresh", "settled requests are not cached");
});

test("unmounting the last consumer aborts the network operation", async () => {
  const controller = new AbortController();
  let underlying!: AbortSignal;
  const request = sharedInFlightRequest("unmount-test", signal => {
    underlying = signal;
    return new Promise<void>((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
  }, controller.signal);
  const cancelled = assert.rejects(request, { name: "AbortError" });
  await setImmediate(); controller.abort(); await cancelled;
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(underlying.aborted, true);
});

test("preflight identity dedupes reconstructed draft files and separates content and pages", async () => {
  const original = new File(["same PDF"], "score.pdf", { type: "application/pdf", lastModified: 1 });
  const restored = new File(["same PDF"], "score.pdf", { type: "application/pdf", lastModified: 2 });
  const different = new File(["new! PDF"], "score.pdf", { type: "application/pdf", lastModified: 1 });
  assert.equal(await scorePreflightFileKey(original), await scorePreflightFileKey(restored));
  assert.notEqual(await scorePreflightFileKey(original), await scorePreflightFileKey(different));
  assert.notEqual(await scorePreflightFileKey(original, "1"), await scorePreflightFileKey(original, "2"));
  let calls = 0, finish!: (response: Response) => void;
  const fetcher: typeof fetch = async () => { calls += 1; return new Promise(resolve => { finish = resolve; }); };
  const a = fetchScorePreflight("https://preflight.test/clone", original, { fetch: fetcher });
  const b = fetchScorePreflight("https://preflight.test/clone", restored, { fetch: fetcher });
  while (!finish) await setImmediate();
  await setImmediate(); assert.equal(calls, 1);
  finish(Response.json({ preflight: { complete: true } }));
  assert.deepEqual(await a, await b);
});

test("retryable preflight busy honours Retry-After and then succeeds", async () => {
  let calls = 0;
  const delays: number[] = [];
  const fetcher: typeof fetch = async () => ++calls === 1
    ? Response.json({ code: "SCORE_PREFLIGHT_BUSY" }, { status: 429, headers: { "Retry-After": "5" } })
    : Response.json({ preflight: { complete: true } });
  const result = await fetchScorePreflight("https://preflight.test/retry", new File(["pdf"], "score.pdf"), {
    fetch: fetcher, wait: async ms => { delays.push(ms); },
  });
  assert.equal(result.ok, true); assert.equal(calls, 2); assert.deepEqual(delays, [5_000]);
  assert.equal(retryAfterMilliseconds("Wed, 14 Oct 2026 02:18:05 GMT", Date.parse("2026-10-14T02:18:00Z")), 5_000);
});

test("changing the selected file releases the original preflight and a resumed draft starts fresh", async () => {
  const controller = new AbortController();
  let calls = 0, finish!: (response: Response) => void, underlying!: AbortSignal;
  const fetcher: typeof fetch = async (_, init) => {
    calls += 1; underlying = init!.signal!;
    return new Promise(resolve => { finish = resolve; });
  };
  const first = fetchScorePreflight("https://preflight.test/resume", new File(["resume PDF"], "score.pdf"), { fetch: fetcher, signal: controller.signal });
  const cancelled = assert.rejects(first, { name: "AbortError" });
  while (!finish) await setImmediate();
  controller.abort(); await cancelled;
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(underlying.aborted, true);
  const resumed = fetchScorePreflight("https://preflight.test/resume", new File(["resume PDF"], "score.pdf"), { fetch: fetcher });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(calls, 2);
  finish(Response.json({ preflight: { complete: true } }));
  assert.equal((await resumed).ok, true);
});

test("preflight deadline ends a stalled response body and releases the shared request", async () => {
  const file = new File(["deadline PDF"], "score.pdf");
  let bodyStarted!: () => void;
  const started = new Promise<void>(resolve => { bodyStarted = resolve; });
  const pending = fetchScorePreflight("https://preflight.test/body-deadline", file, {
    timeoutMs: 20,
    fetch: async () => ({ ok: true, status: 200, headers: new Headers(), json: () => { bodyStarted(); return new Promise(() => undefined); } }) as Response,
  });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await started; await rejected;
  await new Promise(resolve => setTimeout(resolve, 5));
  const recovered = await fetchScorePreflight("https://preflight.test/body-deadline", file, {
    fetch: async () => Response.json({ preflight: { complete: true } }),
  });
  assert.equal(recovered.ok, true);
});

test("preflight backoff is bounded and does not retry unrelated throttles or early", async () => {
  for (const [suffix, code, retryAfter, expected] of [["busy", "SCORE_PREFLIGHT_BUSY", "5", 3], ["rate", "RATE_LIMIT_EXCEEDED", "60", 1], ["long", "SCORE_PREFLIGHT_BUSY", "300", 1]] as const) {
    let calls = 0;
    const result = await fetchScorePreflight(`https://preflight.test/${suffix}`, new File([suffix], "score.pdf"), {
      fetch: async () => { calls += 1; return Response.json({ code }, { status: 429, headers: { "Retry-After": retryAfter } }); },
      wait: async () => undefined,
    });
    assert.equal(result.status, 429); assert.equal(calls, expected);
  }
});

test("app score detail and list API reads share in-flight JSON by route and account", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calls = 0;
  let responses: Array<(response: Response) => void> = [];
  globalThis.fetch = async () => { calls += 1; return new Promise(resolve => responses.push(resolve)); };
  for (const path of ["/api/scores", "/api/scores/test-score"]) {
    const a = apiRequest(path, { headers: { Authorization: "Bearer account-a" } });
    const b = apiRequest(path, { headers: { Authorization: "Bearer account-a" } });
    await setImmediate();
    assert.equal(responses.length, 1);
    responses[0](Response.json({ score: {}, scores: [] }));
    assert.deepEqual(await a, await b);
    responses = [];
  }
  assert.equal(calls, 2);
  const a = apiRequest("/api/scores", { headers: { Authorization: "Bearer account-a" } });
  const b = apiRequest("/api/scores", { headers: { Authorization: "Bearer account-b" } });
  await setImmediate(); assert.equal(responses.length, 2);
  for (const respond of responses) respond(Response.json({ scores: [] }));
  await Promise.all([a, b]); assert.equal(calls, 4, "accounts never share private responses");
});
