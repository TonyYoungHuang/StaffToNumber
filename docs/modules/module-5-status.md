# Module 5 Status

## Goal

Turn `staff_pdf_to_numbered` from a placeholder worker flow into a usable staged-recognition pipeline for image and text PDFs.

## Current exposure

- only `staff_pdf_to_numbered` is exposed in the UI and API
- `numbered_pdf_to_staff` is deferred and hidden from users

## Current stage summary

### 5A

- text-layer token extraction from PDF
- produces `final` when parseable note letters are available

### 5B

- first screenshot-based OMR preprocessing
- staff-line detection
- candidate note column detection
- notehead candidate detection
- produces draft bundle when confidence is low

### 5C

- notehead fill analysis
- stem direction estimation
- first-pass dot, accidental, and beam-like detection
- duration prototype for numbered preview

### 5D

- refined notehead core extraction
- first-pass connected-cluster splitting for glued notehead/stem/accidental components
- valley-based sub-bounding-box subdivision before local notehead refinement
- structural noise filtering
- promotion score replaces overly simple final gating
- richer diagnostics for why a sample stays draft

### 5E

- repeatable sample framework under `samples/clean`, `samples/draft`, and `samples/fail`
- evaluator that records `latest` and timestamped history snapshots after each recognition change
- multi-page aggregation for up to three PDF pages per job
- stronger fragment rejection for text-like or weak symbol remnants
- sequence smoothing for pitch and duration outliers inside each staff
- more conservative accidental stabilization rules for `#` and `b`

## What is still not done in Module 5

- reliable connected-symbol splitting on complex real scans
- strong barline/rest classification
- more robust multi-staff ordering on dense real-world layouts
- production-grade accidental recognition with barline awareness
- production-grade duration recognition beyond the current heuristic prototype

## Exit criteria for moving beyond Module 5

- draft/final decision becomes meaningfully stable on mixed synthetic and real samples
- sample evaluator shows stable or improving `final` / `draft` outcomes across tracked inputs
- draft bundles provide enough signal for fast manual correction
- worker can handle common clean treble-clef PDFs without obvious over-detection
