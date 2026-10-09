import fs from "node:fs";

export class StorageCapacityError extends Error {
  readonly statusCode = 503;
  readonly code = "STORAGE_CAPACITY_REACHED";
  constructor() {
    super("Storage capacity is temporarily unavailable. Please try again later.");
    this.name = "StorageCapacityError";
  }
}

export function assertMinimumFreeSpace(directory: string, minimumFreeBytes = 0, incomingBytes = 0) {
  if (!Number.isFinite(minimumFreeBytes) || minimumFreeBytes <= 0) return;
  const stat = fs.statfsSync(directory);
  if (stat.bavail * stat.bsize - Math.max(0, incomingBytes) < minimumFreeBytes) throw new StorageCapacityError();
}
