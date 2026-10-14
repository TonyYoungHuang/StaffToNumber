import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ScoreUploadReceipts, UploadReceiptError, UPLOAD_RECEIPT_WAIT_MS } from "./score-upload-receipts.js";

test("upload receipts prevent duplicate work and reconcile a commit before response/receipt loss", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upload-receipt-"));
  const documents = new Map<string, string>();
  let now = 0;
  const create = () => new ScoreUploadReceipts(root, (id, user) => documents.get(id) === user, () => now);
  const key = crypto.randomUUID();
  try {
    const receipts = create();
    const original = receipts.begin("alice", key, "/omr?mode=simple");
    assert.equal(original.replay, false);
    assert.throws(() => receipts.begin("alice", key, "/omr?mode=simple"), (e: unknown) => e instanceof UploadReceiptError && e.code === "UPLOAD_IN_PROGRESS");
    assert.equal(receipts.status("bob", key), null);
    now = UPLOAD_RECEIPT_WAIT_MS + 1;
    assert.equal(create().status("alice", key)?.state, "unknown");
    assert.throws(() => create().begin("alice", key, "/omr?mode=simple"), (e: unknown) => e instanceof UploadReceiptError && e.code === "UPLOAD_RESULT_UNKNOWN");
    documents.set(original.scoreId, "alice");
    assert.deepEqual(create().status("alice", key), { state: "completed", scoreId: original.scoreId });
    assert.deepEqual(create().begin("alice", key, "/omr?mode=simple"), { scoreId: original.scoreId, replay: true });
    assert.throws(() => create().begin("alice", key, "/omr?mode=complex"), (e: unknown) => e instanceof UploadReceiptError && e.code === "IDEMPOTENCY_KEY_REUSED");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a confirmed failure can safely retry the same identity; concurrent claims stay exclusive", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upload-receipt-"));
  const receipts = new ScoreUploadReceipts(root, () => false);
  const key = crypto.randomUUID();
  try {
    const first = receipts.begin("alice", key, "/omr");
    receipts.finish("alice", key);
    assert.equal(receipts.status("alice", key)?.state, "failed");
    assert.deepEqual(receipts.begin("alice", key, "/omr"), first);
    assert.throws(() => receipts.begin("alice", key, "/omr"));
    assert.throws(() => receipts.begin("alice", "../../private", "/omr"), (e: unknown) => e instanceof UploadReceiptError && e.statusCode === 400);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
