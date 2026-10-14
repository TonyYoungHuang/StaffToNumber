import fs from "node:fs";
import os from "node:os";

const MIB = 1024 * 1024;
export type EngineMemorySnapshot = { availableBytes: number; currentBytes: number; limitBytes?: number };

function setting(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

/** The audited worker memory.peak was 947.3 MiB. This is a conservative
 * reservation floor; large HOMR/audio inputs still need separate qualification. */
export function engineMemoryReservationMb(heavy = false) {
  return setting(heavy ? "MUSIC_ENGINE_HEAVY_MEMORY_MB" : "MUSIC_ENGINE_MEMORY_MB", heavy ? 2048 : 1024);
}

export function readEngineMemory(): EngineMemorySnapshot {
  if (process.platform !== "linux") return { availableBytes: os.freemem(), currentBytes: 0 };
  const available = fs.readFileSync("/proc/meminfo", "utf8").match(/^MemAvailable:\s+(\d+)\s+kB$/mu);
  if (!available) throw new Error("MemAvailable is unavailable.");
  for (const [root, currentName, limitName] of [
    ["/sys/fs/cgroup", "memory.current", "memory.max"],
    ["/sys/fs/cgroup/memory", "memory.usage_in_bytes", "memory.limit_in_bytes"],
  ]) {
    if (!fs.existsSync(`${root}/${currentName}`)) continue;
    const currentBytes = Number(fs.readFileSync(`${root}/${currentName}`, "utf8").trim());
    const limitValue = fs.readFileSync(`${root}/${limitName}`, "utf8").trim();
    // cgroup v1 represents an unlimited root with a very large numeric sentinel.
    const limitBytes = limitValue === "max" || Number(limitValue) >= 2 ** 60 ? undefined : Number(limitValue);
    if (!Number.isFinite(currentBytes) || (limitBytes !== undefined && !Number.isFinite(limitBytes))) throw new Error("The memory limit is unreadable.");
    return { availableBytes: Number(available[1]) * 1024, currentBytes, limitBytes };
  }
  return { availableBytes: Number(available[1]) * 1024, currentBytes: 0 };
}

export function canReserveEngineMemory(input: {
  snapshot: EngineMemorySnapshot; baseline: EngineMemorySnapshot; reservedBytes: number; requestedBytes: number; marginBytes?: number;
}) {
  const { snapshot, baseline, reservedBytes, requestedBytes } = input;
  const margin = input.marginBytes ?? setting("MUSIC_ENGINE_MEMORY_MARGIN_MB", 256) * MIB;
  const groupGrowth = snapshot.limitBytes === undefined ? 0 : Math.max(0, snapshot.currentBytes - baseline.currentBytes);
  // Never credit another site's host pressure as consumed engine memory.
  // Bare hosts without a cgroup sensor keep the full reservation conservatively.
  const hostGrowth = Math.min(groupGrowth, Math.max(0, baseline.availableBytes - snapshot.availableBytes));
  // Existing RSS is already in the snapshot. Reserve only its remaining growth.
  return snapshot.availableBytes >= Math.max(0, reservedBytes - hostGrowth) + requestedBytes + margin
    && (snapshot.limitBytes === undefined || snapshot.limitBytes - snapshot.currentBytes >= Math.max(0, reservedBytes - groupGrowth) + requestedBytes + margin);
}
