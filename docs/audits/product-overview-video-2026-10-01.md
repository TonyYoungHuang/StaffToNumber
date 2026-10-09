# Homepage product video — 2026-10-01

## Delivered scope

Added one 80-second video after the homepage hero/fact bar, before the existing
four feature demos. All visitors can use the player without signing in. The
existing H1, copy, pricing, metadata, canonical URLs, language alternates and
SoftwareApplication schema are retained.

Nine versions are provided: English, simplified/traditional Chinese, Japanese,
Korean, French, Spanish, German and Russian. Each has a localized interface
recording, title cards, WebVTT captions and a compressed WebP poster. There are
eight chapter buttons: import, edit, transpose, numbered notation, playback,
export, looping practice and assignments.

The film uses the original Product Workflow Etude throughout. Its soundtrack
is the same score exported by the local application at 80 BPM, used as musical
accompaniment to the edited footage; it is not synchronized browser audio.
Audio-to-score transcription is explicitly marked unavailable. MusicXML import
is not presented as PDF/photo OCR; recognition and review are described separately.

## Evidence and validation

- Isolated local API/application recordings; no mocked product responses or
  production payment, account, or score mutations.
- All nine imports returned 201 and reached the editor. Saved note edits and
  transpositions were checked against all 24 playback events; transposition
  raised pitches by two semitones while preserving durations.
- 72 chapter clips decoded successfully. Actual MusicXML, MIDI and WAV exports
  were generated; all nine 80 BPM WAV files have the same SHA-256 digest.
- Final MP4s are 1600 × 900, 25 fps, H.264/AAC, 80 seconds with fast-start
  metadata. Per-language files are 2,442,183–2,636,793 bytes; all nine total
  22,937,826 bytes. Posters total 151,176 bytes, with each below 18 KiB.
- Homepage localization/media/routing tests: 23 passed. Production build and
  TypeScript checks passed, producing 46 routes.
- Original homepage budgets passed: JavaScript 45.2/110 KiB gzip, CSS
  30.9/42 KiB gzip, all product images 12,264.2/12,288 KiB. Initial media checks
  include each new poster; click-to-load video files are not downloaded initially.
- All 22 strict browser checks passed, with no pending checks or runtime errors.
  Coverage includes nine localized pages and all media HTTP responses;
  English/Chinese playback at 1440 px and 390 px, decoded audio, captions, chapter
  seeking, first-use keyboard seeking, locale change reset and media-error fallback.
- Chapter seeking enters the requested chapter 10 ms after its boundary. This
  resolves a reproduced Chromium issue retaining the previous caption when a
  fresh seek lands exactly on adjacent cues. All eight chapter jumps were checked
  for a single correct active caption; visible timestamps stay unchanged.

Final media checksums and codec/operation evidence are in
[`product-overview-video-2026-10-01.json`](product-overview-video-2026-10-01.json).
Reproduction and source details are in [`../product-overview-video.md`](../product-overview-video.md).
Capture and browser logs remain under ignored `.tmp/`; session files are not
public assets.

## Release state

Prepared and verified locally. This is not a production deployment. A standalone
local production preview is available at
`http://127.0.0.1:44610/zh-cn#product-overview`. The temporary capture API and
application servers at ports 44602 and 44601 were stopped after recording.
