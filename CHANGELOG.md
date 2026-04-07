# Changelog

All notable project updates are recorded here.

## 2026-04-07

### Changed

- continued Module 5D with first-pass connected-cluster splitting for glued notehead/stem/accidental components
- tightened final promotion gating with a minimum spacing-confidence check
- verified that a dense connected synthetic sample now stays in `draft` instead of being over-promoted to `final`

### Verified

- `npm run typecheck`
- `npm run build`
- clean synthetic verification job: `43310f76-e76a-4fd9-9f2c-838b17649d1f`
- dense connected synthetic verification job: `639478ab-03bb-491f-b11c-272834585a23`

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
