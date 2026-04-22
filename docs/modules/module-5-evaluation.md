# Module 5 Evaluation

## Purpose

Keep Module 5 heuristic changes measurable so each OMR tweak can be checked against a stable sample set before promotion.

## Sample buckets

- `samples/clean/`: should remain `final`
- `samples/draft/`: should remain `draft`
- `samples/fail/`: should never become `final`

## Evaluation outputs

- `samples/generate-fixtures.mjs`: regenerates copied and composed sample PDFs
- `samples/reports/latest.json`: machine-readable latest snapshot
- `samples/reports/latest.md`: human-readable latest summary
- `samples/reports/history/`: timestamped report history for change tracking
- `samples/.runs/`: ignored temporary runtime data for each local evaluation run

## Command

```bash
npm run generate:samples
npm run evaluate:samples
```

## Current checks

- 20 tracked fixtures across clean / draft / fail
- single-page, multi-page, and multi-staff composed layouts
- `sourceKind` tagging so copied local uploads and composed fixtures are distinguishable in the manifest
- expected `final` vs `draft` outcome per sample
- preview hash changes between runs
- note count, rest count, barline count, and promotion score capture when available
- category-level summary across clean / draft / fail buckets

## Near-term expansion

- add real-world multi-page PDFs
- add denser multi-staff piano and choir layouts
- split accidental, duration, and sequencing regressions into dedicated fixtures
