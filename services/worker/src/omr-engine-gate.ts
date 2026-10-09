/** One heavy OMR process at a time per worker process, including broker jobs. */
let tail: Promise<void> = Promise.resolve();

export async function withOmrEngineSlot<T>(input: { timeoutMs: number; isCancelled?: () => boolean; cancelledError: () => Error; timeoutError: () => Error }, operation: (remainingTimeoutMs: number) => Promise<T>): Promise<T> {
  const deadline = Date.now() + input.timeoutMs;
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>((resolve) => { release = resolve; });
  let poll: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      previous,
      new Promise<never>((_resolve, reject) => {
        poll = setInterval(() => {
          if (input.isCancelled?.()) reject(input.cancelledError());
          else if (Date.now() >= deadline) reject(input.timeoutError());
        }, 25);
      }),
    ]);
    if (poll) clearInterval(poll);
    if (input.isCancelled?.()) throw input.cancelledError();
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw input.timeoutError();
    return await operation(remaining);
  } finally {
    if (poll) clearInterval(poll);
    // A cancelled waiter must not release the next task before its predecessor.
    void previous.then(release);
  }
}
