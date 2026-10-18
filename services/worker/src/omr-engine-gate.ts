import { EngineResourceError } from "./engine-resource-error.js";
import { hasJobMemoryLease } from "./job-memory-lease.js";
import { canReserveEngineMemory, engineMemoryReservationMb, readEngineMemory, type EngineMemorySnapshot } from "./engine-memory.js";

/** Local development also needs protection when using bare engine binaries.
 * Production wrappers enforce this pool across API and worker containers. */
let activeSlots = 0;
let reservedBytes = 0;
let memoryBaseline: EngineMemorySnapshot | undefined;
const pending: Array<() => boolean> = [];

function positiveSetting(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function omrEngineCapacity() {
  return positiveSetting(process.env.MUSIC_ENGINE_MAX_CONCURRENCY, 1);
}

export function homrEngineSlotWeight() {
  return Math.min(omrEngineCapacity(), positiveSetting(process.env.MUSIC_ENGINE_HOMR_SLOT_WEIGHT, omrEngineCapacity()));
}

function drain() {
  while (pending.length && pending[0]()) pending.shift();
}

export async function withOmrEngineSlot<T>(input: {
  timeoutMs: number; isCancelled?: () => boolean; cancelledError: () => Error; timeoutError: () => Error;
  slots?: number; onQueueWait?: (elapsedMs: number) => void; queueWaitMs?: number; memoryMb?: number;
  memorySnapshot?: () => EngineMemorySnapshot;
}, operation: (executionTimeoutMs: number) => Promise<T>): Promise<T> {
  if (input.isCancelled?.()) throw input.cancelledError();
  if (input.timeoutMs <= 0) throw input.timeoutError();
  if (hasJobMemoryLease()) return operation(input.timeoutMs);
  const capacity = omrEngineCapacity();
  const slots = Math.max(1, Math.min(capacity, input.slots ?? 1));
  const requestedBytes = (input.memoryMb ?? engineMemoryReservationMb()) * 1024 * 1024;
  const queuedAt = Date.now();
  const queueWaitMs = input.queueWaitMs ?? positiveSetting(process.env.MUSIC_ENGINE_QUEUE_WAIT_MS, 120_000);
  await new Promise<void>((resolve, reject) => {
    let poll: NodeJS.Timeout | undefined;
    let memoryBlocked = false;
    const start = () => {
      if (activeSlots + slots > capacity) return false;
      try {
        const snapshot = (input.memorySnapshot ?? readEngineMemory)();
        if (!canReserveEngineMemory({ snapshot, baseline: memoryBaseline ?? snapshot, reservedBytes, requestedBytes })) {
          memoryBlocked = true;
          return false;
        }
        memoryBlocked = false;
        memoryBaseline ??= snapshot;
      } catch {
        if (poll) clearInterval(poll);
        reject(new EngineResourceError("ENGINE_RESOURCE_UNAVAILABLE"));
        return true;
      }
      if (poll) clearInterval(poll);
      activeSlots += slots;
      reservedBytes += requestedBytes;
      resolve();
      return true;
    };
    pending.push(start);
    drain();
    if (!pending.includes(start)) return;
    poll = setInterval(() => {
      const cancelled = input.isCancelled?.();
      if (!cancelled && Date.now() - queuedAt < queueWaitMs) { drain(); return; }
      clearInterval(poll);
      const index = pending.indexOf(start);
      if (index < 0) return;
      pending.splice(index, 1);
      reject(cancelled ? input.cancelledError() : new EngineResourceError(memoryBlocked ? "ENGINE_MEMORY_PRESSURE" : "ENGINE_RESOURCE_BUSY"));
      drain();
    }, 25);
  });
  try {
    input.onQueueWait?.(Date.now() - queuedAt);
    if (input.isCancelled?.()) throw input.cancelledError();
    // Predecessors must not consume a new job's engine execution budget.
    return await operation(input.timeoutMs);
  } finally {
    activeSlots -= slots;
    reservedBytes -= requestedBytes;
    if (activeSlots === 0) memoryBaseline = undefined;
    drain();
  }
}
