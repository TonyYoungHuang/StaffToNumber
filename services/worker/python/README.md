# Complex score recognition worker

`recognitionMode: complex` uses the real pinned homr CPU package and the existing
Audiveris runner. The simple path retains its current engine and confirmation
workflow. This worker does not determine or deduct credits; the API persists
the authorized mode and cost before the task is claimed.

The complex path inventories every rendered source page, independently detects
4/5/6-line regions, selects a usable orientation, keeps instrument labels and
staff/system groups, and then recognizes serially: whole page, failed system,
failed instrument group. It compares group/staff layout, synchronized measures,
and durations before accepting a structural candidate. MusicXML from sequential
systems/pages joins vertically in time; simultaneous instrument groups join
at the same measure positions. Duplicate names cannot establish identity.
Reliable unique source labels allow a legitimate clef change without splitting
the same instrument. Ambiguous layouts preserve separate parts and review gaps.

Successful recognition always produces a candidate awaiting review. A detected
layout is not ground truth and correct durations do not prove correct pitches.
Unknown bar boundaries, unsupported TAB, missing regions, ambiguous identities,
and exhausted budgets are explicit coverage gaps. Missing regions synchronize
with flagged silent `<forward>` placeholders, never fabricated source rests.
TAB is kept in the original image and inventory, and masked only in pitch OMR
copies; this implementation does not read its frets/strings. Source-labeled
percussion remains unpitched and silent until a real drum mapping is supplied.

## Provision before enabling paid jobs

Use Python 3.11–3.15 and the pinned source commit documented in THIRD_PARTY.md.
Retain the upstream license/source and `SOURCE_COMMIT` when packaging a checkout
without its `.git` directory. CPU inference needs neither PyTorch nor a GPU.
Install the CPU dependency extra into an isolated environment during image
build or operator provisioning, for example from the repository root:

```sh
python3 -m venv .venv-complex-omr
POETRY_DYNAMIC_VERSIONING_BYPASS=0+33baa326 .venv-complex-omr/bin/python -m pip install './third_party/music-engines/homr[cpu]'
.venv-complex-omr/bin/python services/worker/python/provision_complex_omr.py \
  --source-dir third_party/music-engines/homr --download \
  --manifest artifacts/complex-omr-readiness.json
```

The final command is an explicit initialization step. It can download the three
pinned homr ONNX files and initialize RapidOCR's three models. The default,
without `--download`, only checks local files against the recorded SHA-256 values,
checks the source commit, and confirms the ONNX CPU provider. Run that offline
check after copying the environment/models to a server. The runtime adapter
requires these local files; a missing model fails rather than downloading during
a customer's job. Do not expose complex mode until the readiness check succeeds.

Set worker paths explicitly in containers (the defaults assume the working
directory is `services/worker`):

```dotenv
HOMR_PYTHON_COMMAND=/opt/complex-omr/bin/python
HOMR_SOURCE_DIR=/app/third_party/music-engines/homr
COMPLEX_OMR_ADAPTER_PATH=/app/services/worker/python/complex_omr_adapter.py
COMPLEX_OMR_TIMEOUT_MS=900000
COMPLEX_OMR_ATTEMPT_TIMEOUT_MS=120000
COMPLEX_OMR_MAX_GROUP_ATTEMPTS=12
```

On a shared 4 GB host use a separately qualified Audiveris heap, start one worker
process, and keep broker concurrency at one. The FIFO engine gate also prevents
simple/complex jobs in that process from overlapping Java/ONNX engines. It does
not coordinate multiple OS processes or containers. Crop attempts and inventory
count toward the total deadline. Cancellation kills the active process group on
Linux and prevents assembly/commit; queued cancellation is immediate. Existing
database candidate commit checks still guard late cancellation and stale jobs.

## Coordinates and preserved evidence

The uploaded source remains unchanged. Preparation applies EXIF orientation,
rasterizes every PDF page with pixel limits before allocation, and saves a private
PNG. Orientation tries the four rotations with independent staff-line evidence,
homr staff reconstruction, clef-side evidence and reliable left-margin labels.
The selected upright PNG is the coordinate space of all coverage boxes and
displayed page images. `sourceTransform.sourceToImage` and `imageToSource` are
2×3 affine matrices (six row-major numbers) between raw uploaded raster pixels
and that upright coordinate space; EXIF reflections are included. For PDF pages,
the source raster space is the rendered page pixels, not PDF point coordinates.
Ambiguous orientation is reported as a review gap.

The candidate's `recognitionLayer.coverage` records pages, systems, instrument
groups, physical staves, source transforms, attempts and remaining gaps. Final
canonical MusicXML is assembled before parsing and attaching preservation
anchors. Note IDs/source references are assigned once during assembly. Exact
source staff bindings are made only when output part/staff grouping matches the
detected source grouping; otherwise the region remains explicitly unresolved.
Original images and the coverage evidence bundle remain available with the
candidate; recognizing a partial page never silently drops another source page.

## Verification

Run worker TypeScript tests via `npm -w @score/worker test` and Python assembly
checks with the configured Python:

```sh
python services/worker/python/test_complex_omr_adapter.py
```

The Python tests use original synthetic MusicXML and verify distinct same-named
instruments, simultaneous vs sequential merging, changed instrument IDs,
unsupported notations/comments/groups/lyrics, percussion safety and duration
checks. TypeScript tests verify recovery, original TAB retention, cancellation,
budget limits and serial engine access. The local qualification also actually
ran homr orientation on four repository-authored rotations and the complete
layered scheduler on a user-authorized photograph. These checks support the
pipeline behavior; they do not establish universal OMR accuracy.
