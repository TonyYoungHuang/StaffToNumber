# Hetzner deployment and cutover

2026-10-05 reviewed score content update: API and worker use `20261005-content1`, and the editor uses `APP_RELEASE=20261005-content2`. These images preserve the earlier subscription, beam and resize fixes. Score import/export now preserves unpitched notation, hidden timing placeholders, voice backups and instrument octave transposition; browser playback excludes unpitched notes. Candidate approval transfers its live reference assets to the accepted revision. Complex score previews avoid ambiguous click bindings while the notation editor retains precise event selection. Audiveris output selection follows the successful rotation and rejects multiple movements instead of silently selecting a partial score. Only API, worker and app were recreated; all 13 other running containers are unchanged. Runtime verification and the private correction record are under `/srv/sites/scoretransposer/releases/20261005-content1`; the verified PostgreSQL dump and previous runtime selectors are under `/srv/sites/scoretransposer/backups/20261005-content1-v1`. Reviewed content remains a pending candidate, with its original revision retained. WWW remains `20261002-brand1`.

2026-10-05 subscription and candidate review fix: API now uses `20261005-period1`, reading subscription invoice line service periods instead of invoice accumulation timestamps. App now uses `20261005-review1`, handling malformed OMR beam groups and rebinding interactive preview notes after width changes. Root `.env` keeps WWW's `FRONTEND_RELEASE=20261002-brand1` and selects the editor independently with `APP_RELEASE=20261005-review1`; update or clear this override when upgrading the app in a later frontend release. Only API and app were recreated; worker, storage, databases, WWW and shared edge remain on their existing releases. Execution and rollback records are under `/srv/sites/scoretransposer/releases/20261005-period1`, `/srv/sites/scoretransposer/releases/20261005-review1`, and their corresponding project-specific backups. No score was confirmed or replaced during the repair.

2026-10-02 indexing investigation: the website Caddy route now retries short upstream connection failures for up to 5 seconds and writes a bounded, redacted crawl access log. The existing direct HTTP-www redirect is also retained in the repository snippet. Only Caddy was gracefully reloaded; all container IDs and application images are unchanged. Preserve this route configuration in subsequent deployments. See [findings, verification and rollback](../../docs/audits/google-indexing-2026-10-02.md).

2026-10-02 search-brand update: WWW now uses `20261002-brand1`. Public pages declare PNG and ICO favicons alongside the existing SVG; localized homepages share one domain-level `WebSite` identity named ScoreTransposer. Existing titles, descriptions, locale links and product content are retained. Only WWW was recreated. See [verification, backup and rollback](../../docs/deployments/site-brand-search-2026-10-02.md).

2026-10-02 homepage spacing update: WWW now uses `20261002-spacing1`. Title-to-video spacing is 28px and video-to-workbench-title spacing is 32px on desktop and mobile. Only homepage CSS changed; copy, SEO, media and payment behavior are retained. Only WWW was recreated, and the other 16 container IDs are unchanged. See [verification, backup and rollback](../../docs/deployments/home-spacing-2026-10-02.md).

2026-10-01 homepage/pricing layout update: WWW now uses `20261001-layout1`. The original main title and description precede the video, followed by a short workbench introduction and the workbench. Five vertical paid cards replace the Free card and separate single-score panel; $49 is selected by default and marked MOST POPULAR. Only WWW was recreated; the app tag aliases its unchanged pass1 image, API stays pass1, and the other 16 container IDs are unchanged. See [verification, backup and rollback](../../docs/deployments/home-layout-pricing-2026-10-01.md).

2026-10-01 homepage/auth/single-score update: WWW, app and API now use `20261001-pass1`. The white English video is first, followed by the workbench; public and workspace sign-in flows use in-place modals and Google One Tap is integrated. The US$2.99 One Score Pass uses Stripe one-time payment, one new PDF/image score up to 5 pages, and 10 dedicated non-expiring processing credits. Additive migration: `single-score-passes.sql`; new private runtime key: `STRIPE_SINGLE_SCORE_PRICE_ID`. Worker and the other 14 containers are unchanged. See [verification, payment boundaries, backup and rollback](../../docs/deployments/homepage-auth-single-score-2026-10-01.md).

2026-10-01 light background update: WWW now uses `20261001-light1`. The homepage animation and foreground are white with dark notation and text. Existing autoplay, metrics, SEO and checkout behavior are retained. Only WWW was recreated. See [verification, backup and rollback](../../docs/deployments/product-background-light-2026-10-01.md).

2026-10-01 homepage background update: WWW now uses `20261001-background2`. The 30-second English score animation autoplays muted and loops below the workbench, with fixed promotional copy and owner-provided 2K / 97 / 65K metrics. The final runtime image fixes Next.js image-cache ownership. API remains `20261001-pricing1`; only WWW was recreated. See [verification, backup and direct rollback to the prior click-to-play version](../../docs/deployments/product-background-release-2026-10-01.md).

2026-10-01 homepage commercial update: WWW now uses `20261001-commercial1`, with the shared 30-second English score film immediately below the homepage workbench. API stays on `20261001-pricing1`; the editor image is aliased under the common frontend selector without rebuilding or restarting it. Only WWW was recreated. See [verification, backup and rollback](../../docs/deployments/product-commercial-release-2026-10-01.md).

2026-09-28 activation-code login update: app and API now use `20260928-codelogin1`; worker stays on `20260928-shop1`. Buyers at `/cn` sign in with the code alone. The additive migration is `activation-code-login.sql`; existing email accounts must explicitly enable code login. See [verification, backups and rollback limits](../../docs/audits/activation-code-login-2026-09-28.md). WWW and the other 15 containers were not restarted.

2026-09-28 shop activation update: app now uses `20260928-shop2`; API and worker use `20260928-shop1`. WWW retains the original flow4 image and was not restarted. The additive `activation-plans.sql` migration maps shop codes to the existing four website plans. See [implementation, verification and rollback limits](../../docs/audits/shop-activation-2026-09-28.md). Audio transcription remains disabled.

2026-09-28 payment update: the current frontend selector is `20260928-checkout1`, which defaults checkout to Stripe and strengthens the selected provider border. Only app was rebuilt; the www tag aliases its unchanged redirect1 image, and the www container was not restarted. See [UI verification and rollback](../../docs/audits/checkout-provider-ui-2026-09-28.md) and the earlier [checkout redirect fix](../../docs/audits/checkout-redirect-fix-2026-09-28.md). API retains `20260928-stripe1`. The base `RELEASE=20260927-cutover2` remains for the other services and engine mounts. Root `.env` sets `FRONTEND_RELEASE=20260928-checkout1`, `API_IMAGE=scoretransposer-api`, and `API_RELEASE=20260928-stripe1`. Update these overrides when publishing a later full release. Stripe and Paddle are enabled. The additive payment recovery table migration is `payment-order-durable-store.sql`. See [payment deployment and rollback](../../docs/operations/stripe-production-activation.md).

Current state on 2026-09-27: the membership tool is live on the existing 4 GB Hetzner server. Quota limits, native API acceptance, public browser acceptance, DNS and HTTPS cutover are complete. **Do not restore R2 or upload the local score library.** See [the current acceptance record](../../docs/operations/hetzner-cutover-2026-09-27.md).

Current release is `20260927-cutover2`; all eight services run. Historical pending jobs were reconciled and the new queue prefix is `scoretransposer-hetzner-v1`. Account quotas are 50/250/500 MiB, uploads 20 MiB, Garage bucket 3 GiB/10,000 objects, and minimum free disk 6 GiB. Set the matching `QUOTA_*_STORAGE_BYTES`, `UPLOAD_MAX_BYTES`, and `STORAGE_MIN_FREE_BYTES` in the private runtime environment. Public pricing uses the same limits.

## Isolation

- Host: `polyadmin@2.29.25.230`, verified dedicated SSH key from the Hetzner deployment skill.
- Project: `/srv/sites/scoretransposer`, Compose name `scoretransposer-prod`.
- PostgreSQL 17 has its own database, owner, restricted application role and volume.
- Redis and Garage S3 have project-specific volumes on `scoretransposer-private`. Neither has a public port.
- Website, app, API and collaboration bind only host loopback ports `21800`–`21803` during preparation.
- `runtime` and `jobs` profiles are separate. Starting the three data services does not launch the application or consume jobs.
- The current shared edge is `/srv/edge`, container `shared-edge-caddy-1`. The Caddy snippet is active for this project's five production hosts, each using Let's Encrypt. No other project's route was replaced.
- Runtime secrets live in `/srv/sites/scoretransposer/shared`, mode 600. Do not print resolved Compose configuration, copy secrets into this directory, or publish preparation data.

## Build

Use a sanitized source archive (tracked application source plus these changes, excluding private environments, uploads, databases and caches). Build on the local development machine when possible. The server must not run concurrent builds.

```sh
docker build -f deploy/hetzner/Dockerfile --target frontend --build-arg FRONTEND=www -t scoretransposer-www:RELEASE .
docker build -f deploy/hetzner/Dockerfile --target frontend --build-arg FRONTEND=app -t scoretransposer-app:RELEASE .
docker build -f deploy/hetzner/Dockerfile --target backend -t scoretransposer-backend:RELEASE .
docker build -f deploy/hetzner/Dockerfile.worker --build-arg BACKEND_IMAGE=scoretransposer-backend:RELEASE -t scoretransposer-worker:RELEASE .
```

The worker extends the release's backend image with the native engines, using the same Audiveris 5.10.2 and Basic Pitch 0.4.0 versions as the previous engine configuration. It has no Cloudflare runtime or registry dependency. This shares the application layers with the API and collaboration images. Record the resulting image ID and Python package inventory with each release.

On the current host's legacy Docker builder, native dependency installation was constrained with `--memory=1024m --memory-swap=1536m --cpu-quota=75000`. Install dependencies sequentially and monitor the existing sites during the build.

The API mounts `clamscan-serial.sh` from the selected release. Preserve executable bits for both shell wrappers (`chmod 755` on the server). It permits one scanner process; another upload receives a temporary scanner-unavailable error and can be retried. The worker permits one queued job. API and Worker now both use the native-engine image and mount `music-engine-serial.sh` under five engine names, sharing `/data/.music-engine.lock`. This serializes API transposition/exports and worker engines across containers. Native dependencies are shared image layers, not duplicate installations.

The frontend script resolves Next.js from the individual workspace. The lockfile contains different root-tooling and application versions; running the root Next executable against an application breaks request context during prerendering.

## Private configuration

Required files outside the source release:

| File | Contents |
| --- | --- |
| `shared/postgres.env` | `POSTGRES_USER=scoretransposer_owner`, random password, `POSTGRES_DB=scoretransposer` |
| `shared/garage.env` | Generated access key, secret and default `scoretransposer-production` bucket |
| `shared/garage.toml` | Persistent metadata/data directories, single-node configuration, random RPC secret, internal S3 port 3900 |
| `shared/runtime.env` | Original production business configuration, replacement local database/Redis/S3 addresses and credentials |
| `.env` | `RELEASE=<verified-release>` |

Garage endpoint is `http://storage:3900`, region `garage`, path-style access enabled, `S3_CHECKSUM_MODE=md5`, original bucket and `production` key prefix retained. MD5 is used for S3 transport compatibility; application SHA-256 metadata and verification remain enabled. Garage is single-node storage: this configuration has no disk or host redundancy and needs an independent file backup before public cutover. [Garage deployment documentation](https://garagehq.deuxfleurs.fr/documentation/quick-start/).

Production mail configuration was restored after confirming there were no pending historical notifications. For a future isolated preparation environment, blank `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS`: `EMAIL_DELIVERY_ENABLED=false` alone does not disable the direct API's mail client. Production Paddle configuration and original price identifiers remain in the private environment; no live payment or outbound-email test was performed.

## Cutover checklist (completed; retain for future recovery)

1. Owner authorization and the zone-scoped DNS credential were supplied. Preserve DNS snapshots separately from secrets.
2. Do not restore or bulk-import old objects. Keep their database records and explain missing historical downloads. Historical pending jobs have been marked as requiring source re-upload; retain their backups.
3. Refresh the production database dump, verify source/target rows, and inspect the old Redis queue. Reconcile incomplete jobs and dispatch outbox records before enabling a worker. Do not run two consumers against the original queue.
4. Update ClamAV signatures and verify that clean uploads pass while an EICAR test is rejected. Test score import, retrieval, transposition, OMR and at least one export on the target.
5. Run a representative heavy job on the 4 GB shared host and measure memory, swap, CPU and existing-site health. Concurrency 1 and container limits are configured, but they do not establish capacity for every score. Concurrent uploads can also start virus scanning; peak capacity needs explicit measurement.
6. Create and verify an independent database and file backup. Record a restore rehearsal and decide retention before enabling production writes.
7. Restore transactional mail only for the final live environment; verify the unchanged Paddle webhook URL and signing secret. Do not make a live payment solely for testing without authorization.
8. Apply `edge.override.yaml`, resolve each unique `scoretransposer-*` upstream inside the shared Caddy container, back up the edge configuration, validate the full candidate and reload it.
9. Remove only this site's Cloudflare Worker custom-domain bindings and replace its five web records with DNS-only A records to `2.29.25.230`. Preserve mail, verification and unrelated records. Validate HTTPS and every existing shared-host domain.
10. Keep the old database and objects until after a verified recovery point and observation period. Keep Cloudflare's deployment pause guard. Review remaining account subscriptions separately; migration does not prove that all Cloudflare or third-party billing is zero.

## Commands and rollback

Always use the explicit project and file:

```sh
cd /srv/sites/scoretransposer
sudo docker compose -p scoretransposer-prod -f compose.yaml -f releases/20260927-cutover2/deploy/hetzner/edge.override.yaml --profile runtime --profile jobs config --quiet
sudo docker compose -p scoretransposer-prod -f compose.yaml ps
sudo docker compose -p scoretransposer-prod -f compose.yaml -f releases/20260927-cutover2/deploy/hetzner/edge.override.yaml --profile runtime --profile jobs up -d
```

The last command preserves the shared-edge network aliases. Jobs have been reconciled, the `jobs` profile is enabled, and the project route is loaded in the active edge. Five web records point directly to Hetzner; unrelated DNS records are unchanged.

Stopping the project's runtime now interrupts the live site. If a rollback is necessary, first preserve new Hetzner data and review the saved DNS/Worker bindings. The old Worker has a maintenance guard, so restoring DNS alone does not restore the service. Stop only this project's services when required:

```sh
sudo docker compose -p scoretransposer-prod -f /srv/sites/scoretransposer/compose.yaml --profile runtime --profile jobs stop www app api collaboration worker
```

Do not remove volumes or the source database dump. The original restored snapshot and its checksum are under `/srv/sites/scoretransposer/backups`. For database restoration, stop this project's writers and restore into a new isolated database before replacing a target; do not overwrite the original cloud database.
