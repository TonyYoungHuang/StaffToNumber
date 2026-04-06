import crypto from "node:crypto";

const HASH_KEYLEN = 64;

export function createId() {
  return crypto.randomUUID();
}

export function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function createSalt() {
  return crypto.randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, HASH_KEYLEN).toString("hex");
}

export function verifyPassword(password: string, salt: string, passwordHash: string) {
  const candidateHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(passwordHash, "hex"));
}
