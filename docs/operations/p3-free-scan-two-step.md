# P3 — Free scan compressed to two steps

Updated: 2026-10-09

## Before
1. Choose file
2. Wait for structure check
3. Pick simple vs complex on mode cards
4. Tap **Confirm {mode} · {credits} credits** (second confirm)

## After (free trial + simple eligible)
1. Choose file (structure check runs automatically)
2. One tap **Start recognition** (inline: “Free — uses your 1 free project”)

Complex / multi-staff stays behind **Show recognition modes**. If preflight recommends complex, the picker opens automatically.

## Still requires a confirm / gate
- Structure check must finish (and support the file) before Start enables — otherwise we would charge/submit a bad file.
- Price-change re-check on submit remains (server `expectedCreditCost`) — not a UI step, safety only.
- Guests still sign in before OMR APIs (P2); after login, draft resumes into the one-tap Start state.
- Paid / non-free-simple users still see mode cards and an explicit price line before Start.

## SEO / GEO
No public marketing URL/title/H1 changes.
