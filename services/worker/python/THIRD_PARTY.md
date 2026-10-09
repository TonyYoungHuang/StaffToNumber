# homr integration provenance

The adapter imports, without copying or modifying, the complete upstream homr
package at `third_party/music-engines/homr` (deployment may configure another
path). Upstream: https://github.com/liebharc/homr

Pinned commit: `33baa326900faa12702df8c4bdcbea034a3d6a34`.
Code and pretrained weights: AGPL-3.0; retain upstream LICENSE and source.

Actually used source entry points:

- `homr/main.py`: `ProcessingConfig`, `detect_staffs_in_image`, `process_image`.
- `homr/segmentation/inference_segnet.py`: CPU ONNX segmentation and caching.
- `homr/staff_detection.py`: anchors and staff reconstruction, through main.
- `homr/brace_dot_detection.py`: staff grouping, through main.
- `homr/staff_parsing.py`: per-staff semantic recognition, through process_image.
- `homr/music_xml_generator.py`: `XmlGeneratorArguments`, MusicXML production.

The independent line inventory explicitly retains 4/6-line TAB regions.
TAB is masked only in recognition copies, never the original source. Neither
homr nor this adapter claims TAB string/fret recognition. Such regions produce
explicit coverage gaps and an incomplete candidate.

Provision CPU inference with the homr dependency extra and run, once before
serving jobs, `python -m homr.main --init --no-title --gpu no`. Missing weights
fail explicitly; paid jobs never start an unbounded network download.

The adapter avoids homr's multi-image `relieur` merging: that convenience path
does not provide this application's source inventory, identity ambiguity,
duplicate instrument protection or incomplete-region evidence.
