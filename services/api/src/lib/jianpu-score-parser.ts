import type {
  JianpuAccidentalStrategy,
  JianpuMode,
  JianpuPitchSystem,
  ScoreEvent,
  ScoreHarmony,
  ScoreImportDiagnostic,
  ScoreJson,
  ScoreLyric,
  ScoreMeasure,
  ScoreMeasureAttributes,
  ScoreNoteEvent,
  ScoreOrnament,
  ScorePitch,
  ScorePitchStep,
  ScoreRestEvent,
  ScoreSlur,
} from "@score/shared";

const PITCH_CLASS_BY_STEP = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
} as const;

const MAJOR_FIFTHS_BY_TONIC = new Map<string, number>([
  ["Cb", -7],
  ["Gb", -6],
  ["Db", -5],
  ["Ab", -4],
  ["Eb", -3],
  ["Bb", -2],
  ["F", -1],
  ["C", 0],
  ["G", 1],
  ["D", 2],
  ["A", 3],
  ["E", 4],
  ["B", 5],
  ["F#", 6],
  ["C#", 7],
]);

const MINOR_FIFTHS_BY_TONIC = new Map<string, number>([
  ["Ab", -7],
  ["Eb", -6],
  ["Bb", -5],
  ["F", -4],
  ["C", -3],
  ["G", -2],
  ["D", -1],
  ["A", 0],
  ["E", 1],
  ["B", 2],
  ["F#", 3],
  ["C#", 4],
  ["G#", 5],
  ["D#", 6],
  ["A#", 7],
]);

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11] as const;
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10] as const;
const PITCH_STEPS: ScorePitchStep[] = ["C", "D", "E", "F", "G", "A", "B"];

type ParsedJianpuHeader = {
  title: string;
  tonic: string;
  mode: JianpuMode;
  beats: string;
  beatType: string;
  measureKeys: Array<{ tonic: string; mode: JianpuMode } | undefined>;
  measureMeters: Array<{ beats: string; beatType: string; senzaMisura?: boolean } | undefined>;
  measureChords: string[][];
  measureLyrics: Map<string, string[][]>;
  pickup?: boolean;
  senzaMisura: boolean;
  pitchSystem: JianpuPitchSystem;
  accidentalStrategy: JianpuAccidentalStrategy;
  bodyLines: JianpuSourceLine[];
};

type JianpuSourceLine = { text: string; line: number; start: number };
type JianpuSourceToken = { value: string; line: number; column: number; start: number; end: number };

type JianpuParseInput = {
  text: string;
  title?: string;
  sourceFileId?: string | null;
  sourceOriginalName?: string;
  importedAt: string;
  tonic?: string;
  mode?: JianpuMode;
  beats?: string;
  beatType?: string;
};

const HARMONY_KIND_BY_SUFFIX = new Map<string, string>([
  ["", "major"],
  ["m", "minor"],
  ["min", "minor"],
  ["7", "dominant"],
  ["maj7", "major-seventh"],
  ["m7", "minor-seventh"],
  ["min7", "minor-seventh"],
  ["dim", "diminished"],
  ["aug", "augmented"],
  ["sus4", "suspended-fourth"],
  ["sus2", "suspended-second"],
]);

function normalizePitchClass(value: number) {
  return ((value % 12) + 12) % 12;
}

function pitchClassFromName(name: string) {
  const match = /^([A-Ga-g])([#b]{0,2})$/.exec(name.trim());
  if (!match) {
    return 0;
  }

  const step = match[1].toUpperCase() as ScorePitchStep;
  const alter = match[2].split("").reduce((total, accidental) => {
    if (accidental === "#") return total + 1;
    if (accidental === "b") return total - 1;
    return total;
  }, 0);

  return normalizePitchClass(PITCH_CLASS_BY_STEP[step] + alter);
}

function normalizeTonic(input: string) {
  const match = /^([A-Ga-g])([#b]?)$/.exec(input.trim());
  if (!match) {
    return "C";
  }

  return `${match[1].toUpperCase()}${match[2]}`;
}

function parseHeader(input: {
  text: string;
  fallbackTitle: string;
  tonic?: string;
  mode?: JianpuMode;
  beats?: string;
  beatType?: string;
}): ParsedJianpuHeader {
  const bodyLines: JianpuSourceLine[] = [];
  let title = input.fallbackTitle.trim() || "Jianpu score";
  let tonic = normalizeTonic(input.tonic ?? "C");
  let mode: JianpuMode = input.mode ?? "major";
  let beats = input.beats ?? "4";
  let beatType = input.beatType ?? "4";
  let pickup: boolean | undefined;
  let senzaMisura = false;
  let pitchSystem: JianpuPitchSystem = "movable-do";
  let accidentalStrategy: JianpuAccidentalStrategy = "preserve";
  const measureKeys: ParsedJianpuHeader["measureKeys"] = [];
  const measureMeters: ParsedJianpuHeader["measureMeters"] = [];
  const measureChords: string[][] = [];
  const measureLyrics = new Map<string, string[][]>();

  let sourceOffset = 0;
  const sourceLines = input.text.split(/\r?\n/);
  for (const [lineIndex, rawLine] of sourceLines.entries()) {
    const lineStart = sourceOffset;
    sourceOffset += rawLine.length + 1;
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const titleMatch = /^(?:title|标题)\s*[:：]\s*(.+)$/i.exec(line);
    if (titleMatch) {
      title = titleMatch[1].trim() || title;
      continue;
    }

    const headingMatch = /^#\s+(.+)$/.exec(line);
    if (headingMatch) {
      title = headingMatch[1].trim() || title;
      continue;
    }

    const systemMatch = /^(?:system|唱名法)\s*[:：]\s*(movable-do|fixed-do|首调|固定调)$/i.exec(line);
    if (systemMatch) {
      pitchSystem = /^(?:fixed-do|固定调)$/i.test(systemMatch[1]) ? "fixed-do" : "movable-do";
      continue;
    }

    const accidentalStrategyMatch = /^(?:accidentals?|升降号策略)\s*[:：]\s*(preserve|prefer-sharps|prefer-flats|保留原拼写|优先升号|优先降号)$/i.exec(line);
    if (accidentalStrategyMatch) {
      accidentalStrategy = /^(?:prefer-sharps|优先升号)$/i.test(accidentalStrategyMatch[1])
        ? "prefer-sharps"
        : /^(?:prefer-flats|优先降号)$/i.test(accidentalStrategyMatch[1])
          ? "prefer-flats"
          : "preserve";
      continue;
    }

    const keysMatch = /^keys?\s*[:：]\s*(.+)$/i.exec(line);
    if (keysMatch) {
      measureCells(keysMatch[1]).forEach((cell, index) => {
        const parsedKey = parseKeyCell(cell);
        if (parsedKey) {
          measureKeys[index] = parsedKey;
        }
      });
      continue;
    }

    const metersMatch = /^meters?\s*[:：]\s*(.+)$/i.exec(line);
    if (metersMatch) {
      measureCells(metersMatch[1]).forEach((cell, index) => {
        const parsedMeter = parseMeterCell(cell);
        if (parsedMeter) {
          measureMeters[index] = parsedMeter;
        }
      });
      continue;
    }

    const chordsMatch = /^chords?\s*[:：]\s*(.+)$/i.exec(line);
    if (chordsMatch) {
      measureCells(chordsMatch[1]).forEach((cell, index) => {
        measureChords[index] = cell.split("/").map((chord) => chord.trim()).filter(Boolean);
      });
      continue;
    }

    const lyricsMatch = /^(?:lyrics?|歌词)\s*([^\s:：]*)\s*[:：]\s*(.+)$/i.exec(line);
    if (lyricsMatch) {
      const lyricNumber = lyricsMatch[1]?.trim() || "1";
      measureLyrics.set(
        lyricNumber,
        measureCells(lyricsMatch[2]).map((cell) => cell.split(/\s+/).map((item) => item.trim()).filter(Boolean)),
      );
      continue;
    }

    const keyMatch = /1\s*=\s*([A-Ga-g](?:#|b)?)/.exec(line);
    if (keyMatch) {
      tonic = normalizeTonic(keyMatch[1]);
      if (/minor|小调/i.test(line)) {
        mode = "minor";
      } else if (/major|大调/i.test(line)) {
        mode = "major";
      }
      continue;
    }

    const pickupMatch = /^(?:pickup|弱起)\s*[:：]\s*(yes|no|true|false|是|否)$/i.exec(line);
    if (pickupMatch) {
      pickup = /^(?:yes|true|是)$/i.test(pickupMatch[1]);
      continue;
    }

    if (/^(?:(?:time|meter|拍号)\s*[:：]\s*)?(?:free|senza\s+misura|自由拍)$/i.test(line)) {
      beats = "4";
      beatType = "4";
      senzaMisura = true;
      continue;
    }

    const meterMatch = /(?:time|meter|拍号)?\s*[:：]?\s*(\d+)\s*\/\s*(\d+)/i.exec(line);
    if (meterMatch && /(?:time|meter|拍号|^\d+\s*\/\s*\d+$)/i.test(line)) {
      beats = meterMatch[1];
      beatType = meterMatch[2];
      senzaMisura = false;
      continue;
    }

    if (line.startsWith("//")) {
      continue;
    }

    bodyLines.push({ text: rawLine, line: lineIndex + 1, start: lineStart });
    continue;
  }

  return {
    title,
    tonic,
    mode,
    beats,
    beatType,
    measureKeys,
    measureMeters,
    measureChords,
    measureLyrics,
    pickup,
    senzaMisura,
    pitchSystem,
    accidentalStrategy,
    bodyLines,
  };
}

function measureCells(value: string) {
  const cells = value
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  return cells.length > 0 ? cells : [value.trim()].filter(Boolean);
}

function parseKeyCell(value: string): { tonic: string; mode: JianpuMode } | undefined {
  const keyMatch = /1\s*=\s*([A-Ga-g](?:#|b)?)/.exec(value);
  if (!keyMatch) {
    return undefined;
  }

  return {
    tonic: normalizeTonic(keyMatch[1]),
    mode: /minor|小调/i.test(value) ? "minor" : "major",
  };
}

function parseMeterCell(value: string): { beats: string; beatType: string; senzaMisura?: boolean } | undefined {
  if (/^(?:free|senza\s+misura|自由拍)$/i.test(value.trim())) {
    return { beats: "4", beatType: "4", senzaMisura: true };
  }
  const meterMatch = /(\d+)\s*\/\s*(\d+)/.exec(value);
  if (!meterMatch) {
    return undefined;
  }

  return {
    beats: meterMatch[1],
    beatType: meterMatch[2],
  };
}

function tokenize(lines: JianpuSourceLine[]): JianpuSourceToken[] {
  return lines.flatMap((line) => {
    const tokens: JianpuSourceToken[] = [];
    for (const match of line.text.matchAll(/\||\S+/g)) {
      const value = match[0];
      const index = match.index ?? 0;
      tokens.push({
        value,
        line: line.line,
        column: index + 1,
        start: line.start + index,
        end: line.start + index + value.length,
      });
    }
    return tokens;
  });
}

function fifthsForKey(tonic: string, mode: JianpuMode) {
  return (mode === "minor" ? MINOR_FIFTHS_BY_TONIC : MAJOR_FIFTHS_BY_TONIC).get(tonic) ?? 0;
}

function effectiveMeasureKey(header: ParsedJianpuHeader, measureIndex: number) {
  let tonic = header.tonic;
  let mode = header.mode;

  for (let index = 0; index <= measureIndex; index += 1) {
    const key = header.measureKeys[index];
    if (key) {
      tonic = key.tonic;
      mode = key.mode;
    }
  }

  return { tonic, mode };
}

function effectiveMeasureMeter(header: ParsedJianpuHeader, measureIndex: number) {
  let beats = header.beats;
  let beatType = header.beatType;
  let senzaMisura = header.senzaMisura;

  for (let index = 0; index <= measureIndex; index += 1) {
    const meter = header.measureMeters[index];
    if (meter) {
      beats = meter.beats;
      beatType = meter.beatType;
      senzaMisura = Boolean(meter.senzaMisura);
    }
  }

  return { beats, beatType, senzaMisura };
}

function pitchFromDegree(input: {
  degree: number;
  accidental: number;
  octaveShift: number;
  tonic: string;
  mode: JianpuMode;
}): ScorePitch {
  const scale = input.mode === "minor" ? MINOR_SCALE : MAJOR_SCALE;
  const tonicMatch = /^([A-G])([#b]?)$/.exec(input.tonic) ?? ["C", "C", ""];
  const tonicStep = tonicMatch[1] as ScorePitchStep;
  const tonicAlter = tonicMatch[2] === "#" ? 1 : tonicMatch[2] === "b" ? -1 : 0;
  const tonicStepIndex = PITCH_STEPS.indexOf(tonicStep);
  const absoluteStepIndex = tonicStepIndex + input.degree - 1;
  const step = PITCH_STEPS[absoluteStepIndex % PITCH_STEPS.length];
  const octave = 4 + Math.floor(absoluteStepIndex / PITCH_STEPS.length) + input.octaveShift;
  const tonicMidi = 60 + PITCH_CLASS_BY_STEP[tonicStep] + tonicAlter;
  const midi = tonicMidi + scale[input.degree - 1] + input.accidental + input.octaveShift * 12;
  const naturalMidi = (octave + 1) * 12 + PITCH_CLASS_BY_STEP[step];

  return {
    step,
    alter: midi - naturalMidi,
    octave,
  };
}

const JIANPU_DIVISIONS = 16;

function durationTypeFromDivisions(duration: number, divisions = JIANPU_DIVISIONS) {
  if (duration >= divisions * 4) return "whole";
  if (duration >= divisions * 2) return "half";
  if (duration >= divisions) return "quarter";
  if (duration >= divisions / 2) return "eighth";
  if (duration >= divisions / 4) return "16th";
  if (duration >= divisions / 8) return "32nd";
  return "64th";
}

function applyDurationMarks(baseDuration: number, marks: string) {
  let duration = baseDuration;

  for (const mark of marks) {
    if (mark === "_" || mark === "/") {
      duration = Math.max(1, Math.floor(duration / 2));
    }
    if (mark === "-") {
      duration += baseDuration;
    }
  }

  return duration;
}

function addJianpuDiagnostic(input: {
  token: JianpuSourceToken;
  diagnostics: ScoreImportDiagnostic[];
  warnings: string[];
  code: string;
  message: string;
  suggestion?: string;
}) {
  input.diagnostics.push({
    code: input.code,
    severity: "warning",
    message: input.message,
    token: input.token.value,
    line: input.token.line,
    column: input.token.column,
    start: input.token.start,
    end: input.token.end,
    suggestion: input.suggestion,
  });
  input.warnings.push(
    `${input.message} (line ${input.token.line}, column ${input.token.column}, token "${input.token.value}")${input.suggestion ? ` Suggestion: ${input.suggestion}` : ""}`,
  );
}

const JIANPU_ORNAMENT_TYPES = [
  "trill-mark",
  "turn",
  "delayed-turn",
  "inverted-turn",
  "mordent",
  "inverted-mordent",
  "tremolo",
] as const satisfies readonly ScoreOrnament["type"][];

type ParsedJianpuExtensions = {
  remaining: string;
  timeModification?: ScoreEvent["timeModification"];
  tupletMarker?: "start" | "stop";
  slurs: ScoreSlur[];
  ornaments: Array<Omit<ScoreOrnament, "id">>;
};

function parseJianpuExtensions(input: {
  value: string;
  token: JianpuSourceToken;
  warnings: string[];
  diagnostics: ScoreImportDiagnostic[];
}): ParsedJianpuExtensions {
  let remaining = input.value;
  const extensionBodies: string[] = [];
  let suffixMatch = /\{([^{}]+)\}$/.exec(remaining);
  while (suffixMatch) {
    extensionBodies.unshift(suffixMatch[1]);
    remaining = remaining.slice(0, suffixMatch.index);
    suffixMatch = /\{([^{}]+)\}$/.exec(remaining);
  }

  let timeModification: ScoreEvent["timeModification"];
  let tupletMarker: "start" | "stop" | undefined;
  const slurs: ScoreSlur[] = [];
  const ornaments: Array<Omit<ScoreOrnament, "id">> = [];
  for (const body of extensionBodies) {
    const tupletMatch = /^(\d+):(\d+)(?::(start|stop))?$/.exec(body);
    if (tupletMatch) {
      const actualNotes = Number.parseInt(tupletMatch[1], 10);
      const normalNotes = Number.parseInt(tupletMatch[2], 10);
      if (actualNotes < 1 || normalNotes < 1 || actualNotes > 64 || normalNotes > 64) {
        addJianpuDiagnostic({
          token: input.token,
          diagnostics: input.diagnostics,
          warnings: input.warnings,
          code: "JIANPU_INVALID_TUPLET",
          message: "The Jianpu tuplet ratio must use values from 1 to 64.",
          suggestion: "Use a suffix such as {3:2:start}, {3:2}, or {3:2:stop}.",
        });
        continue;
      }
      timeModification = { actualNotes, normalNotes };
      tupletMarker = tupletMatch[3] as "start" | "stop" | undefined;
      continue;
    }

    const slurMatch = /^slur:(start|stop)(?::([A-Za-z0-9_-]{1,20}))?$/.exec(body);
    if (slurMatch) {
      slurs.push({ type: slurMatch[1] as "start" | "stop", ...(slurMatch[2] ? { number: slurMatch[2] } : {}) });
      continue;
    }

    const ornamentMatch = /^orn:([a-z-]+)(?::(above|below|-))?(?::([^:{}]{1,20}))?$/.exec(body);
    if (ornamentMatch && (JIANPU_ORNAMENT_TYPES as readonly string[]).includes(ornamentMatch[1])) {
      ornaments.push({
        type: ornamentMatch[1] as ScoreOrnament["type"],
        ...(ornamentMatch[2] === "above" || ornamentMatch[2] === "below" ? { placement: ornamentMatch[2] } : {}),
        ...(ornamentMatch[3] ? { value: ornamentMatch[3] } : {}),
      });
      continue;
    }

    addJianpuDiagnostic({
      token: input.token,
      diagnostics: input.diagnostics,
      warnings: input.warnings,
      code: "JIANPU_UNSUPPORTED_EXTENSION",
      message: `Unsupported Jianpu extension "{${body}}" was not imported.`,
      suggestion: "Use {3:2:start}, {slur:start:1}, or {orn:trill-mark:above}.",
    });
  }

  return { remaining, timeModification, tupletMarker, slurs, ornaments };
}

function parseTokenToEvents(input: {
  token: JianpuSourceToken;
  eventId: string;
  tonic: string;
  mode: JianpuMode;
  pitchSystem: JianpuPitchSystem;
  warnings: string[];
  diagnostics: ScoreImportDiagnostic[];
}): ScoreEvent[] {
  let value = input.token.value;
  let voice = "1";
  let staff = 1;
  const voiceMatch = /^v([A-Za-z0-9_-]{1,20})(?:@s([1-9]\d{0,2}))?:(.*)$/.exec(value);
  if (voiceMatch) {
    voice = voiceMatch[1];
    staff = voiceMatch[2] ? Number.parseInt(voiceMatch[2], 10) : 1;
    value = voiceMatch[3];
  }
  const globalExtensions = parseJianpuExtensions({ ...input, value });
  value = globalExtensions.remaining;
  const chordMatch = /^\[(.+)]$/.exec(value);
  const memberValues = chordMatch ? chordMatch[1].split(",").map((member) => member.trim()).filter(Boolean) : [value];
  if (memberValues.length === 0) {
    addJianpuDiagnostic({
      token: input.token,
      diagnostics: input.diagnostics,
      warnings: input.warnings,
      code: "JIANPU_EMPTY_CHORD",
      message: "The Jianpu chord does not contain any notes.",
      suggestion: "Use comma-separated chord notes, for example [1,3,5].",
    });
    return [];
  }

  const events: ScoreEvent[] = [];
  for (const [memberIndex, memberValue] of memberValues.entries()) {
    const memberExtensions = parseJianpuExtensions({ ...input, value: memberValue });
    const timeModification = memberExtensions.timeModification ?? globalExtensions.timeModification;
    const tupletMarker = memberExtensions.tupletMarker ?? (memberIndex === 0 ? globalExtensions.tupletMarker : undefined);
    const slurs = [...(memberIndex === 0 ? globalExtensions.slurs : []), ...memberExtensions.slurs];
    const ornaments = [...(memberIndex === 0 ? globalExtensions.ornaments : []), ...memberExtensions.ornaments];
    const match = /^(~)?([#b]*)([0-7])([',]*)([-_/.]*)(~)?$/.exec(memberExtensions.remaining);
    if (!match) {
      addJianpuDiagnostic({
        token: input.token,
        diagnostics: input.diagnostics,
        warnings: input.warnings,
        code: "JIANPU_UNSUPPORTED_TOKEN",
        message: `Unsupported Jianpu token member "${memberValue}" was not imported.`,
        suggestion: "Use 0-7, optional #/b, octave marks ' or ,, duration marks _ - ., ties ~, chords [1,3,5], and contexts such as v2: or v2@s2:.",
      });
      continue;
    }

    const [, tieStop, accidentalText, degreeText, octaveText, marks, tieStart] = match;
    const dots = (marks.match(/\./g) ?? []).length;
    const baseDuration = applyDurationMarks(JIANPU_DIVISIONS, marks.replace(/\./g, ""));
    const duration = baseDuration * (2 - 1 / 2 ** dots);
    const accidental = accidentalText.split("").reduce((total, symbol) => {
      if (symbol === "#") return total + 1;
      if (symbol === "b") return total - 1;
      return total;
    }, 0);
    const octaveShift = octaveText.split("").reduce((total, symbol) => {
      if (symbol === "'") return total + 1;
      if (symbol === ",") return total - 1;
      return total;
    }, 0);
    const id = memberValues.length === 1 ? input.eventId : `${input.eventId}-c${memberIndex + 1}`;
    const tuplets = tupletMarker && memberIndex === 0
      ? [{ id: `${id}-tuplet-1`, type: tupletMarker, number: "1" }]
      : undefined;

    if (degreeText === "0") {
      if (memberValues.length > 1 || tieStop || tieStart) {
        addJianpuDiagnostic({
          token: input.token,
          diagnostics: input.diagnostics,
          warnings: input.warnings,
          code: "JIANPU_INVALID_REST_CONTEXT",
          message: "A rest cannot be a chord member or use a tie marker.",
          suggestion: "Place rest token 0 outside chord brackets and remove ~ markers.",
        });
        continue;
      }
      events.push({
        id,
        type: "rest",
        duration,
        durationType: durationTypeFromDivisions(baseDuration),
        dots,
        voice,
        staff,
        measureRest: false,
        timeModification,
        tuplets,
      } satisfies ScoreRestEvent);
      continue;
    }

    events.push({
      id,
      type: "note",
      pitch: pitchFromDegree({
        degree: Number(degreeText),
        accidental,
        octaveShift,
        tonic: input.pitchSystem === "fixed-do" ? "C" : input.tonic,
        mode: input.pitchSystem === "fixed-do" ? "major" : input.mode,
      }),
      duration,
      durationType: durationTypeFromDivisions(baseDuration),
      dots,
      voice,
      staff,
      chord: memberIndex > 0,
      ties: [
        ...(tieStop ? [{ type: "stop" }] : []),
        ...(tieStart ? [{ type: "start" }] : []),
      ],
      slurs,
      lyrics: [],
      timeModification,
      tuplets,
      ornaments: ornaments.map((ornament, index) => ({ id: `${id}-ornament-${index + 1}`, ...ornament })),
    } satisfies ScoreNoteEvent);
  }
  return events;
}

function extendPreviousEvent(events: ScoreEvent[], token: JianpuSourceToken, warnings: string[], diagnostics: ScoreImportDiagnostic[]) {
  const previous = events.at(-1);
  if (!previous) {
    addJianpuDiagnostic({
      token,
      diagnostics,
      warnings,
      code: "JIANPU_ORPHAN_EXTENSION",
      message: "A standalone duration extension has no previous Jianpu event.",
      suggestion: "Attach - to a note or rest, for example 1- or 0-.",
    });
    return;
  }

  previous.duration += JIANPU_DIVISIONS;
  previous.durationType = durationTypeFromDivisions(previous.duration);
}

function lyricForMeasure(header: ParsedJianpuHeader, measureIndex: number, lyricNumber: string, noteIndex: number) {
  return header.measureLyrics.get(lyricNumber)?.[measureIndex]?.[noteIndex];
}

function applyMeasureLyrics(events: ScoreEvent[], header: ParsedJianpuHeader, measureIndex: number) {
  const lyricNumbers = Array.from(header.measureLyrics.keys()).sort((left, right) => Number(left) - Number(right) || left.localeCompare(right));
  let noteIndex = 0;

  for (const event of events) {
    if (event.type === "rest") {
      continue;
    }

    const lyrics: ScoreLyric[] = [];
    for (const number of lyricNumbers) {
      const lyricText = lyricForMeasure(header, measureIndex, number, noteIndex);
      if (!lyricText || lyricText === "_" || lyricText === "-") {
        continue;
      }

      lyrics.push({
        number,
        syllabic: "single",
        text: lyricText,
      });
    }

    event.lyrics = lyrics;
    noteIndex += 1;
  }
}

function parseHarmony(chord: string, id: string): ScoreHarmony | undefined {
  if (/^(?:N\.?C\.?|none)$/i.test(chord.trim())) {
    return {
      id,
      rootStep: "C",
      rootAlter: 0,
      kind: "none",
      text: "N.C.",
    };
  }

  const match = /^([A-Ga-g])([#b]?)(.*)$/.exec(chord.trim());
  if (!match) {
    return undefined;
  }

  const rootStep = match[1].toUpperCase() as ScorePitchStep;
  const rootAlter = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const suffix = match[3].trim();

  return {
    id,
    rootStep,
    rootAlter,
    kind: HARMONY_KIND_BY_SUFFIX.get(suffix) ?? "major",
    text: chord.trim(),
  };
}

function harmoniesForMeasure(header: ParsedJianpuHeader, measureIndex: number, measureId: string) {
  return (header.measureChords[measureIndex] ?? [])
    .map((chord, index) => parseHarmony(chord, `${measureId}-h${index + 1}`))
    .filter((harmony): harmony is ScoreHarmony => Boolean(harmony));
}

function isPickupMeasure(events: ScoreEvent[], meter: { beats: string; beatType: string; senzaMisura?: boolean }) {
  if (meter.senzaMisura) return false;
  const beatCount = meter.beats.split("+").reduce((sum, value) => sum + (Number.parseInt(value, 10) || 0), 0);
  const beatType = Number.parseInt(meter.beatType, 10);
  if (!beatCount || !beatType) return false;
  const byVoice = new Map<string, number>();
  for (const event of events) {
    if (event.type === "note" && (event.chord || event.grace)) continue;
    const voice = event.voice ?? "1";
    byVoice.set(voice, (byVoice.get(voice) ?? 0) + event.duration);
  }
  const soundingDuration = Math.max(0, ...byVoice.values());
  const expectedDuration = JIANPU_DIVISIONS * beatCount * (4 / beatType);
  return soundingDuration > 0 && soundingDuration < expectedDuration;
}

function parseSinglePartJianpuToScoreJson(input: JianpuParseInput, partId: string): ScoreJson {
  const header = parseHeader({
    text: input.text,
    fallbackTitle: input.title ?? input.sourceOriginalName ?? "Jianpu score",
    tonic: input.tonic,
    mode: input.mode,
    beats: input.beats,
    beatType: input.beatType,
  });
  const warnings: string[] = [];
  const diagnostics: ScoreImportDiagnostic[] = [];
  const measures: ScoreMeasure[] = [];
  let currentEvents: ScoreEvent[] = [];
  let measureNumber = 1;
  let eventNumber = 0;

  function pushMeasure(force = false) {
    if (!force && currentEvents.length === 0) {
      return;
    }

    const measureIndex = measureNumber - 1;
    const measureKey = effectiveMeasureKey(header, measureIndex);
    const measureMeter = effectiveMeasureMeter(header, measureIndex);
    const explicitKey = measureIndex === 0 || header.measureKeys[measureIndex] !== undefined;
    const explicitMeter = measureIndex === 0 || header.measureMeters[measureIndex] !== undefined;
    const implicit = measureIndex === 0 && (header.pickup ?? isPickupMeasure(currentEvents, measureMeter));
    const measureId = `${partId}-m${measureNumber}-${measureNumber}`;
    applyMeasureLyrics(currentEvents, header, measureIndex);

    const attributes: ScoreMeasureAttributes | undefined =
      explicitKey || explicitMeter
        ? {
            ...(measureIndex === 0 ? { divisions: JIANPU_DIVISIONS } : {}),
            ...(explicitKey
              ? {
                  key: {
                    fifths: fifthsForKey(measureKey.tonic, measureKey.mode),
                    mode: measureKey.mode,
                  },
                }
              : {}),
            ...(explicitMeter
              ? {
                  time: {
                    beats: measureMeter.beats,
                    beatType: measureMeter.beatType,
                    ...(measureMeter.senzaMisura ? { senzaMisura: true } : {}),
                  },
                }
              : {}),
            ...(measureIndex === 0
              ? {
                  clef: {
                    sign: "G",
                    line: 2,
                  },
                }
              : {}),
          }
        : undefined;
    const harmonies = harmoniesForMeasure(header, measureIndex, measureId);

    measures.push({
      id: measureId,
      partId,
      number: String(measureNumber),
      sequence: measureNumber,
      implicit,
      attributes,
      harmonies,
      events: currentEvents,
    });
    currentEvents = [];
    measureNumber += 1;
  }

  for (const sourceToken of tokenize(header.bodyLines)) {
    const token = sourceToken.value;
    if (token === "|") {
      pushMeasure();
      continue;
    }

    if (/^-+$/.test(token)) {
      for (let index = 0; index < token.length; index += 1) {
        extendPreviousEvent(currentEvents, sourceToken, warnings, diagnostics);
      }
      continue;
    }

    eventNumber += 1;
    const measureKey = effectiveMeasureKey(header, measureNumber - 1);
    const events = parseTokenToEvents({
      token: sourceToken,
      eventId: `${partId}-m${measureNumber}-e${eventNumber}`,
      tonic: measureKey.tonic,
      mode: measureKey.mode,
      pitchSystem: header.pitchSystem,
      warnings,
      diagnostics,
    });

    currentEvents.push(...events);
  }

  if (currentEvents.length > 0) {
    pushMeasure();
  }

  const noteCount = measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "note").length, 0);
  const restCount = measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "rest").length, 0);

  if (noteCount === 0 && restCount === 0) {
    throw new Error("No supported Jianpu tokens were found.");
  }

  return {
    schemaVersion: 2,
    title: header.title,
    source: {
      kind: "jianpu",
      fileId: input.sourceFileId ?? null,
      originalName: input.sourceOriginalName ?? `${header.title}.jianpu.txt`,
    },
    metadata: {
      importedAt: input.importedAt,
      parser: "jianpu-basic-v1",
      workTitle: header.title,
      measureCount: measures.length,
      noteCount,
      restCount,
      warnings,
      importDiagnostics: diagnostics,
    },
    parts: [
      {
        id: partId,
        name: header.title || "Jianpu",
        midiProgram: 1,
        measureCount: measures.length,
      },
    ],
    measures,
  };
}

function splitJianpuPartSections(text: string) {
  const sections: string[][] = [];
  const prelude: string[] = [];
  let current: string[] | null = null;

  for (const line of text.split(/\r?\n/)) {
    if (/^#\s+/.test(line.trim())) {
      if (current?.some((item) => item.trim().length > 0)) {
        sections.push(current);
      }
      current = [...prelude, line];
      continue;
    }

    if (current) {
      current.push(line);
    } else {
      prelude.push(line);
    }
  }

  if (current?.some((item) => item.trim().length > 0)) {
    sections.push(current);
  }

  if (sections.length === 0) {
    return [text.trim()].filter(Boolean);
  }

  return sections.map((section) => section.join("\n").trim()).filter(Boolean);
}

export function parseJianpuToScoreJson(input: JianpuParseInput): ScoreJson {
  const sections = splitJianpuPartSections(input.text);

  if (sections.length <= 1) {
    return parseSinglePartJianpuToScoreJson(input, "P1");
  }

  const parsedScores = sections.map((section, index) =>
    parseSinglePartJianpuToScoreJson(
      {
        ...input,
        text: section,
      },
      `P${index + 1}`,
    ),
  );
  const measures = parsedScores.flatMap((score) => score.measures);
  const parts = parsedScores.flatMap((score) => score.parts);
  const noteCount = measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "note").length, 0);
  const restCount = measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "rest").length, 0);
  const warnings = parsedScores.flatMap((score) => score.metadata.warnings);
  const importDiagnostics = parsedScores.flatMap((score) => score.metadata.importDiagnostics ?? []);
  const title = input.title?.trim() || input.sourceOriginalName || "Jianpu score";

  return {
    schemaVersion: 2,
    title,
    source: {
      kind: "jianpu",
      fileId: input.sourceFileId ?? null,
      originalName: input.sourceOriginalName ?? `${title}.jianpu.txt`,
    },
    metadata: {
      importedAt: input.importedAt,
      parser: "jianpu-basic-v1",
      workTitle: title,
      measureCount: measures.length,
      noteCount,
      restCount,
      warnings,
      importDiagnostics,
    },
    parts,
    measures,
  };
}
