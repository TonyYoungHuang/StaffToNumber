export class ApiTransportError extends Error {
  constructor(readonly code: "API_REQUEST_TIMEOUT" | "API_REQUEST_CANCELLED" | "API_INVALID_RESPONSE", message: string) { super(message); }
}

/** The deadline includes consuming the body, not only receiving HTTP headers. */
export async function withApiDeadline<T>(operation: (signal: AbortSignal) => Promise<T>,
  options: { signal?: AbortSignal | null; timeoutMs: number }): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: () => void = () => undefined;
  const stopped = new Promise<never>((_resolve, reject) => {
    cancel = () => { controller.abort(); reject(new ApiTransportError("API_REQUEST_CANCELLED", "Request cancelled. You can try again.")); };
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) { cancel(); return; }
    timer = setTimeout(() => {
      reject(new ApiTransportError("API_REQUEST_TIMEOUT", "The request timed out. Check the result before retrying."));
      controller.abort();
    }, options.timeoutMs);
  });
  try { return await Promise.race([stopped, Promise.resolve().then(() => operation(controller.signal))]); }
  finally { clearTimeout(timer); options.signal?.removeEventListener("abort", cancel); }
}
