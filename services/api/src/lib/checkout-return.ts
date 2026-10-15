import { createHash, randomBytes } from "node:crypto";
import { normalizeCheckoutReturnState, validateCheckoutReturnPath, type CheckoutReturnContext, type CheckoutReturnSite } from "@score/shared";
import type { RuntimeDatabaseLike } from "@score/runtime-database";

export const CHECKOUT_RETURN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export function checkoutReturnTokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function issueCheckoutReturnToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: checkoutReturnTokenHash(token), expiresAt: new Date(Date.now() + CHECKOUT_RETURN_TOKEN_TTL_MS).toISOString() };
}

/** Paddle embeds its return URL in checkout_url. Keep the ephemeral credential
 * in the first browser response only; retries recover through owner login. */
export function checkoutUrlWithoutReturnCredential(value: string | null) {
  if (!value) return value;
  try {
    const url = new URL(value);
    for (const key of ["return_token", "returnToken"]) url.searchParams.delete(key);
    for (const key of ["success_url", "cancel_url", "successUrl", "cancelUrl"]) {
      const nested = url.searchParams.get(key);
      if (!nested) continue;
      const callback = new URL(nested);
      callback.searchParams.delete("return_token"); callback.searchParams.delete("returnToken");
      url.searchParams.set(key, callback.toString());
    }
    return url.toString();
  } catch { throw new Error("Invalid provider checkout URL."); }
}

export function validateCheckoutReturn(input: { returnSite?: unknown; returnPath?: unknown; returnState?: unknown; returnTo?: unknown }, targetDocumentId: string | null, hasAction: boolean): CheckoutReturnContext {
  if (input.returnSite !== undefined && input.returnSite !== "app" && input.returnSite !== "www") throw new Error("Invalid checkout return site.");
  const site: CheckoutReturnSite = input.returnSite === "www" ? "www" : "app";
  const pathInput = input.returnPath ?? input.returnTo ?? (targetDocumentId ? `/scores/${encodeURIComponent(targetDocumentId)}` : site === "www" ? "/pricing" : "/scores");
  const path = validateCheckoutReturnPath(site, pathInput);
  const state = normalizeCheckoutReturnState(input.returnState);
  if (!path || !state) throw new Error("Invalid checkout return path or state.");
  state.intent = hasAction ? "continue_action" : "restore_view";
  // A concrete score must remain the target; an unrelated client path cannot
  // redirect a paid action to another score or another account's work area.
  let successPath = site === "www" ? "/scores" : path;
  if (targetDocumentId) {
    const targetPath = `/scores/${encodeURIComponent(targetDocumentId)}`;
    const origin = new URL(path, "https://return.invalid");
    successPath = site === "app" && (origin.pathname === targetPath || origin.pathname.startsWith(`${targetPath}/`)) ? path : targetPath;
    if (state.uploadDraftId && site === "app") {
      const uploadPath = /^\/scores(?:\/new(?:\/[a-z0-9_-]+)?|\/simple|\/complex)?\/?$/u.test(origin.pathname);
      if (uploadPath) {
        origin.searchParams.set("uploadDraft", state.uploadDraftId);
        successPath = `${origin.pathname}${origin.search}${origin.hash}`;
      } else successPath = `/scores?uploadDraft=${encodeURIComponent(state.uploadDraftId)}`;
    }
  }
  return { site, path, state, successSite: "app", successPath };
}

export function orderCheckoutReturnContext(order: { return_site: string | null; return_path: string | null; return_state_json: string | null; target_document_id: string | null; intended_action_json: string | null }): CheckoutReturnContext | null {
  if (!order.return_site || !order.return_path) return null;
  try {
    return validateCheckoutReturn({ returnSite: order.return_site, returnPath: order.return_path, returnState: order.return_state_json ? JSON.parse(order.return_state_json) : undefined }, order.target_document_id, Boolean(order.intended_action_json));
  } catch { return null; }
}

/** GET/HEAD never call this. Compare-and-set makes concurrent handoffs single use. */
export function consumeCheckoutReturnToken(db: RuntimeDatabaseLike, orderId: string, userId: string, token: string, now = new Date().toISOString()) {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) return false;
  const result = db.prepare(`UPDATE payment_orders SET return_token_consumed_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND return_token_hash = ?
      AND return_token_consumed_at IS NULL AND return_token_expires_at > ?`)
    .run(now, now, orderId, userId, checkoutReturnTokenHash(token), now);
  return result.changes === 1;
}
