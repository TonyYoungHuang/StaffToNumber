export type OfflineScoreCollaborationCommand = {
  version: 1;
  operationId: string;
  scope: string;
  scoreId: string;
  baseRevisionId: string;
  command: {
    type: "note.patch" | "note.insert" | "event.delete" | "events.batch" | "event.reorder";
    patch: Record<string, unknown>;
  };
  targetEventIds: string[];
  createdAt: string;
};

const DATABASE_NAME = "score-notation-collaboration";
const DATABASE_VERSION = 1;
const COMMAND_STORE = "commands";
const MAX_COMMANDS_PER_SCOPE = 256;

export async function scoreCollaborationQueueScope(input: { scoreId: string; shareToken?: string | null }) {
  const material = input.shareToken ? `share:${input.scoreId}:${input.shareToken}` : `owner:${input.scoreId}`;
  const bytes = new TextEncoder().encode(material);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function orderOfflineScoreCollaborationCommands(commands: OfflineScoreCollaborationCommand[]) {
  return commands
    .filter((command, index, items) => items.findIndex((candidate) => candidate.operationId === command.operationId) === index)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.operationId.localeCompare(right.operationId));
}

export function queuedScoreCollaborationRequest(command: OfflineScoreCollaborationCommand, baseRevisionId: string) {
  return {
    operationId: command.operationId,
    baseRevisionId,
    command: command.command,
  };
}

export async function enqueueOfflineScoreCollaborationCommand(command: OfflineScoreCollaborationCommand) {
  const existing = await listOfflineScoreCollaborationCommands(command.scope);
  if (existing.some((item) => item.operationId === command.operationId)) return;
  if (existing.length >= MAX_COMMANDS_PER_SCOPE) throw new Error("Offline collaboration queue limit reached.");
  const database = await openDatabase();
  await transactionComplete(database, "readwrite", (store) => store.put(command));
  database.close();
}

export async function listOfflineScoreCollaborationCommands(scope: string) {
  const database = await openDatabase();
  const transaction = database.transaction(COMMAND_STORE, "readonly");
  const index = transaction.objectStore(COMMAND_STORE).index("scope");
  const commands = await requestResult(index.getAll(IDBKeyRange.only(scope))) as OfflineScoreCollaborationCommand[];
  await transactionDone(transaction);
  database.close();
  return orderOfflineScoreCollaborationCommands(commands);
}

export async function removeOfflineScoreCollaborationCommand(operationId: string) {
  const database = await openDatabase();
  await transactionComplete(database, "readwrite", (store) => store.delete(operationId));
  database.close();
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(COMMAND_STORE)
        ? request.transaction!.objectStore(COMMAND_STORE)
        : database.createObjectStore(COMMAND_STORE, { keyPath: "operationId" });
      if (!store.indexNames.contains("scope")) store.createIndex("scope", "scope", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the offline collaboration queue."));
    request.onblocked = () => reject(new Error("Offline collaboration queue upgrade is blocked."));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
  });
}

async function transactionComplete(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
) {
  const transaction = database.transaction(COMMAND_STORE, mode);
  action(transaction.objectStore(COMMAND_STORE));
  await transactionDone(transaction);
}
