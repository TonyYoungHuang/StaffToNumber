import type {
  ScoreBarline,
  ScoreClef,
  ScoreDynamic,
  ScoreEvent,
  ScoreFermata,
  ScoreGrace,
  ScoreHarmony,
  ScoreJson,
  ScoreKeySignature,
  ScoreLayoutHint,
  ScoreMeasureAttributes,
  ScoreNavigationMark,
  ScoreNoteEvent,
  ScoreOrnament,
  ScorePitch,
  ScoreRehearsalMark,
  ScoreRestEvent,
  ScoreStaffGroup,
  ScoreTempo,
  ScoreTimeModification,
  ScoreTimeSignature,
  ScoreTuplet,
  ScoreWedge,
} from "@score/shared";

export type MusicXmlPageLayout = {
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
};

export type ScoreMusicXmlExportOptions = {
  pageLayout?: MusicXmlPageLayout;
};

function escapeXml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string | number | undefined, indent: number) {
  if (value === undefined) {
    return [];
  }

  return [`${" ".repeat(indent)}<${name}>${escapeXml(value)}</${name}>`];
}

function pitchToXml(pitch: ScorePitch, indent: number) {
  return [
    `${" ".repeat(indent)}<pitch>`,
    ...tag("step", pitch.step, indent + 2),
    ...(pitch.alter !== 0 ? tag("alter", pitch.alter, indent + 2) : []),
    ...tag("octave", pitch.octave, indent + 2),
    `${" ".repeat(indent)}</pitch>`,
  ];
}

function keyToXml(key: ScoreKeySignature | undefined, indent: number) {
  if (!key) {
    return [];
  }

  return [`${" ".repeat(indent)}<key>`, ...tag("fifths", key.fifths, indent + 2), ...tag("mode", key.mode, indent + 2), `${" ".repeat(indent)}</key>`];
}

function timeToXml(time: ScoreTimeSignature | undefined, indent: number) {
  if (!time) {
    return [];
  }

  if (time.senzaMisura) {
    return [`${" ".repeat(indent)}<time>`, `${" ".repeat(indent + 2)}<senza-misura/>`, `${" ".repeat(indent)}</time>`];
  }

  return [`${" ".repeat(indent)}<time>`, ...tag("beats", time.beats, indent + 2), ...tag("beat-type", time.beatType, indent + 2), `${" ".repeat(indent)}</time>`];
}

function pageLayoutToXml(pageLayout: MusicXmlPageLayout | undefined, indent: number) {
  if (!pageLayout) {
    return [];
  }

  return [
    `${" ".repeat(indent)}<defaults>`,
    `${" ".repeat(indent + 2)}<scaling>`,
    ...tag("millimeters", 7, indent + 4),
    ...tag("tenths", 40, indent + 4),
    `${" ".repeat(indent + 2)}</scaling>`,
    `${" ".repeat(indent + 2)}<page-layout>`,
    ...tag("page-height", pageLayout.pageHeight, indent + 4),
    ...tag("page-width", pageLayout.pageWidth, indent + 4),
    `${" ".repeat(indent + 4)}<page-margins type="both">`,
    ...tag("left-margin", pageLayout.marginLeft, indent + 6),
    ...tag("right-margin", pageLayout.marginRight, indent + 6),
    ...tag("top-margin", pageLayout.marginTop, indent + 6),
    ...tag("bottom-margin", pageLayout.marginBottom, indent + 6),
    `${" ".repeat(indent + 4)}</page-margins>`,
    `${" ".repeat(indent + 2)}</page-layout>`,
    `${" ".repeat(indent)}</defaults>`,
  ];
}

function clefToXml(clef: ScoreClef | undefined, indent: number) {
  if (!clef) {
    return [];
  }

  return [
    `${" ".repeat(indent)}<clef${clef.number ? ` number="${escapeXml(clef.number)}"` : ""}>`,
    ...tag("sign", clef.sign, indent + 2),
    ...tag("line", clef.line, indent + 2),
    ...tag("clef-octave-change", clef.octaveChange, indent + 2),
    `${" ".repeat(indent)}</clef>`,
  ];
}

function attributesToXml(attributes: ScoreMeasureAttributes | undefined, indent: number) {
  if (!attributes) {
    return [];
  }

  const clefs = attributes.clefs?.length ? attributes.clefs : attributes.clef ? [attributes.clef] : [];
  return [
    `${" ".repeat(indent)}<attributes>`,
    ...tag("divisions", attributes.divisions, indent + 2),
    ...keyToXml(attributes.key, indent + 2),
    ...timeToXml(attributes.time, indent + 2),
    ...tag("staves", attributes.staves, indent + 2),
    ...clefs.flatMap((clef) => clefToXml(clef, indent + 2)),
    `${" ".repeat(indent)}</attributes>`,
  ];
}

function harmonyToXml(harmony: ScoreHarmony, indent: number) {
  const kindText = harmony.text ? ` text="${escapeXml(harmony.text)}"` : "";
  return [
    `${" ".repeat(indent)}<harmony>`,
    `${" ".repeat(indent + 2)}<root>`,
    ...tag("root-step", harmony.rootStep, indent + 4),
    ...(harmony.rootAlter !== 0 ? tag("root-alter", harmony.rootAlter, indent + 4) : []),
    `${" ".repeat(indent + 2)}</root>`,
    `${" ".repeat(indent + 2)}<kind${kindText}>${escapeXml(harmony.kind)}</kind>`,
    `${" ".repeat(indent)}</harmony>`,
  ];
}

function barlineToXml(barline: ScoreBarline, indent: number) {
  return [
    `${" ".repeat(indent)}<barline location="${escapeXml(barline.location)}">`,
    ...tag("bar-style", barline.barStyle, indent + 2),
    ...(barline.ending ? [`${" ".repeat(indent + 2)}<ending number="${escapeXml(barline.ending.number)}" type="${escapeXml(barline.ending.type)}"/>`] : []),
    ...(barline.repeatDirection
      ? [`${" ".repeat(indent + 2)}<repeat direction="${escapeXml(barline.repeatDirection)}"${barline.repeatTimes ? ` times="${barline.repeatTimes}"` : ""}/>`]
      : []),
    `${" ".repeat(indent)}</barline>`,
  ];
}

function dynamicToXml(dynamic: ScoreDynamic, indent: number) {
  const placement = dynamic.placement ? ` placement="${escapeXml(dynamic.placement)}"` : "";

  return [
    `${" ".repeat(indent)}<direction${placement}>`,
    `${" ".repeat(indent + 2)}<direction-type>`,
    `${" ".repeat(indent + 4)}<dynamics>`,
    `${" ".repeat(indent + 6)}<${dynamic.value}/>`,
    `${" ".repeat(indent + 4)}</dynamics>`,
    `${" ".repeat(indent + 2)}</direction-type>`,
    `${" ".repeat(indent)}</direction>`,
  ];
}

function tempoToXml(tempo: ScoreTempo, indent: number) {
  const placement = tempo.placement ? ` placement="${escapeXml(tempo.placement)}"` : "";
  const beatUnit = tempo.beatUnit?.trim() || "quarter";
  const bpm = Math.round(tempo.bpm);

  return [
    `${" ".repeat(indent)}<direction${placement}>`,
    `${" ".repeat(indent + 2)}<direction-type>`,
    `${" ".repeat(indent + 4)}<metronome parentheses="no">`,
    `${" ".repeat(indent + 6)}<beat-unit>${escapeXml(beatUnit)}</beat-unit>`,
    `${" ".repeat(indent + 6)}<per-minute>${escapeXml(bpm)}</per-minute>`,
    `${" ".repeat(indent + 4)}</metronome>`,
    `${" ".repeat(indent + 2)}</direction-type>`,
    ...(tempo.offsetDivisions !== undefined ? [`${" ".repeat(indent + 2)}<offset>${escapeXml(tempo.offsetDivisions)}</offset>`] : []),
    `${" ".repeat(indent + 2)}<sound tempo="${escapeXml(bpm)}"/>`,
    `${" ".repeat(indent)}</direction>`,
  ];
}

function wedgeToXml(wedge: ScoreWedge, indent: number) {
  const placement = wedge.placement ? ` placement="${escapeXml(wedge.placement)}"` : "";
  const number = wedge.number ? ` number="${escapeXml(wedge.number)}"` : "";

  return [
    `${" ".repeat(indent)}<direction${placement}>`,
    `${" ".repeat(indent + 2)}<direction-type>`,
    `${" ".repeat(indent + 4)}<wedge type="${escapeXml(wedge.type)}"${number}/>`,
    `${" ".repeat(indent + 2)}</direction-type>`,
    `${" ".repeat(indent)}</direction>`,
  ];
}

function navigationMarkToXml(mark: ScoreNavigationMark, indent: number) {
  const text = mark.text.trim() || mark.type;
  const directionType =
    mark.type === "coda"
      ? `${" ".repeat(indent + 4)}<coda/>`
      : mark.type === "segno"
        ? `${" ".repeat(indent + 4)}<segno/>`
        : `${" ".repeat(indent + 4)}<words>${escapeXml(text)}</words>`;

  return [
    `${" ".repeat(indent)}<direction placement="above">`,
    `${" ".repeat(indent + 2)}<direction-type>`,
    directionType,
    `${" ".repeat(indent + 2)}</direction-type>`,
    `${" ".repeat(indent)}</direction>`,
  ];
}

function rehearsalMarkToXml(mark: ScoreRehearsalMark, indent: number) {
  const placement = mark.placement ? ` placement="${escapeXml(mark.placement)}"` : "";
  return [
    `${" ".repeat(indent)}<direction${placement}>`,
    `${" ".repeat(indent + 2)}<direction-type>`,
    `${" ".repeat(indent + 4)}<rehearsal>${escapeXml(mark.text)}</rehearsal>`,
    `${" ".repeat(indent + 2)}</direction-type>`,
    `${" ".repeat(indent)}</direction>`,
  ];
}

function layoutHintToXml(layout: ScoreLayoutHint | undefined, indent: number) {
  if (!layout) {
    return [];
  }
  const attributes = [
    layout.newSystem ? 'new-system="yes"' : "",
    layout.newPage ? 'new-page="yes"' : "",
  ].filter(Boolean);
  const attributeText = attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
  if (layout.staffDistance === undefined) {
    return [`${" ".repeat(indent)}<print${attributeText}/>`];
  }
  return [
    `${" ".repeat(indent)}<print${attributeText}>`,
    `${" ".repeat(indent + 2)}<staff-layout>`,
    ...tag("staff-distance", layout.staffDistance, indent + 4),
    `${" ".repeat(indent + 2)}</staff-layout>`,
    `${" ".repeat(indent)}</print>`,
  ];
}

function timeModificationToXml(timeModification: ScoreTimeModification | undefined, indent: number) {
  if (!timeModification || timeModification.actualNotes <= 0 || timeModification.normalNotes <= 0) {
    return [];
  }

  return [
    `${" ".repeat(indent)}<time-modification>`,
    ...tag("actual-notes", timeModification.actualNotes, indent + 2),
    ...tag("normal-notes", timeModification.normalNotes, indent + 2),
    `${" ".repeat(indent)}</time-modification>`,
  ];
}

function graceToXml(grace: ScoreGrace | undefined, indent: number) {
  if (!grace) {
    return [];
  }
  const attributes = [
    grace.slash !== undefined ? `slash="${grace.slash ? "yes" : "no"}"` : "",
    grace.stealTimePrevious !== undefined ? `steal-time-previous="${escapeXml(grace.stealTimePrevious)}"` : "",
    grace.stealTimeFollowing !== undefined ? `steal-time-following="${escapeXml(grace.stealTimeFollowing)}"` : "",
    grace.makeTime !== undefined ? `make-time="${escapeXml(grace.makeTime)}"` : "",
  ].filter(Boolean);
  return [`${" ".repeat(indent)}<grace${attributes.length ? ` ${attributes.join(" ")}` : ""}/>`];
}

function tupletsToXml(tuplets: ScoreTuplet[] | undefined, indent: number) {
  return (tuplets ?? []).map((tuplet) => {
    const attributes = [
      `type="${escapeXml(tuplet.type)}"`,
      tuplet.number ? `number="${escapeXml(tuplet.number)}"` : "",
      tuplet.bracket !== undefined ? `bracket="${tuplet.bracket ? "yes" : "no"}"` : "",
      tuplet.showNumber ? `show-number="${escapeXml(tuplet.showNumber)}"` : "",
    ].filter(Boolean);
    return `${" ".repeat(indent)}<tuplet ${attributes.join(" ")}/>`;
  });
}

function ornamentsToXml(ornaments: ScoreOrnament[] | undefined, indent: number) {
  if (!ornaments?.length) {
    return [];
  }
  return [
    `${" ".repeat(indent)}<ornaments>`,
    ...ornaments.map((ornament) => {
      const placement = ornament.placement ? ` placement="${escapeXml(ornament.placement)}"` : "";
      const value = ornament.value?.trim();
      return value
        ? `${" ".repeat(indent + 2)}<${ornament.type}${placement}>${escapeXml(value)}</${ornament.type}>`
        : `${" ".repeat(indent + 2)}<${ornament.type}${placement}/>`;
    }),
    `${" ".repeat(indent)}</ornaments>`,
  ];
}

function fermatasToXml(fermatas: ScoreFermata[] | undefined, indent: number) {
  return (fermatas ?? []).map((fermata) => {
    const type = fermata.type ? ` type="${escapeXml(fermata.type)}"` : "";
    const shape = fermata.shape?.trim();
    return shape ? `${" ".repeat(indent)}<fermata${type}>${escapeXml(shape)}</fermata>` : `${" ".repeat(indent)}<fermata${type}/>`;
  });
}

function restToXml(event: ScoreRestEvent, indent: number) {
  const notations = [
    ...fermatasToXml(event.fermatas, indent + 4),
    ...tupletsToXml(event.tuplets, indent + 4),
  ];

  return [
    `${" ".repeat(indent)}<note id="${escapeXml(event.id)}">`,
    `${" ".repeat(indent + 2)}<rest${event.measureRest ? ' measure="yes"' : ""}/>`,
    ...tag("duration", event.duration, indent + 2),
    ...tag("voice", event.voice, indent + 2),
    ...tag("type", event.durationType, indent + 2),
    ...Array.from({ length: event.dots }, () => `${" ".repeat(indent + 2)}<dot/>`),
    ...timeModificationToXml(event.timeModification, indent + 2),
    ...(event.beams ?? []).map((beam) => `${" ".repeat(indent + 2)}<beam number="${escapeXml(beam.number)}">${escapeXml(beam.type)}</beam>`),
    ...(notations.length > 0
      ? [
          `${" ".repeat(indent + 2)}<notations>`,
          ...notations,
          `${" ".repeat(indent + 2)}</notations>`,
        ]
      : []),
    ...tag("staff", event.staff, indent + 2),
    `${" ".repeat(indent)}</note>`,
  ];
}

function noteToXml(event: ScoreNoteEvent, indent: number) {
  const fingerings = event.fingerings?.map((fingering) => fingering.trim()).filter(Boolean) ?? [];
  const articulations = event.articulations?.map((articulation) => articulation.type).filter(Boolean) ?? [];
  const slurs = event.slurs ?? [];
  const notations = [
    ...event.ties.map((tie) => `${" ".repeat(indent + 4)}<tied type="${escapeXml(tie.type)}"/>`),
    ...slurs.map((slur) => `${" ".repeat(indent + 4)}<slur type="${escapeXml(slur.type)}"${slur.number ? ` number="${escapeXml(slur.number)}"` : ""}/>`),
    ...fermatasToXml(event.fermatas, indent + 4),
    ...tupletsToXml(event.tuplets, indent + 4),
    ...ornamentsToXml(event.ornaments, indent + 4),
    ...(articulations.length > 0
      ? [
          `${" ".repeat(indent + 4)}<articulations>`,
          ...articulations.map((type) => `${" ".repeat(indent + 6)}<${type}/>`),
          `${" ".repeat(indent + 4)}</articulations>`,
        ]
      : []),
    ...(fingerings.length > 0
      ? [
          `${" ".repeat(indent + 4)}<technical>`,
          ...fingerings.map((fingering) => `${" ".repeat(indent + 6)}<fingering>${escapeXml(fingering)}</fingering>`),
          `${" ".repeat(indent + 4)}</technical>`,
        ]
      : []),
  ];

  return [
    `${" ".repeat(indent)}<note id="${escapeXml(event.id)}">`,
    ...(event.chord ? [`${" ".repeat(indent + 2)}<chord/>`] : []),
    ...graceToXml(event.grace, indent + 2),
    ...pitchToXml(event.pitch, indent + 2),
    ...(event.grace ? [] : tag("duration", event.duration, indent + 2)),
    ...event.ties.map((tie) => `${" ".repeat(indent + 2)}<tie type="${escapeXml(tie.type)}"/>`),
    ...tag("voice", event.voice, indent + 2),
    ...tag("type", event.durationType, indent + 2),
    ...Array.from({ length: event.dots }, () => `${" ".repeat(indent + 2)}<dot/>`),
    ...tag("accidental", event.accidental, indent + 2),
    ...timeModificationToXml(event.timeModification, indent + 2),
    ...(event.beams ?? []).map((beam) => `${" ".repeat(indent + 2)}<beam number="${escapeXml(beam.number)}">${escapeXml(beam.type)}</beam>`),
    ...(notations.length > 0
      ? [
          `${" ".repeat(indent + 2)}<notations>`,
          ...notations,
          `${" ".repeat(indent + 2)}</notations>`,
        ]
      : []),
    ...event.lyrics.flatMap((lyric) => [
      `${" ".repeat(indent + 2)}<lyric${lyric.number ? ` number="${escapeXml(lyric.number)}"` : ""}>`,
      ...tag("syllabic", lyric.syllabic, indent + 4),
      ...tag("text", lyric.text, indent + 4),
      `${" ".repeat(indent + 2)}</lyric>`,
    ]),
    ...tag("staff", event.staff, indent + 2),
    `${" ".repeat(indent)}</note>`,
  ];
}

function eventToXml(event: ScoreEvent, indent: number) {
  return event.type === "rest" ? restToXml(event, indent) : noteToXml(event, indent);
}

function scorePartToXml(part: ScoreJson["parts"][number], indent: number) {
  return [
    `${" ".repeat(indent)}<score-part id="${escapeXml(part.id)}">`,
    `${" ".repeat(indent + 2)}<part-name>${escapeXml(part.name)}</part-name>`,
    ...(part.abbreviation ? [`${" ".repeat(indent + 2)}<part-abbreviation>${escapeXml(part.abbreviation)}</part-abbreviation>`] : []),
    ...(part.midiProgram
      ? [
          `${" ".repeat(indent + 2)}<midi-instrument id="${escapeXml(part.id)}-I1">`,
          `${" ".repeat(indent + 4)}<midi-program>${escapeXml(part.midiProgram)}</midi-program>`,
          `${" ".repeat(indent + 2)}</midi-instrument>`,
        ]
      : []),
    `${" ".repeat(indent)}</score-part>`,
  ];
}

function staffGroupStartToXml(group: ScoreStaffGroup, indent: number) {
  return [
    `${" ".repeat(indent)}<part-group number="${escapeXml(group.number)}" type="start">`,
    ...tag("group-name", group.name, indent + 2),
    ...tag("group-abbreviation", group.abbreviation, indent + 2),
    ...tag("group-symbol", group.symbol, indent + 2),
    ...tag("group-barline", group.barline === undefined ? undefined : group.barline ? "yes" : "no", indent + 2),
    `${" ".repeat(indent)}</part-group>`,
  ];
}

function partListToXml(score: ScoreJson, indent: number) {
  const partIndex = new Map(score.parts.map((part, index) => [part.id, index]));
  const groups = (score.staffGroups ?? [])
    .map((group) => {
      const indexes = group.partIds.map((partId) => partIndex.get(partId)).filter((index): index is number => index !== undefined);
      return indexes.length > 0
        ? { group, start: Math.min(...indexes), end: Math.max(...indexes) }
        : null;
    })
    .filter((group): group is { group: ScoreStaffGroup; start: number; end: number } => Boolean(group));
  const lines = [`${" ".repeat(indent)}<part-list>`];

  score.parts.forEach((part, index) => {
    groups
      .filter((group) => group.start === index)
      .sort((left, right) => right.end - left.end)
      .forEach(({ group }) => lines.push(...staffGroupStartToXml(group, indent + 2)));
    lines.push(...scorePartToXml(part, indent + 2));
    groups
      .filter((group) => group.end === index)
      .sort((left, right) => right.start - left.start)
      .forEach(({ group }) => lines.push(`${" ".repeat(indent + 2)}<part-group number="${escapeXml(group.number)}" type="stop"/>`));
  });

  lines.push(`${" ".repeat(indent)}</part-list>`);
  return lines;
}

export function scoreJsonToMusicXml(score: ScoreJson, options: ScoreMusicXmlExportOptions = {}) {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">`,
    `<score-partwise version="4.0">`,
    `  <work>`,
    `    <work-title>${escapeXml(score.metadata.workTitle ?? score.title)}</work-title>`,
    `  </work>`,
    ...(score.metadata.movementTitle ? [`  <movement-title>${escapeXml(score.metadata.movementTitle)}</movement-title>`] : []),
    ...(score.metadata.composer
      ? [`  <identification>`, `    <creator type="composer">${escapeXml(score.metadata.composer)}</creator>`, `  </identification>`]
      : []),
    ...pageLayoutToXml(options.pageLayout, 2),
    ...partListToXml(score, 2),
    ...score.parts.flatMap((part) => [
      `  <part id="${escapeXml(part.id)}">`,
      ...score.measures
        .filter((measure) => measure.partId === part.id)
        .flatMap((measure) => [
          `    <measure number="${escapeXml(measure.number)}"${measure.implicit ? ` implicit="yes"` : ""}${measure.layout?.measureWidth !== undefined ? ` width="${escapeXml(measure.layout.measureWidth)}"` : ""}>`,
          ...layoutHintToXml(measure.layout, 6),
          ...attributesToXml(measure.attributes, 6),
          ...(measure.harmonies ?? []).flatMap((harmony) => harmonyToXml(harmony, 6)),
          ...(measure.tempos ?? []).flatMap((tempo) => tempoToXml(tempo, 6)),
          ...(measure.dynamics ?? []).flatMap((dynamic) => dynamicToXml(dynamic, 6)),
          ...(measure.wedges ?? []).flatMap((wedge) => wedgeToXml(wedge, 6)),
          ...(measure.navigationMarks ?? []).flatMap((mark) => navigationMarkToXml(mark, 6)),
          ...(measure.rehearsalMarks ?? []).flatMap((mark) => rehearsalMarkToXml(mark, 6)),
          ...measure.events.flatMap((event) => eventToXml(event, 6)),
          ...(measure.barlines ?? []).flatMap((barline) => barlineToXml(barline, 6)),
          `    </measure>`,
        ]),
      `  </part>`,
    ]),
    `</score-partwise>`,
  ];

  return `${lines.join("\n")}\n`;
}
