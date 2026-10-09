// Accept codes pasted from mobile shop chats without changing their identity.
export function normalizeActivationCode(code: string) {
  return code.normalize("NFKC").trim().toUpperCase().replace(/[\s\u200b-\u200d\ufeff]/gu, "").replace(/[‐‑‒–—−]/gu, "-");
}
