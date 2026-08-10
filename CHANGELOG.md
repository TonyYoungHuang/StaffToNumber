# Changelog

- schema v20 LTI 1.3 registration, one-time OIDC state, verified launch capabilities, NRPS/AGS sync timestamps, and platform diagnostics
- schema v19 Stripe/Paddle customer, subscription, invoice, webhook ledger, refund, and school-seat lifecycle
- schema v18 resumable upload sessions and checksummed multipart state for local and S3 storage
- schema v17 SQLite trigger outbox for continuous idempotent PostgreSQL mirroring

All notable project updates are recorded here.

## 2026-07-17

### Added

- a private Docker Compose observability overlay with Prometheus API metrics, four API alerts, Alertmanager secret-file routing, Loki centralized Docker logs, Grafana Alloy collection, locked-down Grafana provisioning, and an on-call runbook
- schema v16 transaction outbox triggers for newly queued and retried legacy/score jobs, with atomic claims, stale dispatch replay, exponential publication retry, and broker status reporting
- BullMQ API publishing and Worker consumption with stable dispatch identities, crash-safe same-dispatch recovery, production enforcement, and atomic legacy job claiming
- configurable SQLite migration lock timeout plus command-level schema v16 migration and protected rollback evidence
- an independent SQLite/PostgreSQL shadow parity command with repeatable-read snapshots, shared migration locking, per-table checksums, drift reports, and fail-closed exit status

### Changed

- made production Redis durable for broker workloads with AOF every-second fsync, `noeviction`, a 1 GB memory ceiling, and a persistent Compose volume
- made OMR browser fixtures use real activation APIs and one retryable caller-managed transaction, and made comment resolution prefer the canonical updated comment over a stale list snapshot

### Verified

- real Redis 7.4 outbox publication, BullMQ delivery, crash/retry recovery without double-counting business attempts, and AOF restart persistence
- real PostgreSQL 17 migration and rollback of the schema v16 consistent snapshot: 53 tables and 202 rows with per-table count/checksum equality
- real PostgreSQL 17 shadow verification of 53 tables and 205 rows, including an intentionally corrupted row that correctly failed parity before restoration
- 252 unit/integration tests, 19 Playwright E2E scenarios, 365-file encoding audit, 363-file repository lint, zero high-severity npm vulnerabilities, production builds, and a verified release manifest

## 2026-07-16

### Added

- canonical score collaboration commands for note patch, note insertion, event deletion, batch editing, and event reordering
- database schema v4 command ledger, collaboration snapshot registry, share identity labels, and annotation resolution evidence
- atomic merging of stale but disjoint score commands, fail-closed same-target/history conflicts, and actor-bound idempotency
- owner and edit-share command APIs plus a permission-aware VexFlow editor on shared score pages
- browser coverage proving owner edits and edit-share edits persist canonical operations while view shares remain read-only
- structured concurrent-edit resolution with server revision context, conflicting operation identities, load-latest, and explicit reapply actions
- a token-free IndexedDB command queue with hashed score/share scopes, bounded ordered persistence, reconnect replay, and conflict handoff
- actor-owned shared undo and redo operations that selectively reverse stable event changes without restoring an entire historical score snapshot
- owner and edit-share history APIs, command-list capability metadata, editor controls, and standard undo/redo keyboard shortcuts
- bounded, restart-safe Yjs persistence using fresh compacted documents, configurable operation/conflict retention, and auditable snapshot metadata
- named comment-share workspaces with OSMD note targeting, server validation, owner resolution/reopen controls, and view-share privacy boundaries
- server-derived account/share-link identity metadata for canonical commands and comments, with explicit verification levels and masked account email display
- server-side reconciliation and duplicate removal for overlapping operations merged after offline reconnect
- a 20-editor authenticated WebSocket convergence gate with retained performance evidence and disconnect/reconnect conflict coverage
- Redis 7.4 multi-instance coordination for Yjs document updates and Awareness, production startup enforcement, and a real two-server integration gate
- schema v5 classroom resources with folders, tags, search, staff/class visibility, immutable version chains, and archival
- scheduled and cancellable classroom notifications with recipient/read counts and student publication boundaries
- a teacher-to-student browser workflow covering roster linkage, resource v2 publication, notification scheduling/read receipts, and LMS draft integrity
- schema v6 organizations, campuses, member roles, classroom staff, invitation claiming, and owner/admin placement boundaries
- schema v7 student invitation lifecycles, guardian relationships, independent guardian notification receipts, and transactional 500-row roster imports
- teacher UI for pending student claims, spreadsheet roster paste, guardian invitation/removal, plus a guardian view of assignments, grades, feedback, resources, and notices
- schema v8 classroom resource files with verified upload, immutable file versions, authenticated download metadata, and file-reference indexes
- teacher file-resource upload/version controls and student/guardian protected downloads for PDF, image, MusicXML/MXL, Score JSON, MIDI, audio, and video resources
- schema v9 resource restore provenance plus staff version-history and immutable restore APIs
- teacher resource-history UI with historical file inspection and restore-as-new-version controls
- schema v10 hierarchical classroom resource folders, immutable folder moves, cross-class resource reuse provenance, and active sibling-name uniqueness
- teacher resource-library controls for nested folder creation, empty-folder archival, versioned moves, and reuse into a selected target folder
- transactional classroom folder rename and subtree relocation with cycle, depth, and sibling-conflict protection plus immutable path versions for every affected current resource
- schema v11 student-scoped classroom resource grants bound to immutable version groups, with guardian inheritance and server-side list/download enforcement
- teacher roster checkboxes for classroom, selected-student, and staff-only resource visibility across link, upload, and new-version workflows
- schema v12 auditable student exit requests with withdrawal, guardian approval/rejection, and atomic roster archival
- bilingual student and guardian exit controls with server-side ownership checks and teacher-visible request history
- schema v13 opt-in classroom email preferences and a persistent notification delivery outbox
- atomic email delivery claiming, Resend idempotency keys, stale-lock recovery, exponential retry, dead-letter history, and teacher retry controls
- bilingual student notification settings plus teacher delivery counts for queued, sent, and failed announcement emails
- schema v14 classroom resource retention policies with minimum-version guarantees, per-version holds, candidate previews, and metadata-preserving content purges
- teacher retention controls for policy editing, safe previews, manual cleanup, and historical-version holds
- schema v15 file storage metadata, a shared local/S3 storage package, private authenticated streaming, and checksum-verified Worker materialization
- a claim-safe local-to-S3 migration command with dry-run, byte/checksum validation, optional local cleanup, and JSON rollback evidence
- a persistent object-deletion outbox with atomic claims, stale-lock recovery, exponential retry, and system-status visibility
- a transaction-safe SQLite-to-PostgreSQL migration tool with schema reconstruction, batched copying, per-table row/checksum verification, advisory locking, and JSON evidence
- an exact-schema-confirmation PostgreSQL rollback command that reports removed tables and rows before deleting only the migrated candidate schema

### Changed

- routed official graphical editing through the canonical command layer while retaining candidate-safe legacy revision endpoints during OMR review
- broadcast server operation and revision identities to Yjs instead of synthesizing replacement identifiers in the product app
- refreshed shared MusicXML, Jianpu, playback revision, and score state after a successful shared graphical edit
- preserved typed API error payloads so product flows can act on structured `409` conflicts instead of flattening them into messages
- stopped completed candidate jobs from repeatedly replacing newer official score state when their source revision is already known
- recorded each offline replay against its actual request base revision while rebasing subsequent queued commands on the latest server revision
- derived history operations from exact before/after revisions, preserved later disjoint collaborator changes, and failed closed when the same event changed afterward
- persisted undo/redo as immutable `history.undo` and `history.redo` command-ledger entries with revision, asset-staleness, idempotency, ownership, conflict, and Yjs broadcast metadata
- refreshed remote score state only for the operation matching the collaboration document's current revision, so retained compacted history is never replayed after reconnect
- discarded malformed client-supplied operation and conflict values while compacting persistence, retaining only conflicts whose operations remain in the bounded snapshot
- labeled Awareness presence as unverified while overlaying canonical operation history with server-derived identities
- included comment identity, target, and resolution data plus share labels in account portability exports
- generated unique collaboration replica identities by hostname and process unless an orchestrator injects a per-replica identifier
- disabled the incompatible ioredis ready-check on duplicated subscriber connections while retaining bounded retry behavior
- stopped unverified LMS provider/course mappings from claiming `configured`; all mappings remain drafts until real OAuth/LTI verification
- refreshed classroom operations immediately after same-page classroom creation or archival
- extended privacy export and account deletion to organization ownership transfer, classroom staff, guardians, and guardian receipts without foreign-key dead ends
- transferred classroom-referenced files to the classroom owner when an uploader account is deleted, retained their physical data, and excluded referenced resources from orphan cleanup
- increased the high-load OMR/VexFlow browser suite timeout while retaining wait-for-in-flight proxy teardown
- omitted JSON content-type headers from bodyless product API requests so Fastify accepts authenticated DELETE workflows
- assigned a stable accessible name to the current-classroom selector so it remains distinct from cross-class reuse controls
- downgraded selected-student resources to staff-only during cross-class reuse so source classroom identities never leak into the target classroom
- transferred resource-grant authorship during account deletion and included relevant grants in account portability exports
- cancelled queued email deliveries on opt-out or announcement cancellation and included notification preferences/delivery history in privacy lifecycle handling
- retained classroom resource metadata and immutable version ancestry after content expiry while deferring physical file deletion to global orphan-reference cleanup
- included retention policies in account portability, classroom deletion, and ownership-transfer handling
- routed API uploads, generated assets, classroom files, OMR/audio inputs, and Worker render outputs through the same storage contract
- made production API and Worker startup require S3 while retaining local storage for development and deterministic tests
- returned a stable retryable 503 contract for object-storage upload failures and made server-side encryption provider-configurable

### Verified

- 244 unit and integration tests across storage, API, worker, collaboration, website, and product app, plus encoding audit coverage for 347 text files and repository lint coverage for 345 text files
- 19 Playwright E2E tests including the teacher-to-student classroom workflow, named comment-share note annotations and owner resolution, canonical owner/edit-share persistence, view-share authorization, both conflict resolution actions, offline queue reconnect, shared undo/redo preserving collaborator edits, 100-page virtualization, and the 20,000-note performance gate
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run security`, and release manifest verification
- release manifest verification for 728 compiled artifacts, database schema 15, and Score JSON schema 2
- browser verification that an organization admin cannot detach an owner classroom, observers cannot write, assistants cannot archive, guardians and students keep independent read receipts, and unregistered roster entries remain pending claims
- browser verification that a teacher can upload and replace a MusicXML classroom resource while anonymous access is denied and observer, guardian, and student identities download only authorized versions
- browser verification that restoring C4 v1 after D4 v2 creates traced v3, observers can inspect but not restore history, and guardians/students receive only current v3
- browser verification that moving a resource creates immutable v3, emptied folders can be archived, non-empty folders return conflict, observers cannot create folders or move resources, and cross-class reuse preserves the shared file and source identity
- browser verification that parent-folder rename, subtree relocation, and explicit resource movement advance the affected resource from v2 through v5 while historical paths remain immutable and observer/cycle updates are rejected
- browser verification that selected resources reach only the chosen student and that student's guardian, direct downloads by unselected students return 404, observers remain read-only, and cross-class reuse becomes staff-only
- browser verification that unrelated students cannot decide an exit request and guardian approval removes the classroom from both student and guardian views
- browser verification that classroom email is opt-in, preferences persist, a new announcement creates the intended student's queued outbox delivery, observers cannot retry failures, and teachers can requeue dead-letter deliveries
- browser verification that an administrator can enable a 30-day classroom retention policy, preview exactly one eligible historical version, purge its content, and retain its non-restorable audit record
- real MinIO verification for bucket health, private upload, Head, download, SHA-256 materialization, and deletion, plus mock coverage for encryption, provider failure, migration, and durable deletion retry
- real PostgreSQL 17 verification for BLOB fidelity, partial uniqueness, foreign keys, rejected unsafe rollback, and successful rollback, plus a 52-table/200-row schema v15 command-level migration and rollback rehearsal
- restart, retention-threshold, conflict-retention, malformed-value, snapshot hash/size, and current-revision reconnect coverage for compacted Yjs persistence
- real Redis container verification for bidirectional document updates and Awareness across two Hocuspocus instances, plus 20 independently authenticated concurrent editors converging in 70.90 ms under a 10-second hard limit

## 2026-07-15

### Added

- MusicXML and Score JSON v2 platform workflows for structured import, editing, transposition, staff/Jianpu conversion, playback, and persistent export jobs
- Audiveris candidate review data, source/recognized score comparison, confidence evidence, symbol geometry, and OMR artifact retention foundations
- VexFlow score editing layer with measure interaction, note insertion/deletion, clipboard and keyboard operations, multiple voices, modifiers, and layout helpers
- MuseScore, music21, FluidSynth/SoundFont, ffmpeg, Basic Pitch, and yt-dlp command integration points with production configuration gates
- first-stage recording practice, classroom/student, Yjs collaboration, support, privacy, security audit, and copyright complaint operations
- public feature SEO metadata, input/output examples, FAQ/HowTo/Breadcrumb structured data, OG routes, sitemap, robots, and SEO administration/audit surfaces
- GitHub Actions for repository quality, build/release verification, browser E2E, dependency review, npm audit, and CodeQL analysis
- explicit database schema versioning and a release manifest that hashes compiled artifacts and records Git, lockfile, database, and Score JSON versions
- semantic VexFlow note hit targets carrying stable event, part, measure, staff, and voice identity for pointer, keyboard, accessibility, and browser automation
- VexFlow key-signature rendering for the full MusicXML fifths range with inherited part context at new systems
- page and system scoped VexFlow rendering with content/selection fingerprints and retained semantic hit geometry for unaffected systems
- MusicXML export/reimport browser coverage for an edited SATB score, including authenticated download and editable project reopen
- structural PDF/SVG/PNG worker validation with real PDF page-tree counts and corrupt-file rejection
- viewport-driven VexFlow page virtualization with stable 100-page placeholders and bounded mounted systems and hit targets
- a 5,000-measure and 20,000-note Chromium performance gate with timing, heap, DOM, mounted-page, system, and hit-target budgets plus a retained JSON report

### Changed

- replaced the legacy PDF-to-Jianpu README with the current architecture, local setup, quality gates, release traceability, and honest commercial boundaries
- split automated tests into unit, integration, and browser E2E gates while retaining the complete default test suite
- strengthened repository linting with encoding, JSON, merge-marker, focused-test, and package metadata checks
- updated public legal/product wording from a single-purpose converter to the actual MusicXML-first notation platform
- made OMR job claiming and candidate publication atomic, cancellable, timeout-aware, and idempotent across worker races
- fixed quarter-step duration form validation that prevented common OMR note corrections from submitting
- isolated Playwright web servers from stale local Next.js processes by disabling server reuse on dedicated E2E ports
- calibrated Audiveris symbol overlays through explicit page-image dimensions, crop/rotation transforms, non-contiguous page numbering, and mismatch warnings
- added shared 50%–200% source/OSMD zoom, bidirectional proportional scrolling, and score-to-source symbol focus in candidate review
- promoted the graphical editor browser matrix from a single HTTP smoke test to real note drag and keyboard edits for solo melody, piano grand staff, SATB four voices, and Bb clarinet written pitch
- split multi-page notation rendering into independently memoized system SVGs so editing one system does not redraw sibling systems on the same or another page
- hardened VexFlow pointer gestures so selection-only clicks never create pitch revisions and only a real pointer move crossing the drag threshold can submit an edit
- replaced rendered PDF file-count metrics with parsed document page counts and fail closed when MuseScore output is malformed
- kept scores of four pages or fewer fully mounted while virtualizing larger scores, and made Playwright route teardown wait for in-flight API proxies
- deferred complete OSMD rendering for large scores and replaced tens of thousands of correction-panel options with indexed selectors that retain random access

### Verified

- 199 unit and integration tests across API, worker, collaboration, website, and product app, plus encoding audit coverage for 318 text files
- eleven Playwright E2E tests covering the copyright complaint lifecycle; OMR candidate correction, undo/redo, acceptance, rejection, confidence evidence, revision integrity, shared review zoom/scroll, score-to-source focus, and a four-CSS-pixel symbol-overlay geometry gate; revision-backed solo, piano, SATB, and Bb transposing-instrument graphical edits; system-scoped redraw isolation; bounded navigation and selection across deterministic 100-page and 20,000-note scores; plus edited SATB MusicXML export, download, reimport, semantic comparison, and editable reopen
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run security`, and release manifest verification
- production builds for 27 public website routes and 21 product application routes

## 2026-04-18

### Added

- Module 5 sample evaluation framework under `samples/clean`, `samples/draft`, `samples/fail`, and `samples/reports/`
- `services/worker/src/evaluate-samples.ts` to run worker regressions against the tracked sample manifest
- `docs/modules/module-5-evaluation.md` to document the sample/evaluation workflow
- `samples/generate-fixtures.mjs` to regenerate copied and composed multi-page / multi-staff sample PDFs

### Changed

- continued Module 5D into early Module 5E with stronger fragment filtering and sequence smoothing
- stabilized pitch, duration, and accidental heuristics in `services/worker/src/index.ts`
- extended the worker to aggregate up to three PDF pages into one OMR preview
- added page/staff confidence layering so weak pages can stay diagnostic-only without blocking strong pages
- added first-pass barline detection and measure-context smoothing for accidental/duration stabilization
- expanded the tracked sample set to 20 fixtures, including multi-page and multi-staff cases
- stabilized `restCount` on the targeted `barline-rest-context` fixture and surfaced rest/bar counts in sample evaluation output
- updated repository docs to reflect the sample framework and current Module 5E focus

### Verified

- `npm run generate:samples`
- `npm run evaluate:samples`
- `npm run typecheck`
- `npm run build`

## 2026-04-07

### Changed

- continued Module 5D with first-pass connected-cluster splitting for glued notehead/stem/accidental components
- continued Module 5D with first valley-based sub-bounding-box subdivision before local notehead-core extraction
- tightened final promotion gating with a minimum spacing-confidence check
- verified that a dense connected synthetic sample now stays in `draft` instead of being over-promoted to `final`

### Verified

- `npm run typecheck`
- `npm run build`
- clean synthetic verification job: `43310f76-e76a-4fd9-9f2c-838b17649d1f`
- dense connected synthetic verification job: `639478ab-03bb-491f-b11c-272834585a23`
- valley clean verification job: `d3a9d86d-d804-4177-aa29-4a34a86d9612`
- valley dense verification job: `c0993dc4-9747-4339-a6ca-90737206cd3b`

## 2026-04-06

### Added

- formal docs index under `docs/`
- handoff archive structure under `docs/handoffs/`
- module tracking note under `docs/modules/`
- Module 5C handoff archive copy
- Module 5D handoff note

### Changed

- upgraded `services/worker/src/index.ts` to Module 5D prototype
- refined notehead core extraction for image-style staff PDFs
- added stronger symbol-noise filtering and structured promotion scoring
- updated `README.md` to reflect Module 5D progress

### Verified

- `npm run typecheck`
- `npm run build`
- local synthetic worker verification for Module 5D final promotion
