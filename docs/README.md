# Docs Index

## Purpose

This folder keeps the project readable for future development sessions and for later collaboration with other models or developers.

## Structure

- `docs/handoffs/`: chronological session handoff notes
- `docs/modules/`: module-level status snapshots
- `docs/frontend-reference-learning-and-gap-checklist.md`: living frontend reference benchmark, ScoreTransposer gap ledger, and redesign acceptance checklist
- `docs/frontend-performance-budget.md`: P1 homepage bundle/image limits and the repeatable production-build check
- `docs/multilingual-frontend-prd.md`: nine-language frontend internationalization PRD, backend boundary, staged rollout, and acceptance gates
- `docs/operations/aitdk-seo-extension-playbook-zh.md`: AITDK browser-extension field guide and reusable Google SEO release/iteration playbook

## Recommended read order

1. `docs/frontend-reference-learning-and-gap-checklist.md` for public/product frontend work
2. `docs/multilingual-frontend-prd.md` before changing locale, copy, localized screenshots, or multilingual SEO
3. `docs/frontend-performance-budget.md` before adding homepage scripts, fonts, or media
4. `docs/operations/aitdk-seo-extension-playbook-zh.md` before SEO research, page release, or post-launch iteration
5. `docs/modules/module-5-status.md`
6. `docs/modules/module-5-evaluation.md`
7. latest file in `docs/handoffs/`
8. `online-pdf-score-converter-spec-v1.md`
9. `online-pdf-score-converter-prd-v1.md`
10. `online-pdf-score-converter-dev-roadmap-v1.md`

## Current focus

- active implementation track: Module 5E
- implemented conversion path: `staff_pdf_to_numbered`
- deferred conversion path: `numbered_pdf_to_staff`
- deferred product capability: transposition
