import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CreateBucketCommand, DeleteBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { ObjectStorage } from "./index.js";

const endpoint = process.env.S3_TEST_ENDPOINT?.trim();

test("real S3-compatible storage supports the complete private object lifecycle", { skip: !endpoint }, async () => {
  const accessKeyId = process.env.S3_TEST_ACCESS_KEY_ID ?? "scoretest";
  const secretAccessKey = process.env.S3_TEST_SECRET_ACCESS_KEY ?? "scoretestsecret";
  const region = process.env.S3_TEST_REGION ?? "us-east-1";
  const bucket = `score-storage-${Date.now()}`;
  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-real-s3-"));
  const source = path.join(root, "source.musicxml");
  const materialized = path.join(root, "materialized.musicxml");
  await fs.promises.writeFile(source, "<score-partwise version=\"4.0\"/>");
  const storage = new ObjectStorage({
    backend: "s3",
    localRoot: root,
    bucket,
    region,
    endpoint,
    forcePathStyle: true,
    accessKeyId,
    secretAccessKey,
    keyPrefix: "integration",
  });
  try {
    assert.deepEqual(await storage.checkHealth(), { backend: "s3", target: bucket });
    const persisted = await storage.persistFile({
      sourcePath: source,
      objectKey: "integration/users/user-1/file-1/source.musicxml",
      contentType: "application/vnd.recordare.musicxml+xml",
    });
    assert.equal(fs.existsSync(source), false);
    assert.equal(await storage.exists(persisted.ref), true);
    await storage.materialize(persisted.ref, materialized, persisted.checksumSha256);
    assert.equal(await fs.promises.readFile(materialized, "utf8"), "<score-partwise version=\"4.0\"/>");
    assert.equal(await storage.delete(persisted.ref), true);
    assert.equal(await storage.exists(persisted.ref), false);
  } finally {
    await client.send(new DeleteBucketCommand({ Bucket: bucket })).catch(() => undefined);
    await fs.promises.rm(root, { recursive: true, force: true });
    client.destroy();
  }
});
