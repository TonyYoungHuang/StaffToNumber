# Cloudflare deployment runbook

This directory is the executable deployment source of truth for the US-first ScoreTransposer runtime. China-mainland infrastructure is outside this project's trust boundary and must not be connected or referenced.

## Current release state

| Area | State | Meaning |
| --- | --- | --- |
| Wrangler configuration | Ready | Staging and production configs pass Wrangler schema/type generation. |
| Public and product frontends | Ready for staging | Next.js public and product apps build with OpenNext and deploy to Cloudflare custom domains. |
| Edge gateway | Ready | Routes API and WebSocket traffic, adds proxy/security headers, exposes edge readiness, and keeps the music worker warm. |
| Container definitions | Ready for staging build | API, Collaboration, and music Worker images are defined for `linux/amd64`. |
| R2 topology | Ready to provision | Separate staging and production buckets are declared. |
| PostgreSQL runtime | Ready for staging | API, Worker, and Collaboration require PostgreSQL in staging/production, select the `scoretransposer` schema, and fail startup when required tables are absent. |
| Upload quarantine | Blocked for production | The lightweight API image requires R2 direct upload plus asynchronous malware/media inspection before production. |
| Cloudflare account | Authorized | Wrangler access, Workers Paid, Containers, and R2 have been enabled by the account owner. |

Staging may now validate the complete multi-container data path: Cloudflare routing, PostgreSQL runtime storage, image startup, R2 credentials, Redis connectivity, and tool availability. This does not waive the remaining production acceptance gates below.

## Files

- `wrangler.staging.jsonc`: workers.dev staging gateway, ENAM-only containers, staging R2 bucket.
- `wrangler.production.jsonc`: production custom domains, rolling container deployment, production R2 bucket.
- `../../apps/www/wrangler.staging.jsonc`: public staging frontend at `staging.scoretransposer.com`.
- `../../apps/app/wrangler.staging.jsonc`: product staging frontend at `app-staging.scoretransposer.com`.
- `../../scripts/cloudflare-deploy-frontends.mjs`: repeatable OpenNext build and staging frontend deployment.
- `Dockerfile.api`: lightweight Fastify API image.
- `Dockerfile.collaboration`: Hocuspocus/Yjs WebSocket image.
- `../backend/Dockerfile`: music Worker image containing Audiveris, music21, MuseScore, FluidSynth, ffmpeg, Basic Pitch, and yt-dlp.
- `container-worker-entrypoint.mjs`: Worker supervisor, health endpoint, and private SoundFont/license download.
- `secrets.staging.example.json`: names of the staging secrets; never put real values in the tracked example.
- `production-approval.example.json`: final human approval evidence required by the production preflight.

## 1. Local prerequisites

Run from the repository root:

```powershell
node --version
npm --version
docker version
npx wrangler --version
npm run cloudflare:preflight:staging
```

Required minimums are Node.js 22, npm 10, a working Docker engine, and the locked Wrangler version. Do not prune the shared Docker cache as part of this project without separately reviewing other local projects.

## 2. Authorize the Cloudflare account

```powershell
npx wrangler login
npx wrangler whoami
```

The browser login must use the Cloudflare account that will own `scoretransposer.com`. Confirm that Workers Paid and Containers are enabled before provisioning resources.

For CI, create a narrowly scoped API token and store it only in the CI secret store as `CLOUDFLARE_API_TOKEN`; also store the matching `CLOUDFLARE_ACCOUNT_ID`. Do not place either value in a repository file.

## 3. DNS and frontend ownership

Cloudflare is the DNS and runtime boundary for the US-first deployment. Staging custom domains are owned by their Wrangler deployments: `staging.scoretransposer.com`, `app-staging.scoretransposer.com`, `api-staging.scoretransposer.com`, and `collab-staging.scoretransposer.com`. Do not create competing DNS records for these names manually.

Before changing any production DNS record, export the current zone and preserve rollback evidence. Production public/app custom-domain configs must be reviewed and approved separately; a successful staging deployment does not authorize replacing the apex or `www` records.

After changing nameservers, verify from two public resolvers:

```powershell
Resolve-DnsName scoretransposer.com
Resolve-DnsName www.scoretransposer.com
```

The existing production website and certificate must remain valid until a separately approved production frontend cutover.

## 4. Provision staging storage

Review the command plan:

```powershell
npm run cloudflare:bootstrap:staging
```

Create the ENAM staging bucket after review:

```powershell
npm run cloudflare:bootstrap:staging -- --execute
```

In the R2 dashboard, create an object read/write API token restricted to `scoretransposer-staging`. Record its access key, secret key, and account-specific S3 endpoint in a password manager. Never enable public bucket access.

Configure lifecycle rules for abandoned multipart uploads, quarantine objects, temporary job work, and expired exports. Store a second recovery copy under a separate credential and rehearse restoration before production.

## 5. Provision US East data services

Create isolated staging instances of:

- PostgreSQL 17 or later in US East, with TLS required, point-in-time recovery, daily backups, and a dedicated least-privilege application role.
- Redis 7.4-compatible service in US East, with TLS, persistence, `noeviction`, and a dedicated staging database/credential.

Allow outbound connections from Cloudflare Containers according to the provider's supported network controls. Do not use IP allowlisting that assumes Containers have a single fixed egress IP unless the selected Cloudflare plan explicitly provides that guarantee.

Use the owner connection only for schema migration. API, Worker, and Collaboration must receive the least-privilege runtime connection, `RUNTIME_DATABASE_PRIMARY=postgres`, and `POSTGRES_SCHEMA=scoretransposer`. Verify the catalog plus transactional write/read/rollback behavior before deployment:

```powershell
node scripts/verify-postgres-runtime.mjs
```

API and Collaboration validate their required tables before listening. Worker supports `WORKER_RUNTIME_READINESS_CHECK_ONLY=true` for a real PostgreSQL readiness transaction that exits without claiming user jobs.

## 6. Configure staging secrets

Create an ignored local secret file:

```powershell
Copy-Item deploy/cloudflare/secrets.staging.example.json deploy/cloudflare/secrets.staging.json
```

Replace every placeholder locally. Use Stripe test mode for staging. Transactional email delivery is disabled in the staging Wrangler configuration so the Resend free-tier quota is reserved for production; email calls fall back to preview mode. Then upload secrets in one operation:

```powershell
npx wrangler secret bulk deploy/cloudflare/secrets.staging.json --config deploy/cloudflare/wrangler.staging.jsonc
```

Generate salts and admin tokens with a cryptographically secure password manager or secret generator. Do not send the completed file through chat, email, screenshots, or support tickets.

## 7. Validate and deploy staging

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run cloudflare:preflight:staging
npm run cloudflare:deploy:staging
npm run cloudflare:deploy:frontends:staging
```

The first Container deployment may take several minutes while Cloudflare builds and distributes images. Save the deployment/version IDs printed by Wrangler.

Run the backend smoke test and then verify both frontend custom domains:

```powershell
node scripts/cloudflare-smoke.mjs --base-url=https://scoretransposer-edge-staging.<subdomain>.workers.dev
Invoke-WebRequest https://staging.scoretransposer.com -Method Head
Invoke-WebRequest https://app-staging.scoretransposer.com -Method Head
```

`/__edge/health`, `/health`, and `/__edge/readiness` must return `200`. Edge health must report `databasePrimary: "postgres"` and the expected non-empty PostgreSQL schema. Aggregate readiness also requires the API, Collaboration service, and Worker to report ready; the Worker `/health` endpoint is only a liveness probe, while its `/ready` endpoint proves PostgreSQL and BullMQ are connected. Any SQLite selection, missing schema, or dependency readiness failure is a release failure.

## 8. Staging acceptance

Do not advance to production until all of the following have evidence:

1. PostgreSQL runtime is active in API, Worker, and Collaboration; staging/production cannot select SQLite, required-table validation passes, and the Worker readiness transaction succeeds without consuming a job.
2. R2 direct multipart upload, quarantine, checksum verification, asynchronous ClamAV/media inspection, cancellation, resume, and lifecycle cleanup pass.
3. API-created BullMQ jobs are consumed by the Worker after restarts, duplicate delivery, Redis interruption, and Container rollout.
4. Audiveris, music21, MuseScore, FluidSynth, licensed SoundFont, ffmpeg, Basic Pitch, and yt-dlp qualification reports pass in the actual Container image.
5. Stripe test subscription, renewal failure, downgrade, refund, webhook replay, and school-seat flows pass.
6. Backup restoration, alert delivery, trace correlation, account export/deletion, copyright intake, and security incident drills pass.
7. Real browser/device tests and a continuous seven-day staging soak pass.

## 9. Production preparation

Create production PostgreSQL, Redis, R2, R2 credentials, Stripe live resources, Resend credentials, and Cloudflare secrets independently. Never clone staging credentials.

Upload a commercially licensed SoundFont and its reviewed license manifest to private production R2 objects. Set their object keys through `SOUNDFONT_OBJECT_KEY` and `SOUNDFONT_LICENSE_OBJECT_KEY`; the Worker downloads them to an ephemeral private directory before starting.

Copy and complete the ignored production approval:

```powershell
Copy-Item deploy/cloudflare/production-approval.example.json deploy/cloudflare/production-approval.json
git rev-parse HEAD
```

The approval must contain the exact clean release commit and evidence that every boolean gate passed. Generate and verify the release manifest from that clean commit:

```powershell
npm run build
npm run release:manifest
npm run release:verify
npm run cloudflare:preflight:production
```

## 10. Production deployment

Backend production deployment has two deliberate confirmations:

```powershell
$env:CLOUDFLARE_PRODUCTION_APPROVED='true'
npm run cloudflare:deploy:production
Remove-Item Env:CLOUDFLARE_PRODUCTION_APPROVED
```

Wrangler creates the `api.scoretransposer.com` and `collab.scoretransposer.com` custom domains defined in the production config. Production public/app frontend Wrangler configs are intentionally not part of the staging script: create and review them only after the production backend, Stripe live account, legal/compliance review, and seven-day staging soak are approved. Then deploy the public and product apps with `NEXT_PUBLIC_API_BASE_URL=https://api.scoretransposer.com` and verify registration, upload, editing, playback, export, billing, collaboration, and deletion from a clean browser profile.

Stripe sandbox Checkout and webhooks prove the integration, but live collection remains blocked until the merchant has a supported legal entity, bank account, tax profile, and completed Stripe verification. Never reuse sandbox product IDs, API keys, webhook secrets, or test evidence for production.

## 11. Smoke, monitoring, and rollback

```powershell
node scripts/cloudflare-smoke.mjs --base-url=https://api.scoretransposer.com --expect-ready
npx wrangler deployments list --config deploy/cloudflare/wrangler.production.jsonc
npx wrangler tail --config deploy/cloudflare/wrangler.production.jsonc
```

Rollback the Worker and Container rollout to a known version:

```powershell
npx wrangler rollback <version-id> --config deploy/cloudflare/wrangler.production.jsonc --message "Rollback after failed production verification"
```

A code rollback does not roll back PostgreSQL or R2. Every schema change needs a separately tested forward repair or database recovery procedure. Stop new writes before restoring persistent data, record RTO/RPO evidence, and verify object checksums after recovery.

## 12. Europe expansion

When European demand or contractual residency requirements justify it, create a separate EU-jurisdiction R2 bucket, add `WEUR` containers, complete a regional data-processing design, and route European tenants deliberately. Adding a CDN location alone is not an EU data-residency implementation.
