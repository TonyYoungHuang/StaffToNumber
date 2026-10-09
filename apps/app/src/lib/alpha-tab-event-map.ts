import type { model } from "@coderline/alphatab";
import type { ScoreJson } from "@score/shared";

type InterchangeAnchor = { eventId: string; partId: string; measureId: string; noteIndex: number; notationId: string; staff: number; alternateEventId?: string };
type Interchange = { anchors: InterchangeAnchor[] };
type XmlNoteAnchor = { eventId: string; track: number; staff: number; measure: number; voice: number; onset: number; midi: number | null; string: number | null; fret: number | null; unpitched: boolean };

function child(node: Element, name: string) { return [...node.children].find(element => element.localName === name); }
function text(node: Element, name: string) { return child(node, name)?.textContent?.trim() ?? ""; }
function numeric(node: Element, name: string, fallback: number) { const value = Number(text(node, name)); return text(node, name) && Number.isFinite(value) ? value : fallback; }

/** Bind imported alphaTab objects to canonical MusicXML anchors, not SVG order.
 * A composite location plus sounding/written pitch must have exactly one match.
 * Unmapped or ambiguous notes remain viewable but cannot modify another event.
 */
export function alphaTabEventMap(rendered: model.Score, score: ScoreJson, musicXml: string): WeakMap<model.Note, string> {
  const result = new WeakMap<model.Note, string>();
  const doc = new DOMParser().parseFromString(musicXml, "application/xml");
  if (doc.querySelector("parsererror")) return result;
  const interchange = (score as ScoreJson & { interchange?: Interchange }).interchange;
  const events = new Map(score.measures.flatMap(measure => measure.events.map(event => [event.id, event] as const)));
  const anchorsById = new Map((interchange?.anchors ?? []).map(anchor => [anchor.notationId, anchor]));
  const anchorsByPosition = new Map((interchange?.anchors ?? []).map(anchor => [`${anchor.partId}/${anchor.measureId}/${anchor.noteIndex}`, anchor]));
  const steps: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const sourceParts = [...doc.documentElement.children].filter(element => element.localName === "part");
  const partNames = new Map([...doc.querySelectorAll("score-part")].map(part => [part.getAttribute("id"), text(part, "part-name")]));
  const notes: XmlNoteAnchor[] = [];
  for (const [sourceIndex, part] of sourceParts.entries()) {
    const partId = part.getAttribute("id") ?? "";
    const expectedName = partNames.get(partId) ?? "";
    const sameName = rendered.tracks.filter(track => track.name.trim() === expectedName.trim());
    const track = rendered.tracks[sourceIndex]?.name.trim() === expectedName.trim() ? rendered.tracks[sourceIndex] : sameName.length === 1 ? sameName[0] : null;
    if (!track) continue;
    const measures = score.measures.filter(measure => measure.partId === partId).sort((a, b) => a.sequence - b.sequence);
    let divisions = 1;
    let transpose = 0;
    const instrumentMidi = new Map<string, number>();
    const scorePart = [...doc.querySelectorAll("score-part")].find(element => element.getAttribute("id") === partId);
    for (const instrument of scorePart?.querySelectorAll("midi-instrument") ?? []) {
      const midi = numeric(instrument, "midi-unpitched", 0);
      if (midi > 0) instrumentMidi.set(instrument.getAttribute("id") ?? "", midi - 1);
    }
    const sourceMeasures = [...part.children].filter(element => element.localName === "measure");
    for (const [measureIndex, measure] of sourceMeasures.entries()) {
      let cursor = 0;
      let lastOnset = 0;
      let noteIndex = 0;
      for (const element of measure.children) {
        if (element.localName === "attributes") {
          divisions = numeric(element, "divisions", divisions);
          const t = child(element, "transpose");
          if (t) transpose = numeric(t, "chromatic", 0) + numeric(t, "octave-change", 0) * 12;
        } else if (element.localName === "backup" || element.localName === "forward") {
          cursor += numeric(element, "duration", 0) / divisions * (element.localName === "backup" ? -1 : 1);
        } else if (element.localName === "note") {
          const id = element.getAttribute("id") ?? "";
          const anchor = anchorsById.get(id) ?? anchorsByPosition.get(`${partId}/${measures[measureIndex]?.id}/${noteIndex}`);
          const eventId = anchor?.eventId ?? (events.has(id) ? id : null);
          const isChord = Boolean(child(element, "chord"));
          const isGrace = Boolean(child(element, "grace"));
          const onset = isChord ? lastOnset : cursor;
          const pitch = child(element, "pitch");
          const instrument = child(element, "instrument");
          const technical = child(child(element, "notations") ?? element, "technical");
          const fret = technical && text(technical, "fret") ? numeric(technical, "fret", 0) : null;
          const string = technical && text(technical, "string") ? numeric(technical, "string", 0) : null;
          const midi = pitch ? (numeric(pitch, "octave", 4) + 1) * 12 + (steps[text(pitch, "step")] ?? 0) + numeric(pitch, "alter", 0) : instrumentMidi.get(instrument?.getAttribute("id") ?? "") ?? null;
          if (eventId && events.has(eventId) && !child(element, "rest") && element.getAttribute("print-object") !== "no" && !isGrace) {
            notes.push({ eventId, track: track.index, staff: numeric(element, "staff", 1) - 1, measure: measureIndex, voice: numeric(element, "voice", 1) - 1, onset, midi, string, fret, unpitched: Boolean(child(element, "unpitched")) });
            // Store sounding alternatives only when transposition is explicit in XML.
            if (pitch && transpose) notes.push({ ...notes[notes.length - 1], midi: midi! + transpose });
          }
          noteIndex++;
          if (!isChord) lastOnset = onset;
          if (!isChord && !isGrace) cursor += numeric(element, "duration", 0) / divisions;
        }
      }
    }
  }
  const index = new Map<string, XmlNoteAnchor[]>();
  const key = (track: number, staff: number, measure: number, voice: number, onset: number) => `${track}/${staff}/${measure}/${voice}/${Math.round(onset * 960)}`;
  for (const note of notes) {
    const k = key(note.track, note.staff, note.measure, note.voice, note.onset);
    if (!index.has(k)) index.set(k, []);
    index.get(k)!.push(note);
  }
  for (const track of rendered.tracks) for (const staff of track.staves) for (const bar of staff.bars) for (const voice of bar.voices) for (const beat of voice.beats) for (const note of beat.notes) {
    const location = index.get(key(track.index, staff.index, bar.index, voice.index, beat.displayStart / 960)) ?? [];
    const candidates = location.filter(item => {
      if (item.string != null && item.fret != null && note.isStringed) return item.fret === note.fret && item.string === staff.tuning.length + 1 - note.string;
      if (item.unpitched && item.midi == null && (note.isDead || note.isPercussion)) return true;
      if (item.unpitched && note.isPercussion) {
        const articulation = track.percussionArticulations[note.percussionArticulation];
        return item.midi != null && item.midi === (articulation?.outputMidiNumber ?? note.realValue);
      }
      // MusicXML import uses custom note-head articulations even for pitched
      // notes; realValue can then be an articulation index. octave/tone retain
      // the imported (transposed) pitch and avoid mapping that index as MIDI.
      if (!item.unpitched && !note.isStringed && note.octave >= 0 && note.tone >= 0) return item.midi === note.octave * 12 + note.tone;
      return item.midi != null && item.midi === note.realValue;
    });
    const ids = [...new Set(candidates.map(candidate => candidate.eventId))];
    if (ids.length === 1) result.set(note, ids[0]);
  }
  return result;
}
