# Commercial Readiness Baseline - 2026-08-17

## Purpose

This commit records the first traceable commercial-readiness baseline after the
Cloudflare, PostgreSQL, Redis, billing, worker, collaboration, and frontend
integration work. It is a release candidate baseline, not an assertion that the
production launch gates are complete.

## Included scope

- Cloudflare deployment definitions for the public site, product app, gateway,
  API, worker, and collaboration services.
- PostgreSQL runtime repositories, migration triggers, Redis-backed job
  dispatch, and runtime verification tooling.
- Stripe checkout ownership, idempotency, plan quotas, cancellation, refund,
  entitlement, and webhook handling changes.
- Production and staging frontend checkout availability controls.
- SoundFont license manifest and music-engine qualification evidence.
- Production PostgreSQL bootstrap and one-time PostgreSQL/R2 restore-drill
  evidence.

## Evidence captured

- `docs/audits/evidence/music-engine-qualification-2026-08-17.json`
- `docs/audits/evidence/production-postgres-bootstrap-2026-08-17.json`
- `docs/audits/evidence/production-backup-restore-drill-2026-08-17.json`

The evidence files contain no runtime credentials. Environment credentials and
production approval files remain ignored by Git.

## Open release gates

- Stabilize the repeatable backup/restore command on Windows and document a
  provider-level PostgreSQL recovery exercise plus independent R2 disaster
  recovery.
- Keep production checkout disabled until Stripe Live onboarding and live-mode
  transaction validation are complete.
- Verify production runtime R2 credentials or replace them with native R2
  bindings where the deployment runtime supports that model.

## Rollback reference

The parent of this baseline is commit `182cd12`, the production SEO indexing
hotfix merge. Reverting this baseline must be coordinated with any database
schema already deployed; application rollback alone does not reverse data or
schema migrations.
