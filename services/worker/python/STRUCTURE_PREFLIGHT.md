# Free score structure preview

`score_structure_preflight.py` inventories printed staff layout before the user
chooses and confirms a paid recognition task. It never opens a database, creates
a score/job, reserves credits, modifies the uploaded source, recognizes notes,
or downloads files. It uses Pillow, NumPy, OpenCV and (for PDF) PDFium locally.
It reuses only the pure `classical_staffs` function from the complex adapter;
homr, ONNX Runtime, RapidOCR, PyTorch and their models are not imported.

## Caller contract

```sh
python services/worker/python/score_structure_preflight.py \
  --request /private/request.json --response /private/response.json
```

The request contains a caller-owned local source, never a URL:

```json
{
  "sourcePath": "/private/upload.pdf",
  "limits": {
    "maxPagePixels": 1000000,
    "maxTotalPixels": 30000000,
    "maxPages": 60,
    "dpi": 100,
    "budgetMs": 15000
  }
}
```

The CLI also supports a JSON request on stdin and a JSON response on stdout.
With `--response`, stdout is empty. Request files are at most 64 KiB. Runtime
errors expose a generic code, never a source path or document contents: exit
`2` for invalid requests/missing source, `3` for unavailable Python dependencies,
and `1` for other analysis failures. Normal budget exhaustion returns exit `0`
with a partial, uncertain response. The API additionally kills the process at
its own deadline and deletes its private temporary files.

The response contains `schemaVersion: 1`, `recommendation` (`simple`, `complex`,
`uncertain`), `confidence`, `sourcePageCount`, `pagesAnalyzed`, `complete`,
`reasonCodes` and a `pages` array. Each page has `page`, `staffCount`,
`systemCount`, `maxStavesPerSystem`, `hasTab`, and `uncertain`. Additional
diagnostics describe dimensions, 4/5/6-line counts, direction certainty and the
clockwise correction `rotation` (or `null`). `exifOrientation` is the original
raster metadata; EXIF correction precedes this optional additional rotation.
No source filenames, paths, image contents or detected notes are returned.

## Recommendations and limits

- Repeated single-staff systems remain simple. Page count alone does not imply
  complexity. A connected pair of ordinary staves is piano-like and remains
  simple; this check does not identify or guarantee the actual instrument.
- Three or more simultaneous staves, or a four/six-line TAB region, suggest
  complex mode. Printed vertical connections distinguish simultaneous staves
  from successive systems. Weak spacing-only groupings remain uncertain.
- Line direction establishes an axis, not an upright orientation. Only strong
  asymmetric clef/label margin evidence establishes the 0/180 choice. Ambiguous
  direction, inconsistent staff grouping, low resolution, unknown/blank pages,
  failed page reads or any incomplete scan return `uncertain`.
- `complete` means every source page was analyzed within the limits. It never
  means every staff was found or every musical symbol can be recognized.
  A failed page read makes `complete` false; a readable but unknown/blank page
  has `complete: true` and `recommendation: uncertain`.
- PDF page count is read before rasterizing. Page size and pixel budgets are
  checked before PDFium allocates a bitmap; output is downscaled as necessary.
  Images are decoded only below the 32-million-native-pixel header guard. JPEG
  uses decoder scaling when available; other formats are bounded before decode.
  Normalized working pages are limited independently. Multi-frame TIFF/GIF
  pages are counted and analyzed, including subsequent frames. Page, pixel and
  time budgets explicitly preserve total page count in a partial result.
- Request limits are clamped to hard maximums: 2 million page pixels, 60 million
  total pixels, 100 pages, 150 DPI and 20 seconds. Default budgets are lower.
  Source decoding/PDF metadata parsing is also covered by the caller's hard
  process deadline. Runtime does not trigger an external renderer for EPS or
  other unsupported Pillow formats.

Reason codes for localization:

| Code | Meaning |
| --- | --- |
| `SINGLE_STAFF_LAYOUT` | One staff per detected system |
| `PIANO_STAFF_LAYOUT` | Connected ordinary double-staff layout |
| `MULTI_INSTRUMENT_LAYOUT` | At least three simultaneous staves |
| `TAB_NOTATION` | Four/six-line region |
| `NO_STAFF_DETECTED` | No usable staff structure |
| `ORIENTATION_UNCERTAIN` | Upright orientation needs inspection |
| `SYSTEM_GROUPING_UNCERTAIN` | Simultaneous-system grouping is ambiguous |
| `LOW_RESOLUTION` | Detected staff spacing is too small |
| `ANALYSIS_LIMIT_REACHED` | Page, native/working pixel, or time limit reached |
| `PAGE_READ_FAILED` | A source page could not be analyzed |

The original file stays selected in the workbench. This preview does not split,
remove or crop pages for a later paid job. The user can choose either mode after
reviewing the suggestion and its current server-provided credit price.

## Provision an independent Python 3.11 environment

On Debian 12/bookworm, install `python3` and `python3-venv` during the container
build, then create a separate environment for this adapter:

```sh
python3 -m venv /opt/score-preflight
/opt/score-preflight/bin/python -m pip install --only-binary=:all: \
  -r services/worker/python/requirements-preflight.txt
/opt/score-preflight/bin/python -m pip check
```

The requirements pin Pillow 11.3.0, NumPy 2.2.6, OpenCV **headless** 4.11.0.86
and pypdfium2 4.30.0. Keep this environment separate from Basic Pitch/TensorFlow
and homr; installing NumPy 2 into their existing environments can conflict with
their own constraints. No GUI packages, ONNX models or OMR engine provisioning
are needed. The adapter and `complex_omr_adapter.py` must both be present in the
same directory for the pure line detector import.

```dotenv
SCORE_PREFLIGHT_PYTHON_COMMAND=/opt/score-preflight/bin/python
SCORE_PREFLIGHT_ADAPTER_PATH=/app/services/worker/python/score_structure_preflight.py
SCORE_PREFLIGHT_TIMEOUT_MS=25000
SCORE_PREFLIGHT_MAX_PAGES=60
SCORE_PREFLIGHT_MAX_CONCURRENCY=2
SCORE_PREFLIGHT_REQUESTS_PER_MINUTE=6
```

The API launches the configured interpreter with arguments and without a shell.
Its output validator limits the response to 128 KiB; the process deadline,
per-user request rate and per-instance concurrency gate bound free inspection
work. Each preview process explicitly sets OpenCV to one thread in addition to
the API's OMP/BLAS thread environment limits. The two-process API default does
not coordinate multiple API instances. Production credentials and customer data
are not needed for provisioning.

The official [Pillow release](https://pypi.org/project/pillow/11.3.0/),
[NumPy release](https://pypi.org/project/numpy/2.2.6/),
[OpenCV headless release](https://pypi.org/project/opencv-python-headless/4.11.0.86/)
and [pypdfium2 release](https://pypi.org/project/pypdfium2/4.30.0/) publish compatible
CPython 3.11/ABI3 or Python 3 Linux wheels. The actual downloaded wheel metadata
and SHA-256 values were checked against PyPI's JSON metadata. Pillow's selected
wheel supports glibc 2.27/2.28; the other selected wheels support glibc 2.17.
The qualified bookworm container used glibc 2.36.

## Local verification

```sh
python services/worker/python/test_score_structure_preflight.py
```

All 23 tests use original geometric fixtures and cover repeated single melodies,
piano, ensembles, four/six-line TAB, all four orientations, EXIF correction,
short final systems, unknown pages, all TIFF frames, all PDF page counts,
allocation/time/page limits, offline operation, no model imports and the CLI.
The production-pinned dependencies passed `pip check` and all 23 tests in a new
Windows Python 3.11.9 environment and a new Linux Python 3.11.2 environment in a
local Debian 12 container. The Linux qualification ran with networking disabled,
an independent temporary venv, downloaded official wheels and a read-only small
script directory. It did not alter an existing environment or start an API,
database or recognition worker. This is local runtime qualification, not a
production deployment. The initial Python 3.13 exploratory environment also
passed all 23 tests with its existing newer libraries.

Read-only checks on existing authorized sources found a short one-staff score
and recommended simple mode in about 160 ms. A dense photographed ensemble
reported detected TAB/multiple staves but uncertain orientation and grouping;
it returned `uncertain`, retaining the user's choice. These checks establish
conservative preview behavior, not universal staff-layout accuracy. Customer
documents and raw results remain private under `.tmp/` and are not test fixtures.
