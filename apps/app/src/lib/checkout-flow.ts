import { type CheckoutIntendedAction, type CheckoutReturnState, validateCheckoutReturnPath, normalizeCheckoutReturnState } from "@score/shared";
import { apiRequest } from "./api";
import { currentWorkPath } from "./flow-return";

type SaveHandler = () => Promise<boolean>;
export type CheckoutSaveState = { busy: boolean; dirty: boolean; blocked: boolean; save: () => Promise<boolean> };
export async function waitForCheckoutSave(read: () => CheckoutSaveState, pause: (milliseconds: number) => Promise<unknown> = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds))) {
  const deadline = Date.now() + 30_000;
  while (read().busy && Date.now() < deadline) await pause(50);
  const current = read();
  if (current.busy || current.blocked || (current.dirty && !(await current.save()))) return false;
  await pause(0);
  const latest = read();
  return !latest.busy && !latest.blocked && !latest.dirty;
}
const saves = new Set<SaveHandler>();
const snapshots = new Set<() => Partial<CheckoutReturnState>>();
export function registerCheckoutSave(handler: SaveHandler) { saves.add(handler); return () => { saves.delete(handler); }; }
export function registerCheckoutState(handler: () => Partial<CheckoutReturnState>) { snapshots.add(handler); return () => { snapshots.delete(handler); }; }
export async function prepareCheckout() {
  // Save handlers must wait for the server, including an already running save.
  for (const save of saves) if (!(await save())) return false;
  if (typeof window !== "undefined" && saves.size) await new Promise(resolve => window.setTimeout(resolve, 0));
  return true;
}
export function checkoutReturnContext(path?: string, action?: CheckoutIntendedAction, state?: Partial<CheckoutReturnState>) {
  const cleaned = new URL(validateCheckoutReturnPath("app", path ?? currentWorkPath()) ?? "/scores", "https://app.scoretransposer.com");
  for (const key of ["checkoutOrderId", "checkoutResult", "checkoutPlan", "checkoutBilling", "checkoutProvider", "checkoutPassMode"]) cleaned.searchParams.delete(key);
  const returnPath = `${cleaned.pathname}${cleaned.search}${cleaned.hash}`;
  const collected = Object.assign({}, ...Array.from(snapshots, read => read()));
  const anchor = returnPath.split("#")[1];
  const panel = anchor && normalizeCheckoutReturnState({ version: 1, intent: "restore_view", panel: anchor }) ? anchor : undefined;
  const returnState = normalizeCheckoutReturnState({ version: 1, intent: action ? "continue_action" : "restore_view", ...collected, ...(panel ? { panel } : {}), ...state }) ?? { version: 1 as const, intent: action ? "continue_action" as const : "restore_view" as const };
  return { returnSite: "app" as const, returnPath, returnState };
}

const INTENT_PREFIX = "score_checkout_intent:";
export function persistedCheckoutIntent(signature: string, supplied?: string) {
  const key = INTENT_PREFIX + signature;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { id: string; savedAt: number } | null;
    if (!supplied && saved?.id && saved.savedAt <= Date.now()) return saved.id;
    const id = supplied ?? crypto.randomUUID();
    localStorage.setItem(key, JSON.stringify({ id, savedAt: Date.now() }));
    return id;
  } catch {
    // Creating an unrecorded purchase cannot safely survive a timeout/reload.
    throw new Error("CHECKOUT_STORAGE_UNAVAILABLE");
  }
}
export function forgetCheckoutIntent(signature: string) { try { localStorage.removeItem(INTENT_PREFIX + signature); } catch { /* no purchase is created */ } }
type CheckoutResponse = { orderId: string; token: string; url: string; status?: string; order?: { status: string; purchaseStatus?: string }; code?: string };
export function completeCheckoutIntent(orderId: string) {
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index); if (!key?.startsWith(INTENT_PREFIX)) continue;
      const entry = JSON.parse(localStorage.getItem(key) ?? "null");
      if (entry?.orderId === orderId) localStorage.setItem(key, JSON.stringify({ ...entry, completed: true }));
    }
  } catch { /* the order remains recoverable from the account */ }
}
export function checkoutIntentSignature(payload: Record<string, unknown>) {
  const ordered = (value: unknown): unknown => Array.isArray(value) ? value.map(ordered) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, ordered(item)])) : value;
  return JSON.stringify(ordered({ provider: payload.provider, billingKind: payload.billingKind, planCode: payload.planCode, passMode: payload.passMode ?? null, targetDocumentId: payload.targetDocumentId ?? null, intendedAction: payload.intendedAction ?? null, organizationId: payload.organizationId ?? null, seatQuantity: payload.seatQuantity ?? 1, returnSite: payload.returnSite, returnPath: payload.returnPath }));
}
export async function lookupAndStartCheckout(payload: Record<string, unknown>, token: string, intentId?: string, request: typeof apiRequest = apiRequest, explicitPurchase = false) {
  const signature = checkoutIntentSignature(payload);
  const key = persistedCheckoutIntent(signature, intentId);
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Idempotency-Key": key };
  const query = new URLSearchParams({ provider: String(payload.provider), intent_id: key });
  const previous = await request<CheckoutResponse>(`/api/payments/orders/by-intent?${query}`, { headers });
  if (previous.ok && previous.data?.orderId) {
    const entry = JSON.parse(localStorage.getItem(INTENT_PREFIX + signature) ?? "null");
    const previousStatus = previous.data.status ?? previous.data.order?.status;
    const terminal = previousStatus === "cancelled" || previousStatus === "failed";
    if (explicitPurchase && (terminal || previous.data.order?.purchaseStatus === "refunded" || (entry?.completed && previousStatus === "paid"))) {
      forgetCheckoutIntent(signature);
      return lookupAndStartCheckout(payload, token, undefined, request, false);
    }
    localStorage.setItem(INTENT_PREFIX + signature, JSON.stringify({ ...entry, id: key, savedAt: entry?.savedAt ?? Date.now(), orderId: previous.data.orderId }));
    if (previousStatus === "paid" || terminal) {
      const params = new URLSearchParams({ order_id: previous.data.orderId, provider: String(payload.provider) });
      if (previous.data.token) params.set("token", previous.data.token);
      return { ...previous, data: { ...previous.data, url: `/checkout/success?${params}` } };
    }
    if (previous.data.url) return previous;
  }
  if (!previous.ok && previous.status !== 404) return previous;
  if (!previous.ok && previous.status === 404) {
    const owned = await request<{ orders: Array<{ id: string; provider: string; planCode?: string; billingKind: string; targetDocumentId?: string }> }>("/api/payments/orders?pending=1", { headers });
    if (!owned.ok) return { ...owned, data: undefined };
    if (owned.data.orders.some(order => order.provider === payload.provider && order.planCode === payload.planCode && order.billingKind === payload.billingKind && (order.targetDocumentId ?? null) === (payload.targetDocumentId ?? null))) return { ok: false as const, status: 409, error: "CHECKOUT_RECOVERY_REQUIRED", data: { code: "CHECKOUT_RECOVERY_REQUIRED" } as CheckoutResponse };
  }
  const created = await request<CheckoutResponse>("/api/payments/checkout/authenticated", { method: "POST", headers, body: JSON.stringify(payload) });
  if (created.ok && created.data?.orderId) {
    const entry = JSON.parse(localStorage.getItem(INTENT_PREFIX + signature) ?? "null");
    localStorage.setItem(INTENT_PREFIX + signature, JSON.stringify({ ...entry, orderId: created.data.orderId }));
  }
  return created;
}

export function checkoutLoginPath(path: string, values: Record<string, string | undefined>) {
  const url = new URL(path, "https://app.scoretransposer.com");
  for (const [key, value] of Object.entries(values)) if (value !== undefined) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
