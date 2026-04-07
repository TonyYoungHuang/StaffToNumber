# Online PDF Score Converter

Monorepo skeleton for the Online PDF Score Converter project.

## Project docs

- `CHANGELOG.md`: high-level delivery history
- `docs/README.md`: docs index
- `docs/handoffs/`: model-to-model development handoff notes
- `docs/modules/`: module progress snapshots and implementation notes

## Apps and services

- `apps/www`: SEO website
- `apps/app`: authenticated user web app
- `services/api`: backend API service
- `services/worker`: async conversion worker placeholder
- `packages/shared`: shared types and constants

## Getting started

```bash
npm install
npm run build -w @score/shared
npm run dev:www
npm run dev:app
npm run dev:api
npm run dev:worker
```

## Default ports

- `apps/www`: `http://localhost:3000`
- `apps/app`: `http://localhost:3001`
- `services/api`: `http://localhost:4000`

## Environment files

- root: `.env.example`
- SEO site: `apps/www/.env.example`
- user app: `apps/app/.env.example`
- API service: `services/api/.env.example`
- worker: `services/worker/.env.example`

## Module 1 scope

This repository currently contains the Module 1 foundation:

- workspace layout
- base TypeScript configs
- minimal Next.js shells for `www` and `app`
- minimal Fastify API server
- minimal worker entry
- shared package for common constants

## Module 2 status

Module 2 adds the first account flow:

- email registration
- email/password sign-in
- activation code redemption
- local SQLite persistence for users, sessions, activation codes, and entitlements
- app pages for register, login, activate, and dashboard

## Module 3 status

Module 3 adds file storage basics:

- PDF upload endpoint
- stored file metadata in SQLite
- authenticated file listing
- authenticated file download
- upload page in the app

## Module 4 status

Module 4 adds the task framework:

- jobs table and job API routes
- authenticated job creation, listing, and detail lookup
- worker polling and status transitions
- jobs page in the app
- placeholder worker outcome until Module 5 adds the real conversion engine

## Module 5 status

Module 5 now has four iterative recognition layers for `staff_pdf_to_numbered`:

- `5A`: text-layer heuristic extraction for PDFs that contain parseable note letters
- `5B`: first OMR preprocessing path that renders the first PDF page to an image, detects likely staff lines, finds notehead candidates, estimates pitch levels from staff spacing, and either upgrades the result to a numbered preview or packages diagnostics into a draft bundle
- `5C`: duration and basic-symbol prototype that adds notehead fill analysis, stem direction estimation, and first-pass dot / accidental / beam-like detection to enrich the numbered preview
- `5D`: structure-cleanup prototype that refines notehead cores, adds first-pass connected-cluster splitting, filters symbol noise more aggressively, and replaces the simple final-promotion rule with a structured promotion score

### Development seed code

The API seeds one activation code by default:

- `DEMO-1YEAR-ACCESS`

You can change it in `services/api/.env.example` or your local `.env`.
