import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

test("Cloudflare R2 uploads use supported MD5 transport checksums and retain SHA-256 metadata", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-storage-r2-"));
  const source = path.join(root, "source.png");
  await fs.promises.writeFile(source, "r2-image");
  const commands: unknown[] = [];
  const storage = new ObjectStorage({
    backend: "s3",
    localRoot: root,
    bucket: "scoretransposer-staging",
    region: "auto",
    endpoint: "https://0123456789abcdef.r2.cloudflarestorage.com",
  }, {
    async send(command: unknown) {
      commands.push(command);
      return {};
    },
  } as never);

  const persisted = await storage.persistFile({ sourcePath: source, objectKey: "staging/source.png", contentType: "image/png" });
  const put = commands[0] as PutObjectCommand;
  assert.equal(put.input.ChecksumSHA256, undefined);
  assert.equal(put.input.ContentMD5, createHash("md5").update("r2-image").digest("base64"));
  assert.equal(put.input.Metadata?.["sha256-hex"], persisted.checksumSha256);
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

test("Cloudflare R2 multipart parts use supported MD5 transport checksums", async () => {
  const commands: unknown[] = [];
  const body = Buffer.from("%PDF-r2-part");
  const storage = new ObjectStorage({
    backend: "s3",
    localRoot: ".",
    bucket: "scoretransposer-staging",
    region: "auto",
    endpoint: "https://0123456789abcdef.r2.cloudflarestorage.com",
  }, {
    async send(command: unknown) {
      commands.push(command);
      if (command instanceof CreateMultipartUploadCommand) return { UploadId: "upload-r2" };
      if (command instanceof UploadPartCommand) return { ETag: '"etag-r2"' };
      return {};
    },
  } as never);

  const session = await storage.beginResumableUpload({ objectKey: "staging/large.pdf", contentType: "application/pdf" });
  const part = await storage.uploadResumablePart({ session, partNumber: 1, body });
  await storage.completeResumableUpload({ session, parts: [part] });
  const upload = commands[1] as UploadPartCommand;
  const complete = commands[2] as CompleteMultipartUploadCommand;
  assert.equal(upload.input.ChecksumSHA256, undefined);
  assert.equal(upload.input.ContentMD5, createHash("md5").update(body).digest("base64"));
  assert.equal(complete.input.MultipartUpload?.Parts?.[0]?.ChecksumSHA256, undefined);
});

test("object storage gateway supports private object and multipart operations", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-storage-gateway-"));
  const source = path.join(root, "source.musicxml");
  await fs.promises.writeFile(source, "<score-partwise/>");
  const requests: Array<{ url: URL; method: string; token: string | null; body: Buffer }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    const headers = new Headers(init?.headers);
    const body = init?.body ? Buffer.from(init.body as Uint8Array) : Buffer.alloc(0);
    requests.push({ url, method: init?.method ?? "GET", token: headers.get("x-score-storage-token"), body });
    if (url.pathname.endsWith("/health")) return Response.json({ status: "ready" });
    if (url.pathname.endsWith("/multipart") && init?.method === "POST") return Response.json({ uploadId: "gateway-upload" });
    if (url.pathname.includes("/parts/")) return Response.json({ etag: "gateway-etag", partNumber: 1 });
    if (url.pathname.endsWith("/complete")) return Response.json({ completed: true });
    if (init?.method === "GET") return new Response("<score-partwise/>");
    return new Response(null, { status: init?.method === "PUT" ? 201 : 204 });
  }) as typeof fetch;

  try {
    const storage = new ObjectStorage({
      backend: "s3",
      localRoot: root,
      bucket: "private-scores",
      region: "auto",
      gatewayUrl: "https://api.example.com/__edge/storage",
      gatewayToken: "test-storage-token",
    });
    const persisted = await storage.persistFile({ sourcePath: source, objectKey: "staging/users/u1/source.musicxml", contentType: "application/xml" });
    assert.equal(persisted.ref.storageKey, "staging/users/u1/source.musicxml");
    assert.equal(requests[0].token, "test-storage-token");
    assert.equal(requests[0].body.toString(), "<score-partwise/>");
    assert.equal(await storage.exists(persisted.ref), true);
    const chunks: Buffer[] = [];
    for await (const chunk of await storage.openReadStream(persisted.ref)) chunks.push(Buffer.from(chunk));
    assert.equal(Buffer.concat(chunks).toString(), "<score-partwise/>");
    assert.deepEqual(await storage.checkHealth(), { backend: "s3", target: "private-scores" });
    const session = await storage.beginResumableUpload({ objectKey: "staging/users/u1/large.pdf", contentType: "application/pdf" });
    const part = await storage.uploadResumablePart({ session, partNumber: 1, body: Buffer.from("part") });
    await storage.completeResumableUpload({ session, parts: [part] });
    await storage.abortResumableUpload(session);
    assert.equal(await storage.delete(persisted.ref), true);
    assert.equal(requests.every((entry) => entry.token === "test-storage-token"), true);
  } finally {
    globalThis.fetch = originalFetch;
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
