import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

export async function storeJianpuSourceText(text: string) {
  const storageRoot = path.resolve(config.storageDir);
  const importDir = path.join(storageRoot, "scores", "jianpu-imports");
  const storedName = `${randomUUID()}.jianpu.txt`;
  const storagePath = path.join(importDir, storedName);

  await fs.promises.mkdir(importDir, { recursive: true });
  await fs.promises.writeFile(storagePath, text, { encoding: "utf8", flag: "wx", mode: 0o600 });
  const stats = await fs.promises.stat(storagePath);
  return { storedName, storagePath, sizeBytes: stats.size };
}
