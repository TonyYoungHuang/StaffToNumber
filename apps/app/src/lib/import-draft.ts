export type ImportKind = "omr" | "musicxml" | "midi" | "score-json" | "audio";
export function detectScoreImport(name: string): ImportKind | null {
  const extension = name.split(".").at(-1)?.toLowerCase();
  if (["pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff"].includes(extension ?? "")) return "omr";
  if (["xml", "musicxml", "mxl"].includes(extension ?? "")) return "musicxml";
  if (["mid", "midi"].includes(extension ?? "")) return "midi";
  if (extension === "json") return "score-json";
  if (["wav", "mp3", "m4a", "aac", "flac", "ogg", "aif", "aiff"].includes(extension ?? "")) return "audio";
  return null;
}
export type ImportDraft = { ownerId: string; file: File | null; title: string; text: string; mode: "file" | "jianpu"; createdAt: number };
/** Local-only draft key used before sign-in so #free-scan can resume after auth. */
export const GUEST_IMPORT_OWNER_ID = "__guest__";
async function draftStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("score-import-draft", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("drafts");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("drafts", mode);
      const request = run(tx.objectStore("drafts"));
      tx.oncomplete = () => { resolve(request.result); db.close(); };
      tx.onabort = tx.onerror = () => { reject(tx.error); db.close(); };
    };
  });
}
export async function saveImportDraft(draft: ImportDraft) { await draftStore("readwrite", s => s.put(draft, draft.ownerId)); }
export async function loadImportDraft(ownerId: string): Promise<ImportDraft | null> {
  try {
    const draft = await draftStore<ImportDraft | undefined>("readonly", s => s.get(ownerId));
    if (!draft || draft.ownerId !== ownerId) return null;
    if (Date.now() - draft.createdAt > 86400000) { await clearImportDraft(ownerId); return null; }
    return draft;
  } catch { return null; }
}
export async function clearImportDraft(ownerId: string) { try { await draftStore("readwrite", s => s.delete(ownerId)); } catch { /* Successful uploads must still open when browser storage is unavailable. */ } }
export async function saveGuestImportDraft(draft: Omit<ImportDraft, "ownerId">) {
  await saveImportDraft({ ...draft, ownerId: GUEST_IMPORT_OWNER_ID });
}
/** Move a pre-auth draft onto the signed-in user so free-scan can continue without re-picking the file. */
export async function claimGuestImportDraft(userId: string): Promise<ImportDraft | null> {
  const guest = await loadImportDraft(GUEST_IMPORT_OWNER_ID);
  if (!guest) return null;
  const claimed: ImportDraft = { ...guest, ownerId: userId, createdAt: Date.now() };
  await saveImportDraft(claimed);
  await clearImportDraft(GUEST_IMPORT_OWNER_ID);
  return claimed;
}
