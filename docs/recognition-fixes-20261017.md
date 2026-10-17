# Recognition fixes: implementation and later release

This branch prepares the three recognition fixes. It does not deploy services,
change a real environment file, apply production migrations, or contact a server.
The capacity target is the shared CX33: 4 vCPU and approximately 7.56 GiB usable
RAM, including CTCSOL and the other services. There is no 16 GiB assumption.

## Admission and memory ownership

The free structure inspection returns a versioned memory assessment, lane,
reason codes and waiting estimate. The staged upload binds that assessment to
the authenticated owner, byte count and SHA-256. Draft preparation reassesses
the source. Its server-written source asset metadata stores the snapshot;
checkout and recognition start read that metadata rather than accepting a
client's lane or memory estimate. Unsupported inputs are rejected before the
draft's checkout and before credit reservation.

When enabled, the broker carries the persisted `normal` or `big` lane and the
worker rejects a mismatched lane. The big lane owns every shared engine slot
for the whole recognition job; therefore only one big task runs and normal
recognition/exports cannot overlap it. Existing command-level gates remain for
other work. A private live lease token avoids charging the same reservation
again inside a job. The Linux holder uses `flock` with no stale-time takeover:
EOF, process exit or a crash releases its slots. Child commands must find the
matching token on a currently locked slot. Losing the holder cancels the job.

Recognition dispatch uses one broker attempt. A second delivery never reclaims
a processing job. The only engine-level resource fallback is the durable,
at-most-once normal-to-big escalation. Existing cancellation, byte/pixel limits,
malware scanning, ownership checks and storage limits remain active.

The default feature flags are false. Existing concurrency values and service
memory limits in the examples have not been changed. A big job is rejected if
its required lane is disabled; it never silently runs without its lease.

## Results and credit settlement

All successful XML/MXL roots and OMR projects are enumerated. Local opus
references are bounded and cannot traverse outside the package/job directory,
fetch URLs or form cycles. Existing 1,000-entry, 50 MiB archive and 20 MiB XML
limits remain. Timewise MusicXML is converted to partwise while preserving
measure children. A malformed sibling is isolated from valid scores.

Original candidates remain document-level assets. A versioned result manifest
in the original job's JSON records their server file IDs, source pages,
relationships and current selection. There is still one editable pending
revision. Equal content can share a file while retaining separate provenance
assets. Case, whitespace, punctuation, full-width forms and export-copy suffixes
do not block title grouping. Different pieces remain alternatives in the same
project. Raw results survive unsuccessful automatic assembly.

Later time/resource exhaustion delivers the earlier readable pages, with
missing pages and coverage gaps shown explicitly. Settlement runs in the same
transaction as candidate publication: quoted credits × delivered unique pages
÷ source pages, rounded down to four decimal places. The original quote stays
in the job; the server also stores `settledCreditCost`, `creditsReturned` and a
validated settlement summary. Monthly and score-pass usage read that summary;
the prepaid ledger stores the actual fractional cost durably. Zero delivery
releases the reservation. Failed/cancelled work releases credits through the
existing status rules. No payment-provider refund is initiated.

Comparing, selecting, ordering, combining and renaming saved results creates
revisions, not recognition or export jobs, and costs zero credits. MusicXML
container imports use an explicitly zero-cost catalog record. Existing rendered
exports retain their existing prices. MusicXML assembly preserves XML subtrees
and rebuilds the preservation baseline before editing.

## Raster work

The optional pipeline preserves grayscale detail, crops/rectifies geometry,
and chooses bounded staff-spacing-based enlargement. At most three frozen
enhancement configurations are evaluated. For a PDF, only two sample pages
receive additional variants and the total recognition call budget is P + 4.
Selection uses structural/coverage, duration and confidence diagnostics; a
larger note count alone is insufficient. Heavy variants require the big lane.
Each original result retains variant geometry and quality metadata without
private scratch paths. The source image remains available for review. HOMR
remains an explicit offline evaluation option and is not the default engine.

## Required schema 28 migration

Existing JSON columns and TEXT job types store the result manifest. That part
requires no new table. Fractional prepaid settlement does require widening
`prepaid_credit_charges.credit_cost` from PostgreSQL INTEGER to
`NUMERIC(18,4)`. The prepared, repeatable SQL is
`deploy/hetzner/recognition-partial-credits-schema28.sql`. It has not been
applied to production. The API validates the numeric column before starting.
SQLite's existing INTEGER affinity already accepts fractional numbers; new
databases declare NUMERIC and the PostgreSQL importer preserves that type.

The existing positive-cost constraint is retained. A zero-cost settlement marks
the reservation released, rather than storing a zero amount. Existing historical
integer charges remain unchanged. Future migration verification should include
a backup/restore rehearsal and a fractional prepaid transaction on the target
PostgreSQL instance before enabling traffic.

## CX33 configuration for the later authorized release

| Setting | Committed default | Candidate CX33 value |
| --- | --- | --- |
| `RECOGNITION_LANES_ENABLED` | `false` | Enable only after whole-service qualification |
| `RASTER_ENHANCEMENT_ENABLED` | `false` | Enable after the offline raster regression is reviewed |
| `RECOGNITION_NORMAL_MAX_MB` | `1536` | `1536` MiB admission ceiling |
| `RECOGNITION_BIG_MAX_MB` | `2048` | `2048` MiB conservative initial ceiling |
| `RECOGNITION_BIG_HEAP_MB` | `768` | Qualify `1024` MiB; always at least 512 MiB below the big reservation ceiling |
| `RECOGNITION_CAPACITY_VERSION` | `cx33-conservative-v1` | Bump whenever the capacity policy changes |
| Normal concurrent jobs | Existing value unchanged | Start at 1; qualify 2 with CTCSOL active |
| Big concurrent jobs | Feature disabled | Exactly 1, exclusive of every shared engine slot |
| Audiveris normal Java heap | Existing value unchanged | Keep the existing 768 MiB initially |
| Shared native-memory margin | Existing value unchanged | At least 256 MiB, with observed host/cgroup headroom |

The memory estimate includes uncertainty and native overhead. A job estimated
above the configured big ceiling remains unsupported, even for paid users.
Raising that ceiling or a heap cap requires measuring the entire shared host;
the server's 7.56 GiB must not be treated as an isolated worker budget. These
are proposed later release settings, not changes to the live environment.

Set the new recognition settings consistently in the API and worker runtime
environment (`shared/runtime.env` in the current Compose layout). Merely putting
them in Compose's interpolation `.env` does not pass new variables into a
container. Keep the API, worker and engine wrapper on the same flags, capacity
version and shared lock directory; drain old in-flight work before changing the
lease protocol. The existing `NODE_OPTIONS=--max-old-space-size=192` and native
thread limits remain unchanged.

The synchronous PostgreSQL bridge now reuses one bounded response buffer per
database connection. Previously every SQL statement allocated another 64 MiB
buffer; long credit/account transactions could exhaust array-buffer memory.
Each request retains a separate completion signal, decoded responses are copied,
and a transport timeout closes the connection before any buffer reuse. Local
PostgreSQL regression checks repeated-query memory and response isolation.

Later release artifacts include worker/Python and engine wrapper, API/shared
runtime packages, app, and www. Apply and verify schema 28 before starting the
new API/worker; then verify normal processing, big exclusivity, payment return
to the same draft, alternative selection, partial settlement and credit-only
failure release. Keep both feature flags off until that verification is complete.
Customer raster samples remain outside Git in the private raster lab; only code,
synthetic regression fixtures and aggregate benchmark measurements belong here.

## Offline raster evidence

The 22 historical cases represent 18 source IDs and 15 unique binaries. The
main cohort covers 35 pages, including 20 music pages following covers. On the
same offline Audiveris 5.10.2 baseline, editable nonempty ScoreJSON coverage is
4/22 before enhancement, 14/22 with automatic enhancement, and 17/22 when two
human-selected photo quadrilaterals are included. The conservative structural
screen improves from 3/22 to 7/22; manual corners add no further passes there.
These are draft coverage measurements, not musical correctness or full-file
success rates. Dense multi-page inputs were sampled rather than fully certified.

The actual worker parser inspected every XML/MXL root in 60 successful variant
directories: 76 documents, 74 nonempty ScoreJSON documents, no parse failures,
and two empty documents. The offline engine used 2 CPUs, 2 GiB RAM and a 768 MiB
Java heap, with no network. All 18 customer originals retained their SHA-256.
HOMR, browser editing, playback, re-export accuracy, full host capacity and
production billing were not part of this benchmark. Private sample files and
detailed per-customer reports are intentionally outside the repository.
