# P2 conversion notes — Google sign-in & free-scan login wall

Updated: 2026-10-09

## Root cause of “Google heading, no button”

Live `/login` **does** embed `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and GIS `renderButton` succeeds when `accounts.google.com/gsi/client` loads (verified with Playwright). The “heading only” state happens when:

1. **GSI script fails or hangs** (common on networks that block Google, e.g. some mainland CN paths). The heading is our HTML; the iframe never appears.
2. **Layout race**: first `renderButton` ran with `clientWidth === 0` and never retried usefully (modal / late mount).
3. **Stale script load**: Next `<Script onLoad>` did not fire when GSI was already on the page from a prior mount.

Code now: detect already-loaded GSI, fall back width to parent/320, double-`rAF` + `ResizeObserver`, 8s timeout with email fallback message, and preferred-login method records `google` correctly.

## Still requires ops / Google Cloud Console

- Authorized JavaScript origins must include `https://app.scoretransposer.com` and `https://scoretransposer.com` (and `www` if used) for client `197772512602-…`.
- Authorized redirect URIs are not used for GIS button/one-tap credential mode, but origins must match.
- Redeploy **both** frontends after this change so AuthForm / SessionBootstrap / EntitlementGate / guest draft ship together.
- If Google stays blocked for a visitor, email/password remains the path; no in-app VPN.

## Free-scan login wall (partial)

- `EntitlementGate` with `allowFreePreview` now uses a **guest** state: `#free-scan` stays mounted so marketing CTAs to `/scores#free-scan` land.
- Guests can choose a file; submit saves a **guest import draft** and opens the auth modal. After sign-in, `claimGuestImportDraft` restores the file.
- **Hard gate remaining:** OMR preflight/import APIs still require auth. Anonymous upload/processing is not implemented (larger product change).

## SEO / GEO

No marketing SEO landing URL, title, or H1 was changed. Edits are limited to `apps/app` auth/free-scan flow, `HomeGoogleSignIn` fallback UI, and this ops note.
