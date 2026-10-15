/** Select from the active locale passed by the server; no catalogs in the client. */
export function selectImportRecovery(copy: readonly string[], error: string | null | undefined) {
  const detail = error ?? "";
  const index = /storage capacity.*unavailable|STORAGE_CAPACITY_REACHED/iu.test(detail) ? 5 :
    /too low interline|low.resolution/iu.test(detail) ? 0 :
    /time.?out|timed out|budget.*exhaust|execution budget/iu.test(detail) ? 1 :
    /not configured|could not start|missing from storage|adapter.*missing/iu.test(detail) ? 3 : 2;
  return { reason: copy[index], recovery: copy[4] };
}
