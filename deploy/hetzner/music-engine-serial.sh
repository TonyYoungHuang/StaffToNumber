#!/bin/sh
set -eu
case "$(basename "$0")" in
  score-audiveris) engine=/opt/audiveris/bin/Audiveris ;;
  score-basic-pitch) engine=/opt/score-python/bin/basic-pitch ;;
  score-musescore) engine=/usr/bin/musescore3 ;;
  score-fluidsynth) engine=/usr/bin/fluidsynth ;;
  score-music21) engine=/opt/score-python/bin/python ;;
  score-homr) engine=/opt/complex-omr/bin/python ;;
  *) echo 'Unknown music engine wrapper' >&2; exit 64 ;;
esac
# API exports and worker recognition share a bounded pool on the scratch volume.
# The dispatcher reserves all slots atomically. Large HOMR models take the full
# pool by default; three lighter Audiveris/export processes can run together.
# No queue deadline: callers can cancel while waiting and start their execution
# clock only after the optional readiness notification. Exec preserves the slot
# descriptors, so exit/SIGKILL releases them without stale lock cleanup.
exec /usr/bin/python3 - "$(basename "$0")" "$engine" "$@" <<'PY'
import fcntl
import os
import sys
import time


def positive_setting(name, default):
    value = os.environ.get(name, str(default))
    if not value.isdecimal() or int(value) < 1:
        raise ValueError(f"{name} must be a positive integer")
    return int(value)


wrapper, engine, *args = sys.argv[1:]
capacity = positive_setting("MUSIC_ENGINE_MAX_CONCURRENCY", 3)
weight = 1
# Adapter arguments end in action, request, response; Python flags may precede
# the adapter path, so indexing from the front could underweight heavy models.
if wrapper == "score-homr" and len(args) >= 4 and args[-3] in ("orient", "inventory", "recognize"):
    weight = min(capacity, positive_setting("MUSIC_ENGINE_HOMR_SLOT_WEIGHT", capacity))
elif wrapper == "score-basic-pitch":
    weight = min(capacity, positive_setting("MUSIC_ENGINE_AUDIO_SLOT_WEIGHT", capacity))
directory = os.environ.get("MUSIC_ENGINE_LOCK_DIR", "/data/.music-engine-slots")
os.makedirs(directory, exist_ok=True)
slots = []
with open(os.path.join(directory, "dispatcher.lock"), "a") as dispatcher:
    fcntl.flock(dispatcher, fcntl.LOCK_EX)
    while True:
        for index in range(capacity):
            slot = open(os.path.join(directory, f"slot-{index}.lock"), "a")
            try:
                fcntl.flock(slot, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                slot.close()
                continue
            slots.append(slot)
            if len(slots) == weight:
                break
        if len(slots) == weight:
            break
        for slot in slots:
            slot.close()
        slots.clear()
        time.sleep(0.05)
    for slot in slots:
        os.set_inheritable(slot.fileno(), True)
    fcntl.flock(dispatcher, fcntl.LOCK_UN)
if os.environ.get("SCORE_ENGINE_START_NOTIFY") == "1":
    os.write(2, b"SCORE_ENGINE_STARTED\n")
os.execv(engine, [engine, *args])
PY
