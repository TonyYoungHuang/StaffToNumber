# 2026-04-18 Module 5E Samples + Sequencing

## What changed

- added a repeatable sample evaluation framework under `samples/`
- added `services/worker/src/evaluate-samples.ts` to run worker regressions against the sample manifest
- continued Module 5 recognition work with:
  - stronger fragment filtering
  - sequence smoothing for pitch and duration outliers
  - multi-page aggregation for up to three PDF pages
  - more conservative accidental classification rules

## Files to read first

- `README.md`
- `CHANGELOG.md`
- `docs/modules/module-5-status.md`
- `docs/modules/module-5-evaluation.md`
- `samples/manifest.json`
- `samples/reports/latest.md`
- `services/worker/src/index.ts`
- `services/worker/src/evaluate-samples.ts`

## Current validation baseline

- `npm run evaluate:samples`
- `npm run typecheck`
- `npm run build`

Current sample status after the latest run:

- clean: `2/2` matched
- draft: `2/2` matched
- fail: `1/1` matched

## Current Module 5 behavior

- text-layer PDFs still short-circuit to `final` when note letters are parseable
- image-style PDFs now run page-by-page OMR, then combine page previews into one result
- draft bundles now include page screenshots for every processed page and page-level OMR diagnostics in `draft.json`

## Best next steps

1. add real-world multi-page sample PDFs and keep them in the manifest
2. improve barline and rest rejection so accidentals and durations can use measure context
3. separate sample fixtures for accidental-heavy pages and dense rhythm pages
4. start ranking page/staff confidence so weak pages can stay diagnostic-only without dragging down strong pages
