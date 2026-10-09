import type { ScoreEvent, ScoreJson, ScoreMeasure, ScoreNoteEvent } from "@score/shared";
import { SmoSelector } from "./vendor/smoosic/selector";

export type EnsembleEvent = {
  event: ScoreEvent;
  partId: string;
  partName: string;
  measure: ScoreMeasure;
  onset: number;
  selector: SmoSelector;
  chordEventIds: string[];
  sourcePages: number[];
};

export type EnsembleCoverage = {
  status: "review-required" | "incomplete";
  sourcePageCount: number;
  coverageBasis: "detected-layout";
  pages: Array<{ page: number; width: number; height: number; systems?: Array<{ id: string; bbox: { x: number; y: number; width: number; height: number }; staffIds: string[]; groups?: Array<{ id: string; name?: string; ordinal: number; staffIds: string[]; bbox: { x: number; y: number; width: number; height: number } }> }> }>;
  staffs: Array<{ id: string; page: number; systemId: string; kind: string; bbox: { x: number; y: number; width: number; height: number }; instrumentGroupId?: string; partId?: string; measureIds?: string[]; eventIds?: string[] }>;
  gaps: Array<{ id: string; kind: string; page?: number; staffId?: string; systemId?: string; partId?: string; message: string; severity: string }>;
  manualReview?: { reviewedAt: string; sourcePageCount: number };
};

export function ensembleCoverage(score: ScoreJson): EnsembleCoverage | null {
  const layer = score.recognitionLayer as (ScoreJson["recognitionLayer"] & { coverage?: EnsembleCoverage }) | undefined;
  return layer?.coverage ?? null;
}

/** Smoosic's physical-staff/measure/voice/attack/pitch selectors drive navigation.
 * Canonical event IDs are retained separately, including every chord member.
 */
export function collectEnsembleEvents(score: ScoreJson): EnsembleEvent[] {
  const rows: EnsembleEvent[] = [];
  const sourcePages = new Map<string, Set<number>>();
  const putPage = (id: string, page: number) => {
    if (!sourcePages.has(id)) sourcePages.set(id, new Set());
    sourcePages.get(id)!.add(page);
  };
  for (const symbol of score.recognitionLayer?.symbols ?? []) if (symbol.eventId) putPage(symbol.eventId, symbol.page);
  const coverage = ensembleCoverage(score);
  for (const staff of coverage?.staffs ?? []) for (const id of staff.eventIds ?? []) putPage(id, staff.page);
  let physicalStaff = 0;
  for (const part of score.parts) {
    const measures = score.measures.filter(measure => measure.partId === part.id).sort((a, b) => a.sequence - b.sequence);
    const staffNumbers = [...new Set(measures.flatMap(measure => measure.events.map(event => event.staff ?? 1)))].sort((a, b) => a - b);
    for (const staffNumber of staffNumbers) {
      for (const [measureIndex, measure] of measures.entries()) {
        const voices = [...new Set(measure.events.filter(event => (event.staff ?? 1) === staffNumber).map(event => event.voice ?? "1"))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        for (const [voiceIndex, voice] of voices.entries()) {
          let onset = 0;
          let attackIndex = -1;
          let attackOnset = 0;
          let attack: EnsembleEvent[] = [];
          for (const event of measure.events.filter(event => (event.staff ?? 1) === staffNumber && (event.voice ?? "1") === voice)) {
            const chord = event.type === "note" && event.chord && attack.length > 0;
            if (!chord) { attackIndex++; attackOnset = onset; attack = []; }
            const row: EnsembleEvent = {
              event, partId: part.id, partName: part.name, measure,
              onset: attackOnset,
              selector: { staff: physicalStaff, measure: measureIndex, voice: voiceIndex, tick: attackIndex, pitches: event.type === "note" ? [attack.length] : [] },
              chordEventIds: [], sourcePages: [...(sourcePages.get(event.id) ?? [])],
            };
            if (event.recognition?.page && !row.sourcePages.includes(event.recognition.page)) row.sourcePages.push(event.recognition.page);
            attack.push(row);
            const chordIds = attack.filter(item => item.event.type === "note").map(item => item.event.id);
            for (const member of attack) member.chordEventIds = chordIds;
            if (event.printObject !== false) rows.push(row);
            if (!chord && !(event.type === "note" && event.grace)) onset += event.duration;
          }
        }
      }
      physicalStaff++;
    }
  }
  return rows.sort((a, b) => SmoSelector.gt(a.selector, b.selector) ? 1 : SmoSelector.lt(a.selector, b.selector) ? -1 : (a.selector.pitches[0] ?? -1) - (b.selector.pitches[0] ?? -1));
}

export function neighboringEnsembleEvent(rows: EnsembleEvent[], currentId: string | null, direction: -1 | 1) {
  const index = rows.findIndex(row => row.event.id === currentId);
  return rows[index < 0 ? 0 : Math.max(0, Math.min(rows.length - 1, index + direction))] ?? null;
}

export function chordMembers(rows: EnsembleEvent[], selected: EnsembleEvent) {
  return rows.filter(row => SmoSelector.sameNote(row.selector, selected.selector) && selected.chordEventIds.includes(row.event.id));
}

export function soundingMidi(note: ScoreNoteEvent, transpose = 0) {
  if (note.unpitched) return note.unpitched.midiPitch ?? null;
  const steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return (note.pitch.octave + 1) * 12 + steps[note.pitch.step] + note.pitch.alter + transpose;
}
