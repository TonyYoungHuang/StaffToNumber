import type { HomeRuntimeCopy } from "./home-runtime-copy";

/** Error classification is independent of the server-selected language. */
export function homeProcessingFailure(error: string | null | undefined, copy: HomeRuntimeCopy["failure"]) {
  const detail = error ?? "";
  const reason = /storage capacity.*unavailable|STORAGE_CAPACITY_REACHED/iu.test(detail) ? copy.storage
    : /too low interline|low.resolution/iu.test(detail) ? copy.lowResolution
      : /time.?out|timed out|budget.*exhaust|execution budget/iu.test(detail) ? copy.timeout
        : /not configured|could not start|missing from storage|adapter.*missing/iu.test(detail) ? copy.unavailable : copy.generic;
  return { reason, recovery: copy.recovery };
}
