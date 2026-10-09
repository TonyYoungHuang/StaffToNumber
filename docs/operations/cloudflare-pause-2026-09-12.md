# Cloudflare temporary shutdown — 2026-09-12

The owner requested a temporary shutdown of ScoreTransposer, including staging, to stop Cloudflare compute costs. The intended next step is migration to an owner-provided overseas server when the owner is ready. This is not authorization to restart or migrate now.

## Verified state

Remote state was verified on 2026-09-12 at 11:14 China Standard Time (03:14 UTC). All workspace deployment guards were also checked locally and rejected deployment while the pause marker was active.

- Six container applications remain present with `instances: 0` and `max_instances: 0`.
- All six applications report zero active, starting, scheduling, assigned and healthy instances after shutdown.
- Both gateway Cron schedules are empty. Their temporary maintenance entrypoints have no-op scheduled handlers.
- All six Workers retain their bindings and Durable Object namespaces. Their content was replaced with a minimal HTTP 503 maintenance response; gateway Workers still export their original container classes.
- All nine custom domains return HTTP 503 with `x-scoretransposer-status: paused`: apex, www, app, api, collab, staging, app-staging, api-staging and collab-staging under `scoretransposer.com`.
- All six Workers have workers.dev and preview URLs disabled.
- The production music runtime required an explicit SIGTERM through its existing Durable Object after capacity reduction. The temporary authenticated control endpoint was removed. The subsequent dashboard instance list was empty.

Container applications retained:

| Application | ID | Prior instances / maximum |
| --- | --- | --- |
| scoretransposer-api-production | a038e621-0d01-4dfb-a770-1476e2df1b01 | 4 / 4 |
| scoretransposer-collaboration-production | a03dae6c-fdcd-4ea5-a8eb-4f1aaa982b93 | 4 / 4 |
| scoretransposer-music-worker-production | a032ec12-22be-421d-844e-8d75f3688a8e | 4 / 4 |
| scoretransposer-api-staging | a0342618-8e25-4216-afa2-f709792dbc18 | 2 / 2 |
| scoretransposer-collaboration-staging | a03e7e57-331a-4715-a329-1d230a7f4cbb | 1 / 1 |
| scoretransposer-music-worker-staging | a03124ea-399b-4c81-a336-2cc28bfbb599 | 1 / 1 |

The prior instance/capacity fields do not mean all instances were consuming billable compute. Before shutdown, application health showed one active music container in each environment.

## Preserved resources and billing boundary

R2 objects/buckets, external PostgreSQL and Redis, Worker secrets/bindings, Durable Object storage, container applications/images, DNS and certificates were not deleted. Container runtime disks are ephemeral; the preserved business data remains in its existing external stores. No database or file migration was performed.

Stopping runtime does not cancel the account-level Workers Paid subscription ($5/month), existing invoices, retained-storage charges or external database/Redis subscriptions. Maintenance requests can still consume a small amount of Workers usage. Do not report that the complete Cloudflare account is guaranteed to cost $0.

## Recovery evidence

Private operational copies are stored in `.tmp/cloudflare-pause-20260912/`, with a durable copy under `E:/CodexData/backups/scoretransposer/cloudflare-pause-20260912/`. Keep these files out of Git and public artifacts. They include the original script multipart content and headers, original/current settings and version IDs, domain mapping, original application settings, original schedules and final verification results. OAuth credentials are read from the owner's existing local Wrangler configuration and are not copied into these records.

Original active Worker versions:

| Worker | Version |
| --- | --- |
| scoretransposer-edge-production | 887c827d-bd54-4c77-a564-b818dec629d2 |
| scoretransposer-edge-staging | d6cf27bf-2c52-4fe9-9ff3-b53600e52963 |
| scoretransposer-www-production | 65eb2e19-71ff-4054-9e00-83b8c0ec6115 |
| scoretransposer-www-staging | 4871459e-96b1-4e5a-97cb-637b8171149c |
| scoretransposer-app-production | 2223665c-09e2-4166-97f6-b521af746b64 |
| scoretransposer-app-staging | cb39e0e0-7ba9-43e7-8849-cdd09d6a6595 |

## Later restoration or migration

1. Confirm the owner's new intended hosting destination and capacity; preserve the current business databases, Redis prefixes and R2 keys.
2. For migration, deploy and verify the new consumer/backend before changing public traffic. Ensure the old Cloudflare music containers remain at zero and cannot consume the same queues concurrently.
3. For an explicitly requested Cloudflare restoration, first decide revised capacity and whether unconditional keepalive is still desired. Restore application capacity deliberately, then restore saved Worker code/version and verify dependencies. Restore Cron and development/preview URLs only where necessary.
4. Do not blindly restore the previous every-five-minute Cron: it kept 12 GiB music containers running and was associated with the costly bill.
5. Clear `deploy/cloudflare/paused.json` only as part of the owner's requested restoration or migration. Standard backend/frontend deploy commands and gateway/app/www workspace deploy commands are blocked while this marker is active. Direct raw Wrangler/API calls or dashboard rollbacks bypass this local guard and must respect the pause record.

The original Wrangler files retain their previous deployment topology for migration reference; they are not a description of the currently paused remote capacity. Avoid raw `wrangler deploy` while paused.
