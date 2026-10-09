"""Render FIRST LIGHT's original commercial arrangement from score note JSON.

This is a reproducible, original advertising soundtrack, not a recording of the
website's realtime synthesizer. No external samples or copyrighted music are
used. The event manifest links every melodic event to a score variant/note.
Requires the locally available NumPy, SciPy and FFmpeg.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy import signal


SAMPLE_RATE = 48_000
DURATION = 30.0
TEMPO = 112.0
BEAT = 60.0 / TEMPO
SEED = 20261001


def wav_write(path: Path, samples: np.ndarray) -> None:
    samples = np.clip(samples, -0.999, 0.999)
    pcm = np.rint(samples * 32767).astype("<i2")
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())


def read_notes(path: Path) -> list[dict]:
    source = json.loads(path.read_text(encoding="utf-8-sig"))
    notes = source if isinstance(source, list) else source["notes"]
    for item in notes:
        assert all(key in item for key in ("midi", "startBeat", "durationBeats")), (path, item)
    return notes


def envelope(t: np.ndarray, duration: float, attack: float, release: float) -> np.ndarray:
    rising = 1 - np.exp(-t / attack)
    falling = np.exp(-np.maximum(t - duration, 0) / release)
    return rising * falling


def synthesize(instrument: str, midi: int, duration: float, velocity: float, seed: int) -> np.ndarray:
    """Timbre-shaped additive voices, deterministic and click-free."""
    rng = np.random.default_rng(seed)
    tail = 1.4 if instrument == "piano" else 0.9
    length = int(math.ceil((duration + tail) * SAMPLE_RATE))
    t = np.arange(length, dtype=np.float64) / SAMPLE_RATE
    frequency = 440.0 * 2.0 ** ((midi - 69) / 12.0)
    out = np.zeros(length, dtype=np.float64)

    if instrument == "piano":
        # Inharmonic partials and very small string beating supply a rounded
        # piano-like attack without recorded samples or noisy transients.
        partials = [1.0, 0.52, 0.28, 0.16, 0.105, 0.065, 0.04, 0.025, 0.016, 0.01]
        stiffness = 0.000022 * 2.0 ** ((midi - 60) / 36.0)
        for harmonic, amplitude in enumerate(partials, 1):
            f = frequency * harmonic * math.sqrt(1.0 + stiffness * harmonic**2)
            if f >= SAMPLE_RATE * 0.46:
                continue
            decay = np.exp(-t / (1.8 / harmonic**0.62))
            angle = 2 * np.pi * f * t
            beating = (np.sin(angle) + 0.24 * np.sin(angle * 1.0007)) / 1.24
            out += amplitude * decay * beating
        out *= envelope(t, duration, 0.0035, 0.23)
        out *= 0.35
    elif instrument == "violin":
        # Gentle bow onset, narrow vibrato and warm harmonic formants.
        vibrato = 0.0016 * np.sin(2 * np.pi * 5.45 * t) * np.minimum(t / 0.3, 1)
        phase = 2 * np.pi * frequency * np.cumsum(1 + vibrato) / SAMPLE_RATE
        for harmonic in range(1, 18):
            f = frequency * harmonic
            if f >= SAMPLE_RATE * 0.44:
                continue
            formant = 0.7 + 0.48 * math.exp(-((f - 850) / 450) ** 2)
            amplitude = formant / harmonic**1.45 * math.exp(-f / 8500)
            out += amplitude * np.sin(harmonic * phase + 0.07 * harmonic)
        out *= envelope(t, duration, 0.068, 0.20)
        out *= 0.76 + 0.025 * np.sin(2 * np.pi * 3.2 * t)
        out *= 0.20
    elif instrument == "flute":
        vibrato = 0.0011 * np.sin(2 * np.pi * 5.1 * t) * np.minimum(t / 0.32, 1)
        phase = 2 * np.pi * frequency * np.cumsum(1 + vibrato) / SAMPLE_RATE
        for harmonic, amplitude in enumerate([1.0, 0.15, 0.065, 0.022], 1):
            out += amplitude * np.sin(harmonic * phase)
        breath = signal.sosfilt(signal.butter(2, [1800, 6800], fs=SAMPLE_RATE, btype="bandpass", output="sos"), rng.normal(0, 1, length))
        out += 0.013 * breath
        out *= envelope(t, duration, 0.045, 0.16)
        out *= 0.23
    else:
        raise ValueError(f"Unknown voice: {instrument}")

    # Taper the synthesis tail to literal silence before any following edit.
    taper = min(int(0.025 * SAMPLE_RATE), len(out))
    out[-taper:] *= np.linspace(1, 0, taper) ** 2
    return out * velocity


def pan_mono(samples: np.ndarray, position: float) -> np.ndarray:
    angle = (position + 1) * np.pi / 4
    return np.column_stack((samples * math.cos(angle), samples * math.sin(angle)))


def room(stereo: np.ndarray) -> np.ndarray:
    """Small stereo room; sparse early reflections plus soft diffused decay."""
    rng = np.random.default_rng(SEED + 99)
    length = int(1.65 * SAMPLE_RATE)
    t = np.arange(length) / SAMPLE_RATE
    late = rng.normal(0, 1, (length, 2))
    late = signal.sosfilt(signal.butter(2, 5500, fs=SAMPLE_RATE, output="sos"), late, axis=0)
    late *= (np.exp(-t / 0.27) * np.minimum(t / 0.04, 1))[:, None]
    late *= 0.00125
    for channel in (0, 1):
        for delay, gain in [(0.026, 0.075), (0.041, 0.058), (0.067, 0.034), (0.093, 0.025)]:
            late[int((delay + channel * 0.0037) * SAMPLE_RATE), channel] += gain
    out = stereo.copy()
    for channel in (0, 1):
        wet = signal.fftconvolve(stereo[:, channel] * 0.78 + stereo[:, 1 - channel] * 0.22, late[:, channel])
        out[:, channel] += wet[:len(stereo)]
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", default=".tmp/score-commercial/score-assets")
    parser.add_argument("--output-dir", default=".tmp/score-commercial/audio")
    parser.add_argument("--original", default="original-C")
    parser.add_argument("--edited-c", default="edited-C")
    parser.add_argument("--edited-d", default="edited-D")
    parser.add_argument("--ensemble-d", default="ensemble-D")
    args = parser.parse_args()
    source_dir, output_dir = Path(args.source_dir).resolve(), Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    variant_names = [args.original, args.edited_c, args.edited_d, args.ensemble_d]
    sources = {name: read_notes(source_dir / f"{name}.notes.json") for name in variant_names}
    size = int(DURATION * SAMPLE_RATE)
    stems = {name: np.zeros((size, 2), dtype=np.float64) for name in ("piano", "violin", "flute")}
    events: list[dict] = []

    def add_note(instrument: str, note: dict, variant: str, start: float, duration: float, gain: float, section: str, *, reference=True) -> None:
        index = len(events)
        voice = synthesize(instrument, int(note["midi"]), duration, gain, SEED + index)
        pan = {"piano": -0.10, "violin": -0.29, "flute": 0.32}[instrument]
        stereo = pan_mono(voice, pan)
        first = int(round(start * SAMPLE_RATE))
        stop = min(size, first + len(stereo))
        if stop <= first:
            return
        stems[instrument][first:stop] += stereo[:stop - first]
        events.append({
            "instrument": instrument, "midi": int(note["midi"]), "pitch": note.get("pitch"),
            "startSeconds": round(start, 9), "durationSeconds": round(duration, 9),
            "endSeconds": round(start + duration, 9), "velocity": round(gain, 5),
            "section": section, "sourceVariant": variant,
            "sourceNoteIndex": note.get("noteIndex", index) if reference else None,
            "sourcePartId": note.get("partId"), "sourceMeasureIndex": note.get("measureIndex"),
            "sourceStartBeat": note.get("startBeat"), "sourceDurationBeats": note.get("durationBeats"),
            "scoreHighlight": reference,
        })

    def phrase(variant: str, source_start: float, source_end: float, film_start_beat: float, section: str, violin_gain: float=0) -> None:
        for note in sources[variant]:
            beat = float(note["startBeat"])
            if not source_start <= beat < source_end:
                continue
            start = (film_start_beat + beat - source_start) * BEAT
            duration = min(float(note["durationBeats"]), source_end - beat) * BEAT
            # Slightly detached articulation keeps rapid notes intelligible.
            duration *= 0.91 if duration < 0.4 else 0.95
            accent = 1.0 if abs(beat % 4) < 1e-6 else 0.91
            add_note("piano", note, variant, start, duration, 0.80 * accent, section)
            if violin_gain:
                # This layer doubles the exact notated melody, no invented notes.
                add_note("violin", note, variant, start, duration, violin_gain * accent, section)

    phrase(args.original, 0, 8, 0, "intro")
    phrase(args.edited_c, 0, 8, 8, "edit")
    phrase(args.edited_d, 0, 8, 16, "transpose", violin_gain=0.18)
    phrase(args.edited_d, 8, 16, 24, "hear", violin_gain=0.31)

    # The ensemble is sounded exactly as supplied by the scored arrangement.
    for note in sources[args.ensemble_d]:
        part = str(note.get("partId", "")).lower()
        instrument = "violin" if "violin" in part else "flute" if "flute" in part else "piano"
        start = (32 + float(note["startBeat"])) * BEAT
        duration = float(note["durationBeats"]) * BEAT * (0.97 if instrument != "piano" else 0.94)
        gain = {"piano": 0.86, "violin": 0.75, "flute": 0.68}[instrument]
        add_note(instrument, note, args.ensemble_d, start, duration, gain, "ensemble")

    # D-major cadence on the brand frame; explicitly marked unscored so the
    # renderer does not highlight arbitrary melody notes for the closing chord.
    cadence = 48 * BEAT
    closing = [("piano", 38, 0.62), ("piano", 50, 0.54), ("piano", 57, 0.43),
               ("piano", 62, 0.52), ("piano", 66, 0.40), ("piano", 69, 0.31),
               ("violin", 66, 0.27), ("flute", 74, 0.23)]
    for index, (instrument, midi, gain) in enumerate(closing):
        add_note(instrument, {"midi": midi, "pitch": {38:"D2",50:"D3",57:"A3",62:"D4",66:"F#4",69:"A4",74:"D5"}[midi]},
                 "closing-cadence", cadence + min(index, 5) * 0.018, 1.7 if instrument == "piano" else 1.85, gain, "outro", reference=False)

    dry = sum(stems.values())
    mixed = room(dry)
    # DC removal and a very small master saturation prevent brittle peaks.
    mixed = signal.sosfilt(signal.butter(2, 32, fs=SAMPLE_RATE, btype="highpass", output="sos"), mixed, axis=0)
    mixed = np.tanh(mixed * 1.12) / 1.12
    fade = int(1.7 * SAMPLE_RATE)
    mixed[-fade:] *= (np.cos(np.linspace(0, np.pi / 2, fade)) ** 2)[:, None]
    mixed[:480] *= np.linspace(0, 1, 480)[:, None]
    mixed[-1] = 0
    gain = min(0.84 / np.max(np.abs(mixed)), 10 ** (-19 / 20) / np.sqrt(np.mean(mixed**2)))
    mixed *= gain
    for name, samples in stems.items():
        wav_write(output_dir / f"stem-{name}.wav", samples * gain)
    pre_master = output_dir / "first-light-premaster.wav"
    wav_write(pre_master, mixed)

    output = output_dir / "first-light-30s.wav"
    common = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "info", "-i", str(pre_master)]
    first = subprocess.run(common + ["-af", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json", "-f", "null", "NUL"], capture_output=True, text=True, check=True)
    measurement = json.loads(re.findall(r"\{[\s\S]*?\}", first.stderr)[-1])
    normalize = ("loudnorm=I=-16:TP=-1.5:LRA=9:linear=true:"
                 f"measured_I={measurement['input_i']}:measured_TP={measurement['input_tp']}:"
                 f"measured_LRA={measurement['input_lra']}:measured_thresh={measurement['input_thresh']}:"
                 f"offset={measurement['target_offset']},apad,atrim=duration=30")
    subprocess.run(common + ["-af", normalize, "-ar", str(SAMPLE_RATE), "-ac", "2", "-c:a", "pcm_s16le", str(output)], capture_output=True, text=True, check=True)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(output), "-c:a", "aac", "-b:a", "192k", str(output_dir / "first-light-30s.m4a")], check=True)

    with wave.open(str(output), "rb") as wav:
        frames = wav.getnframes()
        final = np.frombuffer(wav.readframes(frames), dtype="<i2").astype(np.float64) / 32768
    assert frames == size
    assert np.max(np.abs(final)) < 0.98, "Clipped master"
    assert np.max(np.abs(final[-960:])) < 0.002, "Abrupt ending"
    film_sections = [
        {"id":"intro", "start":0, "end":8*BEAT, "variant":args.original, "sourceStartBeat":0},
        {"id":"edit", "start":8*BEAT, "end":16*BEAT, "variant":args.edited_c, "sourceStartBeat":0},
        {"id":"transpose", "start":16*BEAT, "end":24*BEAT, "variant":args.edited_d, "sourceStartBeat":0},
        {"id":"hear", "start":24*BEAT, "end":32*BEAT, "variant":args.edited_d, "sourceStartBeat":8},
        {"id":"ensemble", "start":32*BEAT, "end":48*BEAT, "variant":args.ensemble_d, "sourceStartBeat":0},
        {"id":"outro", "start":48*BEAT, "end":30, "variant":None},
    ]
    manifest = {
        "title":"FIRST LIGHT", "purpose":"Original advertising soundtrack; not realtime browser audio",
        "durationSeconds":DURATION, "sampleRate":SAMPLE_RATE, "channels":2, "tempoBpm":TEMPO,
        "composition":"Original melody and arrangement composed for this project",
        "renderer":"Deterministic additive piano, violin and flute synthesis; no external samples",
        "ending":"D-major original cadence, natural release, final 1.7-second tail fade",
        "sections":film_sections, "events":sorted(events,key=lambda e:(e['startSeconds'],e['instrument'])),
        "sources":[{"variant":v,"file":str(source_dir/f'{v}.notes.json'),"sha256":hashlib.sha256((source_dir/f'{v}.notes.json').read_bytes()).hexdigest()} for v in variant_names],
        "master":{"file":str(output), "bytes":output.stat().st_size, "peakDbfs":round(20*math.log10(np.max(np.abs(final))),3),
                  "rmsDbfs":round(20*math.log10(np.sqrt(np.mean(final**2))),3), "sha256":hashlib.sha256(output.read_bytes()).hexdigest()},
        "normalizationInput":measurement,
    }
    (output_dir / "timeline.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (output_dir / "copy.json").write_text(json.dumps({"headlines":["Your score. In motion.","Make every note yours.","Find your perfect key.","Hear it come alive.","One score. More voices.","Bring your music to life."],"cta":"Start with your score.","supportingExportLine":"MusicXML · MIDI · Audio"},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"audio":str(output),"timeline":str(output_dir/'timeline.json'),"events":len(events),"duration":DURATION,"peakDbfs":manifest['master']['peakDbfs']},ensure_ascii=False))


if __name__ == "__main__":
    main()
