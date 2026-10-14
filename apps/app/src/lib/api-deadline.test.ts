import assert from "node:assert/strict";
import test from "node:test";
import { ApiTransportError, withApiDeadline } from "./api-deadline.ts";

test("deadline releases a hung body read even if the operation ignores abort", async () => {
  let aborted = false;
  await assert.rejects(withApiDeadline(async signal => {
    signal.addEventListener("abort", () => { aborted = true; });
    return new Promise<never>(() => undefined);
  }, { timeoutMs: 10 }), (e: unknown) => e instanceof ApiTransportError && e.code === "API_REQUEST_TIMEOUT");
  assert.equal(aborted, true);
  assert.equal(await withApiDeadline(async () => "recovered", { timeoutMs: 50 }), "recovered");
});

test("caller cancellation has a separate outcome and the next request is usable", async () => {
  const controller = new AbortController();
  const pending = withApiDeadline(() => new Promise<never>(() => undefined), { signal: controller.signal, timeoutMs: 50 });
  controller.abort();
  await assert.rejects(pending, (e: unknown) => e instanceof ApiTransportError && e.code === "API_REQUEST_CANCELLED");
  assert.equal(await withApiDeadline(async () => 1, { timeoutMs: 50 }), 1);
});
