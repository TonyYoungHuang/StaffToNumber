import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { createStorageObjectKey, ObjectStorage } from "./index.js";

test("local storage persists, streams, materializes, and deletes only safe paths", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-storage-"));
  const source = path.join(root, "source.musicxml");
  const copy = path.join(root, "copy.musicxml");
  await fs.promises.writeFile(source, "<score-partwise/>");
  const storage = new ObjectStorage({ backend: "local", localRoot: root });
  const persisted = await storage.persistFile({ sourcePath: source, objectKey: "ignored", contentType: "application/xml" });
  assert.equal(persisted.ref.backend, "local");
  assert.equal(persisted.sizeBytes, 17);
  assert.equal(persisted.checksumSha256.length, 64);
  assert.equal(await storage.exists(persisted.ref), true);
  const chunks: Buffer[] = [];
  for await (const chunk of await storage.openReadStream(persisted.ref)) chunks.push(Buffer.from(chunk));
  assert.equal(Buffer.concat(chunks).toString(), "<score-partwise/>");
  assert.equal(await storage.materialize(persisted.ref, copy), source);
  assert.equal(await storage.delete(persisted.ref), true);
  assert.equal(await storage.exists(persisted.ref), false);
  await fs.promises.rm(root, { recursive: true, force: true });
});

test("S3 storage writes checksummed private objects and reads through the configured bucket", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-storage-s3-"));
  const source = path.join(root, "source.mid");
  await fs.promises.writeFile(source, "MThd-test");
  const commands: unknown[] = [];
  const client = {
    async send(command: unknown) {
      commands.push(command);
      if (command instanceof GetObjectCommand) return { Body: Readable.from([Buffer.from("MThd-test")]) };
      if (command instanceof HeadObjectCommand) return { ContentLength: 9 };
      return {};
    },
  };
  const storage = new ObjectStorage({
    backend: "s3",
    localRoot: root,
    bucket: "private-scores",
    region: "test-1",
    serverSideEncryption: "AES256",
  }, client as never);
  const result = await storage.persistFile({ sourcePath: source, objectKey: "users/u1/f1/source.mid", contentType: "audio/midi" });
  assert.equal(result.ref.storagePath, "s3://private-scores/users/u1/f1/source.mid");
  assert.equal(result.ref.storageKey, "users/u1/f1/source.mid");
  assert.equal(fs.existsSync(source), false);
  const put = commands[0] as PutObjectCommand;
  assert.equal(put.input.Bucket, "private-scores");
  assert.equal(put.input.ServerSideEncryption, "AES256");
  assert.equal(put.input.Metadata?.["sha256-hex"], result.checksumSha256);
  assert.equal(await storage.exists(result.ref), true);
  assert.deepEqual(await storage.checkHealth(), { backend: "s3", target: "private-scores" });
  assert.equal(commands.some((command) => command instanceof HeadBucketCommand), true);
  const chunks: Buffer[] = [];
  for await (const chunk of await storage.openReadStream(result.ref)) chunks.push(Buffer.from(chunk));
  assert.equal(Buffer.concat(chunks).toString(), "MThd-test");
  const materialized = path.join(root, "materialized.mid");
  await storage.materialize(result.ref, materialized, result.checksumSha256);
  assert.equal(await fs.promises.readFile(materialized, "utf8"), "MThd-test");
  const corruptTarget = path.join(root, "corrupt.mid");
  await assert.rejects(storage.materialize(result.ref, corruptTarget, "0".repeat(64)), /checksum verification failed/u);
  assert.equal(fs.existsSync(corruptTarget), false);
  await fs.promises.rm(root, { recursive: true, force: true });
});

test("object keys are tenant-scoped and traversal-safe", () => {
  assert.equal(
    createStorageObjectKey({ prefix: "prod/scores", userId: "../user", fileId: "file/1", storedName: "../../score.xml" }),
    "prod/scores/users/..-user/file-1/..-..-score.xml",
  );
});

test("local resumable uploads verify parts, resume, complete, and abort", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-storage-multipart-"));
  const storage = new ObjectStorage({ backend: "local", localRoot: root });
  const session = await storage.beginResumableUpload({ objectKey: "users/u1/file.bin", contentType: "application/octet-stream" });
  const second = await storage.uploadResumablePart({ session, partNumber: 2, body: Buffer.from("world") });
  const first = await storage.uploadResumablePart({ session, partNumber: 1, body: Buffer.from("hello ") });
  const completed = await storage.completeResumableUpload({ session, parts: [second, first] });
  assert.equal(await fs.promises.readFile(completed.ref.storagePath, "utf8"), "hello world");
  assert.equal(completed.sizeBytes, 11);

  const abandoned = await storage.beginResumableUpload({ objectKey: "users/u1/abandoned.bin", contentType: "application/octet-stream" });
  await storage.uploadResumablePart({ session: abandoned, partNumber: 1, body: Buffer.from("partial") });
  await storage.abortResumableUpload(abandoned);
  await assert.rejects(storage.completeResumableUpload({ session: abandoned, parts: [{ partNumber: 1, etag: "x", sizeBytes: 7, checksumSha256: "x" }] }));
  await fs.promises.rm(root, { recursive: true, force: true });
});

test("S3 resumable uploads use native multipart commands and preserve encryption", async () => {
  const commands: unknown[] = [];
  const client = {
    async send(command: unknown) {
      commands.push(command);
      if (command instanceof CreateMultipartUploadCommand) return { UploadId: "upload-1" };
      if (command instanceof UploadPartCommand) return { ETag: '"etag-1"' };
      return {};
    },
  };
  const storage = new ObjectStorage({ backend: "s3", localRoot: ".", bucket: "private-scores", region: "test-1", serverSideEncryption: "AES256" }, client as never);
  const session = await storage.beginResumableUpload({ objectKey: "users/u1/large.pdf", contentType: "application/pdf" });
  const part = await storage.uploadResumablePart({ session, partNumber: 1, body: Buffer.from("%PDF-part") });
  const completed = await storage.completeResumableUpload({ session, parts: [part] });
  await storage.abortResumableUpload(session);
  assert.equal((commands[0] as CreateMultipartUploadCommand).input.ServerSideEncryption, "AES256");
  assert.equal((commands[1] as UploadPartCommand).input.PartNumber, 1);
  assert.equal(commands[2] instanceof CompleteMultipartUploadCommand, true);
  assert.equal(commands[3] instanceof AbortMultipartUploadCommand, true);
  assert.equal(completed.ref.storagePath, "s3://private-scores/users/u1/large.pdf");
});
