import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { fetchScorePreflight, forgetStagedScorePreflight, parseStagedPreflightMetadata, retryAfterMilliseconds, scorePreflightFileKey, sharedInFlightRequest, stagedScoreRecognitionBody } from "../../../../packages/shared/src/client-request";
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

test("preflight busy never silently uploads source bytes again", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => ++calls === 1
    ? Response.json({ code: "SCORE_PREFLIGHT_BUSY" }, { status: 429, headers: { "Retry-After": "5" } })
    : Response.json({ preflight: { complete: true } });
  const result = await fetchScorePreflight("https://preflight.test/retry", new File(["pdf"], "score.pdf"), {
    fetch: fetcher,
  });
  assert.equal(result.ok, false); assert.equal(result.status, 429); assert.equal(calls, 1);
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

test("capacity and unrelated throttles require an explicit new upload attempt", async () => {
  for (const [suffix, code, retryAfter] of [["busy", "SCORE_PREFLIGHT_BUSY", "5"], ["rate", "RATE_LIMIT_EXCEEDED", "60"], ["long", "SCORE_PREFLIGHT_BUSY", "300"]] as const) {
    let calls = 0;
    const result = await fetchScorePreflight(`https://preflight.test/${suffix}`, new File([suffix], "score.pdf"), {
      fetch: async () => { calls += 1; return Response.json({ code }, { status: 429, headers: { "Retry-After": retryAfter } }); },
    });
    assert.equal(result.status, 429); assert.equal(calls, 1);
  }
});

class PreflightXhr {
  status = 200;
  responseText = "";
  withCredentials = false;
  method = "";
  url = "";
  body: Document | XMLHttpRequestBodyInit | null = null;
  aborted = false;
  headers = new Map<string, string>();
  upload = { onprogress: null as ((event: ProgressEvent) => void) | null, onload: null as (() => void) | null };
  onload: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open(method: string, url: string) { this.method = method; this.url = url; }
  setRequestHeader(name: string, value: string) { this.headers.set(name.toLowerCase(), value); }
  send(body: Document | XMLHttpRequestBodyInit | null) { this.body = body; }
  abort() { this.aborted = true; this.onabort?.(); }
  progress(loaded: number, total: number, lengthComputable = true) { this.upload.onprogress?.({ loaded, total, lengthComputable } as ProgressEvent); }
  complete(payload: unknown) { this.upload.onload?.(); this.responseText = JSON.stringify(payload); this.onload?.(); }
}

test("one XHR preflight reports real byte percentages to all active consumers", async () => {
  const instances: PreflightXhr[] = [];
  const xhr = () => { const instance = new PreflightXhr(); instances.push(instance); return instance as unknown as XMLHttpRequest; };
  const file = new File(["single upload PDF"], "score.pdf", { type: "application/pdf" });
  const first: number[] = [], second: number[] = [];
  const options = { xhr, accountId: "owner-real-progress", headers: { Authorization: "Bearer owner-real-progress" } };
  const a = fetchScorePreflight("https://preflight.test/xhr", file, { ...options, onUploadProgress: percent => first.push(percent) });
  const b = fetchScorePreflight("https://preflight.test/xhr", file, { ...options, onUploadProgress: percent => second.push(percent) });
  while (!instances.length) await setImmediate();
  await setImmediate();
  assert.equal(instances.length, 1);
  const request = instances[0];
  assert.equal(request.method, "POST"); assert.equal(request.withCredentials, true);
  assert.equal(request.headers.get("authorization"), "Bearer owner-real-progress");
  assert.ok(request.body instanceof FormData);
  assert.equal((request.body.get("file") as File).name, "score.pdf");
  request.progress(123, 0, false);
  request.progress(40, 100);
  request.complete({ stagedUploadId: "one-upload", stagedUploadExpiresAt: "2026-10-15T00:00:00Z", preflight: {} });
  assert.deepEqual(await a, await b);
  assert.deepEqual(first, [0, 40, 100]); assert.deepEqual(second, [0, 40, 100]);
});

test("staged references survive effects and expiry; only explicit retry uploads again, and accounts never share", async () => {
  let calls = 0;
  const file = new File(["staged cache PDF"], "score.pdf", { type: "application/pdf" });
  const fetcher: typeof fetch = async () => Response.json({ stagedUploadId: `stage-${++calls}`, stagedUploadExpiresAt: "2000-01-01T00:00:00Z", preflight: {} });
  const options = { fetch: fetcher, accountId: "owner-stage-a" };
  const first = await fetchScorePreflight("https://preflight.test/staged-cache", file, options);
  const repeated = await fetchScorePreflight("https://preflight.test/staged-cache", new File(["staged cache PDF"], "score.pdf", { type: "application/pdf" }), options);
  assert.deepEqual(repeated, first); assert.equal(calls, 1);
  const retried = await fetchScorePreflight("https://preflight.test/staged-cache", file, { ...options, retryKey: 1 });
  assert.notDeepEqual(retried, first); assert.equal(calls, 2);
  await fetchScorePreflight("https://preflight.test/staged-cache", file, { ...options, accountId: "owner-stage-b" });
  assert.equal(calls, 3);
  forgetStagedScorePreflight("stage-1");
  await fetchScorePreflight("https://preflight.test/staged-cache", file, options);
  assert.equal(calls, 4, "a deliberate later selection obtains an unconsumed stage after success");
});

test("fresh explicit retry keys upload after remount even when an older retry's stage expired", async () => {
  let calls = 0;
  const file = new File(["remounted retry PDF"], "score.pdf", { type: "application/pdf" });
  const options = { accountId: "remounted-retry-owner", fetch: (async () => Response.json({
    stagedUploadId: `remounted-stage-${++calls}`, stagedUploadExpiresAt: "2000-01-01T00:00:00Z",
  })) as typeof fetch };
  const url = "https://preflight.test/remounted-retry";
  await fetchScorePreflight(url, file, options);
  await fetchScorePreflight(url, file, { ...options, retryKey: crypto.randomUUID() });
  await fetchScorePreflight(url, file, options);
  assert.equal(calls, 2, "remount keeps the reference until the user explicitly retries");
  const newAttempt = { ...options, retryKey: crypto.randomUUID() };
  await fetchScorePreflight(url, file, newAttempt);
  await fetchScorePreflight(url, file, newAttempt);
  assert.equal(calls, 3, "the new retry uploads once, and its repeated effect reuses that stage");
});

test("identical bytes with a different filename get a stage recording the selected source name", async () => {
  const names: string[] = [];
  const options = { accountId: "renamed-source-owner", fetch: (async (_, init) => {
    const file = (init!.body as FormData).get("file") as File;
    names.push(file.name);
    return Response.json({ stagedUploadId: `renamed-${names.length}`, stagedUploadExpiresAt: "2026-10-15T00:00:00Z" });
  }) as typeof fetch };
  const url = "https://preflight.test/renamed-source";
  await fetchScorePreflight(url, new File(["same source"], "first.pdf", { type: "application/pdf" }), options);
  await fetchScorePreflight(url, new File(["same source"], "second.pdf", { type: "application/pdf" }), options);
  await fetchScorePreflight(url, new File(["same source"], "second.pdf", { type: "application/pdf" }), options);
  assert.deepEqual(names, ["first.pdf", "second.pdf"]);
});

test("last XHR consumer cancellation aborts source transfer and never retries", async () => {
  let request: PreflightXhr | null = null;
  const controller = new AbortController();
  const pending = fetchScorePreflight("https://preflight.test/xhr-abort", new File(["abort PDF"], "score.pdf"), {
    signal: controller.signal,
    xhr: () => { request = new PreflightXhr(); return request as unknown as XMLHttpRequest; },
  });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  while (!request) await setImmediate();
  controller.abort(); await rejected;
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal((request as PreflightXhr).aborted, true);
});

test("a stalled XHR preflight reaches its deadline and releases the upload", async () => {
  const instances: PreflightXhr[] = [];
  const pending = fetchScorePreflight("https://preflight.test/xhr-timeout", new File(["timeout PDF"], "score.pdf"), {
    timeoutMs: 20,
    xhr: () => { const request = new PreflightXhr(); instances.push(request); return request as unknown as XMLHttpRequest; },
  });
  await assert.rejects(pending, { name: "AbortError" });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(instances.length, 1); assert.equal(instances[0].aborted, true);
});

test("staged confirmation contains the reference, selected mode and agreed price without file bytes", () => {
  assert.deepEqual(stagedScoreRecognitionBody("stage-confirm", "complex", 7), {
    stagedUploadId: "stage-confirm", recognitionMode: "complex", expectedCreditCost: 7,
  });
  assert.equal(parseStagedPreflightMetadata({ stagedUploadId: "stage", stagedUploadExpiresAt: "2026-10-15T00:00:00Z" })?.stagedUploadId, "stage");
  for (const value of [{}, { stagedUploadId: "", stagedUploadExpiresAt: "2026-10-15T00:00:00Z" }, { stagedUploadId: "stage", stagedUploadExpiresAt: "invalid" }]) {
    assert.equal(parseStagedPreflightMetadata(value), null);
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
