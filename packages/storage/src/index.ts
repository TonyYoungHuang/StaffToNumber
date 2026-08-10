import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

export type StorageBackend = "local" | "s3";

export type StoredObjectRef = {
  backend: StorageBackend;
  storagePath: string;
  storageKey: string | null;
};

export type ObjectStorageConfig = {
  backend: StorageBackend;
  localRoot: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  keyPrefix?: string;
  maxAttempts?: number;
  serverSideEncryption?: "AES256" | "aws:kms";
  kmsKeyId?: string;
};

export type ResumableUploadSession = {
  backend: StorageBackend;
  uploadId: string;
  objectKey: string;
  contentType: string;
  createdAt: string;
};

export type ResumableUploadPart = {
  partNumber: number;
  etag: string;
  sizeBytes: number;
  checksumSha256: string;
};

type S3Sender = Pick<S3Client, "send">;

function safeSegment(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]/gu, "-").replace(/^-+|-+$/gu, "");
  return normalized || "object";
}

function normalizePrefix(value: string | undefined) {
  return (value ?? "").split("/").map(safeSegment).filter(Boolean).join("/");
}

function isMissingObject(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.name === "NoSuchKey" || candidate.$metadata?.httpStatusCode === 404;
}

function assertPartNumber(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 10_000) throw new Error("Multipart part number must be from 1 to 10000.");
}

async function sha256File(filePath: string) {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath)) digest.update(chunk as Buffer);
  return digest.digest("hex");
}

export function createStorageObjectKey(input: {
  prefix?: string;
  userId: string;
  fileId: string;
  storedName: string;
}) {
  return [normalizePrefix(input.prefix), "users", safeSegment(input.userId), safeSegment(input.fileId), safeSegment(input.storedName)]
    .filter(Boolean)
    .join("/");
}

export class ObjectStorage {
  readonly backend: StorageBackend;
  readonly bucket: string | null;
  readonly keyPrefix: string;
  private readonly localRoot: string;
  private readonly s3: S3Sender | null;

  constructor(private readonly config: ObjectStorageConfig, client?: S3Sender) {
    this.backend = config.backend;
    this.localRoot = path.resolve(config.localRoot);
    this.bucket = config.bucket?.trim() || null;
    this.keyPrefix = normalizePrefix(config.keyPrefix);

    if (this.backend === "s3") {
      if (!this.bucket) throw new Error("S3_BUCKET is required when STORAGE_BACKEND=s3.");
      if (!config.region?.trim()) throw new Error("S3_REGION is required when STORAGE_BACKEND=s3.");
      const clientConfig: S3ClientConfig = {
        region: config.region,
        endpoint: config.endpoint?.trim() || undefined,
        forcePathStyle: config.forcePathStyle ?? false,
        maxAttempts: config.maxAttempts ?? 3,
      };
      if (config.accessKeyId && config.secretAccessKey) {
        clientConfig.credentials = { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey };
      }
      this.s3 = client ?? new S3Client(clientConfig);
    } else {
      this.s3 = null;
    }
  }

  async persistFile(input: { sourcePath: string; objectKey: string; contentType: string; removeSource?: boolean }) {
    const stats = await fs.promises.stat(input.sourcePath);
    const checksumSha256 = await sha256File(input.sourcePath);

    if (this.backend === "local") {
      const resolved = path.resolve(input.sourcePath);
      if (resolved !== this.localRoot && !resolved.startsWith(`${this.localRoot}${path.sep}`)) {
        throw new Error("Local storage target must remain inside STORAGE_DIR.");
      }
      return {
        ref: { backend: "local", storagePath: resolved, storageKey: null } satisfies StoredObjectRef,
        sizeBytes: stats.size,
        checksumSha256,
      };
    }

    const key = input.objectKey.replace(/^\/+|\/+$/gu, "");
    if (!key) throw new Error("Object storage key cannot be empty.");
    const checksumBase64 = Buffer.from(checksumSha256, "hex").toString("base64");
    await this.s3!.send(new PutObjectCommand({
      Bucket: this.bucket!,
      Key: key,
      Body: fs.createReadStream(input.sourcePath),
      ContentLength: stats.size,
      ContentType: input.contentType,
      ChecksumSHA256: checksumBase64,
      Metadata: { "sha256-hex": checksumSha256 },
      ServerSideEncryption: this.config.serverSideEncryption,
      SSEKMSKeyId: this.config.serverSideEncryption === "aws:kms" ? this.config.kmsKeyId : undefined,
    }));
    if (input.removeSource !== false) await fs.promises.rm(input.sourcePath, { force: true });
    return {
      ref: { backend: "s3", storagePath: `s3://${this.bucket}/${key}`, storageKey: key } satisfies StoredObjectRef,
      sizeBytes: stats.size,
      checksumSha256,
    };
  }

  async beginResumableUpload(input: { objectKey: string; contentType: string }): Promise<ResumableUploadSession> {
    const objectKey = input.objectKey.replace(/^\/+|\/+$/gu, "");
    if (!objectKey) throw new Error("Object storage key cannot be empty.");
    const createdAt = new Date().toISOString();
    if (this.backend === "s3") {
      const response = await this.s3!.send(new CreateMultipartUploadCommand({
        Bucket: this.bucket!,
        Key: objectKey,
        ContentType: input.contentType,
        ServerSideEncryption: this.config.serverSideEncryption,
        SSEKMSKeyId: this.config.serverSideEncryption === "aws:kms" ? this.config.kmsKeyId : undefined,
      }));
      if (!response.UploadId) throw new Error("S3 did not return a multipart upload id.");
      return { backend: "s3", uploadId: response.UploadId, objectKey, contentType: input.contentType, createdAt };
    }

    const uploadId = randomUUID();
    const directory = this.localMultipartDirectory(uploadId);
    await fs.promises.mkdir(directory, { recursive: true });
    await fs.promises.writeFile(path.join(directory, "session.json"), JSON.stringify({ objectKey, contentType: input.contentType, createdAt }), { flag: "wx" });
    return { backend: "local", uploadId, objectKey, contentType: input.contentType, createdAt };
  }

  async uploadResumablePart(input: { session: ResumableUploadSession; partNumber: number; body: Buffer }): Promise<ResumableUploadPart> {
    assertPartNumber(input.partNumber);
    if (input.body.length === 0) throw new Error("Multipart upload parts cannot be empty.");
    const checksumSha256 = createHash("sha256").update(input.body).digest("hex");
    if (this.backend === "s3") {
      if (input.session.backend !== "s3") throw new Error("Multipart upload backend does not match object storage.");
      const response = await this.s3!.send(new UploadPartCommand({
        Bucket: this.bucket!,
        Key: input.session.objectKey,
        UploadId: input.session.uploadId,
        PartNumber: input.partNumber,
        Body: input.body,
        ContentLength: input.body.length,
        ChecksumSHA256: Buffer.from(checksumSha256, "hex").toString("base64"),
      }));
      if (!response.ETag) throw new Error("S3 did not return an ETag for the uploaded part.");
      return { partNumber: input.partNumber, etag: response.ETag, sizeBytes: input.body.length, checksumSha256 };
    }

    if (input.session.backend !== "local") throw new Error("Multipart upload backend does not match object storage.");
    await this.assertLocalMultipartSession(input.session);
    const partPath = path.join(this.localMultipartDirectory(input.session.uploadId), `${String(input.partNumber).padStart(5, "0")}.part`);
    await fs.promises.writeFile(partPath, input.body);
    return { partNumber: input.partNumber, etag: checksumSha256, sizeBytes: input.body.length, checksumSha256 };
  }

  async completeResumableUpload(input: { session: ResumableUploadSession; parts: ResumableUploadPart[] }) {
    const parts = [...input.parts].sort((left, right) => left.partNumber - right.partNumber);
    if (parts.length === 0) throw new Error("At least one multipart upload part is required.");
    parts.forEach((part, index) => {
      assertPartNumber(part.partNumber);
      if (index > 0 && parts[index - 1].partNumber === part.partNumber) throw new Error("Multipart upload part numbers must be unique.");
    });
    if (this.backend === "s3") {
      if (input.session.backend !== "s3") throw new Error("Multipart upload backend does not match object storage.");
      await this.s3!.send(new CompleteMultipartUploadCommand({
        Bucket: this.bucket!,
        Key: input.session.objectKey,
        UploadId: input.session.uploadId,
        MultipartUpload: { Parts: parts.map((part) => ({ PartNumber: part.partNumber, ETag: part.etag, ChecksumSHA256: Buffer.from(part.checksumSha256, "hex").toString("base64") })) },
      }));
      return { ref: { backend: "s3", storagePath: `s3://${this.bucket}/${input.session.objectKey}`, storageKey: input.session.objectKey } satisfies StoredObjectRef };
    }

    if (input.session.backend !== "local") throw new Error("Multipart upload backend does not match object storage.");
    await this.assertLocalMultipartSession(input.session);
    const targetPath = this.localObjectPath(input.session.objectKey);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    try {
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        const partPath = path.join(this.localMultipartDirectory(input.session.uploadId), `${String(part.partNumber).padStart(5, "0")}.part`);
        const bytes = await fs.promises.readFile(partPath);
        const checksum = createHash("sha256").update(bytes).digest("hex");
        if (checksum !== part.checksumSha256 || bytes.length !== part.sizeBytes) throw new Error(`Multipart part ${part.partNumber} failed checksum verification.`);
        await pipeline(Readable.from(bytes), fs.createWriteStream(targetPath, { flags: index === 0 ? "wx" : "a" }));
      }
      const stats = await fs.promises.stat(targetPath);
      const checksumSha256 = await sha256File(targetPath);
      await fs.promises.rm(this.localMultipartDirectory(input.session.uploadId), { recursive: true, force: true });
      return { ref: { backend: "local", storagePath: targetPath, storageKey: null } satisfies StoredObjectRef, sizeBytes: stats.size, checksumSha256 };
    } catch (error) {
      await fs.promises.rm(targetPath, { force: true });
      throw error;
    }
  }

  async abortResumableUpload(session: ResumableUploadSession) {
    if (this.backend === "s3") {
      if (session.backend !== "s3") throw new Error("Multipart upload backend does not match object storage.");
      await this.s3!.send(new AbortMultipartUploadCommand({ Bucket: this.bucket!, Key: session.objectKey, UploadId: session.uploadId }));
      return;
    }
    if (session.backend !== "local") throw new Error("Multipart upload backend does not match object storage.");
    await fs.promises.rm(this.localMultipartDirectory(session.uploadId), { recursive: true, force: true });
  }

  private localMultipartDirectory(uploadId: string) {
    if (!/^[a-zA-Z0-9._-]{1,200}$/u.test(uploadId)) throw new Error("Multipart upload id is invalid.");
    return path.join(this.localRoot, ".multipart", uploadId);
  }

  private localObjectPath(objectKey: string) {
    const target = path.resolve(this.localRoot, ...objectKey.split("/").map(safeSegment));
    if (target === this.localRoot || !target.startsWith(`${this.localRoot}${path.sep}`)) throw new Error("Local object key escaped STORAGE_DIR.");
    return target;
  }

  private async assertLocalMultipartSession(session: ResumableUploadSession) {
    const metadata = JSON.parse(await fs.promises.readFile(path.join(this.localMultipartDirectory(session.uploadId), "session.json"), "utf8")) as { objectKey?: string; contentType?: string };
    if (metadata.objectKey !== session.objectKey || metadata.contentType !== session.contentType) throw new Error("Multipart upload session metadata does not match.");
  }

  async openReadStream(ref: StoredObjectRef) {
    if (ref.backend === "local") {
      await fs.promises.access(ref.storagePath, fs.constants.R_OK);
      return fs.createReadStream(ref.storagePath);
    }
    if (!ref.storageKey) throw new Error("Stored S3 object is missing its key.");
    const response = await this.s3!.send(new GetObjectCommand({ Bucket: this.bucket!, Key: ref.storageKey }));
    if (!response.Body) throw new Error("Stored S3 object returned an empty response body.");
    if (response.Body instanceof Readable) return response.Body;
    return Readable.fromWeb(response.Body.transformToWebStream() as never);
  }

  async exists(ref: StoredObjectRef) {
    if (ref.backend === "local") {
      return fs.promises.access(ref.storagePath, fs.constants.R_OK).then(() => true, () => false);
    }
    if (!ref.storageKey) return false;
    try {
      await this.s3!.send(new HeadObjectCommand({ Bucket: this.bucket!, Key: ref.storageKey }));
      return true;
    } catch (error) {
      if (isMissingObject(error)) return false;
      throw error;
    }
  }

  async checkHealth() {
    if (this.backend === "local") {
      await fs.promises.mkdir(this.localRoot, { recursive: true });
      await fs.promises.access(this.localRoot, fs.constants.R_OK | fs.constants.W_OK);
      return { backend: this.backend, target: this.localRoot } as const;
    }
    await this.s3!.send(new HeadBucketCommand({ Bucket: this.bucket! }));
    return { backend: this.backend, target: this.bucket! } as const;
  }

  async materialize(ref: StoredObjectRef, targetPath: string, expectedChecksumSha256?: string | null) {
    if (ref.backend === "local") {
      if (expectedChecksumSha256 && await sha256File(ref.storagePath) !== expectedChecksumSha256) {
        throw new Error("Stored local file checksum verification failed.");
      }
      return ref.storagePath;
    }
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    const stream = await this.openReadStream(ref);
    try {
      await pipeline(stream, fs.createWriteStream(targetPath, { flags: "wx" }));
      if (expectedChecksumSha256 && await sha256File(targetPath) !== expectedChecksumSha256) {
        throw new Error("Downloaded object checksum verification failed.");
      }
    } catch (error) {
      await fs.promises.rm(targetPath, { force: true });
      throw error;
    }
    return targetPath;
  }

  async delete(ref: StoredObjectRef) {
    if (ref.backend === "local") {
      const resolved = path.resolve(ref.storagePath);
      if (resolved !== this.localRoot && !resolved.startsWith(`${this.localRoot}${path.sep}`)) return false;
      await fs.promises.rm(resolved, { force: true });
      return true;
    }
    if (!ref.storageKey) return false;
    await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket!, Key: ref.storageKey }));
    return true;
  }
}
