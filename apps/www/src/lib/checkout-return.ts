import { normalizeCheckoutReturnState, validateCheckoutReturnPath, type CheckoutReturnState } from "@score/shared";

export type PurchaseReturnContext = {
  returnSite: "app" | "www";
  returnPath: string;
  returnState: CheckoutReturnState;
  targetDocumentId?: string;
  intendedAction?: unknown;
  passMode?: "top_up";
};

/** Carry the first page in the link itself, including when opened in a new tab. */
export function purchaseReturnContext(location: { pathname: string; search: string; hash: string }): PurchaseReturnContext {
  const params = new URLSearchParams(location.search);
  const site = params.get("returnSite") === "app" ? "app" : "www";
  const explicitPath = params.get("returnPath");
  const appPath = params.get("next");
  const safeExplicit = explicitPath ? validateCheckoutReturnPath(site, explicitPath) : null;
  const safeApp = appPath ? validateCheckoutReturnPath("app", appPath) : null;
  const returnSite = safeExplicit ? site : safeApp ? "app" : "www";
  const returnPath = safeExplicit || safeApp || validateCheckoutReturnPath("www", `${location.pathname}${location.search}${location.hash}`) || "/";
  const target = params.get("target") ?? params.get("targetDocumentId");
  const targetDocumentId = target && /^[A-Za-z0-9_-]{1,128}$/u.test(target) ? target : undefined;
  let intendedAction: unknown;
  let state: CheckoutReturnState | null = null;
  try {
    const action = params.get("action");
    if (targetDocumentId && action && action.length <= 16_384) intendedAction = JSON.parse(action);
  } catch { /* The server validates the actual action; malformed links restore only the view. */ }
  try {
    const snapshot = params.get("returnState") ?? params.get("state");
    if (snapshot && snapshot.length <= 8192) state = normalizeCheckoutReturnState(JSON.parse(snapshot));
  } catch { /* Invalid state cannot replace the safe view restoration. */ }
  return {
    returnSite, returnPath,
    returnState: { ...state, version: 1, intent: intendedAction ? "continue_action" : "restore_view" },
    ...(targetDocumentId ? { targetDocumentId } : {}),
    ...(intendedAction ? { intendedAction } : {}),
    ...((params.get("passMode") ?? params.get("checkoutPassMode")) === "top_up" ? { passMode: "top_up" as const } : {}),
  };
}

export function withPurchaseOrigin(href: string, location: { pathname: string; search: string; hash: string }) {
  const target = new URL(href, "https://public.invalid");
  if (target.origin !== "https://public.invalid") return href;
  const context = purchaseReturnContext(location);
  target.searchParams.set("returnSite", context.returnSite);
  target.searchParams.set("returnPath", context.returnPath);
  if (context.targetDocumentId) target.searchParams.set("target", context.targetDocumentId);
  if (context.intendedAction) target.searchParams.set("action", JSON.stringify(context.intendedAction));
  target.searchParams.set("returnState", JSON.stringify(context.returnState));
  if (context.passMode) target.searchParams.set("passMode", context.passMode);
  return `${target.pathname}${target.search}${target.hash}`;
}

export function isPublicPricingDestination(pathname: string, hash: string) {
  return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?pricing\/?$/iu.test(pathname)
    || (hash === "#pricing" && /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/?)?$/iu.test(pathname));
}

export function shouldReplacePurchaseIntent(status: string | undefined, purchaseStatus: string | undefined, explicitPurchase: boolean, separateNewPurchase: boolean) {
  return explicitPurchase && (purchaseStatus === "refunded" || status === "cancelled" || status === "failed")
    || separateNewPurchase && status === "paid";
}

export function purchaseIntentSignature(accountId: string, locale: string, selection: string, context: PurchaseReturnContext) {
  const source = new URL(context.returnPath, "https://return.invalid");
  for (const key of ["plan", "billing", "provider", "checkout_cancelled", "checkoutOrderId", "checkoutResult", "checkoutPlan", "checkoutBilling", "checkoutProvider", "checkoutPassMode"]) source.searchParams.delete(key);
  return JSON.stringify([accountId, locale, selection, { ...context, returnPath: `${source.pathname}${source.search}${source.hash}` }]);
}

type PersistentIntent = { version: 1; key: string; orderId?: string; completed?: boolean; returnContext?: PurchaseReturnContext };
const prefix = "scoretransposer_www_checkout_intent:";

/** Never replace a pending identity on refresh, remount, network timeout or retry. */
export function persistentPurchaseIntent(signature: string, storage: Pick<Storage, "getItem" | "setItem">, createKey = () => crypto.randomUUID(), returnContext?: PurchaseReturnContext): PersistentIntent {
  const key = `${prefix}${encodeURIComponent(signature)}`;
  let previous: PersistentIntent | null = null;
  try { previous = JSON.parse(storage.getItem(key) ?? "null") as PersistentIntent | null; } catch { /* Replace malformed local data only. */ }
  if (previous?.version === 1 && typeof previous.key === "string" && previous.key && !previous.completed) return previous;
  const intent: PersistentIntent = { version: 1, key: createKey(), ...(returnContext ? { returnContext } : {}) };
  storage.setItem(key, JSON.stringify(intent));
  return intent;
}

export function rememberPurchaseOrder(signature: string, intent: PersistentIntent, orderId: string, storage: Pick<Storage, "setItem">) {
  storage.setItem(`${prefix}${encodeURIComponent(signature)}`, JSON.stringify({ ...intent, orderId }));
}

export function completePurchaseIntent(orderId: string, storage: Pick<Storage, "length" | "key" | "getItem" | "setItem">) {
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    try {
      const item = JSON.parse(storage.getItem(key) ?? "null") as PersistentIntent | null;
      if (item?.orderId === orderId) storage.setItem(key, JSON.stringify({ ...item, completed: true }));
    } catch { /* Invalid unrelated records cannot authorize a payment. */ }
  }
}
