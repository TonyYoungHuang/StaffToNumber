import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { DetectedUploadKind } from "./upload-security.js";

export const STAGED_OMR_TTL_MS = 24 * 60 * 60 * 1000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
export type StagedOmrUpload = {
  id: string; userId: string; filename: string; sizeBytes: number; mimeType: string;
  detectedKind: DetectedUploadKind; checksumSha256: string; createdAt: string; expiresAt: string;
  consumed?: boolean;
};

export class StagedOmrUploadError extends Error {
  constructor(readonly code: "STAGED_UPLOAD_NOT_FOUND" | "STAGED_UPLOAD_EXPIRED" | "STAGED_UPLOAD_BUSY" | "STAGED_UPLOAD_CONSUMED" | "INVALID_STAGED_UPLOAD_ID",
    message: string, readonly statusCode: number) { super(message); }
}

const root = () => path.join(config.storageDir, ".staged-omr");
const directory = (id: string) => path.join(root(), id);
const expired = () => new StagedOmrUploadError("STAGED_UPLOAD_EXPIRED", "The checked upload expired or was cleared. Check the file again to upload a fresh copy.", 410);
const missing = () => new StagedOmrUploadError("STAGED_UPLOAD_NOT_FOUND", "This checked upload is not available for your account.", 404);
const isMissing = (error: unknown) => (error as NodeJS.ErrnoException)?.code === "ENOENT";

/** Lazy TTL collection runs on every preflight and confirmation, including after a
 * restart. Active claims are kept until their lock is an hour old, so a cleanup
 * request cannot remove a source while another process is starting recognition. */
export async function cleanupExpiredStagedOmrUploads(now = Date.now()) {
  const entries = await fs.readdir(root(), { withFileTypes: true }).catch(error => { if (isMissing(error)) return []; throw error; });
  for (const entry of entries) {
    if (!entry.isDirectory() || !UUID.test(entry.name)) continue;
    const dir = directory(entry.name);
    try {
      let expiry: number;
      try {
        const metadata: unknown = JSON.parse(await fs.readFile(path.join(dir, "metadata.json"), "utf8"));
        expiry = metadata && typeof metadata === "object" && "expiresAt" in metadata && typeof metadata.expiresAt === "string"
          ? Date.parse(metadata.expiresAt) : NaN;
      } catch (error) {
        if (!(error instanceof SyntaxError) && !isMissing(error)) throw error;
        expiry = NaN;
      }
      // A crash between mkdir/rename/metadata publication leaves an incomplete
      // directory. Sweep it after the same TTL; a malformed record must not stop
      // collection (or prevent every user's next preflight/confirmation).
      if (!Number.isFinite(expiry)) expiry = (await fs.stat(dir)).mtimeMs + STAGED_OMR_TTL_MS;
      if (expiry > now) continue;
      const lock = await fs.stat(path.join(dir, ".claim")).catch(error => { if (isMissing(error)) return null; throw error; });
      if (lock && now - lock.mtimeMs < 60 * 60 * 1000) continue;
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      if (isMissing(error)) continue;
      throw error;
    }
  }
}

export async function stageOmrUpload(input: {
  sourcePath: string; userId: string; filename: string; sizeBytes: number; mimeType: string; detectedKind: DetectedUploadKind;
}, now = Date.now()) {
  await cleanupExpiredStagedOmrUploads(now);
  const id = randomUUID(), dir = directory(id);
  const metadata: StagedOmrUpload = {
    id, userId: input.userId, filename: input.filename, sizeBytes: input.sizeBytes,
    mimeType: input.mimeType, detectedKind: input.detectedKind,
    checksumSha256: createHash("sha256").update(await fs.readFile(input.sourcePath)).digest("hex"),
    createdAt: new Date(now).toISOString(), expiresAt: new Date(now + STAGED_OMR_TTL_MS).toISOString(),
  };
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.rename(input.sourcePath, path.join(dir, "source.upload"));
    await fs.writeFile(path.join(dir, "metadata.json"), `${JSON.stringify(metadata)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return metadata;
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true });
    throw error;
  }
}

/** mkdir is atomic across API processes sharing STORAGE_DIR. A failed request
 * releases the claim; after a score/job commits the claim must never be released
 * unless its consumed marker is durable, preventing a crash from charging twice. */
export async function claimStagedOmrUpload(userId: string, id: unknown, now = Date.now()) {
  if (typeof id !== "string" || !UUID.test(id)) throw new StagedOmrUploadError("INVALID_STAGED_UPLOAD_ID", "Supply the checked upload id returned by preflight.", 400);
  await cleanupExpiredStagedOmrUploads(now);
  const dir = directory(id), metadataPath = path.join(dir, "metadata.json"), lockPath = path.join(dir, ".claim");
  let metadata: StagedOmrUpload;
  try { metadata = JSON.parse(await fs.readFile(metadataPath, "utf8")) as StagedOmrUpload; }
  catch (error) { if (isMissing(error)) throw expired(); throw error; }
  if (metadata.userId !== userId) throw missing();
  if (Date.parse(metadata.expiresAt) <= now) throw expired();
  if (metadata.consumed) throw new StagedOmrUploadError("STAGED_UPLOAD_CONSUMED", "This checked upload already started recognition. Open its score in your library.", 409);
  try { await fs.mkdir(lockPath); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new StagedOmrUploadError("STAGED_UPLOAD_BUSY", "This checked upload is already starting recognition. Check your library before retrying.", 409);
    if (isMissing(error)) throw expired();
    throw error;
  }
  let committed = false;
  const release = async () => { if (!committed) await fs.rmdir(lockPath).catch(error => { if (!isMissing(error)) throw error; }); };
  try {
    // Re-read after locking: a competing claimant may have completed between the
    // first read and mkdir. Replayed sources must not be copied or billed again.
    metadata = JSON.parse(await fs.readFile(metadataPath, "utf8")) as StagedOmrUpload;
    if (metadata.consumed) throw new StagedOmrUploadError("STAGED_UPLOAD_CONSUMED", "This checked upload already started recognition. Open its score in your library.", 409);
    const sourcePath = path.join(dir, "source.upload");
    const bytes = await fs.readFile(sourcePath);
    if (bytes.length !== metadata.sizeBytes || createHash("sha256").update(bytes).digest("hex") !== metadata.checksumSha256) throw expired();
    return {
      metadata, sourcePath, release,
      consume: async () => {
        committed = true;
        const nextPath = path.join(dir, "metadata.next.json");
        await fs.writeFile(nextPath, `${JSON.stringify({ ...metadata, consumed: true })}\n`, { encoding: "utf8", mode: 0o600 });
        await fs.rename(nextPath, metadataPath);
        await fs.rm(sourcePath, { force: true });
        await fs.rmdir(lockPath);
      },
    };
  } catch (error) {
    await release();
    if (isMissing(error)) throw expired();
    throw error;
  }
}
