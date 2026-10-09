# Music engine source provenance

This directory retains the upstream source and license texts used by the score
recognition and editing implementation. `SOURCE_COMMIT` pins each source snapshot;
these are ordinary vendored files, not Git submodules. Model weights and local
execution artifacts are excluded by upstream/project ignore rules.

| Project | Pinned source/package | Integration |
| --- | --- | --- |
| [homr](https://github.com/liebharc/homr) | `33baa326900faa12702df8c4bdcbea034a3d6a34`, AGPL-3.0 | CPU ONNX recognition and page/system/staff inventory via `services/worker/python/complex_omr_adapter.py` |
| [Smoosic](https://github.com/Smoosic/Smoosic) | `1427042ef0d6b9d8684b140c8f2a489270e8cc9f`, MIT | Source-adapted `SmoSelector` in `apps/app/src/lib/vendor/smoosic/selector.ts`, used for transient editor navigation |
| [Audiveris](https://github.com/Audiveris/audiveris) | Installed CLI, existing runner; local verification used 5.10.2 | Primary simple-score recognition and fallback for complex localized groups |
| [alphaTab](https://github.com/CoderLine/alphaTab) | npm `@coderline/alphatab@1.8.4`, MPL-2.0 | TAB/percussion view, note picking, SoundFont playback; assets and notices in `apps/app/public/vendor/alphatab` |
| [OpenSheetMusicDisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) | npm `opensheetmusicdisplay@2.0.0`, BSD-3-Clause | Full-score preview and stable MusicXML-note-to-graphical-note bridge |

The existing MuseScore export/render integration is retained. The two source
snapshots above are used directly or adapted with source attribution; the three
other projects use their actual installed CLI/package implementations.

See `docs/score-dual-workspaces-implementation-2026-10-06.md` for behavior,
verification and remaining recognition limitations. Provision homr models using
`services/worker/python/provision_complex_omr.py`; it checks the pinned source and
six model SHA-256 digests. Recognition jobs require local models and never invoke
the provisioning/download operation.
