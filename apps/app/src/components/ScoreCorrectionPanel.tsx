"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMessage, formatNumber, type SupportedLocale } from "@score/i18n";
import { MIDI_PROGRAM_PRESETS, suggestMidiProgramPresetForPartName } from "@score/shared";
import type { ScoreArticulation, ScoreBeam, ScoreClef, ScoreDynamic, ScoreEvent, ScoreJson, ScoreLyric, ScoreMeasure, ScoreNoteEvent, ScoreOrnament, ScorePart, ScorePitchStep, ScoreSlur, ScoreTempo, ScoreTuplet, ScoreWedge } from "@score/shared";
import { apiRequest } from "../lib/api";
import { useScoreReviewMessages } from "../lib/score-entry-messages/client";
import type { ScoreCorrectionMessages } from "../lib/score-correction-messages/types";
import { useAppLocale } from "./AppLocaleProvider";

type ScoreRevision = {
  id: string;
  revisionNumber: number;
  musicxmlFileId: string | null;
  createdFrom: string;
  createdAt: string;
  scoreJson: ScoreJson;
};

type ScoreDocument = {
  id: string;
  title: string;
  status: "imported" | "candidate" | "ready" | "archived";
  sourceFileId: string | null;
  currentRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentRevision: ScoreRevision | null;
};

type ScorePayload = {
  score: ScoreDocument;
  revisions: ScoreRevision[];
};

type EditableScoreEvent = ScoreEvent & {
  partId: string;
  measureNumber: string;
  partName: string;
};

type EditableMeasure = ScoreMeasure & {
  partName: string;
};

type LyricDraft = {
  number: string;
  syllabic: string;
  text: string;
};

type BeamDraft = Pick<ScoreBeam, "id" | "number" | "type">;
type TupletDraft = Pick<ScoreTuplet, "id" | "type" | "number" | "bracket" | "showNumber">;
type OrnamentDraft = Pick<ScoreOrnament, "id" | "type" | "placement" | "value">;

const PITCH_STEPS: ScorePitchStep[] = ["C", "D", "E", "F", "G", "A", "B"];
const DURATION_TYPES = ["whole", "half", "quarter", "eighth", "16th", "32nd", "64th"];
const LYRIC_SYLLABIC_OPTIONS = ["single", "begin", "middle", "end"];
const ARTICULATION_OPTIONS: ScoreArticulation["type"][] = ["accent", "staccato", "tenuto", "breath-mark", "caesura"];
const BEAM_TYPE_OPTIONS: ScoreBeam["type"][] = ["begin", "continue", "end", "forward-hook", "backward-hook"];
const ORNAMENT_TYPE_OPTIONS: ScoreOrnament["type"][] = ["trill-mark", "turn", "delayed-turn", "inverted-turn", "mordent", "inverted-mordent", "tremolo"];
const KEY_MODE_OPTIONS = ["major", "minor"] as const;
const TIME_BEAT_TYPE_OPTIONS = ["1", "2", "4", "8", "16", "32", "64"];
const CLEF_SIGN_OPTIONS: ScoreClef["sign"][] = ["G", "F", "C", "percussion", "TAB"];
const HARMONY_KIND_OPTIONS = ["major", "minor", "dominant", "major-seventh", "minor-seventh", "diminished", "augmented", "suspended-fourth", "suspended-second", "none"];
const DYNAMIC_VALUE_OPTIONS: ScoreDynamic["value"][] = ["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"];
const DYNAMIC_PLACEMENT_OPTIONS = ["below", "above"] as const;
const TEMPO_BEAT_UNIT_OPTIONS = ["whole", "half", "quarter", "eighth", "16th", "32nd"];
const WEDGE_TYPE_OPTIONS: ScoreWedge["type"][] = ["crescendo", "diminuendo", "stop"];
const BARLINE_LOCATION_OPTIONS = ["left", "right", "middle"] as const;
const BARLINE_STYLE_OPTIONS = ["regular", "dotted", "dashed", "heavy", "light-light", "light-heavy", "heavy-light", "heavy-heavy", "tick", "short", "none"];
const REPEAT_DIRECTION_OPTIONS = ["none", "forward", "backward"];
const NATIVE_SELECT_ITEM_LIMIT = 500;

export function ScoreCorrectionPanel({
  scoreId,
  token,
  scoreJson,
  onUpdated,
}: {
  scoreId: string;
  token: string | null;
  scoreJson: ScoreJson;
  onUpdated: (payload: ScorePayload) => void | Promise<void>;
}) {
  const { locale } = useAppLocale();
  const messages = useScoreReviewMessages().correction;
  const events = useMemo(() => collectEditableEvents(scoreJson), [scoreJson]);
  const measures = useMemo(() => collectEditableMeasures(scoreJson), [scoreJson]);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;
  const [selectedMeasureId, setSelectedMeasureId] = useState(measures[0]?.id ?? "");
  const selectedMeasure = measures.find((measure) => measure.id === selectedMeasureId) ?? measures[0] ?? null;
  const [selectedPartId, setSelectedPartId] = useState(scoreJson.parts[0]?.id ?? "");
  const selectedPart = scoreJson.parts.find((part) => part.id === selectedPartId) ?? scoreJson.parts[0] ?? null;
  const [partName, setPartName] = useState(selectedPart?.name ?? "");
  const [partAbbreviation, setPartAbbreviation] = useState(selectedPart?.abbreviation ?? "");
  const [partMidiProgram, setPartMidiProgram] = useState(selectedPart?.midiProgram ? String(selectedPart.midiProgram) : "");
  const [eventType, setEventType] = useState<"note" | "rest">(selectedEvent?.type ?? "note");
  const [step, setStep] = useState<ScorePitchStep>(selectedEvent?.type === "note" ? selectedEvent.pitch.step : "C");
  const [alter, setAlter] = useState(selectedEvent?.type === "note" ? selectedEvent.pitch.alter : 0);
  const [octave, setOctave] = useState(selectedEvent?.type === "note" ? selectedEvent.pitch.octave : 4);
  const [duration, setDuration] = useState(selectedEvent?.duration ?? 1);
  const [durationType, setDurationType] = useState(selectedEvent?.durationType ?? "quarter");
  const [dots, setDots] = useState(selectedEvent?.dots ?? 0);
  const [voice, setVoice] = useState(selectedEvent?.voice ?? "1");
  const [staff, setStaff] = useState(selectedEvent?.staff ?? 1);
  const [chord, setChord] = useState(selectedEvent?.type === "note" ? selectedEvent.chord : false);
  const [measureRest, setMeasureRest] = useState(selectedEvent?.type === "rest" ? selectedEvent.measureRest : false);
  const [fermataEnabled, setFermataEnabled] = useState((selectedEvent?.fermatas?.length ?? 0) > 0);
  const [fermataType, setFermataType] = useState<"upright" | "inverted">(selectedEvent?.fermatas?.[0]?.type ?? "upright");
  const [fermataShape, setFermataShape] = useState(selectedEvent?.fermatas?.[0]?.shape ?? "normal");
  const [lyricDrafts, setLyricDrafts] = useState<LyricDraft[]>(lyricsToDrafts(selectedEvent?.type === "note" ? selectedEvent.lyrics : []));
  const [fingeringDrafts, setFingeringDrafts] = useState<string[]>(fingeringsToDrafts(selectedEvent?.type === "note" ? selectedEvent.fingerings : []));
  const [tieStart, setTieStart] = useState(selectedEvent?.type === "note" ? selectedEvent.ties.some((tie) => tie.type === "start") : false);
  const [tieStop, setTieStop] = useState(selectedEvent?.type === "note" ? selectedEvent.ties.some((tie) => tie.type === "stop") : false);
  const [slurStart, setSlurStart] = useState(selectedEvent?.type === "note" ? selectedEvent.slurs?.some((slur) => slur.type === "start") ?? false : false);
  const [slurStop, setSlurStop] = useState(selectedEvent?.type === "note" ? selectedEvent.slurs?.some((slur) => slur.type === "stop") ?? false : false);
  const [slurNumber, setSlurNumber] = useState(selectedEvent?.type === "note" ? selectedEvent.slurs?.[0]?.number ?? "1" : "1");
  const [articulationDrafts, setArticulationDrafts] = useState<Record<ScoreArticulation["type"], boolean>>(articulationsToDrafts(selectedEvent?.type === "note" ? selectedEvent.articulations : []));
  const [beamDrafts, setBeamDrafts] = useState<BeamDraft[]>(beamsToDrafts(selectedEvent?.beams));
  const [tupletDrafts, setTupletDrafts] = useState<TupletDraft[]>(tupletsToDrafts(selectedEvent?.tuplets));
  const [timeModificationEnabled, setTimeModificationEnabled] = useState(Boolean(selectedEvent?.timeModification));
  const [actualNotes, setActualNotes] = useState(selectedEvent?.timeModification?.actualNotes ?? 3);
  const [normalNotes, setNormalNotes] = useState(selectedEvent?.timeModification?.normalNotes ?? 2);
  const [graceEnabled, setGraceEnabled] = useState(selectedEvent?.type === "note" ? Boolean(selectedEvent.grace) : false);
  const [graceSlash, setGraceSlash] = useState(selectedEvent?.type === "note" ? selectedEvent.grace?.slash ?? false : false);
  const [graceStealPrevious, setGraceStealPrevious] = useState(selectedEvent?.type === "note" ? selectedEvent.grace?.stealTimePrevious ?? 0 : 0);
  const [graceStealFollowing, setGraceStealFollowing] = useState(selectedEvent?.type === "note" ? selectedEvent.grace?.stealTimeFollowing ?? 0 : 0);
  const [ornamentDrafts, setOrnamentDrafts] = useState<OrnamentDraft[]>(ornamentsToDrafts(selectedEvent?.type === "note" ? selectedEvent.ornaments : undefined));
  const [divisions, setDivisions] = useState(selectedMeasure?.attributes?.divisions ?? 1);
  const [keyFifths, setKeyFifths] = useState(selectedMeasure?.attributes?.key?.fifths ?? 0);
  const [keyMode, setKeyMode] = useState<"major" | "minor">((selectedMeasure?.attributes?.key?.mode === "minor" ? "minor" : "major"));
  const [timeBeats, setTimeBeats] = useState(selectedMeasure?.attributes?.time?.beats ?? "4");
  const [timeBeatType, setTimeBeatType] = useState(selectedMeasure?.attributes?.time?.beatType ?? "4");
  const [clefSign, setClefSign] = useState<ScoreClef["sign"]>(selectedMeasure?.attributes?.clef?.sign ?? "G");
  const [clefLine, setClefLine] = useState(selectedMeasure?.attributes?.clef?.line ?? 2);
  const [clefOctaveChange, setClefOctaveChange] = useState(selectedMeasure?.attributes?.clef?.octaveChange ?? 0);
  const [layoutNewSystem, setLayoutNewSystem] = useState(selectedMeasure?.layout?.newSystem ?? false);
  const [layoutNewPage, setLayoutNewPage] = useState(selectedMeasure?.layout?.newPage ?? false);
  const [layoutMeasureWidth, setLayoutMeasureWidth] = useState(selectedMeasure?.layout?.measureWidth?.toString() ?? "");
  const [layoutStaffDistance, setLayoutStaffDistance] = useState(selectedMeasure?.layout?.staffDistance?.toString() ?? "");
  const [harmonyRootStep, setHarmonyRootStep] = useState<ScorePitchStep>(selectedMeasure?.harmonies?.[0]?.rootStep ?? "C");
  const [harmonyRootAlter, setHarmonyRootAlter] = useState(selectedMeasure?.harmonies?.[0]?.rootAlter ?? 0);
  const [harmonyKind, setHarmonyKind] = useState(selectedMeasure?.harmonies?.[0]?.kind ?? "major");
  const [harmonyText, setHarmonyText] = useState(selectedMeasure?.harmonies?.[0]?.text ?? "");
  const [selectedTempoId, setSelectedTempoId] = useState(selectedMeasure?.tempos?.[0]?.id ?? "__new__");
  const [tempoBpm, setTempoBpm] = useState(selectedMeasure?.tempos?.[0]?.bpm ?? 96);
  const [tempoBeatUnit, setTempoBeatUnit] = useState(selectedMeasure?.tempos?.[0]?.beatUnit ?? "quarter");
  const [tempoPlacement, setTempoPlacement] = useState<"above" | "below">(selectedMeasure?.tempos?.[0]?.placement ?? "above");
  const [tempoOffsetDivisions, setTempoOffsetDivisions] = useState(selectedMeasure?.tempos?.[0]?.offsetDivisions ?? 0);
  const [dynamicValue, setDynamicValue] = useState<ScoreDynamic["value"]>(selectedMeasure?.dynamics?.[0]?.value ?? "mf");
  const [dynamicPlacement, setDynamicPlacement] = useState<"above" | "below">(selectedMeasure?.dynamics?.[0]?.placement ?? "below");
  const [wedgeType, setWedgeType] = useState<ScoreWedge["type"]>(selectedMeasure?.wedges?.[0]?.type ?? "crescendo");
  const [wedgePlacement, setWedgePlacement] = useState<"above" | "below">(selectedMeasure?.wedges?.[0]?.placement ?? "below");
  const [wedgeNumber, setWedgeNumber] = useState(selectedMeasure?.wedges?.[0]?.number ?? "1");
  const [barlineLocation, setBarlineLocation] = useState<"left" | "right" | "middle">(selectedMeasure?.barlines?.[0]?.location ?? "right");
  const [barlineStyle, setBarlineStyle] = useState(selectedMeasure?.barlines?.[0]?.barStyle ?? "regular");
  const [repeatDirection, setRepeatDirection] = useState(selectedMeasure?.barlines?.[0]?.repeatDirection ?? "none");
  const [repeatTimes, setRepeatTimes] = useState(selectedMeasure?.barlines?.[0]?.repeatTimes ?? 2);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);

  const copy = { ...messages.intro, ...messages.note, ...messages.status, empty: messages.empty.events };
  const measureCopy = { ...messages.measure, empty: messages.empty.measures };
  const partCopy = { ...messages.part, empty: messages.empty.parts };
  const harmonyCopy = { choose: messages.measure.choose, ...messages.harmony };
  const dynamicCopy = { choose: messages.measure.choose, ...messages.dynamics };
  const tempoCopy = { choose: messages.measure.choose, ...messages.tempo };
  const wedgeCopy = { choose: messages.measure.choose, ...messages.wedge };
  const barlineCopy = { choose: messages.measure.choose, ...messages.barline };

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    setSelectedEventId(selectedEvent.id);
    setEventType(selectedEvent.type);
    setStep(selectedEvent.type === "note" ? selectedEvent.pitch.step : "C");
    setAlter(selectedEvent.type === "note" ? selectedEvent.pitch.alter : 0);
    setOctave(selectedEvent.type === "note" ? selectedEvent.pitch.octave : 4);
    setDuration(selectedEvent.duration);
    setDurationType(selectedEvent.durationType ?? "quarter");
    setDots(selectedEvent.dots);
    setVoice(selectedEvent.voice ?? "1");
    setStaff(selectedEvent.staff ?? 1);
    setChord(selectedEvent.type === "note" ? selectedEvent.chord : false);
    setMeasureRest(selectedEvent.type === "rest" ? selectedEvent.measureRest : false);
    setFermataEnabled((selectedEvent.fermatas?.length ?? 0) > 0);
    setFermataType(selectedEvent.fermatas?.[0]?.type ?? "upright");
    setFermataShape(selectedEvent.fermatas?.[0]?.shape ?? "normal");
    setLyricDrafts(lyricsToDrafts(selectedEvent.type === "note" ? selectedEvent.lyrics : []));
    setFingeringDrafts(fingeringsToDrafts(selectedEvent.type === "note" ? selectedEvent.fingerings : []));
    setTieStart(selectedEvent.type === "note" ? selectedEvent.ties.some((tie) => tie.type === "start") : false);
    setTieStop(selectedEvent.type === "note" ? selectedEvent.ties.some((tie) => tie.type === "stop") : false);
    setSlurStart(selectedEvent.type === "note" ? selectedEvent.slurs?.some((slur) => slur.type === "start") ?? false : false);
    setSlurStop(selectedEvent.type === "note" ? selectedEvent.slurs?.some((slur) => slur.type === "stop") ?? false : false);
    setSlurNumber(selectedEvent.type === "note" ? selectedEvent.slurs?.[0]?.number ?? "1" : "1");
    setArticulationDrafts(articulationsToDrafts(selectedEvent.type === "note" ? selectedEvent.articulations : []));
    setBeamDrafts(beamsToDrafts(selectedEvent.beams));
    setTupletDrafts(tupletsToDrafts(selectedEvent.tuplets));
    setTimeModificationEnabled(Boolean(selectedEvent.timeModification));
    setActualNotes(selectedEvent.timeModification?.actualNotes ?? 3);
    setNormalNotes(selectedEvent.timeModification?.normalNotes ?? 2);
    setGraceEnabled(selectedEvent.type === "note" ? Boolean(selectedEvent.grace) : false);
    setGraceSlash(selectedEvent.type === "note" ? selectedEvent.grace?.slash ?? false : false);
    setGraceStealPrevious(selectedEvent.type === "note" ? selectedEvent.grace?.stealTimePrevious ?? 0 : 0);
    setGraceStealFollowing(selectedEvent.type === "note" ? selectedEvent.grace?.stealTimeFollowing ?? 0 : 0);
    setOrnamentDrafts(ornamentsToDrafts(selectedEvent.type === "note" ? selectedEvent.ornaments : undefined));
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!selectedMeasure) {
      return;
    }

    setSelectedMeasureId(selectedMeasure.id);
    setDivisions(selectedMeasure.attributes?.divisions ?? 1);
    setKeyFifths(selectedMeasure.attributes?.key?.fifths ?? 0);
    setKeyMode(selectedMeasure.attributes?.key?.mode === "minor" ? "minor" : "major");
    setTimeBeats(selectedMeasure.attributes?.time?.beats ?? "4");
    setTimeBeatType(selectedMeasure.attributes?.time?.beatType ?? "4");
    setClefSign(selectedMeasure.attributes?.clef?.sign ?? "G");
    setClefLine(selectedMeasure.attributes?.clef?.line ?? 2);
    setClefOctaveChange(selectedMeasure.attributes?.clef?.octaveChange ?? 0);
    setLayoutNewSystem(selectedMeasure.layout?.newSystem ?? false);
    setLayoutNewPage(selectedMeasure.layout?.newPage ?? false);
    setLayoutMeasureWidth(selectedMeasure.layout?.measureWidth?.toString() ?? "");
    setLayoutStaffDistance(selectedMeasure.layout?.staffDistance?.toString() ?? "");
    setHarmonyRootStep(selectedMeasure.harmonies?.[0]?.rootStep ?? "C");
    setHarmonyRootAlter(selectedMeasure.harmonies?.[0]?.rootAlter ?? 0);
    setHarmonyKind(selectedMeasure.harmonies?.[0]?.kind ?? "major");
    setHarmonyText(selectedMeasure.harmonies?.[0]?.text ?? "");
    const firstTempo = selectedMeasure.tempos?.[0];
    setSelectedTempoId(firstTempo?.id ?? "__new__");
    setTempoBpm(firstTempo?.bpm ?? 96);
    setTempoBeatUnit(firstTempo?.beatUnit ?? "quarter");
    setTempoPlacement(firstTempo?.placement ?? "above");
    setTempoOffsetDivisions(firstTempo?.offsetDivisions ?? 0);
    setDynamicValue(selectedMeasure.dynamics?.[0]?.value ?? "mf");
    setDynamicPlacement(selectedMeasure.dynamics?.[0]?.placement ?? "below");
    setWedgeType(selectedMeasure.wedges?.[0]?.type ?? "crescendo");
    setWedgePlacement(selectedMeasure.wedges?.[0]?.placement ?? "below");
    setWedgeNumber(selectedMeasure.wedges?.[0]?.number ?? "1");
    setBarlineLocation(selectedMeasure.barlines?.[0]?.location ?? "right");
    setBarlineStyle(selectedMeasure.barlines?.[0]?.barStyle ?? "regular");
    setRepeatDirection(selectedMeasure.barlines?.[0]?.repeatDirection ?? "none");
    setRepeatTimes(selectedMeasure.barlines?.[0]?.repeatTimes ?? 2);
  }, [selectedMeasure]);

  useEffect(() => {
    if (!selectedPart) {
      return;
    }

    setSelectedPartId(selectedPart.id);
    setPartName(selectedPart.name);
    setPartAbbreviation(selectedPart.abbreviation ?? "");
    setPartMidiProgram(selectedPart.midiProgram ? String(selectedPart.midiProgram) : "");
  }, [selectedPart?.id]);

  function updateLyricDraft(index: number, field: keyof LyricDraft, value: string) {
    setLyricDrafts((current) => current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, [field]: value } : draft)));
  }

  function addLyricDraft() {
    setLyricDrafts((current) => [
      ...current,
      {
        number: String(current.length + 1),
        syllabic: "single",
        text: "",
      },
    ]);
  }

  function removeLyricDraft(index: number) {
    setLyricDrafts((current) => {
      const next = current.filter((_, draftIndex) => draftIndex !== index);
      return next.length > 0 ? next : lyricsToDrafts([]);
    });
  }

  function updateFingeringDraft(index: number, value: string) {
    setFingeringDrafts((current) => current.map((draft, draftIndex) => (draftIndex === index ? value : draft)));
  }

  function addFingeringDraft() {
    setFingeringDrafts((current) => [...current, ""]);
  }

  function removeFingeringDraft(index: number) {
    setFingeringDrafts((current) => {
      const next = current.filter((_, draftIndex) => draftIndex !== index);
      return next.length > 0 ? next : fingeringsToDrafts([]);
    });
  }

  function updateBeamDraft(index: number, patch: Partial<BeamDraft>) {
    setBeamDrafts((current) => current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)));
  }

  function addBeamDraft() {
    setBeamDrafts((current) => {
      const used = new Set(current.map((beam) => beam.number));
      const number = Array.from({ length: 8 }, (_, index) => index + 1).find((candidate) => !used.has(candidate));
      if (!number) return current;
      return [...current, { id: `${selectedEvent?.id ?? "event"}-beam-${number}-manual`, number, type: "begin" }];
    });
  }

  function updateTupletDraft(index: number, patch: Partial<TupletDraft>) {
    setTupletDrafts((current) => current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)));
  }

  function addTupletDraft() {
    setTupletDrafts((current) => [
      ...current,
      { id: `${selectedEvent?.id ?? "event"}-tuplet-${current.length + 1}-manual`, type: "start", number: String(current.length + 1), bracket: true, showNumber: "actual" },
    ]);
  }

  function updateOrnamentDraft(index: number, patch: Partial<OrnamentDraft>) {
    setOrnamentDrafts((current) => current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)));
  }

  function addOrnamentDraft() {
    setOrnamentDrafts((current) => [
      ...current,
      { id: `${selectedEvent?.id ?? "event"}-ornament-${current.length + 1}-manual`, type: "trill-mark", placement: "above", value: "" },
    ]);
  }

  function suggestInstrumentForSelectedPart() {
    const preset = suggestMidiProgramPresetForPartName(partName || selectedPart?.name || "");
    if (preset) {
      setPartMidiProgram(String(preset.program));
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEvent) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/edit/note`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId: selectedEvent.id,
        eventType,
        step: eventType === "note" ? step : undefined,
        alter: eventType === "note" ? alter : undefined,
        octave: eventType === "note" ? octave : undefined,
        duration,
        durationType,
        dots,
        voice,
        staff,
        chord: eventType === "note" ? chord : false,
        measureRest: eventType === "rest" ? measureRest : undefined,
        lyrics: eventType === "note" ? normalizeLyricDrafts(lyricDrafts) : undefined,
        fingerings: eventType === "note" ? normalizeFingeringDrafts(fingeringDrafts) : undefined,
        ties: eventType === "note" ? tiesFromDraft(tieStart, tieStop) : undefined,
        slurs: eventType === "note" ? slursFromDraft(slurStart, slurStop, slurNumber) : undefined,
        articulations: eventType === "note" ? articulationsFromDraft(articulationDrafts) : undefined,
        fermatas: fermatasFromDraft(fermataEnabled, fermataType, fermataShape),
        timeModification: timeModificationEnabled ? { actualNotes, normalNotes } : null,
        beams: beamDrafts,
        tuplets: tupletDrafts,
        grace:
          eventType === "note"
            ? graceEnabled
              ? { id: selectedEvent.type === "note" ? selectedEvent.grace?.id : undefined, slash: graceSlash, stealTimePrevious: graceStealPrevious, stealTimeFollowing: graceStealFollowing }
              : null
            : undefined,
        ornaments: eventType === "note" ? ornamentDrafts : undefined,
      }),
    });
    setSaving(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data);
  }

  async function handleSavePartSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPart) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const trimmedMidiProgram = partMidiProgram.trim();
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/edit/part`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        partId: selectedPart.id,
        name: partName,
        abbreviation: partAbbreviation,
        midiProgram: trimmedMidiProgram ? Number(trimmedMidiProgram) : null,
      }),
    });
    setSaving(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data);
  }

  async function handleSaveMeasureAttributes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedMeasure) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/edit/measure-attributes`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        measureId: selectedMeasure.id,
        divisions,
        keyFifths,
        keyMode,
        timeBeats,
        timeBeatType,
        clefSign,
        clefLine,
        clefOctaveChange,
        newSystem: layoutNewSystem,
        newPage: layoutNewPage,
        measureWidth: layoutMeasureWidth === "" ? null : Number(layoutMeasureWidth),
        staffDistance: layoutStaffDistance === "" ? null : Number(layoutStaffDistance),
      }),
    });
    setSaving(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data);
  }

  async function saveHarmony(clear = false) {
    if (!selectedMeasure) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/edit/harmony`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        clear
          ? {
              measureId: selectedMeasure.id,
              clear: true,
            }
          : {
              measureId: selectedMeasure.id,
              rootStep: harmonyRootStep,
              rootAlter: harmonyRootAlter,
              kind: harmonyKind,
              text: harmonyText,
            },
      ),
    });
    setSaving(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data);
  }

  async function saveDynamic(clear = false) {
    if (!selectedMeasure) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/edit/dynamics`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        clear
          ? {
              measureId: selectedMeasure.id,
              clear: true,
            }
          : {
              measureId: selectedMeasure.id,
              value: dynamicValue,
              placement: dynamicPlacement,
            },
      ),
    });
    setSaving(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data);
  }

  async function saveTempo(clear = false) {
    if (!selectedMeasure) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/edit/tempo`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        clear
          ? {
              measureId: selectedMeasure.id,
              clear: true,
            }
          : {
              measureId: selectedMeasure.id,
              ...(selectedTempoId !== "__new__" ? { tempoId: selectedTempoId } : {}),
              bpm: tempoBpm,
              beatUnit: tempoBeatUnit,
              placement: tempoPlacement,
              offsetDivisions: tempoOffsetDivisions,
            },
      ),
    });
    setSaving(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data);
  }

  async function saveWedge(clear = false) {
    if (!selectedMeasure) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/edit/wedge`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        clear
          ? {
              measureId: selectedMeasure.id,
              clear: true,
            }
          : {
              measureId: selectedMeasure.id,
              type: wedgeType,
              placement: wedgePlacement,
              number: wedgeNumber,
            },
      ),
    });
    setSaving(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data);
  }

  async function saveBarline(clear = false) {
    if (!selectedMeasure) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/edit/barline`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        clear
          ? {
              measureId: selectedMeasure.id,
              clear: true,
            }
          : {
              measureId: selectedMeasure.id,
              location: barlineLocation,
              barStyle: barlineStyle,
              repeatDirection,
              repeatTimes: repeatDirection === "backward" ? repeatTimes : undefined,
            },
      ),
    });
    setSaving(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data);
  }

  return (
    <section className="surface-panel stack-lg" aria-label={messages.aria.panel} aria-busy={saving}>
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">{copy.empty}</div>
      ) : (
        <form className="correction-panel" onSubmit={handleSave}>
          <label className="field-group wide">
            <span>{copy.choose}</span>
            <ScalableEntityPicker items={events} value={selectedEventId} onChange={setSelectedEventId} formatLabel={(event) => formatEntityPreview(event.partName, event.measureNumber, formatEventPreview(event, messages), messages)} />
          </label>

          <label className="field-group">
            <span>{messages.note.eventType}</span>
            <select className="field-select" value={eventType} onChange={(event) => setEventType(event.target.value as "note" | "rest")}>
              <option value="note">{messages.enums.eventType.note}</option>
              <option value="rest">{messages.enums.eventType.rest}</option>
            </select>
          </label>

          <label className="field-group">
            <span>{messages.note.dots}</span>
            <input className="field-control" type="number" min={0} max={4} step={1} value={dots} onChange={(event) => setDots(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{messages.note.voice}</span>
            <input className="field-control" type="text" maxLength={20} value={voice} onChange={(event) => setVoice(event.target.value)} />
          </label>

          <label className="field-group">
            <span>{messages.note.staff}</span>
            <input className="field-control" type="number" min={1} max={8} step={1} value={staff} onChange={(event) => setStaff(Number(event.target.value))} />
          </label>

          {eventType === "note" ? (
            <label className="field-group">
              <span>{messages.note.chordTone}</span>
              <input type="checkbox" checked={chord} onChange={(event) => setChord(event.target.checked)} />
            </label>
          ) : null}

          {eventType === "note" ? (
            <>
          <label className="field-group">
            <span>{messages.note.graceNote}</span>
            <input type="checkbox" checked={graceEnabled} onChange={(event) => setGraceEnabled(event.target.checked)} />
          </label>

          {graceEnabled ? (
            <>
              <label className="field-group">
                <span>{messages.note.slashedGrace}</span>
                <input type="checkbox" checked={graceSlash} onChange={(event) => setGraceSlash(event.target.checked)} />
              </label>
              <label className="field-group">
                <span>{messages.note.stealPrevious}</span>
                <input className="field-control" type="number" min={0} max={100} step={0.5} value={graceStealPrevious} onChange={(event) => setGraceStealPrevious(Number(event.target.value))} />
              </label>
              <label className="field-group">
                <span>{messages.note.stealFollowing}</span>
                <input className="field-control" type="number" min={0} max={100} step={0.5} value={graceStealFollowing} onChange={(event) => setGraceStealFollowing(Number(event.target.value))} />
              </label>
            </>
          ) : null}

          <div className="field-group wide">
            <span>{messages.note.ornaments}</span>
            <div className="stack-sm">
              {ornamentDrafts.map((draft, index) => (
                <div className="form-grid" key={draft.id || `ornament-${index}`}>
                  <label className="field-group">
                    <span>{messages.note.type}</span>
                    <select className="field-select" value={draft.type} onChange={(event) => updateOrnamentDraft(index, { type: event.target.value as ScoreOrnament["type"] })}>
                      {ORNAMENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{messages.enums.ornamentType[type]}</option>)}
                    </select>
                  </label>
                  <label className="field-group">
                    <span>{messages.note.placement}</span>
                    <select className="field-select" value={draft.placement ?? "above"} onChange={(event) => updateOrnamentDraft(index, { placement: event.target.value as ScoreOrnament["placement"] })}>
                      <option value="above">{messages.enums.placement.above}</option><option value="below">{messages.enums.placement.below}</option>
                    </select>
                  </label>
                  <label className="field-group">
                    <span>{messages.note.value}</span>
                    <input className="field-control" type="text" maxLength={40} value={draft.value ?? ""} onChange={(event) => updateOrnamentDraft(index, { value: event.target.value })} />
                  </label>
                  <button type="button" className="button button-secondary button-ghost" onClick={() => setOrnamentDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))}>
                    {messages.actions.remove}
                  </button>
                </div>
              ))}
              <button type="button" className="button button-secondary button-ghost" onClick={addOrnamentDraft} disabled={ornamentDrafts.length >= 8}>
                {messages.actions.addOrnament}
              </button>
            </div>
          </div>

          <label className="field-group">
            <span>{copy.step}</span>
            <select className="field-select" value={step} onChange={(event) => setStep(event.target.value as ScorePitchStep)}>
              {PITCH_STEPS.map((pitchStep) => (
                <option key={pitchStep} value={pitchStep}>
                  {pitchStep}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{copy.alter}</span>
            <input className="field-control" type="number" min={-2} max={2} step={1} value={alter} onChange={(event) => setAlter(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{copy.octave}</span>
            <input className="field-control" type="number" min={0} max={9} step={1} value={octave} onChange={(event) => setOctave(Number(event.target.value))} />
          </label>
            </>
          ) : null}

          <label className="field-group">
            <span>{copy.duration}</span>
            <input className="field-control" type="number" min={0.25} step={0.25} value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{copy.durationType}</span>
            <select className="field-select" value={durationType} onChange={(event) => setDurationType(event.target.value)}>
              {DURATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {messages.enums.durationType[type as keyof typeof messages.enums.durationType]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{messages.note.fermata}</span>
            <input type="checkbox" checked={fermataEnabled} onChange={(event) => setFermataEnabled(event.target.checked)} />
          </label>

          {fermataEnabled ? (
            <>
              <label className="field-group">
                <span>{messages.note.fermataType}</span>
                <select className="field-select" value={fermataType} onChange={(event) => setFermataType(event.target.value as "upright" | "inverted")}>
                  <option value="upright">{messages.enums.fermataType.upright}</option>
                  <option value="inverted">{messages.enums.fermataType.inverted}</option>
                </select>
              </label>

              <label className="field-group">
                <span>{messages.note.fermataShape}</span>
                <input className="field-control" type="text" maxLength={40} value={fermataShape} onChange={(event) => setFermataShape(event.target.value)} />
              </label>
            </>
          ) : null}

          <label className="field-group">
            <span>{messages.note.timeModification}</span>
            <input type="checkbox" checked={timeModificationEnabled} onChange={(event) => setTimeModificationEnabled(event.target.checked)} />
          </label>

          {timeModificationEnabled ? (
            <>
              <label className="field-group">
                <span>{messages.note.actualNotes}</span>
                <input className="field-control" type="number" min={1} max={64} step={1} value={actualNotes} onChange={(event) => setActualNotes(Number(event.target.value))} />
              </label>
              <label className="field-group">
                <span>{messages.note.normalNotes}</span>
                <input className="field-control" type="number" min={1} max={64} step={1} value={normalNotes} onChange={(event) => setNormalNotes(Number(event.target.value))} />
              </label>
            </>
          ) : null}

          <div className="field-group wide">
            <span>{messages.note.beams}</span>
            <div className="stack-sm">
              {beamDrafts.map((draft, index) => (
                <div className="form-grid" key={draft.id || `beam-${index}`}>
                  <label className="field-group">
                    <span>{messages.note.level}</span>
                    <input className="field-control" type="number" min={1} max={8} step={1} value={draft.number} onChange={(event) => updateBeamDraft(index, { number: Number(event.target.value) })} />
                  </label>
                  <label className="field-group">
                    <span>{messages.note.type}</span>
                    <select className="field-select" value={draft.type} onChange={(event) => updateBeamDraft(index, { type: event.target.value as ScoreBeam["type"] })}>
                      {BEAM_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{messages.enums.beamType[type]}</option>)}
                    </select>
                  </label>
                  <button type="button" className="button button-secondary button-ghost" onClick={() => setBeamDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))}>
                    {messages.actions.remove}
                  </button>
                </div>
              ))}
              <button type="button" className="button button-secondary button-ghost" onClick={addBeamDraft} disabled={beamDrafts.length >= 8}>
                {messages.actions.addBeam}
              </button>
            </div>
          </div>

          <div className="field-group wide">
            <span>{messages.note.tupletMarkers}</span>
            <div className="stack-sm">
              {tupletDrafts.map((draft, index) => (
                <div className="form-grid" key={draft.id || `tuplet-${index}`}>
                  <label className="field-group">
                    <span>{messages.note.boundary}</span>
                    <select className="field-select" value={draft.type} onChange={(event) => updateTupletDraft(index, { type: event.target.value as ScoreTuplet["type"] })}>
                      <option value="start">{messages.enums.tupletBoundary.start}</option><option value="stop">{messages.enums.tupletBoundary.stop}</option>
                    </select>
                  </label>
                  <label className="field-group">
                    <span>{messages.note.number}</span>
                    <input className="field-control" type="number" min={1} max={99} step={1} value={draft.number ?? ""} onChange={(event) => updateTupletDraft(index, { number: event.target.value })} />
                  </label>
                  <label className="field-group">
                    <span>{messages.note.bracket}</span>
                    <input type="checkbox" checked={draft.bracket ?? false} onChange={(event) => updateTupletDraft(index, { bracket: event.target.checked })} />
                  </label>
                  <label className="field-group">
                    <span>{messages.note.showNumber}</span>
                    <select className="field-select" value={draft.showNumber ?? "actual"} onChange={(event) => updateTupletDraft(index, { showNumber: event.target.value as ScoreTuplet["showNumber"] })}>
                      <option value="actual">{messages.enums.tupletShowNumber.actual}</option><option value="both">{messages.enums.tupletShowNumber.both}</option><option value="none">{messages.enums.tupletShowNumber.none}</option>
                    </select>
                  </label>
                  <button type="button" className="button button-secondary button-ghost" onClick={() => setTupletDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))}>
                    {messages.actions.remove}
                  </button>
                </div>
              ))}
              <button type="button" className="button button-secondary button-ghost" onClick={addTupletDraft} disabled={tupletDrafts.length >= 8}>
                {messages.actions.addTuplet}
              </button>
            </div>
          </div>

          {eventType === "rest" ? (
            <label className="field-group">
              <span>{messages.note.measureRest}</span>
              <input type="checkbox" checked={measureRest} onChange={(event) => setMeasureRest(event.target.checked)} />
            </label>
          ) : null}

          {eventType === "note" ? (
            <>
          <label className="field-group">
            <span>{messages.note.tieStart}</span>
            <input type="checkbox" checked={tieStart} onChange={(event) => setTieStart(event.target.checked)} />
          </label>

          <label className="field-group">
            <span>{messages.note.tieStop}</span>
            <input type="checkbox" checked={tieStop} onChange={(event) => setTieStop(event.target.checked)} />
          </label>

          <label className="field-group">
            <span>{messages.note.slurStart}</span>
            <input type="checkbox" checked={slurStart} onChange={(event) => setSlurStart(event.target.checked)} />
          </label>

          <label className="field-group">
            <span>{messages.note.slurStop}</span>
            <input type="checkbox" checked={slurStop} onChange={(event) => setSlurStop(event.target.checked)} />
          </label>

          <label className="field-group">
            <span>{messages.note.slurNumber}</span>
            <input className="field-control" type="number" min={1} max={99} step={1} value={slurNumber} onChange={(event) => setSlurNumber(event.target.value)} />
          </label>

          <div className="field-group wide">
            <span>{messages.note.articulations}</span>
            <div className="button-row">
              {ARTICULATION_OPTIONS.map((type) => (
                <label className="field-group" key={type}>
                  <span>{messages.enums.articulation[type]}</span>
                  <input
                    type="checkbox"
                    checked={articulationDrafts[type]}
                    onChange={(event) =>
                      setArticulationDrafts((current) => ({
                        ...current,
                        [type]: event.target.checked,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="field-group wide">
            <span>{messages.note.lyrics}</span>
            <div className="stack-sm">
              {lyricDrafts.map((draft, index) => (
                <div className="form-grid" key={`lyric-${index}`}>
                  <label className="field-group">
                    <span>{messages.note.verse}</span>
                    <input className="field-control" type="text" maxLength={20} value={draft.number} onChange={(event) => updateLyricDraft(index, "number", event.target.value)} />
                  </label>
                  <label className="field-group">
                    <span>{messages.note.syllabic}</span>
                    <select className="field-select" value={draft.syllabic} onChange={(event) => updateLyricDraft(index, "syllabic", event.target.value)}>
                      {LYRIC_SYLLABIC_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {messages.enums.syllabic[option as keyof typeof messages.enums.syllabic]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    <span>{messages.note.text}</span>
                    <input className="field-control" type="text" maxLength={500} value={draft.text} onChange={(event) => updateLyricDraft(index, "text", event.target.value)} />
                  </label>
                  <div className="button-row">
                    <button type="button" className="button button-secondary button-ghost" onClick={() => removeLyricDraft(index)}>
                      {messages.actions.remove}
                    </button>
                  </div>
                </div>
              ))}
              <div className="button-row">
                <button type="button" className="button button-secondary button-ghost" onClick={addLyricDraft} disabled={lyricDrafts.length >= 8}>
                  {messages.actions.addLyric}
                </button>
              </div>
            </div>
          </div>

          <div className="field-group wide">
            <span>{messages.note.fingerings}</span>
            <div className="stack-sm">
              {fingeringDrafts.map((draft, index) => (
                <div className="form-grid" key={`fingering-${index}`}>
                  <label className="field-group">
                    <span>
                      {formatMessage(messages.note.fingering, { number: formatNumber(index + 1, locale) })}
                    </span>
                    <input className="field-control" type="text" maxLength={50} value={draft} onChange={(event) => updateFingeringDraft(index, event.target.value)} />
                  </label>
                  <div className="button-row">
                    <button type="button" className="button button-secondary button-ghost" onClick={() => removeFingeringDraft(index)}>
                      {messages.actions.remove}
                    </button>
                  </div>
                </div>
              ))}
              <div className="button-row">
                <button type="button" className="button button-secondary button-ghost" onClick={addFingeringDraft} disabled={fingeringDrafts.length >= 8}>
                  {messages.actions.addFingering}
                </button>
              </div>
            </div>
          </div>
            </>
          ) : null}

          <div className="button-row wide">
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? copy.saving : copy.save}
            </button>
          </div>
        </form>
      )}

      {scoreJson.parts.length === 0 ? (
        <div className="empty-state">{partCopy.empty}</div>
      ) : (
        <form className="correction-panel" onSubmit={handleSavePartSettings}>
          <label className="field-group wide">
            <span>{partCopy.choose}</span>
            <select className="field-select" value={selectedPartId} onChange={(event) => setSelectedPartId(event.target.value)}>
              {scoreJson.parts.map((part) => (
                <option key={part.id} value={part.id}>
                  {formatPartPreview(part, messages, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{partCopy.name}</span>
            <input className="field-control" type="text" maxLength={120} value={partName} onChange={(event) => setPartName(event.target.value)} />
          </label>

          <label className="field-group">
            <span>{partCopy.abbreviation}</span>
            <input className="field-control" type="text" maxLength={40} value={partAbbreviation} onChange={(event) => setPartAbbreviation(event.target.value)} />
          </label>

          <label className="field-group">
            <span>{partCopy.instrumentPreset}</span>
            <select className="field-select" value={partMidiProgram} onChange={(event) => setPartMidiProgram(event.target.value)}>
              <option value="">{partCopy.noPreset}</option>
              {MIDI_PROGRAM_PRESETS.map((preset) => (
                <option key={preset.program} value={String(preset.program)}>
                  {formatMidiPresetLabel(preset.program, messages, locale)}
                </option>
              ))}
            </select>
          </label>

          <div className="button-row">
            <button type="button" className="button button-secondary button-ghost" onClick={suggestInstrumentForSelectedPart}>
              {partCopy.suggestInstrument}
            </button>
          </div>

          <label className="field-group">
            <span>{partCopy.midiProgram}</span>
            <input
              className="field-control"
              type="number"
              min={1}
              max={128}
              step={1}
              value={partMidiProgram}
              onChange={(event) => setPartMidiProgram(event.target.value)}
              placeholder="1"
            />
          </label>

          <p className="helper-copy wide">{partCopy.midiHelp}</p>

          <div className="button-row wide">
            <button type="submit" className="button button-secondary" disabled={saving}>
              {saving ? copy.saving : partCopy.save}
            </button>
          </div>
        </form>
      )}

      {measures.length === 0 ? (
        <div className="empty-state">{measureCopy.empty}</div>
      ) : (
        <form className="correction-panel" onSubmit={handleSaveMeasureAttributes}>
          <label className="field-group wide">
            <span>{measureCopy.choose}</span>
            <ScalableEntityPicker items={measures} value={selectedMeasureId} onChange={setSelectedMeasureId} formatLabel={(measure) => formatEntityPreview(measure.partName, measure.number, formatMeasureAttributes(measure, messages, locale), messages)} />
          </label>

          <label className="field-group">
            <span>{measureCopy.divisions}</span>
            <input className="field-control" type="number" min={1} max={4096} step={1} value={divisions} onChange={(event) => setDivisions(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{measureCopy.keyFifths}</span>
            <input className="field-control" type="number" min={-7} max={7} step={1} value={keyFifths} onChange={(event) => setKeyFifths(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{measureCopy.keyMode}</span>
            <select className="field-select" value={keyMode} onChange={(event) => setKeyMode(event.target.value as "major" | "minor")}>
              {KEY_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {messages.enums.keyMode[mode]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{measureCopy.timeBeats}</span>
            <input className="field-control" type="number" min={1} max={32} step={1} value={timeBeats} onChange={(event) => setTimeBeats(event.target.value)} />
          </label>

          <label className="field-group">
            <span>{measureCopy.timeBeatType}</span>
            <select className="field-select" value={timeBeatType} onChange={(event) => setTimeBeatType(event.target.value)}>
              {TIME_BEAT_TYPE_OPTIONS.map((beatType) => (
                <option key={beatType} value={beatType}>
                  {beatType}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{measureCopy.clefSign}</span>
            <select className="field-select" value={clefSign} onChange={(event) => setClefSign(event.target.value as ScoreClef["sign"])}>
              {CLEF_SIGN_OPTIONS.map((sign) => (
                <option key={sign} value={sign}>
                  {enumLabel(messages.enums.clef, sign)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{measureCopy.clefLine}</span>
            <input className="field-control" type="number" min={1} max={5} step={1} value={clefLine} onChange={(event) => setClefLine(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{measureCopy.clefOctaveChange}</span>
            <input
              className="field-control"
              type="number"
              min={-2}
              max={2}
              step={1}
              value={clefOctaveChange}
              onChange={(event) => setClefOctaveChange(Number(event.target.value))}
            />
          </label>

          <label className="field-group">
            <span>{measureCopy.newSystem}</span>
            <input type="checkbox" checked={layoutNewSystem} onChange={(event) => setLayoutNewSystem(event.target.checked)} />
          </label>

          <label className="field-group">
            <span>{measureCopy.newPage}</span>
            <input type="checkbox" checked={layoutNewPage} onChange={(event) => setLayoutNewPage(event.target.checked)} />
          </label>

          <label className="field-group">
            <span>{measureCopy.measureWidth}</span>
            <input className="field-control" type="number" min={20} max={2000} step={1} value={layoutMeasureWidth} onChange={(event) => setLayoutMeasureWidth(event.target.value)} placeholder={measureCopy.automatic} />
          </label>

          <label className="field-group">
            <span>{measureCopy.staffDistance}</span>
            <input className="field-control" type="number" min={10} max={500} step={1} value={layoutStaffDistance} onChange={(event) => setLayoutStaffDistance(event.target.value)} placeholder={measureCopy.automatic} />
          </label>

          <div className="button-row wide">
            <button type="submit" className="button button-secondary" disabled={saving}>
              {saving ? copy.saving : measureCopy.save}
            </button>
          </div>
        </form>
      )}

      {measures.length > 0 ? (
        <form
          className="correction-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void saveHarmony(false);
          }}
        >
          <label className="field-group wide">
            <span>{harmonyCopy.choose}</span>
            <ScalableEntityPicker items={measures} value={selectedMeasureId} onChange={setSelectedMeasureId} formatLabel={(measure) => formatEntityPreview(measure.partName, measure.number, formatHarmonyPreview(measure, messages), messages)} />
          </label>

          <label className="field-group">
            <span>{harmonyCopy.root}</span>
            <select className="field-select" value={harmonyRootStep} onChange={(event) => setHarmonyRootStep(event.target.value as ScorePitchStep)}>
              {PITCH_STEPS.map((pitchStep) => (
                <option key={pitchStep} value={pitchStep}>
                  {pitchStep}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{harmonyCopy.alter}</span>
            <input className="field-control" type="number" min={-2} max={2} step={1} value={harmonyRootAlter} onChange={(event) => setHarmonyRootAlter(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{harmonyCopy.kind}</span>
            <select className="field-select" value={harmonyKind} onChange={(event) => setHarmonyKind(event.target.value)}>
              {HARMONY_KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {enumLabel(messages.enums.harmonyKind, kind)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group wide">
            <span>{harmonyCopy.text}</span>
            <input className="field-control" type="text" maxLength={100} value={harmonyText} onChange={(event) => setHarmonyText(event.target.value)} />
          </label>

          <div className="button-row wide">
            <button type="submit" className="button button-secondary" disabled={saving}>
              {saving ? copy.saving : harmonyCopy.save}
            </button>
            <button type="button" className="button button-secondary button-ghost" disabled={saving} onClick={() => void saveHarmony(true)}>
              {harmonyCopy.clear}
            </button>
          </div>
        </form>
      ) : null}

      {measures.length > 0 ? (
        <form
          className="correction-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void saveTempo(false);
          }}
        >
          <label className="field-group wide">
            <span>{tempoCopy.choose}</span>
            <ScalableEntityPicker items={measures} value={selectedMeasureId} onChange={setSelectedMeasureId} formatLabel={(measure) => formatEntityPreview(measure.partName, measure.number, formatTempoPreview(measure, messages, locale), messages)} />
          </label>

          <label className="field-group">
            <span>{tempoCopy.event}</span>
            <select
              className="field-select"
              value={selectedTempoId}
              onChange={(event) => {
                const tempoId = event.target.value;
                setSelectedTempoId(tempoId);
                const tempo = selectedMeasure.tempos?.find((candidate) => candidate.id === tempoId);
                setTempoBpm(tempo?.bpm ?? 96);
                setTempoBeatUnit(tempo?.beatUnit ?? "quarter");
                setTempoPlacement(tempo?.placement ?? "above");
                setTempoOffsetDivisions(tempo?.offsetDivisions ?? 0);
              }}
            >
              {(selectedMeasure.tempos ?? []).map((tempo) => (
                <option key={tempo.id} value={tempo.id}>{formatTempoEvent(tempo, messages, locale)}</option>
              ))}
              <option value="__new__">{tempoCopy.newEvent}</option>
            </select>
          </label>

          <label className="field-group">
            <span>{tempoCopy.bpm}</span>
            <input className="field-control" type="number" min={20} max={400} step={1} value={tempoBpm} onChange={(event) => setTempoBpm(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{tempoCopy.beatUnit}</span>
            <select className="field-select" value={tempoBeatUnit} onChange={(event) => setTempoBeatUnit(event.target.value)}>
              {TEMPO_BEAT_UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {enumLabel(messages.enums.tempoBeatUnit, unit)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{tempoCopy.offset}</span>
            <input className="field-control" type="number" step={1} value={tempoOffsetDivisions} onChange={(event) => setTempoOffsetDivisions(Number(event.target.value))} />
          </label>

          <label className="field-group">
            <span>{tempoCopy.placement}</span>
            <select className="field-select" value={tempoPlacement} onChange={(event) => setTempoPlacement(event.target.value as "above" | "below")}>
              {DYNAMIC_PLACEMENT_OPTIONS.map((placement) => (
                <option key={placement} value={placement}>
                  {messages.enums.placement[placement]}
                </option>
              ))}
            </select>
          </label>

          <div className="button-row wide">
            <button type="submit" className="button button-secondary" disabled={saving}>
              {saving ? copy.saving : tempoCopy.save}
            </button>
            <button type="button" className="button button-secondary button-ghost" disabled={saving} onClick={() => void saveTempo(true)}>
              {tempoCopy.clear}
            </button>
          </div>
        </form>
      ) : null}

      {measures.length > 0 ? (
        <form
          className="correction-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void saveWedge(false);
          }}
        >
          <label className="field-group wide">
            <span>{wedgeCopy.choose}</span>
            <ScalableEntityPicker items={measures} value={selectedMeasureId} onChange={setSelectedMeasureId} formatLabel={(measure) => formatEntityPreview(measure.partName, measure.number, formatWedgePreview(measure, messages), messages)} />
          </label>

          <label className="field-group">
            <span>{wedgeCopy.type}</span>
            <select className="field-select" value={wedgeType} onChange={(event) => setWedgeType(event.target.value as ScoreWedge["type"])}>
              {WEDGE_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {messages.enums.wedgeType[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{wedgeCopy.placement}</span>
            <select className="field-select" value={wedgePlacement} onChange={(event) => setWedgePlacement(event.target.value as "above" | "below")}>
              {DYNAMIC_PLACEMENT_OPTIONS.map((placement) => (
                <option key={placement} value={placement}>
                  {messages.enums.placement[placement]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{wedgeCopy.number}</span>
            <input className="field-control" type="number" min={1} max={99} step={1} value={wedgeNumber} onChange={(event) => setWedgeNumber(event.target.value)} />
          </label>

          <div className="button-row wide">
            <button type="submit" className="button button-secondary" disabled={saving}>
              {saving ? copy.saving : wedgeCopy.save}
            </button>
            <button type="button" className="button button-secondary button-ghost" disabled={saving} onClick={() => void saveWedge(true)}>
              {wedgeCopy.clear}
            </button>
          </div>
        </form>
      ) : null}

      {measures.length > 0 ? (
        <form
          className="correction-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void saveDynamic(false);
          }}
        >
          <label className="field-group wide">
            <span>{dynamicCopy.choose}</span>
            <ScalableEntityPicker items={measures} value={selectedMeasureId} onChange={setSelectedMeasureId} formatLabel={(measure) => formatEntityPreview(measure.partName, measure.number, formatDynamicPreview(measure, messages), messages)} />
          </label>

          <label className="field-group">
            <span>{dynamicCopy.value}</span>
            <select className="field-select" value={dynamicValue} onChange={(event) => setDynamicValue(event.target.value as ScoreDynamic["value"])}>
              {DYNAMIC_VALUE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{dynamicCopy.placement}</span>
            <select className="field-select" value={dynamicPlacement} onChange={(event) => setDynamicPlacement(event.target.value as "above" | "below")}>
              {DYNAMIC_PLACEMENT_OPTIONS.map((placement) => (
                <option key={placement} value={placement}>
                  {messages.enums.placement[placement]}
                </option>
              ))}
            </select>
          </label>

          <div className="button-row wide">
            <button type="submit" className="button button-secondary" disabled={saving}>
              {saving ? copy.saving : dynamicCopy.save}
            </button>
            <button type="button" className="button button-secondary button-ghost" disabled={saving} onClick={() => void saveDynamic(true)}>
              {dynamicCopy.clear}
            </button>
          </div>
        </form>
      ) : null}

      {measures.length > 0 ? (
        <form
          className="correction-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void saveBarline(false);
          }}
        >
          <label className="field-group wide">
            <span>{barlineCopy.choose}</span>
            <ScalableEntityPicker items={measures} value={selectedMeasureId} onChange={setSelectedMeasureId} formatLabel={(measure) => formatEntityPreview(measure.partName, measure.number, formatBarlinePreview(measure, messages, locale), messages)} />
          </label>

          <label className="field-group">
            <span>{barlineCopy.location}</span>
            <select className="field-select" value={barlineLocation} onChange={(event) => setBarlineLocation(event.target.value as "left" | "right" | "middle")}>
              {BARLINE_LOCATION_OPTIONS.map((location) => (
                <option key={location} value={location}>
                  {messages.enums.barlineLocation[location]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{barlineCopy.style}</span>
            <select className="field-select" value={barlineStyle} onChange={(event) => setBarlineStyle(event.target.value)}>
              {BARLINE_STYLE_OPTIONS.map((style) => (
                <option key={style} value={style}>
                  {enumLabel(messages.enums.barlineStyle, style)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>{barlineCopy.repeat}</span>
            <select className="field-select" value={repeatDirection} onChange={(event) => setRepeatDirection(event.target.value)}>
              {REPEAT_DIRECTION_OPTIONS.map((repeat) => (
                <option key={repeat} value={repeat}>
                  {enumLabel(messages.enums.repeatDirection, repeat)}
                </option>
              ))}
            </select>
          </label>
          {repeatDirection === "backward" ? (
            <label className="field-group">
              <span>{barlineCopy.repeatTimes}</span>
              <input
                className="field-control"
                type="number"
                min={2}
                max={16}
                step={1}
                value={repeatTimes}
                onChange={(event) => setRepeatTimes(Math.max(2, Math.min(16, Number(event.target.value))))}
              />
            </label>
          ) : null}

          <div className="button-row wide">
            <button type="submit" className="button button-secondary" disabled={saving}>
              {saving ? copy.saving : barlineCopy.save}
            </button>
            <button type="button" className="button button-secondary button-ghost" disabled={saving} onClick={() => void saveBarline(true)}>
              {barlineCopy.clear}
            </button>
          </div>
        </form>
      ) : null}

      {status && statusKind ? (
        <p className={`form-status ${statusKind}`} role={statusKind === "error" ? "alert" : "status"} aria-live="polite" aria-label={messages.aria.status}>
          {status}
        </p>
      ) : null}
    </section>
  );
}

function collectEditableEvents(scoreJson: ScoreJson): EditableScoreEvent[] {
  return scoreJson.measures.flatMap((measure) => {
    const partName = scoreJson.parts.find((part) => part.id === measure.partId)?.name ?? measure.partId;
    return measure.events.map((event) => ({
      ...event,
      partId: measure.partId,
      measureNumber: measure.number,
      partName,
    }));
  });
}

function collectEditableMeasures(scoreJson: ScoreJson): EditableMeasure[] {
  return scoreJson.measures.map((measure) => ({
    ...measure,
    partName: scoreJson.parts.find((part) => part.id === measure.partId)?.name ?? measure.partId,
  }));
}

function ScalableEntityPicker<T extends { id: string }>({
  items,
  value,
  onChange,
  formatLabel,
}: {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  formatLabel: (item: T) => string;
}) {
  if (items.length <= NATIVE_SELECT_ITEM_LIMIT) {
    return (
      <select className="field-select" data-scalable-entity-picker="native" data-item-count={items.length} value={value} onChange={(event) => onChange(event.target.value)}>
        {items.map((item) => (
          <option key={item.id} value={item.id}>{formatLabel(item)}</option>
        ))}
      </select>
    );
  }

  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === value));
  const selectedItem = items[selectedIndex];
  return (
    <span className="stack-sm" data-scalable-entity-picker="indexed" data-item-count={items.length}>
      <input
        className="field-control"
        type="number"
        min={1}
        max={items.length}
        step={1}
        value={selectedIndex + 1}
        onChange={(event) => {
          const nextIndex = Math.min(items.length - 1, Math.max(0, Number(event.target.value) - 1));
          const nextItem = items[nextIndex];
          if (nextItem) onChange(nextItem.id);
        }}
      />
      <span className="item-meta">{selectedItem ? formatLabel(selectedItem) : "-"}</span>
    </span>
  );
}

function formatPitch(note: ScoreNoteEvent) {
  const accidental = note.pitch.alter > 0 ? "#".repeat(note.pitch.alter) : note.pitch.alter < 0 ? "b".repeat(Math.abs(note.pitch.alter)) : "";
  return `${note.pitch.step}${accidental}${note.pitch.octave}`;
}

function enumLabel(messages: Readonly<Record<string, string>>, value: string | null | undefined) {
  return value ? messages[value] ?? value : "";
}

function formatEntityPreview(part: string, measure: string, preview: string, messages: ScoreCorrectionMessages) {
  return formatMessage(messages.previews.entity, { part, measure, preview });
}

function formatEventPreview(event: EditableScoreEvent, messages: ScoreCorrectionMessages) {
  const durationType = enumLabel(messages.enums.durationType, event.durationType);
  if (event.type === "rest") {
    return `${event.measureRest ? messages.previews.measureRest : messages.previews.rest} ${durationType} ${formatFermataPreview(event, messages)}`.trim();
  }

  return `${formatPitch(event)} ${durationType} ${formatTiePreview(event, messages)} ${formatSlurPreview(event, messages)} ${formatArticulationPreview(event, messages)} ${formatFermataPreview(event, messages)} ${formatLyricPreview(event)} ${formatFingeringPreview(event)}`.trim();
}

function formatTiePreview(note: ScoreNoteEvent, messages: ScoreCorrectionMessages) {
  if (note.ties.length === 0) {
    return "";
  }

  return `[${messages.previews.tie} ${note.ties.map((tie) => enumLabel(messages.enums.tupletBoundary, tie.type)).join("/")}]`;
}

function lyricsToDrafts(lyrics: ScoreLyric[]): LyricDraft[] {
  if (lyrics.length === 0) {
    return [
      {
        number: "1",
        syllabic: "single",
        text: "",
      },
    ];
  }

  return lyrics.map((lyric, index) => ({
    number: lyric.number ?? String(index + 1),
    syllabic: lyric.syllabic ?? "single",
    text: lyric.text,
  }));
}

function normalizeLyricDrafts(drafts: LyricDraft[]): ScoreLyric[] {
  const lyrics = drafts
    .map((draft, index) => {
      const text = draft.text.trim();
      if (!text) {
        return null;
      }

      return {
        number: draft.number.trim() || String(index + 1),
        syllabic: LYRIC_SYLLABIC_OPTIONS.includes(draft.syllabic) ? draft.syllabic : "single",
        text,
      };
    })
    .filter((lyric): lyric is { number: string; syllabic: string; text: string } => Boolean(lyric));

  return lyrics;
}

function tiesFromDraft(tieStart: boolean, tieStop: boolean) {
  return [
    ...(tieStart ? [{ type: "start" }] : []),
    ...(tieStop ? [{ type: "stop" }] : []),
  ];
}

function slursFromDraft(slurStart: boolean, slurStop: boolean, slurNumber: string): ScoreSlur[] {
  const number = slurNumber.trim();
  return [
    ...(slurStart ? [{ type: "start" as const, ...(number ? { number } : {}) }] : []),
    ...(slurStop ? [{ type: "stop" as const, ...(number ? { number } : {}) }] : []),
  ];
}

function beamsToDrafts(beams: ScoreBeam[] | undefined): BeamDraft[] {
  return (beams ?? []).map((beam) => ({ id: beam.id, number: beam.number, type: beam.type }));
}

function tupletsToDrafts(tuplets: ScoreTuplet[] | undefined): TupletDraft[] {
  return (tuplets ?? []).map((tuplet) => ({
    id: tuplet.id,
    type: tuplet.type,
    number: tuplet.number,
    bracket: tuplet.bracket,
    showNumber: tuplet.showNumber,
  }));
}

function ornamentsToDrafts(ornaments: ScoreOrnament[] | undefined): OrnamentDraft[] {
  return (ornaments ?? []).map((ornament) => ({
    id: ornament.id,
    type: ornament.type,
    placement: ornament.placement,
    value: ornament.value,
  }));
}

function articulationsToDrafts(articulations: ScoreArticulation[] | undefined): Record<ScoreArticulation["type"], boolean> {
  return {
    accent: articulations?.some((articulation) => articulation.type === "accent") ?? false,
    staccato: articulations?.some((articulation) => articulation.type === "staccato") ?? false,
    tenuto: articulations?.some((articulation) => articulation.type === "tenuto") ?? false,
    "breath-mark": articulations?.some((articulation) => articulation.type === "breath-mark") ?? false,
    caesura: articulations?.some((articulation) => articulation.type === "caesura") ?? false,
  };
}

function articulationsFromDraft(draft: Record<ScoreArticulation["type"], boolean>): ScoreArticulation[] {
  return ARTICULATION_OPTIONS.filter((type) => draft[type]).map((type) => ({ type }));
}

function fermatasFromDraft(enabled: boolean, type: "upright" | "inverted", shape: string) {
  if (!enabled) {
    return [];
  }

  const trimmedShape = shape.trim();
  return [
    {
      type,
      ...(trimmedShape ? { shape: trimmedShape } : {}),
    },
  ];
}

function formatArticulationPreview(note: ScoreNoteEvent, messages: ScoreCorrectionMessages) {
  const text = note.articulations?.map((articulation) => enumLabel(messages.enums.articulation, articulation.type)).join("/");
  return text ? `[${text}]` : "";
}

function formatFermataPreview(event: ScoreEvent, messages: ScoreCorrectionMessages) {
  const text = event.fermatas?.map((fermata) => [enumLabel(messages.enums.fermataType, fermata.type), fermata.shape].filter(Boolean).join(" ")).filter(Boolean).join("/");
  return event.fermatas?.length ? `[${messages.previews.fermata}${text ? ` ${text}` : ""}]` : "";
}

function formatSlurPreview(note: ScoreNoteEvent, messages: ScoreCorrectionMessages) {
  const text = note.slurs?.map((slur) => `${enumLabel(messages.enums.tupletBoundary, slur.type)}${slur.number ? `#${slur.number}` : ""}`).join("/");
  return text ? `[${messages.previews.slur} ${text}]` : "";
}

function fingeringsToDrafts(fingerings: string[] | undefined): string[] {
  const cleaned = fingerings?.map((fingering) => fingering.trim()).filter(Boolean) ?? [];
  return cleaned.length > 0 ? cleaned : [""];
}

function normalizeFingeringDrafts(drafts: string[]) {
  return drafts.map((draft) => draft.trim()).filter(Boolean);
}

function formatMeasureAttributes(measure: ScoreMeasure, messages: ScoreCorrectionMessages, locale: SupportedLocale) {
  const key = measure.attributes?.key
    ? `${messages.previews.key} ${formatNumber(measure.attributes.key.fifths, locale)} ${enumLabel(messages.enums.keyMode, measure.attributes.key.mode ?? "major")}`
    : `${messages.previews.key} -`;
  const time = measure.attributes?.time ? `${messages.previews.time} ${measure.attributes.time.beats}/${measure.attributes.time.beatType}` : `${messages.previews.time} -`;
  const clef = measure.attributes?.clef
    ? `${messages.previews.clef} ${enumLabel(messages.enums.clef, measure.attributes.clef.sign)}${measure.attributes.clef.line ? ` ${messages.previews.line} ${formatNumber(measure.attributes.clef.line, locale)}` : ""}${
        measure.attributes.clef.octaveChange ? ` ${messages.previews.octave} ${formatNumber(measure.attributes.clef.octaveChange, locale)}` : ""
      }`
    : `${messages.previews.clef} -`;
  return `${key} ${time} ${clef}`;
}

function formatMidiPresetLabel(program: number, messages: ScoreCorrectionMessages, locale: SupportedLocale) {
  const name = enumLabel(messages.midiPresets, String(program)) || messages.part.midiProgram;
  return `${name} (${formatNumber(program, locale)})`;
}

function formatPartPreview(part: ScorePart, messages: ScoreCorrectionMessages, locale: SupportedLocale) {
  const abbreviation = part.abbreviation ? ` (${part.abbreviation})` : "";
  const midiProgram = part.midiProgram
    ? formatMessage(messages.previews.program, {
        name: enumLabel(messages.midiPresets, String(part.midiProgram)) || messages.part.midiProgram,
        number: formatNumber(part.midiProgram, locale),
      })
    : messages.previews.noProgram;
  return `${part.name}${abbreviation} | ${midiProgram}`;
}

function formatHarmonyPreview(measure: ScoreMeasure, messages: ScoreCorrectionMessages) {
  const harmony = measure.harmonies?.[0];
  if (!harmony) {
    return "-";
  }

  const accidental = harmony.rootAlter > 0 ? "#".repeat(harmony.rootAlter) : harmony.rootAlter < 0 ? "b".repeat(Math.abs(harmony.rootAlter)) : "";
  return harmony.text || `${harmony.rootStep}${accidental} ${enumLabel(messages.enums.harmonyKind, harmony.kind)}`;
}

function formatTempoPreview(measure: ScoreMeasure, messages: ScoreCorrectionMessages, locale: SupportedLocale) {
  const tempos = measure.tempos ?? [];
  if (tempos.length === 0) {
    return "-";
  }

  return tempos.map((tempo) => formatTempoEvent(tempo, messages, locale)).join("; ");
}

function formatTempoEvent(tempo: ScoreTempo, messages: ScoreCorrectionMessages, locale: SupportedLocale) {
  const offset = `@${formatNumber(tempo.offsetDivisions ?? 0, locale)}`;
  return [enumLabel(messages.enums.tempoBeatUnit, tempo.beatUnit ?? "quarter"), `=${formatNumber(tempo.bpm, locale)}`, offset, enumLabel(messages.enums.placement, tempo.placement)].filter(Boolean).join(" ");
}

function formatDynamicPreview(measure: ScoreMeasure, messages: ScoreCorrectionMessages) {
  const dynamic = measure.dynamics?.[0];
  if (!dynamic) {
    return "-";
  }

  return [dynamic.value, enumLabel(messages.enums.placement, dynamic.placement)].filter(Boolean).join(" ");
}

function formatWedgePreview(measure: ScoreMeasure, messages: ScoreCorrectionMessages) {
  const wedge = measure.wedges?.[0];
  if (!wedge) {
    return "-";
  }

  return [enumLabel(messages.enums.wedgeType, wedge.type), enumLabel(messages.enums.placement, wedge.placement), wedge.number ? `#${wedge.number}` : ""].filter(Boolean).join(" ");
}

function formatBarlinePreview(measure: ScoreMeasure, messages: ScoreCorrectionMessages, locale: SupportedLocale) {
  const barline = measure.barlines?.[0];
  if (!barline) {
    return "-";
  }

  return [
    enumLabel(messages.enums.barlineLocation, barline.location),
    enumLabel(messages.enums.barlineStyle, barline.barStyle),
    enumLabel(messages.enums.repeatDirection, barline.repeatDirection),
    barline.repeatTimes ? `×${formatNumber(barline.repeatTimes, locale)}` : "",
    barline.ending ? `${messages.previews.ending} ${barline.ending.number} ${messages.enums.endingType[barline.ending.type]}` : "",
  ].filter(Boolean).join(" ");
}

function formatLyricPreview(note: ScoreNoteEvent) {
  const text = note.lyrics.map((lyric) => `${lyric.number ?? "1"}:${lyric.text.trim()}`).filter(Boolean).join(" | ");
  return text ? `- ${text}` : "";
}

function formatFingeringPreview(note: ScoreNoteEvent) {
  const text = note.fingerings?.map((fingering) => fingering.trim()).filter(Boolean).join("/");
  return text ? `(${text})` : "";
}
