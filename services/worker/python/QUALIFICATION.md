# Local complex OMR qualification — 2026-10-06

The implementation and the two score workspaces are recorded in
[`docs/score-dual-workspaces-implementation-2026-10-06.md`](../../../docs/score-dual-workspaces-implementation-2026-10-06.md).
This document contains no customer identifiers or original score content.
Actual execution evidence remains private under `.tmp/complex-omr-realtest/`.

Pinned engines actually executed: Audiveris 5.10.2, homr commit
`33baa326900faa12702df8c4bdcbea034a3d6a34`, CPU ONNX inference.

| Actual local case | Result | Remaining limitation |
| --- | --- | --- |
| Four repository-authored image orientations | 0→0, 90→270, 180→180, 270→90; correct single-staff inventory in each | Direction evidence can still be ambiguous on other source layouts; such cases remain flagged |
| Authorized photographed ensemble page | Whole-page → two systems → 12 instrument groups; 31 recorded attempts in 186 seconds; full inventory has 16 physical staves including 4 TAB | Musical recognition remains incomplete; original bar boundaries are not independently verified |
| Assembly of actual ensemble region outputs | Six source-labeled instruments, eight measures per part, two systems, six main staves per system; all 12 main source staff regions bind to their candidate parts | 38 structural diagnostics remain; invalid source timing produces explicit silent synchronization gaps; no missing music is fabricated |
| Actual two-page authored PDF | Both source pages preserved, one track with two measures and eight events; five attempts in 60 seconds | Generic source label requires flagged layout-based identity inference |
| MusicXML validation | The ensemble assembly and two-page output both pass MusicXML 4.0 XSD; music21 reads all six ensemble parts × eight measures | Schema validity does not establish musical accuracy |
| Offline readiness | Six pinned ONNX model checksums, CPU provider, source commit and license checked both with Git and after source archive packaging | Runtime requires the provisioned model files; paid jobs never fetch them |

Worker full suite passed 71 tests with one disabled real-Redis integration skip
before the final evidence-bundle test was added. The final affected TypeScript
modules passed all 18 tests, Python assembly/notation safeguards passed all 19
tests, and the worker TypeScript typecheck passed. Source coverage, correct
instrument separation, raw region evidence retention, serial execution, budget
limits, cancellation and syntactic export correctness are tested independently
of note accuracy.

The complex pipeline produces a candidate requiring explicit review. Original
TAB is retained in page images and inventory; this worker does not reconstruct
its string/fret notation. Pitched percussion fallback is converted to unpitched
display notation and stays silent until a real sound mapping is supplied; an
existing explicit unpitched mapping is preserved. Same-named instruments are
not silently joined when their identity is ambiguous. The OMR engine gate
coordinates jobs within one worker process, so the shared 4 GB host should use
one worker process until a separate memory/load qualification is completed.
No production deployment or customer candidate modification occurred in this
qualification.
