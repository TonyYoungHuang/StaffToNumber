import type {
  JianpuDocument,
  JianpuAccidentalStrategy,
  JianpuEvent,
  JianpuKey,
  JianpuLyricLine,
  JianpuMeasure,
  JianpuMode,
  JianpuNoteEvent,
  JianpuPitchSystem,
  ScoreHarmony,
  ScoreJson,
  ScoreMeasure,
  ScorePitch,
  ScoreTimeSignature,
} from "@score/shared";

const MAJOR_TONICS_BY_FIFTHS = new Map<number, string>([
  [-7, "Cb"],
  [-6, "Gb"],
  [-5, "Db"],
  [-4, "Ab"],
  [-3, "Eb"],
  [-2, "Bb"],
  [-1, "F"],
  [0, "C"],
  [1, "G"],
  [2, "D"],
  [3, "A"],
  [4, "E"],
  [5, "B"],
  [6, "F#"],
  [7, "C#"],
]);

const MINOR_TONICS_BY_FIFTHS = new Map<number, string>([
  [-7, "Ab"],
  [-6, "Eb"],
  [-5, "Bb"],
  [-4, "F"],
  [-3, "C"],
  [-2, "G"],
  [-1, "D"],
  [0, "A"],
  [1, "E"],
  [2, "B"],
  [3, "F#"],
  [4, "C#"],
  [5, "G#"],
  [6, "D#"],
  [7, "A#"],
]);

const PITCH_CLASS_BY_STEP = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
} as const;

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11] as const;
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10] as const;
const PITCH_STEPS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const HARMONY_KIND_SUFFIXES = new Map<string, string>([
  ["major", ""],
  ["minor", "m"],
  ["dominant", "7"],
  ["major-seventh", "maj7"],
  ["minor-seventh", "m7"],
  ["diminished", "dim"],
  ["augmented", "aug"],
  ["suspended-fourth", "sus4"],
  ["suspended-second", "sus2"],
  ["none", "N.C."],
]);

function tonicMidiFromName(name: string) {
  const match = /^([A-G])([#b]{0,2})$/.exec(name);
  if (!match) return 60;
  const alter = match[2].split("").reduce((total, accidental) => total + (accidental === "#" ? 1 : -1), 0);
  return 60 + PITCH_CLASS_BY_STEP[match[1] as keyof typeof PITCH_CLASS_BY_STEP] + alter;
}

function midiFromPitch(pitch: ScorePitch) {
  return (pitch.octave + 1) * 12 + PITCH_CLASS_BY_STEP[pitch.step] + pitch.alter;
}

function keyFromFifths(fifths: number, mode?: string): JianpuKey {
  const normalizedMode: JianpuMode = mode === "minor" ? "minor" : "major";
  const tonic =
    normalizedMode === "minor"
      ? MINOR_TONICS_BY_FIFTHS.get(fifths) ?? "A"
      : MAJOR_TONICS_BY_FIFTHS.get(fifths) ?? "C";

  return {
    tonic,
    mode: normalizedMode,
    fifths,
    display: `${tonic} ${normalizedMode}`,
  };
}

function firstKey(score: ScoreJson) {
  for (const measure of score.measures) {
    if (measure.attributes?.key) {
      return keyFromFifths(measure.attributes.key.fifths, measure.attributes.key.mode);
    }
  }

  return keyFromFifths(0, "major");
}

function firstTimeSignature(score: ScoreJson) {
  return score.measures.find((measure) => measure.attributes?.time)?.attributes?.time;
}

function timeSignatureText(timeSignature: ScoreTimeSignature | undefined) {
  return timeSignature ? (timeSignature.senzaMisura ? "free" : `${timeSignature.beats}/${timeSignature.beatType}`) : undefined;
}

function jianpuKeyText(key: JianpuKey) {
  return `1=${key.tonic} (${key.mode})`;
}

function sameJianpuKey(left: JianpuKey, right: JianpuKey) {
  return left.tonic === right.tonic && left.mode === right.mode && left.fifths === right.fifths;
}

function sameTimeSignature(left: ScoreTimeSignature | undefined, right: ScoreTimeSignature | undefined) {
  return left?.beats === right?.beats && left?.beatType === right?.beatType && Boolean(left?.senzaMisura) === Boolean(right?.senzaMisura);
}

function tokenForNote(degree: number, accidental: number, octaveShift: number) {
  const accidentalPrefix = accidental > 0 ? "#".repeat(accidental) : accidental < 0 ? "b".repeat(Math.abs(accidental)) : "";
  const octaveSuffix = octaveShift > 0 ? "'".repeat(octaveShift) : octaveShift < 0 ? ",".repeat(Math.abs(octaveShift)) : "";
  return `${accidentalPrefix}${degree}${octaveSuffix}`;
}

function durationUnitsFromType(durationType: string | undefined, divisions: number, fallbackDuration: number) {
  switch (durationType) {
    case "whole":
      return divisions * 4;
    case "half":
      return divisions * 2;
    case "quarter":
      return divisions;
    case "eighth":
      return Math.max(1, divisions / 2);
    case "16th":
      return Math.max(1, divisions / 4);
    case "32nd":
      return Math.max(1, divisions / 8);
    case "64th":
      return Math.max(1, divisions / 16);
    default:
      return fallbackDuration;
  }
}

function durationSuffix(input: { duration: number; durationType?: string; dots: number; divisions: number }) {
  const divisions = input.divisions > 0 ? input.divisions : 1;
  const durationUnits = durationUnitsFromType(input.durationType, divisions, input.duration);
  let suffix = "";

  if (durationUnits >= divisions) {
    const quarters = Math.max(1, Math.round(durationUnits / divisions));
    suffix = "-".repeat(Math.max(0, quarters - 1));
  } else {
    const ratio = divisions / durationUnits;
    const shortMarks = Number.isFinite(ratio) && ratio > 1 ? Math.round(Math.log2(ratio)) : 0;
    suffix = "_".repeat(Math.max(0, shortMarks));
  }

  return `${suffix}${".".repeat(input.dots)}`;
}

function normalizeLyricText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function lyricLinesFromEvents(events: JianpuEvent[]): JianpuLyricLine[] {
  const lyricNumbers = Array.from(
    new Set(
      events.flatMap((event) =>
        event.type === "note"
          ? (event.lyrics ?? [])
              .map((lyric) => lyric.number?.trim() || "1")
              .filter(Boolean)
          : [],
      ),
    ),
  ).sort((left, right) => Number(left) - Number(right) || left.localeCompare(right));

  return lyricNumbers
    .map((number) => {
      const text = events
        .map((event) => {
          if (event.type === "rest") {
            return "-";
          }

          const lyric = (event.lyrics ?? []).find((item) => (item.number?.trim() || "1") === number);
          return lyric ? normalizeLyricText(lyric.text) : "_";
        })
        .join(" ")
        .trim();

      return {
        number,
        text,
      };
    })
    .filter((line) => line.text.replace(/[_\-\s]/g, "").length > 0);
}

function partTextFromMeasures(measures: JianpuMeasure[]) {
  if (measures.length === 0) {
    return "";
  }

  const notationLine = `| ${measures.map((measure) => measure.text).join(" | ")} |`;
  const pickupLine = measures[0]?.implicit ? "Pickup: yes" : "";
  const hasKeyChanges = measures.some((measure, index) => index > 0 && !sameJianpuKey(measure.key, measures[index - 1].key));
  const keyLine = hasKeyChanges ? `Keys: | ${measures.map((measure) => jianpuKeyText(measure.key)).join(" | ")} |` : "";
  const hasMeterChanges = measures.some((measure, index) => index > 0 && !sameTimeSignature(measure.timeSignature, measures[index - 1].timeSignature));
  const meterLine = hasMeterChanges ? `Meters: | ${measures.map((measure) => timeSignatureText(measure.timeSignature) ?? "").join(" | ")} |` : "";
  const chordLine = measures.some((measure) => measure.chordSymbols.length > 0)
    ? `Chords: | ${measures.map((measure) => measure.chordSymbols.join(" / ")).join(" | ")} |`
    : "";
  const lyricNumbers = Array.from(new Set(measures.flatMap((measure) => measure.lyricLines.map((line) => line.number)))).sort(
    (left, right) => Number(left) - Number(right) || left.localeCompare(right),
  );
  const lyricLines = lyricNumbers.map((number) => {
    const lineByMeasure = new Map(measures.flatMap((measure) => measure.lyricLines.filter((line) => line.number === number).map((line) => [measure.id, line.text])));
    return `Lyrics ${number}: | ${measures.map((measure) => lineByMeasure.get(measure.id) ?? "").join(" | ")} |`;
  });

  return [notationLine, pickupLine, keyLine, meterLine, chordLine, ...lyricLines].filter(Boolean).join("\n");
}

function accidentalText(alter: number) {
  if (alter > 0) {
    return "#".repeat(alter);
  }

  if (alter < 0) {
    return "b".repeat(Math.abs(alter));
  }

  return "";
}

function harmonyText(harmony: ScoreHarmony) {
  if (harmony.text?.trim()) {
    return harmony.text.trim();
  }

  const suffix = HARMONY_KIND_SUFFIXES.get(harmony.kind) ?? harmony.kind;
  if (suffix === "N.C.") {
    return suffix;
  }

  return `${harmony.rootStep}${accidentalText(harmony.rootAlter)}${suffix}`;
}

function chordSymbolsFromMeasure(measure: ScoreMeasure) {
  return Array.from(new Set((measure.harmonies ?? []).map(harmonyText).filter(Boolean)));
}

function jianpuNoteFromPitch(input: {
  id: string;
  pitch: ScorePitch;
  key: JianpuKey;
  duration: number;
  durationType?: string;
  dots: number;
  chord: boolean;
  voice?: string;
  staff?: number;
  ties: JianpuNoteEvent["ties"];
  slurs: JianpuNoteEvent["slurs"];
  ornaments: JianpuNoteEvent["ornaments"];
  timeModification: JianpuNoteEvent["timeModification"];
  tuplets: JianpuNoteEvent["tuplets"];
  lyrics: JianpuNoteEvent["lyrics"];
  divisions: number;
  pitchSystem: JianpuPitchSystem;
  accidentalStrategy: JianpuAccidentalStrategy;
}): JianpuNoteEvent {
  const referenceTonic = input.pitchSystem === "fixed-do" ? "C" : input.key.tonic;
  const referenceMode: JianpuMode = input.pitchSystem === "fixed-do" ? "major" : input.key.mode;
  const tonicMidi = tonicMidiFromName(referenceTonic);
  const pitchMidi = midiFromPitch(input.pitch);
  const scale = referenceMode === "minor" ? MINOR_SCALE : MAJOR_SCALE;
  const tonicStep = (/^([A-G])/.exec(referenceTonic)?.[1] ?? "C") as ScorePitch["step"];
  const tonicStepIndex = PITCH_STEPS.indexOf(tonicStep);
  const pitchStepIndex = PITCH_STEPS.indexOf(input.pitch.step);
  let degreeIndex = (pitchStepIndex - tonicStepIndex + PITCH_STEPS.length) % PITCH_STEPS.length;
  let baseDegreeOctave = 4 + Math.floor((tonicStepIndex + degreeIndex) / PITCH_STEPS.length);
  let octaveShift = input.pitch.octave - baseDegreeOctave;
  let accidental = pitchMidi - (tonicMidi + scale[degreeIndex] + octaveShift * 12);
  if (input.accidentalStrategy !== "preserve") {
    const candidates = scale.flatMap((offset, candidateDegreeIndex) =>
      Array.from({ length: 15 }, (_, index) => index - 7).map((candidateOctaveShift) => {
        const candidateAccidental = pitchMidi - (tonicMidi + offset + candidateOctaveShift * 12);
        const directionPenalty = input.accidentalStrategy === "prefer-sharps"
          ? (candidateAccidental < 0 ? 0.25 : 0)
          : (candidateAccidental > 0 ? 0.25 : 0);
        return { degreeIndex: candidateDegreeIndex, octaveShift: candidateOctaveShift, accidental: candidateAccidental, score: Math.abs(candidateAccidental) + directionPenalty };
      }),
    ).sort((left, right) => left.score - right.score || Math.abs(left.octaveShift) - Math.abs(right.octaveShift));
    const preferred = candidates[0];
    degreeIndex = preferred.degreeIndex;
    octaveShift = preferred.octaveShift;
    accidental = preferred.accidental;
  }
  const degree = (degreeIndex + 1) as JianpuNoteEvent["degree"];
  const noteToken = `${tokenForNote(degree, accidental, octaveShift)}${durationSuffix({
    duration: input.duration,
    durationType: input.durationType,
    dots: input.dots,
    divisions: input.divisions,
  })}`;
  const tiePrefix = input.ties?.some((tie) => tie.type === "stop") ? "~" : "";
  const tieSuffix = input.ties?.some((tie) => tie.type === "start") ? "~" : "";
  const slurSuffix = (input.slurs ?? [])
    .map((slur) => `{slur:${slur.type}${slur.number ? `:${slur.number}` : ""}}`)
    .join("");
  const ornamentSuffix = (input.ornaments ?? [])
    .map((ornament) => {
      const placement = ornament.placement ?? (ornament.value ? "-" : undefined);
      return `{orn:${ornament.type}${placement ? `:${placement}` : ""}${ornament.value ? `:${ornament.value}` : ""}}`;
    })
    .join("");
  const tupletMarker = input.tuplets?.find((tuplet) => tuplet.type === "start" || tuplet.type === "stop");
  const tupletSuffix = input.timeModification
    ? `{${input.timeModification.actualNotes}:${input.timeModification.normalNotes}${tupletMarker ? `:${tupletMarker.type}` : ""}}`
    : "";
  const token = `${tiePrefix}${noteToken}${tieSuffix}${slurSuffix}${ornamentSuffix}${tupletSuffix}`;

  return {
    id: input.id,
    type: "note",
    degree,
    accidental,
    octaveShift,
    duration: input.duration,
    durationType: input.durationType,
    dots: input.dots,
    chord: input.chord,
    voice: input.voice,
    staff: input.staff,
    ties: input.ties,
    slurs: input.slurs,
    ornaments: input.ornaments,
    timeModification: input.timeModification,
    tuplets: input.tuplets,
    lyrics: input.lyrics,
    sourcePitch: input.pitch,
    token,
  };
}

function measureNotationText(scoreEvents: ScoreMeasure["events"], events: JianpuEvent[]) {
  const multipleVoices = new Set(scoreEvents.map((event) => event.voice ?? "1")).size > 1;
  const multipleStaffs = new Set(scoreEvents.map((event) => event.staff ?? 1)).size > 1 || scoreEvents.some((event) => (event.staff ?? 1) !== 1);
  const groups: Array<{ scoreEvents: ScoreMeasure["events"]; events: JianpuEvent[] }> = [];
  for (const [index, scoreEvent] of scoreEvents.entries()) {
    const event = events[index];
    if (!event) continue;
    const previous = groups.at(-1);
    const previousAnchor = previous?.scoreEvents[0];
    if (
      scoreEvent.type === "note" &&
      scoreEvent.chord &&
      previous &&
      previousAnchor?.type === "note" &&
      (previousAnchor.voice ?? "1") === (scoreEvent.voice ?? "1") &&
      (previousAnchor.staff ?? 1) === (scoreEvent.staff ?? 1)
    ) {
      previous.scoreEvents.push(scoreEvent);
      previous.events.push(event);
    } else {
      groups.push({ scoreEvents: [scoreEvent], events: [event] });
    }
  }
  return groups.map((group) => {
    const anchor = group.scoreEvents[0];
    const contextPrefix = multipleVoices || multipleStaffs
      ? `v${anchor.voice ?? "1"}${(anchor.staff ?? 1) !== 1 ? `@s${anchor.staff}` : ""}:`
      : "";
    if (group.events.length === 1) return `${contextPrefix}${group.events[0].token}`;
    return `${contextPrefix}[${group.events.map((event) => event.token).join(",")}]`;
  }).join(" ");
}

function measureProjectionWarnings(measure: ScoreMeasure) {
  const warnings: string[] = [];
  for (const event of measure.events) {
    const unsupported: string[] = [];
    if (event.fermatas?.length) unsupported.push("fermatas");
    if (event.beams?.length) unsupported.push("beam grouping");
    if (event.type === "note") {
      if (event.articulations?.length) unsupported.push("articulations");
      if (event.fingerings?.length) unsupported.push("fingerings");
      if (event.grace) unsupported.push("grace-note timing");
    }
    if (unsupported.length > 0) {
      warnings.push(`Jianpu text does not yet encode ${unsupported.join(", ")} at event ${event.id}; the data remains preserved in Score JSON.`);
    }
  }

  const measureFields = [
    [measure.tempos?.length, "tempo marks"],
    [measure.dynamics?.length, "dynamics"],
    [measure.wedges?.length, "wedges"],
    [measure.navigationMarks?.length, "navigation marks"],
    [measure.rehearsalMarks?.length, "rehearsal marks"],
    [measure.barlines?.some((barline) => barline.repeatDirection || barline.ending || barline.barStyle), "special barlines and repeats"],
    [measure.layout, "layout hints"],
  ] as const;
  const unsupportedMeasureFields = measureFields.filter(([present]) => Boolean(present)).map(([, label]) => label);
  if (unsupportedMeasureFields.length > 0) {
    warnings.push(`Jianpu text does not yet encode ${unsupportedMeasureFields.join(", ")} in measure ${measure.number}; the data remains preserved in Score JSON.`);
  }
  return warnings;
}

function convertMeasure(
  measure: ScoreMeasure,
  activeKey: JianpuKey,
  activeDivisions: number,
  activeTimeSignature: ScoreTimeSignature | undefined,
  options: Required<JianpuConversionOptions>,
): JianpuMeasure {
  const key = measure.attributes?.key ? keyFromFifths(measure.attributes.key.fifths, measure.attributes.key.mode) : activeKey;
  const timeSignature = measure.attributes?.time ?? activeTimeSignature;
  const divisions = measure.attributes?.divisions && measure.attributes.divisions > 0 ? measure.attributes.divisions : activeDivisions;
  const events = measure.events.map((event): JianpuEvent => {
    if (event.type === "rest") {
      return {
        id: event.id,
        type: "rest",
        duration: event.duration,
        durationType: event.durationType,
        dots: event.dots,
        measureRest: event.measureRest,
        voice: event.voice,
        staff: event.staff,
        timeModification: event.timeModification,
        tuplets: event.tuplets,
        token: `0${durationSuffix({
          duration: event.duration,
          durationType: event.durationType,
          dots: event.dots,
          divisions,
        })}${event.timeModification ? `{${event.timeModification.actualNotes}:${event.timeModification.normalNotes}${event.tuplets?.[0] ? `:${event.tuplets[0].type}` : ""}}` : ""}`,
      };
    }

    return jianpuNoteFromPitch({
      id: event.id,
      pitch: event.pitch,
      key,
      duration: event.duration,
      durationType: event.durationType,
      dots: event.dots,
      chord: event.chord,
      voice: event.voice,
      staff: event.staff,
      ties: event.ties,
      slurs: event.slurs,
      ornaments: event.ornaments,
      timeModification: event.timeModification,
      tuplets: event.tuplets,
      lyrics: event.lyrics ?? [],
      divisions,
      pitchSystem: options.pitchSystem,
      accidentalStrategy: options.accidentalStrategy,
    });
  });

  return {
    id: measure.id,
    number: measure.number,
    sequence: measure.sequence,
    implicit: measure.implicit,
    key,
    timeSignature,
    events,
    text: measureNotationText(measure.events, events),
    chordSymbols: chordSymbolsFromMeasure(measure),
    lyricLines: lyricLinesFromEvents(events),
  };
}

export type JianpuConversionOptions = {
  pitchSystem?: JianpuPitchSystem;
  accidentalStrategy?: JianpuAccidentalStrategy;
};

export function scoreJsonToJianpu(score: ScoreJson, generatedAt = new Date().toISOString(), inputOptions: JianpuConversionOptions = {}): JianpuDocument {
  const options: Required<JianpuConversionOptions> = {
    pitchSystem: inputOptions.pitchSystem ?? "movable-do",
    accidentalStrategy: inputOptions.accidentalStrategy ?? "preserve",
  };
  const documentKey = firstKey(score);
  const documentTimeSignature = firstTimeSignature(score);
  const warnings: string[] = [];
  const parts = score.parts.map((part) => {
    let activeKey = documentKey;
    let activeTimeSignature = documentTimeSignature;
    let activeDivisions = 1;
    const measures = score.measures
      .filter((measure) => measure.partId === part.id)
      .map((measure) => {
        if (measure.attributes?.divisions && measure.attributes.divisions > 0) {
          activeDivisions = measure.attributes.divisions;
        }
        const convertedMeasure = convertMeasure(measure, activeKey, activeDivisions, activeTimeSignature, options);
        warnings.push(...measureProjectionWarnings(measure));
        activeKey = convertedMeasure.key;
        activeTimeSignature = convertedMeasure.timeSignature;
        return convertedMeasure;
      });

    if (measures.length === 0) {
      warnings.push(`Part ${part.id} has no measures to convert to Jianpu.`);
    }

    return {
      id: part.id,
      name: part.name,
      measures,
      text: partTextFromMeasures(measures),
    };
  });

  const text = parts
    .map((part) =>
      [
        `# ${part.name}`,
        jianpuKeyText(documentKey),
        `System: ${options.pitchSystem}`,
        `Accidentals: ${options.accidentalStrategy}`,
        documentTimeSignature ? `Meter: ${timeSignatureText(documentTimeSignature)}` : "",
        part.text,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  return {
      schemaVersion: 1,
    title: score.title,
    key: documentKey,
    timeSignature: documentTimeSignature,
    metadata: {
      sourceRevisionParser: score.metadata.parser,
      generatedAt,
      measureCount: score.metadata.measureCount,
      noteCount: score.metadata.noteCount,
      restCount: score.metadata.restCount,
      warnings,
      pitchSystem: options.pitchSystem,
      accidentalStrategy: options.accidentalStrategy,
    },
    parts,
    text,
  };
}
