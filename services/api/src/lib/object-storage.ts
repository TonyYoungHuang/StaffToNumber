import { ObjectStorage, type StoredObjectRef } from "@score/storage";
import { config } from "../config.js";

export const objectStorage = new ObjectStorage({
  backend: config.storageBackend,
  localRoot: config.storageDir,
  bucket: config.s3Bucket,
  region: config.s3Region,
  endpoint: config.s3Endpoint,
  forcePathStyle: config.s3ForcePathStyle,
  accessKeyId: config.s3AccessKeyId,
  secretAccessKey: config.s3SecretAccessKey,
  keyPrefix: config.s3KeyPrefix,
  maxAttempts: config.s3MaxAttempts,
  serverSideEncryption: config.s3ServerSideEncryption,
  kmsKeyId: config.s3KmsKeyId,
});

export class ObjectStorageUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = "OBJECT_STORAGE_UNAVAILABLE";

  constructor(cause?: unknown) {
    super("Object storage is temporarily unavailable. Please try again later.", { cause });
    this.name = "ObjectStorageUnavailableError";
  }
}

export type StoredFileLocation = {
  storage_path: string;
  storage_backend?: string | null;
  storage_key?: string | null;
};

export function storedObjectRef(file: StoredFileLocation): StoredObjectRef {
  return {
    backend: file.storage_backend === "s3" ? "s3" : "local",
    storagePath: file.storage_path,
    storageKey: file.storage_key ?? null,
  };
}

export async function storedFileExists(file: StoredFileLocation) {
  try {
    return await objectStorage.exists(storedObjectRef(file));
  } catch (error) {
    throw new ObjectStorageUnavailableError(error);
  }
}

export async function openStoredFile(file: StoredFileLocation) {
  try {
    return await objectStorage.openReadStream(storedObjectRef(file));
  } catch (error) {
    throw new ObjectStorageUnavailableError(error);
  }
}

export function deleteStoredFileObject(file: StoredFileLocation) {
  return objectStorage.delete(storedObjectRef(file));
}
