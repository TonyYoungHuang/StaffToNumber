# Development Handoff - 2026-04-06 - Module 5C

## Purpose

This document records the work completed on 2026-04-06 so later models can continue development without re-reading the whole thread.

Project root:

- `E:\AI WEB\21.wuxianpu`

Current product direction:

- PC-first web product
- Main implemented pipeline: `staff_pdf_to_numbered`
- `numbered_pdf_to_staff` is still not implemented
- Transposition is postponed to a later independent module on the same website

## What Was Completed Today

Today focused on Module 5C: duration and basic-symbol recognition prototype for image-style staff PDFs.

Main result:

- the worker now performs a richer OMR analysis beyond pitch estimation
- the OMR preview now includes first-pass duration and symbol signals
- final vs draft judgment now uses stronger notehead analysis

## Files Changed Today

- `E:\AI WEB\21.wuxianpu\services\worker\src\index.ts`
- `E:\AI WEB\21.wuxianpu\README.md`

## Module 5C Changes in Detail

### 1. Richer note analysis model

Added new internal types in `services/worker/src/index.ts`:

- `DurationValue = "eighth" | "quarter" | "half" | "whole"`
- `NoteFillKind = "filled" | "open" | "uncertain"`
- `StemAnalysis`
- expanded `AnalyzedNotehead`
- expanded `OmrPitchPreview`

New `AnalyzedNotehead` fields now include:

- `stemDirection`
- `stemSide`
- `stemLength`
- `stemConfidence`
- `duration`
- `dotted`
- `accidental`
- `fillKind`
- `fillRatio`
- `hasBeamOrFlag`
- `beamSignal`
- `numberedToken`

New `OmrPitchPreview` summary fields:

- `durationCounts`
- `dottedCount`
- `accidentalCount`
- `beamCount`
- `stemmedCount`

### 2. Better notehead candidate filtering

In `detectNoteheadsFromDiagnostics(...)`:

- added aspect-ratio filtering
- added width/height bounds relative to detected `staff.averageSpacing`
- reduced obvious false positives from symbol fragments and page noise

This makes candidate noteheads more stable before pitch and duration inference.

### 3. New low-level OMR helpers

Added helper functions:

- `measureDarkRegion(...)`
- `classifyNoteheadFill(...)`
- `detectStem(...)`
- `detectBeamOrFlag(...)`
- existing dot/accidental detection was rewritten to use denser region analysis

Meaning of each helper:

- `measureDarkRegion(...)`: counts dark pixels and occupied rows/columns in a bounded region
- `classifyNoteheadFill(...)`: estimates whether the head looks filled, open, or uncertain
- `detectStem(...)`: finds likely stem side, direction, length, and confidence
- `detectBeamOrFlag(...)`: checks for beam/flag-like dark clusters near the stem tip

### 4. Duration inference prototype

Duration is now estimated using combined signals:

- stem exists or not
- notehead fill state
- beam/flag-like signal
- candidate confidence

Current heuristic:

- stem + filled + beam/flag -> `eighth`
- stem + open -> `half`
- stem + other filled/uncertain -> `quarter`
- no stem + strong filled candidate -> `quarter`
- otherwise -> `whole`

This is still heuristic and not yet production-grade OMR.

### 5. Better preview and draft diagnostics

When OMR is strong enough to become `final`, preview text now includes:

- note count
- average confidence
- duration distribution
- symbol summary
- grouped numbered preview lines

When OMR remains `draft`, diagnostics now include:

- stem count
- dotted count
- duration summary
- accidental count
- beam/flag count
- grouped heuristic preview

Draft bundle JSON now carries the richer `omrPitchPreview` and `analyzedNoteheads` payload.

## Final Promotion Logic After Today

The worker still only upgrades to `final` for `staff_pdf_to_numbered` when all of these are true:

- staff groups detected
- enough preview tokens
- average confidence is above threshold
- enough stemmed notes detected

However, the note set feeding this decision is now cleaner because:

- low-confidence noteheads are filtered
- uncertain noteheads without stem or fill signal are dropped from preview generation

## Validation Performed Today

### Build / type validation

These commands passed:

- `npm run typecheck`
- `npm run build`

### Functional verification

A synthetic verification PDF was generated locally and inserted into the local dev database.

Important verification job:

- job id: `e7f5c462-5aa2-49dd-b112-5319d6cd91a8`

Result:

- status: `completed`
- result kind: `final`

Preview text from that verification run:

```text
OMR final | notes: 7 | avg confidence: 0.768
Durations e:0 q:2 h:4 w:1
Symbols dots:0 accidentals:1 flags/beams:1
1'(q) 1'(h) #7(q) 1'(w) 3'(h) 4(h) 1'(h)
```

Generated output file:

- `E:\AI WEB\21.wuxianpu\services\api\storage\16008ff2-6494-4d78-9182-cbaae09b38a4\jobs\e7f5c462-5aa2-49dd-b112-5319d6cd91a8\verify-5c-symbols-v3-numbered-omr.pdf`

Additional temporary verification jobs were also created during tuning. They can remain as local dev artifacts unless cleanup is needed later.

## Current Reality / Limits

Module 5C is now "working prototype" level, not production level.

Known limits:

- still heuristic, not true engraved-score OMR
- still possible to over-segment or under-segment connected notation graphics
- dot detection is conservative and may miss very small dots
- accidental detection is still shape-density based, not symbol-class based
- beam/flag detection is only a local density heuristic
- some synthetic samples still produce extra or merged candidates

Practical conclusion:

- 5C is strong enough to continue development
- next improvements should focus more on structure cleanup than on adding more token labels

## Best Next Step

Recommended next module step: Module 5D.

Priority order:

1. split notehead/stem/adjacent-symbol connected regions more reliably
2. filter barlines, rests, text fragments, and accidental noise better
3. make final-promotion logic use structured confidence rather than simple count thresholds
4. improve multi-note spacing and left-to-right sequencing stability

## Important Existing Project State

Already implemented before today and still valid:

- Module 1 foundation completed
- Module 2 auth + activation completed
- Module 3 file upload/storage completed
- Module 4 job framework completed
- Module 5A text-layer heuristic completed
- Module 5B staff-line and notehead preprocessing completed
- Module 5C duration/basic-symbol prototype advanced today

Current source-of-truth docs:

- `E:\AI WEB\21.wuxianpu\online-pdf-score-converter-spec-v1.md`
- `E:\AI WEB\21.wuxianpu\online-pdf-score-converter-prd-v1.md`
- `E:\AI WEB\21.wuxianpu\online-pdf-score-converter-dev-roadmap-v1.md`

## Resume Instructions For The Next Model

If another model continues from here, it should:

1. read this file first
2. inspect `E:\AI WEB\21.wuxianpu\services\worker\src\index.ts`
3. verify current behavior with `npm run typecheck` and `npm run build`
4. continue with Module 5D instead of redoing 5C from scratch

Suggested immediate focus area in code:

- notehead component splitting
- stem/barline/rest discrimination
- better promotion threshold for `final`
