# Module 5 Status

## Goal

Turn `staff_pdf_to_numbered` from a placeholder worker flow into a usable staged-recognition pipeline for image and text PDFs.

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

## What is still not done in Module 5

- reliable connected-symbol splitting
- strong barline/rest classification
- multi-page and multi-staff-group sequencing robustness
- production-grade accidental recognition
- production-grade duration recognition

## Exit criteria for moving beyond Module 5

- draft/final decision becomes meaningfully stable on mixed synthetic and real samples
- draft bundles provide enough signal for fast manual correction
- worker can handle common clean treble-clef PDFs without obvious over-detection
