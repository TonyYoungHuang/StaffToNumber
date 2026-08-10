import { XMLParser } from "fast-xml-parser";
import type {
  ScoreArticulation,
  ScoreBarline,
  ScoreBeam,
  ScoreClef,
  ScoreDynamic,
  ScoreEvent,
  ScoreFermata,
  ScoreGrace,
  ScoreHarmony,
  ScoreJson,
  ScoreLayoutHint,
  ScoreKeySignature,
  ScoreLyric,
  ScoreMeasure,
  ScoreMeasureAttributes,
  ScoreNavigationMark,
  ScoreOrnament,
  ScorePart,
  ScorePitch,
  ScorePitchStep,
  ScoreRehearsalMark,
  ScoreRestEvent,
  ScoreSlur,
  ScoreStaffGroup,
  ScoreTempo,
  ScoreTimeModification,
  ScoreTimeSignature,
  ScoreTie,
  ScoreTuplet,
  ScoreWedge,
} from "@score/shared";

type XmlObject = Record<string, unknown>;

const musicXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

const orderedMusicXmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

function isObject(value: unknown): value is XmlObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function child(node: unknown, key: string) {
  return isObject(node) ? node[key] : undefined;
}

function attr(node: unknown, key: string) {
  return isObject(node) ? node[`@_${key}`] : undefined;
}

function text(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  if (isObject(value)) {
    return text(value["#text"]);
  }

  return undefined;
}

function numberFrom(value: unknown): number | undefined {
  const rawValue = text(value);
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requiredNumber(value: unknown, fallback: number) {
  return numberFrom(value) ?? fallback;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function parseTitle(score: XmlObject, fallbackTitle: string) {
  return (
    firstText(child(child(score, "work"), "work-title"), child(score, "movement-title")) ??
    fallbackTitle
  );
}

function parseComposer(score: XmlObject) {
  const creators = asArray(child(child(score, "identification"), "creator"));

  for (const creator of creators) {
    const creatorType = text(attr(creator, "type"));
    if (creatorType === "composer") {
      return text(creator);
    }
  }

  return text(creators[0]);
}

function parseMidiProgram(scorePart: unknown) {
  const midiInstrument = asArray(child(scorePart, "midi-instrument"))[0];
  return numberFrom(child(midiInstrument, "midi-program"));
}

function parseParts(score: XmlObject, warnings: string[]): ScorePart[] {
  const scoreParts = asArray(child(child(score, "part-list"), "score-part"));

  if (scoreParts.length === 0) {
    warnings.push("No score-part entries were found in part-list.");
  }

  return scoreParts.map((scorePart, index) => {
    const partId = text(attr(scorePart, "id")) ?? `P${index + 1}`;

    return {
      id: partId,
      name: text(child(scorePart, "part-name")) ?? partId,
      abbreviation: text(child(scorePart, "part-abbreviation")),
      midiProgram: parseMidiProgram(scorePart),
      measureCount: 0,
    };
  });
}

function orderedChildren(nodes: unknown, key: string): unknown[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  for (const node of nodes) {
    if (!isObject(node) || !Array.isArray(node[key])) {
      continue;
    }
    return node[key] as unknown[];
  }

  return [];
}

function orderedAttribute(node: unknown, key: string) {
  const attributes = isObject(node) && isObject(node[":@"]) ? (node[":@"] as XmlObject) : undefined;
  return text(attributes?.[`@_${key}`]);
}

function orderedChildText(nodes: unknown, key: string) {
  const values = orderedChildren(nodes, key);
  for (const value of values) {
    if (isObject(value) && value["#text"] !== undefined) {
      return text(value["#text"]);
    }
  }
  return undefined;
}

function parseStaffGroups(musicXml: string, warnings: string[]): ScoreStaffGroup[] {
  const document = orderedMusicXmlParser.parse(musicXml) as unknown;
  const scoreChildren = orderedChildren(document, "score-partwise");
  const partListChildren = orderedChildren(scoreChildren, "part-list");
  const activeGroups = new Map<string, ScoreStaffGroup>();
  const completedGroups: ScoreStaffGroup[] = [];
  let generatedGroupNumber = 0;

  for (const entry of partListChildren) {
    if (!isObject(entry)) {
      continue;
    }

    if (Array.isArray(entry["part-group"])) {
      const number = orderedAttribute(entry, "number") ?? String(++generatedGroupNumber);
      const type = orderedAttribute(entry, "type");
      if (type === "start") {
        const groupChildren = entry["part-group"] as unknown[];
        const rawSymbol = orderedChildText(groupChildren, "group-symbol");
        const symbol = rawSymbol === "brace" || rawSymbol === "bracket" || rawSymbol === "line" || rawSymbol === "square" || rawSymbol === "none" ? rawSymbol : undefined;
        const groupBarline = orderedChildText(groupChildren, "group-barline");
        activeGroups.set(number, {
          id: `staff-group-${number}`,
          number,
          partIds: [],
          name: orderedChildText(groupChildren, "group-name"),
          abbreviation: orderedChildText(groupChildren, "group-abbreviation"),
          symbol,
          ...(groupBarline === "yes" || groupBarline === "no" ? { barline: groupBarline === "yes" } : {}),
        });
      } else if (type === "stop") {
        const group = activeGroups.get(number);
        if (group) {
          completedGroups.push(group);
          activeGroups.delete(number);
        } else {
          warnings.push(`Ignored unmatched part-group stop number ${number}.`);
        }
      }
      continue;
    }

    if (Array.isArray(entry["score-part"])) {
      const partId = orderedAttribute(entry, "id");
      if (partId) {
        for (const group of activeGroups.values()) {
          group.partIds.push(partId);
        }
      }
    }
  }

  for (const group of activeGroups.values()) {
    warnings.push(`Part group ${group.number} did not include a stop marker; its captured parts were preserved.`);
    completedGroups.push(group);
  }

  return completedGroups.filter((group) => group.partIds.length > 0);
}

function parseKey(attributes: unknown): ScoreKeySignature | undefined {
  const key = child(attributes, "key");
  if (!key) {
    return undefined;
  }

  return {
    fifths: requiredNumber(child(key, "fifths"), 0),
    mode: text(child(key, "mode")),
  };
}

function parseTime(attributes: unknown): ScoreTimeSignature | undefined {
  const time = child(attributes, "time");
  if (time && child(time, "senza-misura") !== undefined) {
    return { beats: "4", beatType: "4", senzaMisura: true };
  }
  const beats = text(child(time, "beats"));
  const beatType = text(child(time, "beat-type"));

  if (!beats || !beatType) {
    return undefined;
  }

  return { beats, beatType };
}

function parseClefs(attributes: unknown): ScoreClef[] {
  return asArray(child(attributes, "clef"))
    .map<ScoreClef | undefined>((clef) => {
      const sign = text(child(clef, "sign"));
      if (!sign) {
        return undefined;
      }

      return {
        sign,
        number: numberFrom(attr(clef, "number")),
        line: numberFrom(child(clef, "line")),
        octaveChange: numberFrom(child(clef, "clef-octave-change")),
      } satisfies ScoreClef;
    })
    .filter((clef): clef is ScoreClef => Boolean(clef));
}

function parseAttributes(measure: unknown): ScoreMeasureAttributes | undefined {
  const attributes = child(measure, "attributes");
  if (!attributes) {
    return undefined;
  }

  const clefs = parseClefs(attributes);
  const parsedAttributes: ScoreMeasureAttributes = {
    divisions: numberFrom(child(attributes, "divisions")),
    key: parseKey(attributes),
    time: parseTime(attributes),
    staves: numberFrom(child(attributes, "staves")),
    clef: clefs[0],
    clefs: clefs.length > 0 ? clefs : undefined,
  };

  return Object.values(parsedAttributes).some((value) => value !== undefined) ? parsedAttributes : undefined;
}

function parseHarmonies(measure: unknown, measureId: string): ScoreHarmony[] {
  return asArray(child(measure, "harmony"))
    .map((harmony, index) => {
      const root = child(harmony, "root");
      const rootStep = text(child(root, "root-step"));

      if (!isScorePitchStep(rootStep)) {
        return undefined;
      }

      const kind = child(harmony, "kind");
      const parsedHarmony: ScoreHarmony = {
        id: `${measureId}-h${index + 1}`,
        rootStep,
        rootAlter: requiredNumber(child(root, "root-alter"), 0),
        kind: text(kind) ?? "major",
      };

      const displayText = text(attr(kind, "text"));
      if (displayText) {
        parsedHarmony.text = displayText;
      }

      return parsedHarmony;
    })
    .filter((harmony): harmony is ScoreHarmony => Boolean(harmony));
}

function parseBarlines(measure: unknown, measureId: string): ScoreBarline[] {
  return asArray(child(measure, "barline"))
    .map((barline, index) => {
      const location = text(attr(barline, "location")) ?? "right";
      if (location !== "left" && location !== "right" && location !== "middle") {
        return undefined;
      }

      const parsedBarline: ScoreBarline = {
        id: `${measureId}-b${index + 1}`,
        location,
      };
      const barStyle = text(child(barline, "bar-style"));
      const repeatDirection = text(attr(child(barline, "repeat"), "direction"));
      const repeatTimes = Number(text(attr(child(barline, "repeat"), "times")));
      const endingNode = child(barline, "ending");
      const endingNumber = text(attr(endingNode, "number"));
      const endingType = text(attr(endingNode, "type"));

      if (barStyle) {
        parsedBarline.barStyle = barStyle;
      }

      if (repeatDirection === "forward" || repeatDirection === "backward") {
        parsedBarline.repeatDirection = repeatDirection;
        if (repeatDirection === "backward" && Number.isInteger(repeatTimes) && repeatTimes >= 2 && repeatTimes <= 16) parsedBarline.repeatTimes = repeatTimes;
      }

      if (endingNumber && (endingType === "start" || endingType === "stop" || endingType === "discontinue")) {
        parsedBarline.ending = {
          number: endingNumber,
          type: endingType,
        };
      }

      return parsedBarline;
    })
    .filter((barline): barline is ScoreBarline => Boolean(barline));
}

const SCORE_DYNAMIC_VALUES = ["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"] as const;

function parseDynamics(measure: unknown, measureId: string): ScoreDynamic[] {
  return asArray(child(measure, "direction"))
    .flatMap((direction, directionIndex) => {
      const placement = text(attr(direction, "placement"));
      return asArray(child(direction, "direction-type")).flatMap((directionType, directionTypeIndex) => {
        const dynamicsNode = child(directionType, "dynamics");

        if (!dynamicsNode) {
          return [];
        }

        return SCORE_DYNAMIC_VALUES.filter((value) => child(dynamicsNode, value) !== undefined).map((value, dynamicIndex) => ({
          id: `${measureId}-dyn${directionIndex + 1}-${directionTypeIndex + 1}-${dynamicIndex + 1}`,
          value,
          ...(placement === "above" || placement === "below" ? { placement } : {}),
        }));
      });
    });
}

function parseTempos(measure: unknown, measureId: string): ScoreTempo[] {
  return asArray(child(measure, "direction"))
    .flatMap((direction, directionIndex) => {
      const placement = text(attr(direction, "placement"));
      const soundTempo = numberFrom(attr(direction, "tempo"));
      const offsetDivisions = numberFrom(child(direction, "offset"));
      const metronomeTempos = asArray(child(direction, "direction-type")).flatMap((directionType, directionTypeIndex) =>
        asArray(child(directionType, "metronome"))
          .map((metronome, metronomeIndex) => {
            const bpm = numberFrom(child(metronome, "per-minute"));
            if (bpm === undefined || bpm <= 0) {
              return undefined;
            }

            const beatUnit = text(child(metronome, "beat-unit"));
            return {
              id: `${measureId}-tempo${directionIndex + 1}-${directionTypeIndex + 1}-${metronomeIndex + 1}`,
              bpm,
              ...(beatUnit ? { beatUnit } : {}),
              ...(placement === "above" || placement === "below" ? { placement } : {}),
              ...(offsetDivisions !== undefined ? { offsetDivisions } : {}),
            };
          })
          .filter((tempo): tempo is ScoreTempo => Boolean(tempo)),
      );

      if (metronomeTempos.length > 0) {
        return metronomeTempos;
      }

      if (soundTempo !== undefined && soundTempo > 0) {
        return [
          {
            id: `${measureId}-tempo${directionIndex + 1}`,
            bpm: soundTempo,
            ...(placement === "above" || placement === "below" ? { placement } : {}),
            ...(offsetDivisions !== undefined ? { offsetDivisions } : {}),
          },
        ];
      }

      return [];
    });
}

function parseWedges(measure: unknown, measureId: string): ScoreWedge[] {
  return asArray(child(measure, "direction"))
    .flatMap((direction, directionIndex) => {
      const placement = text(attr(direction, "placement"));
      return asArray(child(direction, "direction-type")).flatMap((directionType, directionTypeIndex) =>
        asArray(child(directionType, "wedge"))
          .map((wedge, wedgeIndex) => {
            const wedgeType = text(attr(wedge, "type"));
            if (wedgeType !== "crescendo" && wedgeType !== "diminuendo" && wedgeType !== "stop") {
              return undefined;
            }

            const number = text(attr(wedge, "number"));
            return {
              id: `${measureId}-wedge${directionIndex + 1}-${directionTypeIndex + 1}-${wedgeIndex + 1}`,
              type: wedgeType,
              ...(placement === "above" || placement === "below" ? { placement } : {}),
              ...(number ? { number } : {}),
            };
          })
          .filter((wedge): wedge is ScoreWedge => Boolean(wedge)),
      );
    });
}

function navigationTypeFromText(value: string): ScoreNavigationMark["type"] | null {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  if (/\bfine\b/.test(normalized)) {
    return "fine";
  }

  if (/\bd\.?\s*c\.?\b|da capo/.test(normalized)) {
    return "dc";
  }

  if (/\bd\.?\s*s\.?\b|dal segno/.test(normalized)) {
    return "ds";
  }

  if (/to coda/.test(normalized)) {
    return "to-coda";
  }

  if (/\bcoda\b/.test(normalized)) {
    return "coda";
  }

  if (/\bsegno\b/.test(normalized)) {
    return "segno";
  }

  return null;
}

function parseNavigationMarks(measure: unknown, measureId: string): ScoreNavigationMark[] {
  return asArray(child(measure, "direction")).flatMap((direction, directionIndex) =>
    asArray(child(direction, "direction-type")).flatMap((directionType, directionTypeIndex) => {
      const marks: ScoreNavigationMark[] = [];
      const words = asArray(child(directionType, "words"))
        .map((word) => text(word))
        .filter((word): word is string => Boolean(word));

      words.forEach((word, wordIndex) => {
        const type = navigationTypeFromText(word);
        if (type) {
          marks.push({
            id: `${measureId}-nav${directionIndex + 1}-${directionTypeIndex + 1}-w${wordIndex + 1}`,
            type,
            text: word,
          });
        }
      });

      if (child(directionType, "coda")) {
        marks.push({
          id: `${measureId}-nav${directionIndex + 1}-${directionTypeIndex + 1}-coda`,
          type: "coda",
          text: "Coda",
        });
      }

      if (child(directionType, "segno")) {
        marks.push({
          id: `${measureId}-nav${directionIndex + 1}-${directionTypeIndex + 1}-segno`,
          type: "segno",
          text: "Segno",
        });
      }

      return marks;
    }),
  );
}

function parseRehearsalMarks(measure: unknown, measureId: string): ScoreRehearsalMark[] {
  return asArray(child(measure, "direction")).flatMap((direction, directionIndex) => {
    const placement = text(attr(direction, "placement"));
    return asArray(child(direction, "direction-type")).flatMap((directionType, directionTypeIndex) =>
      asArray(child(directionType, "rehearsal"))
        .map((rehearsal, rehearsalIndex) => {
          const rehearsalText = text(rehearsal);
          if (!rehearsalText) {
            return undefined;
          }
          return {
            id: `${measureId}-rehearsal-${directionIndex + 1}-${directionTypeIndex + 1}-${rehearsalIndex + 1}`,
            text: rehearsalText,
            ...(placement === "above" || placement === "below" ? { placement } : {}),
          } satisfies ScoreRehearsalMark;
        })
        .filter((mark): mark is ScoreRehearsalMark => Boolean(mark)),
    );
  });
}

function parseLayoutHint(measure: unknown, measureId: string): ScoreLayoutHint | undefined {
  const print = asArray(child(measure, "print"))[0];
  const measureWidth = numberFrom(attr(measure, "width"));
  const staffLayout = asArray(child(print, "staff-layout"))[0];
  const staffDistance = numberFrom(child(staffLayout, "staff-distance"));
  const newSystem = text(attr(print, "new-system")) === "yes";
  const newPage = text(attr(print, "new-page")) === "yes";

  if (!newSystem && !newPage && measureWidth === undefined && staffDistance === undefined) {
    return undefined;
  }

  return {
    id: `${measureId}-layout`,
    ...(newSystem ? { newSystem: true } : {}),
    ...(newPage ? { newPage: true } : {}),
    ...(measureWidth !== undefined ? { measureWidth } : {}),
    ...(staffDistance !== undefined ? { staffDistance } : {}),
  };
}

function parsePitch(note: unknown): ScorePitch | undefined {
  const pitch = child(note, "pitch");
  const step = text(child(pitch, "step"));
  const octave = numberFrom(child(pitch, "octave"));

  if (!isScorePitchStep(step) || octave === undefined) {
    return undefined;
  }

  return {
    step,
    alter: requiredNumber(child(pitch, "alter"), 0),
    octave,
  };
}

function isScorePitchStep(value: string | undefined): value is ScorePitchStep {
  return value === "A" || value === "B" || value === "C" || value === "D" || value === "E" || value === "F" || value === "G";
}

function parseDots(note: unknown) {
  const dot = child(note, "dot");
  if (dot === undefined) {
    return 0;
  }

  return Array.isArray(dot) ? dot.length : 1;
}

function parseLyrics(note: unknown): ScoreLyric[] {
  return asArray(child(note, "lyric"))
    .map((lyric) => {
      const lyricText = text(child(lyric, "text"));

      if (!lyricText) {
        return undefined;
      }

      const parsedLyric: ScoreLyric = {
        text: lyricText,
      };

      const lyricNumber = text(attr(lyric, "number"));
      const syllabic = text(child(lyric, "syllabic"));

      if (lyricNumber) {
        parsedLyric.number = lyricNumber;
      }

      if (syllabic) {
        parsedLyric.syllabic = syllabic;
      }

      return parsedLyric;
    })
    .filter((lyric): lyric is ScoreLyric => Boolean(lyric));
}

function parseFingerings(note: unknown): string[] {
  return asArray(child(note, "notations"))
    .flatMap((notation) => asArray(child(child(notation, "technical"), "fingering")))
    .map((fingering) => text(fingering)?.trim())
    .filter((fingering): fingering is string => Boolean(fingering));
}

function parseArticulations(note: unknown): ScoreArticulation[] {
  return asArray(child(note, "notations"))
    .flatMap((notation) => asArray(child(notation, "articulations")))
    .flatMap((articulations) =>
      (["accent", "staccato", "tenuto", "breath-mark", "caesura"] as const)
        .filter((type) => child(articulations, type) !== undefined)
        .map((type) => ({ type })),
    );
}

function parseFermatas(note: unknown): ScoreFermata[] {
  return asArray(child(note, "notations"))
    .flatMap((notation) => asArray(child(notation, "fermata")))
    .map((fermata) => {
      const fermataType = text(attr(fermata, "type"));
      const shape = text(fermata)?.trim();
      return {
        ...(fermataType === "upright" || fermataType === "inverted" ? { type: fermataType } : {}),
        ...(shape ? { shape } : {}),
      };
    });
}

function parseTies(note: unknown): ScoreTie[] {
  return asArray(child(note, "tie"))
    .map((tie) => {
      const tieType = text(attr(tie, "type"));
      return tieType ? { type: tieType } : undefined;
    })
    .filter((tie): tie is ScoreTie => Boolean(tie));
}

function parseSlurs(note: unknown): ScoreSlur[] {
  return asArray(child(note, "notations"))
    .flatMap((notation) => asArray(child(notation, "slur")))
    .map((slur) => {
      const slurType = text(attr(slur, "type"));
      if (slurType !== "start" && slurType !== "stop") {
        return undefined;
      }

      const number = text(attr(slur, "number"));
      return {
        type: slurType,
        ...(number ? { number } : {}),
      };
    })
    .filter((slur): slur is ScoreSlur => Boolean(slur));
}

function parseTimeModification(note: unknown): ScoreTimeModification | undefined {
  const timeModification = child(note, "time-modification");
  const actualNotes = numberFrom(child(timeModification, "actual-notes"));
  const normalNotes = numberFrom(child(timeModification, "normal-notes"));

  if (actualNotes === undefined || normalNotes === undefined) {
    return undefined;
  }

  return { actualNotes, normalNotes };
}

const SCORE_BEAM_TYPES = new Set<ScoreBeam["type"]>(["begin", "continue", "end", "forward-hook", "backward-hook"]);
const SCORE_ORNAMENT_TYPES = ["trill-mark", "turn", "delayed-turn", "inverted-turn", "mordent", "inverted-mordent", "tremolo"] as const;

function parseBeams(note: unknown, eventId: string, warnings: string[]): ScoreBeam[] {
  return asArray(child(note, "beam"))
    .map((beam, index) => {
      const type = text(beam) as ScoreBeam["type"] | undefined;
      if (!type || !SCORE_BEAM_TYPES.has(type)) {
        warnings.push(`Unsupported beam value at ${eventId}; the beam was not imported.`);
        return undefined;
      }
      const number = numberFrom(attr(beam, "number")) ?? 1;
      if (!Number.isInteger(number) || number < 1 || number > 8) {
        warnings.push(`Invalid beam number at ${eventId}; the beam was not imported.`);
        return undefined;
      }
      return {
        id: `${eventId}-beam-${number}-${index + 1}`,
        number,
        type,
      } satisfies ScoreBeam;
    })
    .filter((beam): beam is ScoreBeam => Boolean(beam));
}

function parseTuplets(note: unknown, eventId: string, warnings: string[]): ScoreTuplet[] {
  return asArray(child(note, "notations"))
    .flatMap((notation) => asArray(child(notation, "tuplet")))
    .map<ScoreTuplet | undefined>((tuplet, index) => {
      const type = text(attr(tuplet, "type"));
      if (type !== "start" && type !== "stop") {
        warnings.push(`Unsupported tuplet type at ${eventId}; the tuplet marker was not imported.`);
        return undefined;
      }
      const bracket = text(attr(tuplet, "bracket"));
      const showNumber = text(attr(tuplet, "show-number"));
      return {
        id: `${eventId}-tuplet-${index + 1}`,
        type,
        number: text(attr(tuplet, "number")),
        ...(bracket === "yes" || bracket === "no" ? { bracket: bracket === "yes" } : {}),
        ...(showNumber === "actual" || showNumber === "both" || showNumber === "none" ? { showNumber } : {}),
      } satisfies ScoreTuplet;
    })
    .filter((tuplet): tuplet is ScoreTuplet => Boolean(tuplet));
}

function parseGrace(note: unknown, eventId: string): ScoreGrace | undefined {
  const grace = child(note, "grace");
  if (grace === undefined) {
    return undefined;
  }
  const slash = text(attr(grace, "slash"));
  const stealTimePrevious = numberFrom(attr(grace, "steal-time-previous"));
  const stealTimeFollowing = numberFrom(attr(grace, "steal-time-following"));
  const makeTime = numberFrom(attr(grace, "make-time"));
  return {
    id: `${eventId}-grace`,
    ...(slash === "yes" || slash === "no" ? { slash: slash === "yes" } : {}),
    ...(stealTimePrevious !== undefined ? { stealTimePrevious } : {}),
    ...(stealTimeFollowing !== undefined ? { stealTimeFollowing } : {}),
    ...(makeTime !== undefined ? { makeTime } : {}),
  };
}

function parseOrnaments(note: unknown, eventId: string, warnings: string[]): ScoreOrnament[] {
  return asArray(child(note, "notations")).flatMap((notation, notationIndex) =>
    asArray(child(notation, "ornaments")).flatMap((ornaments, ornamentsIndex) => {
      if (isObject(ornaments)) {
        for (const key of Object.keys(ornaments)) {
          if (!key.startsWith("@_") && key !== "#text" && !(SCORE_ORNAMENT_TYPES as readonly string[]).includes(key)) {
            warnings.push(`Unsupported ornament ${key} at ${eventId}; it was preserved only as an import warning.`);
          }
        }
      }

      return SCORE_ORNAMENT_TYPES.flatMap((type) =>
        asArray(child(ornaments, type)).map((ornament, ornamentIndex) => {
          const placement = text(attr(ornament, "placement"));
          return {
            id: `${eventId}-ornament-${notationIndex + 1}-${ornamentsIndex + 1}-${ornamentIndex + 1}`,
            type,
            ...(placement === "above" || placement === "below" ? { placement } : {}),
            ...(type === "tremolo" && text(ornament) ? { value: text(ornament) } : {}),
          } satisfies ScoreOrnament;
        }),
      );
    }),
  );
}

function parseNoteEvent(note: unknown, eventId: string, warnings: string[]): ScoreEvent | undefined {
  const duration = requiredNumber(child(note, "duration"), 0);
  const durationType = text(child(note, "type"));
  const voice = text(child(note, "voice"));
  const staff = numberFrom(child(note, "staff"));
  const rest = child(note, "rest");

  if (rest !== undefined) {
    const event: ScoreRestEvent = {
      id: eventId,
      type: "rest",
      duration,
      durationType,
      dots: parseDots(note),
      voice,
      staff,
      measureRest: text(attr(rest, "measure")) === "yes",
      fermatas: parseFermatas(note),
      timeModification: parseTimeModification(note),
      beams: parseBeams(note, eventId, warnings),
      tuplets: parseTuplets(note, eventId, warnings),
    };

    return event;
  }

  const pitch = parsePitch(note);
  if (!pitch) {
    warnings.push(`Skipped a note without a complete pitch at ${eventId}.`);
    return undefined;
  }

  return {
    id: eventId,
    type: "note",
    pitch,
    duration,
    durationType,
    dots: parseDots(note),
    voice,
    staff,
    accidental: text(child(note, "accidental")),
    chord: child(note, "chord") !== undefined,
    ties: parseTies(note),
    slurs: parseSlurs(note),
    articulations: parseArticulations(note),
    fermatas: parseFermatas(note),
    lyrics: parseLyrics(note),
    fingerings: parseFingerings(note),
    timeModification: parseTimeModification(note),
    beams: parseBeams(note, eventId, warnings),
    tuplets: parseTuplets(note, eventId, warnings),
    grace: parseGrace(note, eventId),
    ornaments: parseOrnaments(note, eventId, warnings),
  };
}

function scoreEventIdFromMusicXml(input: {
  noteNode: unknown;
  fallbackId: string;
  usedEventIds: Set<string>;
  warnings: string[];
}) {
  const xmlEventId = text(attr(input.noteNode, "id"));

  if (!xmlEventId) {
    input.usedEventIds.add(input.fallbackId);
    return input.fallbackId;
  }

  if (input.usedEventIds.has(xmlEventId)) {
    input.warnings.push(`Duplicate MusicXML note id "${xmlEventId}" was replaced with generated id ${input.fallbackId}.`);
    input.usedEventIds.add(input.fallbackId);
    return input.fallbackId;
  }

  input.usedEventIds.add(xmlEventId);
  return xmlEventId;
}

function parsePartMeasures(partNode: unknown, partId: string, warnings: string[], usedEventIds: Set<string>) {
  return asArray(child(partNode, "measure")).map((measureNode, measureIndex) => {
    const number = text(attr(measureNode, "number")) ?? String(measureIndex + 1);
    const measureId = `${partId}-m${number}-${measureIndex + 1}`;
    let eventIndex = 0;
    const events = asArray(child(measureNode, "note"))
      .map((noteNode) => {
        eventIndex += 1;
        const fallbackId = `${partId}-m${number}-e${eventIndex}`;
        return parseNoteEvent(
          noteNode,
          scoreEventIdFromMusicXml({
            noteNode,
            fallbackId,
            usedEventIds,
            warnings,
          }),
          warnings,
        );
      })
      .filter((event): event is ScoreEvent => Boolean(event));

    return {
      id: measureId,
      partId,
      number,
      sequence: measureIndex + 1,
      implicit: text(attr(measureNode, "implicit")) === "yes",
      attributes: parseAttributes(measureNode),
      harmonies: parseHarmonies(measureNode, measureId),
      tempos: parseTempos(measureNode, measureId),
      dynamics: parseDynamics(measureNode, measureId),
      wedges: parseWedges(measureNode, measureId),
      navigationMarks: parseNavigationMarks(measureNode, measureId),
      rehearsalMarks: parseRehearsalMarks(measureNode, measureId),
      barlines: parseBarlines(measureNode, measureId),
      layout: parseLayoutHint(measureNode, measureId),
      events,
    } satisfies ScoreMeasure;
  });
}

export function parseMusicXmlToScoreJson(input: {
  musicXml: string;
  title: string;
  sourceFileId: string;
  sourceOriginalName: string;
  importedAt: string;
}): ScoreJson {
  const parsed = musicXmlParser.parse(input.musicXml) as XmlObject;
  const score = child(parsed, "score-partwise");
  const warnings: string[] = [];

  if (!isObject(score)) {
    throw new Error("Only MusicXML score-partwise documents are supported in this importer.");
  }

  const parts = parseParts(score, warnings);
  const partNodes = asArray(child(score, "part"));
  const measures: ScoreMeasure[] = [];
  const usedEventIds = new Set<string>();

  for (const partNode of partNodes) {
    const partId = text(attr(partNode, "id")) ?? `P${measures.length + 1}`;
    measures.push(...parsePartMeasures(partNode, partId, warnings, usedEventIds));
  }

  const partsWithMeasureCounts: ScorePart[] = parts.map((part) => ({
    ...part,
    staffCount: Math.max(
      1,
      ...measures
        .filter((measure) => measure.partId === part.id)
        .map((measure) => measure.attributes?.staves ?? 1),
    ),
    measureCount: measures.filter((measure) => measure.partId === part.id).length,
  }));
  const noteCount = measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "note").length, 0);
  const restCount = measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "rest").length, 0);

  if (measures.length === 0) {
    warnings.push("No measures were found in the imported MusicXML.");
  }

  return {
    schemaVersion: 2,
    title: parseTitle(score, input.title),
    source: {
      kind: "musicxml",
      fileId: input.sourceFileId,
      originalName: input.sourceOriginalName,
    },
    metadata: {
      importedAt: input.importedAt,
      parser: "musicxml-basic-v1",
      workTitle: text(child(child(score, "work"), "work-title")),
      movementTitle: text(child(score, "movement-title")),
      composer: parseComposer(score),
      measureCount: measures.length,
      noteCount,
      restCount,
      warnings,
    },
    parts: partsWithMeasureCounts,
    staffGroups: parseStaffGroups(input.musicXml, warnings),
    measures,
  };
}
