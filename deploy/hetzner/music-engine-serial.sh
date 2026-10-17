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
# A shared memory reservation protects process launch and model/renderer growth.
# Queueing is bounded and cancellable; execution clocks still start at admission.
# Exec preserves descriptors, so exit/SIGKILL releases slots without stale locks.
exec /usr/bin/python3 - "$(basename "$0")" "$engine" "$@" <<'PY'
import fcntl
import json
import os
import sys
import time


def positive_setting(name, default):
    value = os.environ.get(name, str(default))
    if not value.isdecimal() or int(value) < 1:
        raise ValueError(f"{name} must be a positive integer")
    return int(value)


MIB = 1024 * 1024


def resource_failure(code, diagnostic):
    print(f"{code}: {diagnostic}", file=sys.stderr, flush=True)
    raise SystemExit(75)


def memory_snapshot():
    with open("/proc/meminfo") as source:
        available = next(int(line.split()[1]) * 1024 for line in source if line.startswith("MemAvailable:"))
    # cgroup v2 is used by production; retain v1 support for other hosts.
    for root, current_name, limit_name in (
        ("/sys/fs/cgroup", "memory.current", "memory.max"),
        ("/sys/fs/cgroup/memory", "memory.usage_in_bytes", "memory.limit_in_bytes"),
    ):
        if not os.path.exists(os.path.join(root, current_name)):
            continue
        with open(os.path.join(root, current_name)) as source:
            current = int(source.read().strip())
        with open(os.path.join(root, limit_name)) as source:
            value = source.read().strip()
        # v1 uses a huge numeric sentinel for an unlimited root cgroup.
        limit = None if value == "max" or int(value) >= (1 << 60) else int(value)
        return available, current, limit
    # Bare hosts have no container cap; the host limit still applies.
    return available, 0, None


def memory_admissible(snapshot, active, reservation, margin, group):
    available, current, limit = snapshot
    own = [item for item in active if item["group"] == group]
    baseline_available = max((item["host_baseline_available"] for item in own), default=available)
    baseline_current = min((item["cgroup_baseline_current"] for item in own), default=current)
    own_reserved = sum(item["memory_bytes"] for item in own)
    # An unlimited root cgroup can include other sites on the entire host.
    group_growth = max(0, current - baseline_current) if limit is not None else 0
    # Credit only growth observed in this container as well as on the host.
    # Another site's RAM use must never erase an engine's future reservation.
    # Other containers' current usage cannot be read from this namespace, so
    # retain their full reservation until their lock is released.
    own_host_growth = min(group_growth, max(0, baseline_available - available))
    remaining = sum(item["memory_bytes"] for item in active if item["group"] != group) + max(0, own_reserved - own_host_growth)
    host_ok = available >= remaining + reservation + margin
    own_remaining = max(0, own_reserved - group_growth)
    group_ok = limit is None or limit - current >= own_remaining + reservation + margin
    return host_ok and group_ok, baseline_available, baseline_current


wrapper, engine, *args = sys.argv[1:]
capacity = positive_setting("MUSIC_ENGINE_MAX_CONCURRENCY", 3)
weight = 1
heavy = False
# Adapter arguments end in action, request, response; Python flags may precede
# the adapter path, so indexing from the front could underweight heavy models.
if wrapper == "score-homr" and len(args) >= 4 and args[-3] in ("orient", "inventory", "recognize"):
    weight = min(capacity, positive_setting("MUSIC_ENGINE_HOMR_SLOT_WEIGHT", capacity))
    heavy = True
elif wrapper == "score-basic-pitch":
    weight = min(capacity, positive_setting("MUSIC_ENGINE_AUDIO_SLOT_WEIGHT", capacity))
    heavy = True
# Audited worker lifetime memory.peak was 947.3 MiB (2026-10-14).
# 1024 MiB is a rounded conservative floor, not a measured per-engine maximum.
# HOMR/audio lack separate large-input peaks, so reserve 2048 MiB and all slots.
memory_mb = positive_setting("MUSIC_ENGINE_HEAVY_MEMORY_MB" if heavy else "MUSIC_ENGINE_MEMORY_MB", 2048 if heavy else 1024)
if wrapper == "score-audiveris":
    # JAVA_TOOL_OPTIONS bounds heap; native OCR/image buffers need extra room.
    heap = os.environ.get("JAVA_TOOL_OPTIONS", "").split("-Xmx")[-1].split()[0] if "-Xmx" in os.environ.get("JAVA_TOOL_OPTIONS", "") else ""
    if heap.endswith("m") and heap[:-1].isdecimal():
        memory_mb = max(memory_mb, int(heap[:-1]) + 256)
reservation = memory_mb * MIB
margin = positive_setting("MUSIC_ENGINE_MEMORY_MARGIN_MB", 256) * MIB
deadline = time.monotonic() + positive_setting("MUSIC_ENGINE_QUEUE_WAIT_MS", 120000) / 1000
group = os.uname().nodename
directory = os.environ.get("MUSIC_ENGINE_LOCK_DIR", "/data/.music-engine-slots")
os.makedirs(directory, exist_ok=True)
# A job-level lease holds these exact slots through preparation, recognition and
# saving. Only a matching token on a *currently locked* slot avoids double
# reservation. Ordinary API/export commands continue through the existing gate.
job_token = os.environ.get("MUSIC_ENGINE_JOB_TOKEN", "")
if job_token and os.environ.get("RECOGNITION_LANES_ENABLED") == "true":
    validated = False
    for index in range(capacity):
        with open(os.path.join(directory, f"slot-{index}.lock"), "a+") as slot:
            try:
                fcntl.flock(slot, fcntl.LOCK_EX | fcntl.LOCK_NB)
                fcntl.flock(slot, fcntl.LOCK_UN)
            except BlockingIOError:
                slot.seek(0)
                if json.load(slot).get("job_token") == job_token:
                    validated = True
    if not validated:
        resource_failure("ENGINE_RESOURCE_UNAVAILABLE", "Task memory lease is no longer held")
    if os.environ.get("SCORE_ENGINE_START_NOTIFY") == "1":
        os.write(2, b"SCORE_ENGINE_STARTED\n")
    os.execv(engine, [engine, *args])
slots = []
memory_blocked = False
with open(os.path.join(directory, "dispatcher.lock"), "a") as dispatcher:
    while True:
        if time.monotonic() >= deadline:
            resource_failure("ENGINE_MEMORY_PRESSURE" if memory_blocked else "ENGINE_RESOURCE_BUSY", "Processing queue admission timed out; retry this operation.")
        try:
            fcntl.flock(dispatcher, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            time.sleep(0.05)
            continue
        try:
            active = []
            for index in range(capacity):
                slot = open(os.path.join(directory, f"slot-{index}.lock"), "a+")
                try:
                    fcntl.flock(slot, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    slots.append(slot)
                except BlockingIOError:
                    slot.seek(0)
                    try:
                        active.append(json.load(slot))
                    except (ValueError, KeyError):
                        resource_failure("ENGINE_RESOURCE_UNAVAILABLE", "Active engine reservation could not be read.")
                    finally:
                        slot.close()
            snapshot = memory_snapshot()
            admitted, host_baseline, group_baseline = memory_admissible(snapshot, active, reservation, margin, group)
            memory_blocked = not admitted
            if os.environ.get("RECOGNITION_LANES_ENABLED") == "true":
                with open(os.path.join(directory, "big-intent.lock"), "a") as big_intent:
                    try:
                        fcntl.flock(big_intent, fcntl.LOCK_EX | fcntl.LOCK_NB)
                        fcntl.flock(big_intent, fcntl.LOCK_UN)
                    except BlockingIOError:
                        admitted = False
            if admitted and len(slots) >= weight:
                # Only the first held descriptor owns this process reservation.
                for index, slot in enumerate(slots[:weight]):
                    slot.seek(0)
                    slot.truncate()
                    json.dump({"memory_bytes": reservation if index == 0 else 0, "group": group,
                               "host_baseline_available": host_baseline, "cgroup_baseline_current": group_baseline}, slot)
                    slot.flush()
                    os.set_inheritable(slot.fileno(), True)
                for slot in slots[weight:]:
                    slot.close()
                slots = slots[:weight]
                break
            for slot in slots:
                slot.close()
            slots.clear()
        except (OSError, ValueError, KeyError, TypeError, StopIteration) as error:
            resource_failure("ENGINE_RESOURCE_UNAVAILABLE", f"Memory admission check failed: {error}")
        finally:
            fcntl.flock(dispatcher, fcntl.LOCK_UN)
        time.sleep(0.05)
if os.environ.get("SCORE_ENGINE_START_NOTIFY") == "1":
    os.write(2, b"SCORE_ENGINE_STARTED\n")
try:
    os.execv(engine, [engine, *args])
except OSError as error:
    if error.errno == 12:
        resource_failure("ENGINE_MEMORY_PRESSURE", "Engine launch ran out of memory; retry this operation.")
    raise
PY
