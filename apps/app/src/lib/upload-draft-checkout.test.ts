import assert from "node:assert/strict";
import test from "node:test";
import { uploadDraftCheckoutContext, uploadDraftCopy, uploadDraftPrepareKey, uploadDraftReturnPath } from "./upload-draft-checkout";
import type { SupportedLocale } from "@score/i18n";

test("draft preparation key persists across remount and retry and separates account/source/mode", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  let generated = 0; const uuid = () => `stable-${++generated}`;
  assert.equal(uploadDraftPrepareKey("user", "stage", "simple", " Title ", storage, uuid), "stable-1");
  assert.equal(uploadDraftPrepareKey("user", "stage", "simple", "Title", storage, uuid), "stable-1");
  assert.equal(uploadDraftPrepareKey("user", "stage", "complex", "Title", storage, uuid), "stable-2");
  assert.equal(uploadDraftPrepareKey("other", "stage", "simple", "Title", storage, uuid), "stable-3");
  assert.equal(uploadDraftPrepareKey("user", "other", "simple", "Title", storage, uuid), "stable-4");
});

test("upload returns keep original query/hash and server draft confirmation", () => {
  assert.equal(uploadDraftReturnPath("/scores/new/scan?task=transpose&checkoutOrderId=old#free-scan", "draft"), "/scores/new/scan?task=transpose&uploadDraft=draft#free-scan");
  const context = uploadDraftCheckoutContext({ id: "draft", documentId: "document", filename: "source.pdf", title: "Score", mode: "complex", creditCost: 5,
    status: "awaiting_payment", expiresAt: "2026-10-16", taskId: null, confirmation: "required" }, "/scores?mode=scan#free-scan");
  assert.equal(context.targetDocumentId, "document");
  assert.deepEqual(context.intendedAction, { kind: "recognition", mode: "complex", uploadDraftId: "draft" });
  assert.deepEqual(context.returnState, { version: 1, intent: "continue_action", uploadDraftId: "draft", confirmation: "required" });
  assert.equal(context.returnPath, "/scores?mode=scan&uploadDraft=draft#free-scan");
});

test("all nine locales explain saved upload, explicit confirmation, queued recognition and failures", () => {
  for (const locale of ["en", "zh-CN", "zh-TW", "ja", "ko", "fr", "es", "de", "ru"] as SupportedLocale[]) {
    const copy = uploadDraftCopy(locale);
    for (const text of Object.values(copy)) assert.ok(text.trim(), locale);
  }
  assert.equal(uploadDraftCopy("zh-CN").continue, "继续识别");
});
