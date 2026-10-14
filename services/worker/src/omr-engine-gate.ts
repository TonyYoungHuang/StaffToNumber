/** Local development also needs protection when using bare engine binaries.
 * Production wrappers enforce this pool across API and worker containers. */
let activeSlots = 0;
const pending: Array<() => boolean> = [];

function positiveSetting(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function omrEngineCapacity() {
  return positiveSetting(process.env.MUSIC_ENGINE_MAX_CONCURRENCY, 3);
}

export function homrEngineSlotWeight() {
  return Math.min(omrEngineCapacity(), positiveSetting(process.env.MUSIC_ENGINE_HOMR_SLOT_WEIGHT, omrEngineCapacity()));
}

function drain() {
  while (pending.length && pending[0]()) pending.shift();
}

export async function withOmrEngineSlot<T>(input: {
  timeoutMs: number; isCancelled?: () => boolean; cancelledError: () => Error; timeoutError: () => Error;
  slots?: number; onQueueWait?: (elapsedMs: number) => void;
}, operation: (executionTimeoutMs: number) => Promise<T>): Promise<T> {
  if (input.isCancelled?.()) throw input.cancelledError();
  if (input.timeoutMs <= 0) throw input.timeoutError();
  const capacity = omrEngineCapacity();
  const slots = Math.max(1, Math.min(capacity, input.slots ?? 1));
  const queuedAt = Date.now();
  await new Promise<void>((resolve, reject) => {
    let poll: NodeJS.Timeout | undefined;
    const start = () => {
      if (activeSlots + slots > capacity) return false;
      if (poll) clearInterval(poll);
      activeSlots += slots;
      resolve();
      return true;
    };
    pending.push(start);
    drain();
    if (!pending.includes(start)) return;
    poll = setInterval(() => {
      if (!input.isCancelled?.()) return;
      clearInterval(poll);
      const index = pending.indexOf(start);
      if (index < 0) return;
      pending.splice(index, 1);
      reject(input.cancelledError());
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
    drain();
  }
}
