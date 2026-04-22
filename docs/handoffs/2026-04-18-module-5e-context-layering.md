# 2026-04-18 Module 5E Context + Layering

## What changed

- expanded `samples/` from 5 fixtures to 20 fixtures
- added `samples/generate-fixtures.mjs` so copied and composed sample PDFs can be regenerated
- added multi-page and multi-staff fixtures for evaluation
- updated worker heuristics with:
  - page/staff confidence layering
  - basic barline detection
  - rest-component scanning
  - measure-context accidental carry
  - measure-context duration downgrades for implausible whole/half notes

## Important files

- `services/worker/src/index.ts`
- `services/worker/src/evaluate-samples.ts`
- `samples/manifest.json`
- `samples/generate-fixtures.mjs`
- `samples/reports/latest.md`
- `docs/modules/module-5-status.md`
- `docs/modules/module-5-evaluation.md`

## Current evaluation baseline

- `npm run generate:samples`
- `npm run evaluate:samples`
- `npm run typecheck`
- `npm run build`

Latest sample summary:

- clean: `11/11`
- draft: `6/6`
- fail: `3/3`

## Current known gaps

- `barline-rest-context` still stays `draft`
- the current rest detector does not yet confidently pick up the synthetic rest rectangles in that fixture
- staff-level confidence layering works, but page/staff ordering on dense real-world scores still needs better coverage

## Best next steps

1. improve rest classification with targeted fixtures that separate rest glyphs from noteheads and barlines more clearly
2. add real user PDFs once available to replace or supplement the composed multi-page / multi-staff fixtures
3. use measure boundaries to start barline-aware beaming and stronger duration normalization
