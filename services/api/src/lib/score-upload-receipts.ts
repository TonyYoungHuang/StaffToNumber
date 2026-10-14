import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const UPLOAD_RECEIPT_WAIT_MS = 300_000;
type Receipt = { signature: string; state: "processing" | "completed" | "failed"; startedAt: number };
export type UploadReceiptStatus = { state: "processing" | "completed" | "failed" | "unknown"; scoreId?: string };
export class UploadReceiptError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode = 409) { super(message); }
}

/** Shared-volume receipts survive a lost response and an API restart. The document
 * id is deterministic, so a commit before receipt persistence can be reconciled.
 * A stale in-progress claim is never automatically stolen: its outcome is unknown. */
export class ScoreUploadReceipts {
  constructor(private readonly root: string, private readonly findScore: (id: string, userId: string) => boolean,
    private readonly now = Date.now) {}

  private identity(userId: string, key: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(key)) {
      throw new UploadReceiptError("INVALID_IDEMPOTENCY_KEY", "Use a UUID upload request key.", 400);
    }
    const hash = createHash("sha256").update(`${userId}:${key.toLowerCase()}`).digest("hex");
    return { id: `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`,
      file: path.join(this.root, `${hash}.json`), lock: path.join(this.root, `${hash}.lock`) };
  }

  status(userId: string, key: string): UploadReceiptStatus | null {
    const entry = this.identity(userId, key);
    if (this.findScore(entry.id, userId)) return { state: "completed", scoreId: entry.id };
    let receipt: Receipt;
    try { receipt = JSON.parse(fs.readFileSync(entry.file, "utf8")) as Receipt; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return fs.existsSync(entry.lock) ? { state: "unknown" } : null;
      return { state: "unknown" };
    }
    if (receipt.state === "failed") return { state: "failed" };
    if (receipt.state === "processing" && Number.isFinite(receipt.startedAt)
      && this.now() - receipt.startedAt < UPLOAD_RECEIPT_WAIT_MS) return { state: "processing" };
    return { state: "unknown" };
  }

  begin(userId: string, key: string, signature: string): { scoreId: string; replay: boolean } {
    const entry = this.identity(userId, key);
    const previous = this.status(userId, key);
    if (previous) {
      try {
        const receipt = JSON.parse(fs.readFileSync(entry.file, "utf8")) as Receipt;
        if (receipt.signature !== signature) throw new UploadReceiptError("IDEMPOTENCY_KEY_REUSED", "This upload key belongs to different import options. Check the original upload result.");
      } catch (error) { if (error instanceof UploadReceiptError) throw error; }
      if (previous.state === "completed") return { scoreId: entry.id, replay: true };
      if (previous.state !== "failed") throw new UploadReceiptError(previous.state === "processing" ? "UPLOAD_IN_PROGRESS" : "UPLOAD_RESULT_UNKNOWN",
        previous.state === "processing" ? "This upload is still processing. Check its result before retrying." : "The upload result needs recovery. Check your library before starting another upload.");
    }
    fs.mkdirSync(this.root, { recursive: true });
    try { fs.mkdirSync(entry.lock); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new UploadReceiptError("UPLOAD_IN_PROGRESS", "This upload is already being processed. Check its result.");
      throw error;
    }
    try { this.write(entry.file, { signature, state: "processing", startedAt: this.now() }); }
    catch (error) { fs.rmdirSync(entry.lock); throw error; }
    return { scoreId: entry.id, replay: false };
  }

  finish(userId: string, key: string) {
    const entry = this.identity(userId, key);
    const receipt = JSON.parse(fs.readFileSync(entry.file, "utf8")) as Receipt;
    receipt.state = this.findScore(entry.id, userId) ? "completed" : "failed";
    this.write(entry.file, receipt);
    fs.rmdirSync(entry.lock);
  }

  private write(file: string, receipt: Receipt) {
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(receipt)}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, file);
  }
}
