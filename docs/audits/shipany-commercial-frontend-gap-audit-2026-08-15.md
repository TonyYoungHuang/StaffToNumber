# ScoreTransposer commercial and template gap audit

Date: 2026-08-15

## Scope

This audit compares the current ScoreTransposer implementation with the supplied ShipAny Cloudflare template's commercial product patterns and with the project's music-notation capability plan. The template was used as a structural reference, not copied as a generic AI landing page.

## Adopted frontend patterns

- Concise navigation centered on scanner, editor, transposition, education, pricing, and the product app.
- Pricing and upgrade actions are visible from public and authenticated navigation.
- Checkout is reachable from both public pricing and the in-app billing surface.
- Public and product apps use a shared light commercial design system and responsive one-column mobile layouts.
- Cloudflare OpenNext builds and custom-domain staging deployment are scripted and repeatable.

## Commercial backend status

| Capability | Status | Evidence or remaining gate |
| --- | --- | --- |
| Account and subscription ownership | Staging ready | Checkout requires a registered normalized email or authenticated user; organization authorization is enforced. |
| Stripe subscription Checkout | Staging ready | Pro and Education sandbox prices, stable idempotency keys, durable payment orders, expiration, webhook processing. |
| Anonymous attribution | Fixed | An unregistered email cannot create an unowned entitlement; Stripe customer email is reconciled to the account. |
| Cancellation | Staging ready | Local cancellation calls the remote Stripe/Paddle subscription and records period-end state. |
| Refund handling | Staging ready | Full refund processing cancels the remote subscription before revoking local access; replay is idempotent. |
| Plan and seat quotas | Staging ready | Legacy, Pro, and Education limits are centralized and checked against repository usage. |
| PostgreSQL runtime | Verified in staging | Schema, required tables, CRUD, transaction rollback, and migration checks passed against the real service. |
| Redis/BullMQ runtime | Verified in staging | Redis primitives, TTL cleanup, outbox, retry, and collaboration multi-instance checks passed. |
| Email delivery | Staging ready | Resend sender domain is verified and a test email was received. |
| Object storage | Staging provisioned | Restricted R2 bucket and credentials exist; production lifecycle, restore, and cross-region evidence remain required. |
| Observability and incident operations | Partial | Health/readiness and runbooks exist; complete distributed traces, alert routing, and production on-call drills remain gates. |
| Production payments | Blocked | Stripe live merchant onboarding, supported legal entity/bank/tax profile, live keys/products/webhook, and real-money acceptance are not complete. |

## Music product capability status

| Product area | Current level | Gap to commercial target |
| --- | --- | --- |
| PDF/image scan to editable score | Usable staging workflow | Audiveris real-world multi-page/rotation/low-confidence qualification and licensed 200-score gold set remain. |
| Structured score editing | Visual selection plus structured editing | Not yet MuseScore/Flat-grade direct engraving, drag layout, complete symbols, or stable pixel regression. |
| Transposition | Usable | Complex instrument-specific comfort ranges and full music21 failure/timeout matrix remain. |
| Staff/Jianpu conversion | Usable core conversion | Complex Chinese publication engraving and legal reference corpus remain. |
| Playback and practice | Usable | Long-duration drift, real recording synchronization, waveform training, and complex navigation marks need broader acceptance. |
| Export | MusicXML/MIDI/WAV/PDF paths exist | Cross-browser PDF reopen equivalence and commercial SoundFont acoustic goldens remain. |
| Audio transcription | Experimental | Polyphonic cleanup, quantization correction, scene benchmarks, and copyright controls remain. |
| Education | Backend and initial product surfaces exist | Full student lifecycle, notifications, resource library, institution permissions, and real LMS synchronization remain. |

## Release decision

The staging product can be deployed for controlled sandbox acceptance with visible payment entry. It must not be represented as production-ready paid SaaS until all of these are complete:

1. Stripe live merchant verification and real-money subscription, renewal failure, cancellation, downgrade, and refund acceptance.
2. Real-device, mobile-network, sleep/resume, accessibility, and cross-browser verification.
3. R2 lifecycle, backup restore, and cross-region recovery evidence.
4. SoundFont commercial license approval and acoustic golden tests.
5. Security, privacy, copyright, tax, terms, refund-policy, and incident-response sign-off.

The supplied template improves commercial presentation and deployment discipline, but it does not close the specialist notation, legal, reliability, or live-payment gates listed above.
