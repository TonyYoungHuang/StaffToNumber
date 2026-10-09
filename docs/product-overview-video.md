# Homepage product overview video

The homepage includes an 80-second product film immediately after the hero and
fact bar. It is public and does not require an account. Each of the nine site
languages has its own interface recording, title cards, poster and WebVTT
captions. Existing homepage copy and SEO metadata are retained.

## Content

The film follows the original `samples/seo-product-demo.musicxml` score through
MusicXML import, saving a note edit, a two-semitone transposition, numbered
notation, playback, MusicXML/MIDI/WAV export, looping practice and creating a
practice assignment. The soundtrack comes from the application's actual WAV
export of this score. It is accompaniment to the edited demonstration, rather
than a recording of browser audio. Waiting periods in longer operations are
shortened to fit their chapters.

Audio-to-score transcription is not publicly enabled. The film explicitly says
it is unavailable; it does not simulate a successful transcription. PDF/photo
recognition is mentioned with its review requirement, without presenting the
MusicXML import recording as OCR.

## Files and reproduction

- `apps/www/src/lib/product-overview.ts`: nine-language copy and shared timeline.
- `apps/www/src/components/ProductOverviewVideo.tsx`: click-to-play video, native
  audio/fullscreen controls, captions, and eight seekable chapters.
- `apps/www/public/product/overview/v1/<locale>/`: MP4, poster and captions.
- `scripts/capture-product-overview.mjs`: isolated local API/application recording
  using a local demo account and database, with actual mutations and export checks.
- `scripts/render-product-overview.mjs`: title cards, real interface clips and
  score audio assembled with Playwright and FFmpeg. Run with Node's `tsx` loader.
- `scripts/verify-product-overview-media.mjs`: all nine media files, duration,
  codecs, fast-start metadata, caption timing and file-size limits.
- `scripts/verify-product-overview.mjs`: local browser checks, playback,
  chapter navigation, mobile width, subtitles and initial network behavior.

Run from the repository root, with Edge, FFmpeg and project dependencies installed:

```powershell
$env:OVERVIEW_LOCALES = 'en,zh-CN,zh-TW,ja,ko,fr,es,de,ru'
node scripts/capture-product-overview.mjs
node --import tsx scripts/render-product-overview.mjs --locales=en,zh-CN,zh-TW,ja,ko,fr,es,de,ru
node --import tsx scripts/verify-product-overview-media.mjs
node --import tsx scripts/verify-product-overview.mjs
```

The browser verification expects a separate local public frontend at port 44610
by default. Capture uses the local application/API ports 44601/44602 and writes
private session information only under ignored `.tmp/`; never publish that
directory. Compiled API/worker builds are required before capture.

## Delivery behavior

Videos use H.264/AAC in a fast-start MP4 at 1600 × 900, 25 fps. Each video must be
under 5 MiB and each 960 × 540 WebP poster under 18 KiB. The player uses `preload="none"` and
does not autoplay. Playback and sound start after a visitor clicks Play or a
chapter; keyboard operation and native fullscreen controls are available.

This change does not change billing, authentication, pricing, or feature release
flags. Production publication is a separate release step.
