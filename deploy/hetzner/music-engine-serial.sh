#!/bin/sh
set -eu
case "$(basename "$0")" in
  score-audiveris) engine=/opt/audiveris/bin/Audiveris ;;
  score-basic-pitch) engine=/opt/score-python/bin/basic-pitch ;;
  score-musescore) engine=/usr/bin/musescore3 ;;
  score-fluidsynth) engine=/usr/bin/fluidsynth ;;
  score-music21) engine=/opt/score-python/bin/python ;;
  *) echo 'Unknown music engine wrapper' >&2; exit 64 ;;
esac
# API exports and the worker share this volume and therefore this advisory lock.
exec flock --wait 180 --conflict-exit-code 75 --no-fork /data/.music-engine.lock "$engine" "$@"
