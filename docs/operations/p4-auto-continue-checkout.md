# P4 — Auto-continue checkout after auth

## Default plan (documented choice)

When `/checkout` or www pricing has **no** `?plan=` (and no pending selection):

- **Chosen default: `starter-monthly`** (Stripe subscription).
- Rationale: lowest paid commitment (monthly Starter), not the marketing-featured `starter-annual`.
- If the user clicked a plan (URL query or saved pending), that plan wins.
- Fallback chain on app checkout selector: `initialPlanCode` → `starter-monthly` → first non-`free` plan → first plan.

## Before → after

### www pricing (`PurchaseFlowProvider`)

**Before:** Pick plan while signed out → auth modal → after login/sign_up the modal closed and a toast showed; user had to click the plan CTA again to create checkout.

**After:** Pending plan (tier, interval/billingKind, provider, display fields) is saved to `sessionStorage` (`scoretransposer_pending_purchase`, 30 min TTL) when the auth modal opens. After successful email/Google auth (or One Tap while pending exists), `purchase()` runs once. `begin_checkout` still fires immediately before redirect. Pending is cleared on success, non-401 error, or auth cancel/dismiss.

### app `/checkout` (`AppCheckoutClient`)

**Before:** Signed-out user saw AuthForm; after auth the payment form appeared and required a second click on the pay button.

**After:** Pending checkout snapshot is saved while signed out. `onAuthenticated` sets a one-shot resume flag; when session becomes ready, `startCheckout()` runs once (same API + Idempotency-Key + `begin_checkout` before redirect). Pending cleared on success or terminal error; 401 returns to signed-out (pending kept for retry). Checkout lock prevents double-submit.

## Edge cases

- Double-submit / loops: `checkoutLock` / `authLock` + clear pending on success/error/cancel; resume refs are one-shot.
- Stale pending: expire after ~30 minutes; invalid JSON/shape cleared.
- Auth cancel (www modal close / backdrop / Esc): clears pending so a later One Tap does not surprise-checkout.
- Auth failure: pending kept so the user can retry without re-picking the plan.
- Already signed-in visit to `/checkout`: no auto-start (resume flag only set from `onAuthenticated`).
- Provider/webhook secrets untouched.

## Deploy / config

- Redeploy **apps/www** and **apps/app** (client-only behavior + shared default).
- No payment provider or webhook config changes required.
