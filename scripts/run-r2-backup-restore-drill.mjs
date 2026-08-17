import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const required = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required.`);
}

const bucket = process.env.R2_BUCKET.trim();
const prefix = normalizePrefix(process.env.R2_PREFIX || "production");
const drillId = `restore-drill-${new Date().toISOString().replace(/[:.]/gu, "-")}-${randomBytes(4).toString("hex")}`;
const drillPrefix = `${prefix}ops/restore-drills/${drillId}/`;
const sourceKey = `${drillPrefix}backup/source.bin`;
const restoredKey = `${drillPrefix}restored/source.bin`;
const sourceFile = process.env.R2_DRILL_SOURCE_FILE?.trim();
const payload = sourceFile
  ? fs.readFileSync(path.resolve(sourceFile))
  : randomBytes(64 * 1024);
const expectedSha256 = sha256(payload);
const startedAt = new Date().toISOString();
const outputPath = path.resolve(process.env.R2_DRILL_REPORT || `.tmp/backup-restore/${drillId}-r2.json`);

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT.trim(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
  },
});

let sourceSha256 = null;
let restoredSha256 = null;
let cleanupPassed = false;
try {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: sourceKey,
    Body: payload,
    ContentType: "application/octet-stream",
    Metadata: { drill: drillId, sha256: expectedSha256 },
  }));
  sourceSha256 = sha256(await bodyBytes((await client.send(new GetObjectCommand({ Bucket: bucket, Key: sourceKey }))).Body));
  if (sourceSha256 !== expectedSha256) throw new Error("Backup object checksum mismatch.");

  await client.send(new CopyObjectCommand({
    Bucket: bucket,
    Key: restoredKey,
    CopySource: `/${bucket}/${sourceKey.split("/").map(encodeURIComponent).join("/")}`,
    MetadataDirective: "COPY",
  }));
  restoredSha256 = sha256(await bodyBytes((await client.send(new GetObjectCommand({ Bucket: bucket, Key: restoredKey }))).Body));
  if (restoredSha256 !== expectedSha256) throw new Error("Restored object checksum mismatch.");
} finally {
  await client.send(new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: { Objects: [{ Key: sourceKey }, { Key: restoredKey }], Quiet: true },
  }));
  const remaining = [];
  for (const key of [sourceKey, restoredKey]) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      remaining.push(key);
    } catch (error) {
      if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== "NotFound") throw error;
    }
  }
  cleanupPassed = remaining.length === 0;
}

const report = {
  schemaVersion: 1,
  drillId,
  startedAt,
  completedAt: new Date().toISOString(),
  scope: "R2 object-level backup copy, checksum restore, and cleanup",
  bucket,
  prefix,
  sourceKey,
  restoredKey,
  sourceFile: sourceFile ? path.basename(sourceFile) : null,
  payloadBytes: payload.byteLength,
  expectedSha256,
  sourceSha256,
  restoredSha256,
  backupReadPassed: sourceSha256 === expectedSha256,
  restorePassed: restoredSha256 === expectedSha256,
  cleanupPassed,
  passed: sourceSha256 === expectedSha256 && restoredSha256 === expectedSha256 && cleanupPassed,
  limitations: [
    "This proves object-level recovery in the configured production R2 bucket.",
    "It does not prove an independent account or cross-region disaster-recovery copy.",
  ],
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`R2 restore drill ${report.passed ? "passed" : "failed"}: ${outputPath}`);
if (!report.passed) process.exitCode = 1;

function normalizePrefix(value) {
  const cleaned = value.trim().replace(/^\/+|\/+$/gu, "");
  return cleaned ? `${cleaned}/` : "";
}

async function bodyBytes(body) {
  if (!body) throw new Error("R2 returned an empty body.");
  return Buffer.from(await body.transformToByteArray());
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
