# Google code login

This change is for the existing web OAuth client:

`197772512602-qu2uh3poji5itp19ajaiu6birililo5o.apps.googleusercontent.com`

The browser opens the API start page synchronously from the original click. The
API creates signed, HttpOnly, five-minute state/nonce/PKCE cookies, exchanges the
authorization code, verifies the ID token, and issues a new existing session.
The popup only posts a status and its transaction ID to its allowlisted opener.
Session, Google ID/access tokens and the secret are never put in the return URL.
The original credential endpoint remains available for the GIS fallback.

## Deployment configuration

Update www, app and API from the same version. Rebuild worker with the shared
package. This login change needs no migration; the preceding B2 schema 27
requirements still apply.

Set `GOOGLE_CLIENT_SECRET` only in the API's private runtime environment. Keep
the existing `GOOGLE_CLIENT_ID` and both frontends' `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
at the ID above. An absent secret leaves the legacy GIS path available. Never
set `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET` or put a secret in a build config.

In Google Auth Platform, select the existing Web application client. Verify
these Authorized JavaScript origins (no paths):

- `https://scoretransposer.com`
- `https://www.scoretransposer.com`
- `https://app.scoretransposer.com`
- `https://staging.scoretransposer.com`
- `https://app-staging.scoretransposer.com`

The exact Authorized redirect URIs derived from `PUBLIC_API_URL` are:

- `https://api.scoretransposer.com/api/auth/google/callback`
- `https://api-staging.scoretransposer.com/api/auth/google/callback`

Both popup and full-page flows use those server callbacks. Check Branding,
Audience/publishing status and Data Access for `openid email profile` only.
Recover a previously saved secret from the owner's secure store. If its value
is unavailable, use **Add secret** on this same client and securely save it at
creation; do not create another OAuth client. See Google's current
[client-management instructions](https://support.google.com/cloud/answer/15549257?hl=en).

## Operational limits and verification

Ordinary transactions live entirely in signed cookies. Larger B2 UI return
contexts use bounded five-minute API memory and POST start navigation. Such a
callback must reach the same API process; a restart or another replica fails
safe and requires a fresh login attempt. It cannot recreate a payment order.

One Tap excludes checkout, activation, billing recovery and callback pages.
Logout sets a shared 24-hour suppression cookie and disables auto selection;
explicit Google login clears it. Account hints come only from a remembered,
verified session, never URL parameters.

Popup login retains the homepage File in memory. A full-page fallback explicitly
asks once to choose it again. App imports continue using their existing local
draft persistence. Upload payment returns still require **Continue recognition**.

Run `npm test`, `npm run typecheck`, `npm run lint` and clean builds. Actual
Google accounts, Stripe checkout, browser policies and Console settings still
require the separate browser checklist; offline mocks cannot prove those.
