import assert from "node:assert/strict";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { hasUsableScoreOutputs, readScoreDownload } from "./download-score-file";
import { boundedScoreTransfer, fetchScoreUpload, forgetUploadReceipt, getUploadReceipt, latestUploadReceipt } from "./score-transfer-request";
import { scoreTransferCopy, scoreGenerationError } from "./score-transfer-messages/client";
import { readScoreMusicXmlPreview } from "./score-preview-request";
import { isCreditUpgradeError } from "./score-pass-checkout";
import { ScoreTransferError } from "./score-transfer-request";

test("an upload deadline covers a stalled response body and keeps the result unknown", async () => {
  await assert.rejects(fetchScoreUpload("https://upload.test", { method: "POST", body: "file" }, {
    timeoutMs: 15,
    fetch: async () => ({ ok: true, status: 201, json: () => new Promise(() => undefined) }) as Response,
  }), { code: "TIMEOUT" });
});

test("upload response failures distinguish explicit rejection from unknown success payloads", async () => {
  await assert.rejects(fetchScoreUpload("https://upload.test", {}, {
    fetch: async () => Response.json({ code: "UPLOAD_TOO_LARGE", error: "Too large" }, { status: 413 }),
  }), error => {
    assert.equal((error as { server?: { status: number } }).server?.status, 413); return true;
  });
  await assert.rejects(fetchScoreUpload("https://upload.test", {}, { fetch: async () => new Response("<html>Proxy error</html>") }), { code: "RESPONSE" });
  await assert.rejects(fetchScoreUpload("https://upload.test", {}, { fetch: async () => { throw new TypeError("Failed to fetch"); } }), { code: "NETWORK" });
});

test("cancelling a transfer releases the caller even when the operation does not settle", async () => {
  const controller = new AbortController();
  const pending = boundedScoreTransfer(() => new Promise(() => undefined), { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { code: "CANCELLED" });
});

test("unknown upload retries retain the same identity and stay isolated by account and input", () => {
  const first = getUploadReceipt("transfer-test-a", "hash:omr:simple");
  assert.equal(first.reused, false);
  const retried = getUploadReceipt("transfer-test-a", "hash:omr:simple");
  assert.equal(retried.key, first.key); assert.equal(retried.reused, true);
  assert.notEqual(getUploadReceipt("transfer-test-b", "hash:omr:simple").key, first.key);
  assert.notEqual(getUploadReceipt("transfer-test-a", "hash:omr:complex").key, first.key);
  forgetUploadReceipt("transfer-test-a", first.key);
  assert.notEqual(getUploadReceipt("transfer-test-a", "hash:omr:simple").key, first.key);
  assert.equal(latestUploadReceipt("transfer-test-a")?.identity, "hash:omr:simple");
});

test("a different upload retains an unresolved original receipt and only reuses its own identity", () => {
  const original = getUploadReceipt("separate-input-test", "unknown-file-hash:omr:simple");
  const distinct = getUploadReceipt("separate-input-test", "another-file-hash:musicxml:");
  assert.equal(distinct.reused, false);
  assert.notEqual(distinct.key, original.key);
  assert.equal(getUploadReceipt("separate-input-test", original.identity).key, original.key, "returning to the original file still reconciles its original request");
  assert.equal(getUploadReceipt("separate-input-test", distinct.identity).key, distinct.key);
  forgetUploadReceipt("separate-input-test", distinct.key);
  assert.equal(latestUploadReceipt("separate-input-test")?.key, original.key, "finishing a new file exposes the earlier unresolved request again");
});

test("download requires nonempty usable content and rejects an HTML or JSON error with HTTP 200", async () => {
  for (const response of [new Response(""), new Response("<!doctype html><html>proxy</html>", { headers: { "content-type": "application/octet-stream" } }), Response.json({ error: "File not found" })]) {
    await assert.rejects(readScoreDownload("https://download.test", {}, { fetch: async () => response }), { code: "INVALID_FILE" });
  }
  const file = await readScoreDownload("https://download.test", {}, { fetch: async () => new Response("%PDF-1.7 content", { headers: { "content-type": "application/pdf", "content-length": "16" } }) });
  assert.equal(file.size, 16);
});

test("paid file download rejection retains the checkout error instead of yielding a file", async () => {
  await assert.rejects(readScoreDownload("https://download.test/score.musicxml", {}, {
    fetch: async () => Response.json({ code: "SCORE_PASS_REQUIRED", error: "Choose a score pass or Starter" }, { status: 403 }),
  }), error => error instanceof ScoreTransferError && Boolean(error.server) && isCreditUpgradeError(error.server!));
});

test("candidate and accepted previews read original XML through preview APIs without downloading a paid file", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ path: string; init?: RequestInit }> = [];
  const originalXml = '<score-partwise><defaults><scaling><millimeters>7</millimeters></scaling></defaults></score-partwise>';
  globalThis.fetch = async (url, init) => {
    requests.push({ path: new URL(String(url)).pathname, init });
    return Response.json({ musicXml: originalXml });
  };
  try {
    for (const candidate of [true, false]) {
      const result = await readScoreMusicXmlPreview({ documentId: "score one", candidate, token: "fixture" });
      assert.equal(result.ok && result.data.musicXml, originalXml, "preview content remains unchanged");
      assert.equal(requests.at(-1)?.path, `/api/scores/score%20one/${candidate ? "candidate/" : ""}musicxml-preview`);
      assert.equal(requests.at(-1)?.init?.credentials, "include");
    }
    assert.equal(requests.some(request => request.path.includes("/files/") || request.path.includes("/download")), false);
  } finally { globalThis.fetch = originalFetch; }
});

test("completed export status requires every declared output file to be present and nonempty", () => {
  const files = [{ id: "page-1", sizeBytes: 100 }, { id: "page-2", sizeBytes: 200 }];
  assert.equal(hasUsableScoreOutputs(["page-1", "page-2"], files), true);
  assert.equal(hasUsableScoreOutputs(null, files), false);
  assert.equal(hasUsableScoreOutputs([], files), false);
  assert.equal(hasUsableScoreOutputs(["missing"], files), false);
  assert.equal(hasUsableScoreOutputs(["page-1"], [{ ...files[0], sizeBytes: 0 }]), false);
  assert.equal(hasUsableScoreOutputs(["page-1"], [{ ...files[0], stale: true }]), false);
});

test("download distinguishes network interruption, blob read failure, and incomplete content", async () => {
  await assert.rejects(readScoreDownload("https://download.test", {}, { fetch: async () => { throw new TypeError("Failed to fetch"); } }), { code: "NETWORK" });
  await assert.rejects(readScoreDownload("https://download.test", {}, {
    fetch: async () => ({ ok: true, headers: new Headers(), blob: async () => { throw new TypeError("Body interrupted"); } }) as unknown as Response,
  }), { code: "READ" });
  await assert.rejects(readScoreDownload("https://download.test", {}, { fetch: async () => new Response("short", { headers: { "content-length": "100" } }) }), { code: "INVALID_FILE" });
});

test("download deadline also covers a stalled blob read", async () => {
  await assert.rejects(readScoreDownload("https://download.test", {}, {
    timeoutMs: 15,
    fetch: async () => ({ ok: true, headers: new Headers(), blob: () => new Promise(() => undefined) }) as Response,
  }), { code: "TIMEOUT" });
});

test("browser decoded compression does not make a complete download look truncated", async () => {
  const file = await readScoreDownload("https://download.test", {}, {
    fetch: async () => new Response("long decoded file contents", { headers: { "content-encoding": "gzip", "content-length": "12" } }),
  });
  assert.ok(file.size > 12);
});

test("memory and empty selection failures receive distinct readable recovery messages", () => {
  assert.equal(scoreGenerationError({ error: "spawn ENOMEM" }, "zh-CN"), scoreTransferCopy("zh-CN").memory);
  assert.equal(scoreGenerationError({ code: "ENGINE_MEMORY_PRESSURE" }, "en"), scoreTransferCopy("en").memory);
  assert.equal(scoreGenerationError({ error: "[ENGINE_RESOURCE_BUSY] Queue busy" }, "zh-CN"), scoreTransferCopy("zh-CN").resourceBusy);
  assert.equal(scoreGenerationError({ code: "ENGINE_RESOURCE_UNAVAILABLE" }, "zh-CN"), scoreTransferCopy("zh-CN").resourceUnavailable);
  assert.equal(scoreGenerationError({ code: "EXPORT_EMPTY_SELECTION" }, "en"), scoreTransferCopy("en").exportEmpty);
  assert.equal(scoreGenerationError({ error: "The selected practice range or part filter does not contain playable notes." }, "zh-CN"), scoreTransferCopy("zh-CN").exportEmpty);
  assert.equal(scoreGenerationError({ error: "Other failure" }, "en"), null);
});

test("upload, file-check and processing recovery has complete locale copy without English fallback", () => {
  const english = scoreTransferCopy("en");
  for (const locale of SUPPORTED_LOCALES) {
    const copy = scoreTransferCopy(locale);
    assert.deepEqual(Object.keys(copy), Object.keys(english), locale);
    for (const key of Object.keys(english) as Array<keyof typeof english>) {
      assert.ok(copy[key].trim(), `${locale} ${key}`);
      if (locale !== "en") assert.notEqual(copy[key], english[key], `${locale} ${key} must be translated`);
    }
    assert.equal(scoreGenerationError({ code: "ENGINE_MEMORY_PRESSURE" }, locale), copy.memory);
    assert.equal(scoreGenerationError({ code: "ENGINE_RESOURCE_BUSY" }, locale), copy.resourceBusy);
    assert.equal(scoreGenerationError({ code: "ENGINE_RESOURCE_UNAVAILABLE" }, locale), copy.resourceUnavailable);
    assert.doesNotMatch(copy.memory, /MiB|GiB/u, locale);
  }
  assert.notEqual(scoreTransferCopy("zh-TW").preflightTimeout, scoreTransferCopy("zh-CN").preflightTimeout);
});
