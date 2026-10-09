# ScoreTransposer

**Live on Hetzner as of 2026-09-27.** Public DNS and HTTPS cutover are complete. A real browser passed membership login, score upload, OMR, transposition and PDF download at [the production workspace](https://app.scoretransposer.com). The existing shared server uses single-concurrency heavy jobs and 50/250/500 MiB account storage quotas. See the [acceptance record](docs/operations/hetzner-cutover-2026-09-27.md) and [deployment runbook](deploy/hetzner/README.md).

**The original Cloudflare deployment remains paused.** Production web domains now point directly to Hetzner; the Cloudflare pause guard, disabled keepalives and zero container capacity remain as recorded in the [pause and recovery record](docs/operations/cloudflare-pause-2026-09-12.md). Retain source backups and review account billing separately from migration status.

ScoreTransposer is a MusicXML-first music notation platform for score scanning, correction, transposition, staff/Jianpu conversion, practice playback, export, teaching, and collaboration.

The repository is under active development. Production runs on the owner's Hetzner server with isolated PostgreSQL, Redis, S3-compatible storage and containerized applications. The owner chose the membership-tool workflow: customers upload and process their own scores. The old R2 objects and local score library were not imported; historical files may need re-uploading. New uploads and the complete sheet-music workflow have passed acceptance; long-audio and large multi-page workloads still require separate capacity testing.

## Architecture

MusicXML and the versioned internal Score JSON document are the source of truth. PDF, images, audio, MIDI, and Jianpu are import/export boundaries; the platform does not edit PDF geometry as the score model.

| Workspace | Purpose | Default port |
| --- | --- | --- |
| `apps/www` | Public website, feature pages, SEO, support, privacy, and copyright intake | 3000 |
| `apps/app` | Authenticated score workspace, editor, jobs, classroom, student, and admin views | 3001 |
| `services/api` | Auth, score/job APIs, storage metadata, billing, privacy, security, and operations | 4000 |
| `services/worker` | OMR, conversion, audio, export, and external-engine job execution | background process |
| `services/collaboration` | Yjs/Hocuspocus real-time score document service | 4001 |
| `packages/shared` | Score JSON schema, MusicXML/Jianpu/MIDI transforms, editor and practice domain logic | library |
| `packages/ui` | Shared UI primitives | library |

## Current Capabilities

- Import MusicXML/MXL, MIDI, Jianpu, PDF, images, audio, and supported remote media into a candidate-based score workflow.
- Run Audiveris OMR jobs and retain source pages, symbol geometry, confidence evidence, engine artifacts, and review status when the engine is configured.
- Render scores with OSMD and provide a VexFlow editing layer with measure selection, insertion/deletion, clipboard operations, keyboard entry, multiple voices, modifiers, and layout helpers.
- Transpose and convert through structured score documents, with optional `music21` processing for complex MusicXML cases.
- Play and practise parts with tempo, loops, metronome/count-in, repeat navigation, solo/mute, and performance-analysis foundations.
- Export MusicXML, MIDI, PDF, WAV, and MP3 through persistent jobs; MuseScore, FluidSynth/SoundFont, and ffmpeg are used when configured.
- Support first-stage assignments, submissions, feedback, recording practice, Yjs collaboration, sharing, billing, support, privacy, security auditing, and copyright complaint operations.
- Publish bilingual feature metadata, sitemap/robots, canonical/hreflang, FAQ/HowTo/Breadcrumb structured data, OG images, and SEO audit/admin surfaces.

## Commercial Boundaries

The following are not yet production claims:

- External engines must run in dedicated `linux/amd64` Cloudflare Containers; ordinary Workers and Vercel functions cannot execute Audiveris, MuseScore, Basic Pitch, FluidSynth, or long ffmpeg workloads.
- Local SQLite and filesystem storage remain development defaults. Staging and production now fail closed unless API, Worker, and Collaboration all use the shared PostgreSQL runtime against an explicitly selected schema; startup validates the required tables before serving or consuming work. Verified SQLite-to-PostgreSQL migration/rollback and shadow-parity tools remain available for controlled data migration. Production still requires private S3-compatible object storage, authenticated streaming, checksum-verified Worker materialization, and completed recovery/scale rehearsals.
- OMR and audio transcription remain probabilistic and require candidate review. They must not be presented as guaranteed-accurate conversion.
- Full MuseScore/Flat-level engraving, mature multi-user classroom/LMS workflows, production collaboration scale, and the 200-score regression corpus are still in progress.
- Production release, Search Console verification, backup/restore drills, centralized observability, load testing, and final legal/security sign-off remain release blockers.

See [the commercial development plan](docs/music-notation-platform-development.md) for the authoritative completion criteria.

## Prerequisites

- Node.js 22 or later
- npm 10 or later
- Optional: Docker Desktop for the local infrastructure topology
- Optional music engines: Audiveris, Python/music21, MuseScore CLI, FluidSynth plus a licensed SoundFont, ffmpeg/ffprobe, Basic Pitch, and yt-dlp

Engine command paths and timeouts are configured through the API and worker environment files. Do not commit production secrets or licensed SoundFont files.

## Local Setup

Install the locked dependency graph:

```powershell
npm ci
```

Create local environment files from the tracked examples:

```powershell
Copy-Item apps/www/.env.example apps/www/.env.local
Copy-Item apps/app/.env.example apps/app/.env.local
Copy-Item services/api/.env.example services/api/.env
Copy-Item services/worker/.env.example services/worker/.env
Copy-Item services/collaboration/.env.example services/collaboration/.env
```

Replace all placeholder secrets before testing admin, payment, email, or metrics routes. For local development, start each process in its own terminal:

```powershell
npm run dev:api
npm run dev:worker
npm run dev:collaboration
npm run dev:www
npm run dev:app
```

Open `http://localhost:3000` for the website and `http://localhost:3001` for the product app.

## Quality Gates

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
npm run security
```

`npm test` runs encoding checks plus unit and integration suites. Browser E2E expects production builds and starts isolated services on `127.0.0.1:43100-43102`. On Windows, Docker or proxy software must not reserve those ports.

GitHub Actions under `.github/workflows` run quality, build/release verification, browser E2E, dependency review, npm audit, and CodeQL checks. A workflow file being present is not evidence that the remote branch protection or CI run is green.

## Release Traceability

After a successful full build:

```powershell
npm run release:manifest
npm run release:verify
```

The generated, ignored `artifacts/release-manifest.json` records the Git commit/dirty state, package versions, lockfile hash, database schema version, Score JSON schema version, and SHA-256 hashes of compiled artifacts. CI rejects a release manifest generated from a dirty checkout.

## Key Documentation

- [Commercial development and acceptance plan](docs/music-notation-platform-development.md)
- [US-first Cloudflare production plan](docs/deployment/cloudflare-us-first.md)
- [Executable Cloudflare deployment runbook](deploy/cloudflare/README.md)
- [Backend deployment topology](deploy/backend/README.md)
- [Module documentation](docs/modules/)
- [Two-mode score workspaces production release (2026-10-07)](docs/deployments/score-workspaces-2026-10-07.md)
- [Change log](CHANGELOG.md)

## Release Policy

The Hetzner production service is live; the current two-mode score workspaces release is documented above with its validation and rollback procedure. Do not label the platform "100% commercial-ready" until the final checklist, clean Git release, CI, production infrastructure, security, recovery, legal, and product-owner acceptance are all complete.
