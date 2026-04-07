# Development Handoff - 2026-04-07 - Module 5D Splitting

## Scope completed

This pass continued Module 5D and focused on the first connected-cluster splitting slice:

- candidate seed extraction inside wider connected components
- tighter local notehead-core search around each seed
- stronger final gating using minimum spacing confidence

## Files changed

- `services/worker/src/index.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/handoffs/2026-04-07-module-5d-splitting.md`

## Implementation summary

### 1. First-pass connected-cluster splitting

Added `collectNoteheadSeeds(...)` in `services/worker/src/index.ts`.

Purpose:

- when a connected component contains glued notehead + stem + accidental content, try to infer multiple notehead seed positions instead of assuming the whole component is one note

Current seed logic uses:

- x-axis dark-pixel profile inside the component
- local smoothed peaks
- nearby `staff.noteCandidateColumns`
- seed spacing limits to avoid duplicate seed centers

### 2. Focused core refinement

Updated `refineNoteheadCore(...)` so the local search stays centered around a chosen seed, rather than scanning the entire component equally.

Effect:

- multiple seeds inside a wider connected component are more likely to produce different refined notehead cores

### 3. Wider component acceptance before splitting

The raw connected-component pass now allows wider components before rejection, so a cluster can be split instead of being discarded too early.

### 4. Safer final promotion

Added a minimum `spacingConfidence` requirement to final promotion.

Reason:

- connected dense samples were still sometimes generating too many tokens
- spacing confidence is now used as a brake so obviously unstable sequences are more likely to stay in `draft`

## Validation completed

Commands passed:

- `npm run typecheck`
- `npm run build`

### Verification 1: clean sample

- job id: `43310f76-e76a-4fd9-9f2c-838b17649d1f`
- result: `final`
- output: `E:\AI WEB\21.wuxianpu\services\api\storage\16008ff2-6494-4d78-9182-cbaae09b38a4\jobs\43310f76-e76a-4fd9-9f2c-838b17649d1f\verify-5d-clean-numbered-omr.pdf`

### Verification 2: dense connected sample

- job id: `639478ab-03bb-491f-b11c-272834585a23`
- result: `draft`
- output PDF: `E:\AI WEB\21.wuxianpu\services\api\storage\16008ff2-6494-4d78-9182-cbaae09b38a4\jobs\639478ab-03bb-491f-b11c-272834585a23\verify-5d-splitting-v2-draft.pdf`
- draft bundle: `E:\AI WEB\21.wuxianpu\services\api\storage\16008ff2-6494-4d78-9182-cbaae09b38a4\jobs\639478ab-03bb-491f-b11c-272834585a23\verify-5d-splitting-v2-draft-bundle.zip`

This second result is important: the sample still over-detects, but it no longer gets over-promoted to `final`.

## Current limitations

- splitting is still seed-based, not true symbol segmentation
- dense beamed clusters still produce too many candidate tokens
- spacing confidence is a safeguard, but not yet a full sequence-quality model

## Recommended next step

Continue Module 5D with:

1. component subdivision using valleys and sub-bounding boxes, not only seed centers
2. better rejection of barlines and text-like fragments before pitch mapping
3. sequence smoothing after left-to-right candidate ordering
