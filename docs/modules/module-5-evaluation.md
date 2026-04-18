# Module 5 Evaluation

## Purpose

Keep Module 5 heuristic changes measurable so each OMR tweak can be checked against a stable sample set before promotion.

## Sample buckets

- `samples/clean/`: should remain `final`
- `samples/draft/`: should remain `draft`
- `samples/fail/`: should never become `final`

## Evaluation outputs

- `samples/reports/latest.json`: machine-readable latest snapshot
- `samples/reports/latest.md`: human-readable latest summary
- `samples/reports/history/`: timestamped report history for change tracking
- `samples/.runs/`: ignored temporary runtime data for each local evaluation run

## Command

```bash
npm run evaluate:samples
```

## Current checks

- expected `final` vs `draft` outcome per sample
- preview hash changes between runs
- note count and promotion score capture when available
- category-level summary across clean / draft / fail buckets

## Near-term expansion

- add real-world multi-page PDFs
- add denser multi-staff piano and choir layouts
- split accidental, duration, and sequencing regressions into dedicated fixtures
