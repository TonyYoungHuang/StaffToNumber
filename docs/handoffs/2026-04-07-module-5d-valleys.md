# Development Handoff - 2026-04-07 - Module 5D Valleys

## Scope completed

This pass continued the Module 5D splitting track and added the first valley-based sub-bounding-box subdivision layer.

## Files changed

- `services/worker/src/index.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/modules/module-5-status.md`
- `docs/handoffs/2026-04-07-module-5d-valleys.md`

## Implementation summary

### 1. Valley-based subdivision

Added:

- `tightenComponentBounds(...)`
- `subdivideComponentByValleys(...)`

Purpose:

- split a wide connected component into narrower subcomponents before local notehead seed detection
- use x-axis density valleys as early cut points
- recursively subdivide a component up to a shallow depth instead of treating the whole cluster as one box

### 2. Integration with existing splitting flow

The candidate pipeline now runs in this order:

1. connected component detection
2. optional valley-based subdivision
3. per-subcomponent notehead seed extraction
4. per-seed local notehead-core refinement

This is more structured than the previous seed-only pass.

### 3. Confidence update

Candidate confidence is now computed from:

- subcomponent shape
- subcomponent density
- candidate-column alignment
- refined core shape
- refined core roundness
- seed score
- a small subdivision bonus when a large cluster is successfully split

## Validation completed

Commands passed:

- `npm run typecheck`
- `npm run build`

### Verification 1: valley clean sample

- job id: `d3a9d86d-d804-4177-aa29-4a34a86d9612`
- result: `final`
- output: `E:\AI WEB\21.wuxianpu\services\api\storage\16008ff2-6494-4d78-9182-cbaae09b38a4\jobs\d3a9d86d-d804-4177-aa29-4a34a86d9612\verify-5d-valley-clean-numbered-omr.pdf`

### Verification 2: valley dense sample

- job id: `c0993dc4-9747-4339-a6ca-90737206cd3b`
- result: `draft`
- output PDF: `E:\AI WEB\21.wuxianpu\services\api\storage\16008ff2-6494-4d78-9182-cbaae09b38a4\jobs\c0993dc4-9747-4339-a6ca-90737206cd3b\verify-5d-valley-dense-draft.pdf`
- draft bundle: `E:\AI WEB\21.wuxianpu\services\api\storage\16008ff2-6494-4d78-9182-cbaae09b38a4\jobs\c0993dc4-9747-4339-a6ca-90737206cd3b\verify-5d-valley-dense-draft-bundle.zip`

Interpretation:

- the clean sample still promotes to `final`
- the dense sample still stays in `draft`
- this means the new subdivision layer did not destabilize the safer promotion behavior

## Current limitations

- valleys are only x-axis cuts; they do not yet use full 2D segmentation
- clustered beamed notes still over-generate tokens on dense samples
- the clean sample still shows some pitch/token inaccuracies, so splitting is better but not yet musically reliable

## Recommended next step

Continue Module 5D with:

1. reject text-like fragments and accidental-only fragments before pitch mapping
2. sequence smoothing after left-to-right ordering
3. optional vertical subdivision for stacked or overlapping clusters
