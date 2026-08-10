import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  requestId: string;
  traceId: string;
  traceparent: string;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T) {
  return requestContext.run(context, callback);
}

export function currentRequestContext() {
  return requestContext.getStore() ?? null;
}
