import argparse
import sys


SHARP_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
FLAT_NAMES = ("C", "D-", "D", "E-", "E", "F", "G-", "G", "A-", "A", "B-", "B")


def parse_args():
    parser = argparse.ArgumentParser(description="Transpose a MusicXML score with music21.")
    parser.add_argument("source_path")
    parser.add_argument("output_path")
    parser.add_argument("semitones", type=int)
    parser.add_argument("--target-tonic")
    parser.add_argument("--target-mode", default="major")
    parser.add_argument("--target-fifths", type=int)
    parser.add_argument("--spelling", choices=("auto", "preserve", "prefer-sharps", "prefer-flats"), default="auto")
    return parser.parse_args()


def respell_score(score, policy: str, target_fifths: int | None) -> None:
    if policy == "preserve":
        return
    prefer_flats = policy == "prefer-flats" or (policy == "auto" and target_fifths is not None and target_fifths < 0)
    names = FLAT_NAMES if prefer_flats else SHARP_NAMES
    for element in score.recurse().notes:
        pitches = getattr(element, "pitches", None) or (getattr(element, "pitch", None),)
        for current_pitch in pitches:
            if current_pitch is None:
                continue
            midi = int(round(current_pitch.midi))
            current_pitch.nameWithOctave = f"{names[midi % 12]}{midi // 12 - 1}"


def main() -> int:
    args = parse_args()

    try:
        from music21 import chord, converter, harmony, interval, key, note
    except Exception as exc:
        print(f"Could not import music21: {exc}", file=sys.stderr)
        return 1

    try:
        score = converter.parse(args.source_path)
        # Score JSON currently stores MIDI program/name but not an explicit
        # written-to-sounding transposition. music21 infers one from names such
        # as "B-flat Clarinet" and would materialize that guess during export.
        # Clear inferred intervals so this adapter preserves the written pitches
        # it received and applies only the requested chromatic shift.
        for instrument in score.recurse().getElementsByClass("Instrument"):
            instrument.transposition = None
        # Stream.transpose() also visits Instrument objects. For transposing
        # instruments that changes their written-pitch interval and then shifts
        # the notes again when MusicXML is written. Restrict the operation to
        # notation elements so every part moves by exactly the requested amount.
        transposed = score.transpose(
            interval.ChromaticInterval(args.semitones),
            classFilterList=(note.Note, chord.Chord, harmony.ChordSymbol, key.KeySignature),
        )
        if args.target_tonic:
            target_key = key.Key(args.target_tonic, args.target_mode)
            key_signatures = list(transposed.recurse().getElementsByClass(key.KeySignature))
            if key_signatures:
                key_signatures[0].sharps = target_key.sharps
        respell_score(transposed, args.spelling, args.target_fifths)
        transposed.write("musicxml", fp=args.output_path)
    except Exception as exc:
        print(f"music21 transposition failed: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
