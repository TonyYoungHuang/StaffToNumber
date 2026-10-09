import { XMLParser } from 'fast-xml-parser';
import type { ScoreJson, ScoreNoteEvent, ScorePitch } from '@score/shared';

const pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (pitch: ScorePitch) => (pitch.octave + 1) * 12 + pc[pitch.step] + pitch.alter;
const array = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const toPitch = (number: number): ScorePitch => {
  const names: ScorePitch['step'][] = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const pitchClass = ((number % 12) + 12) % 12;
  return { step: names[pitchClass], alter: [1, 3, 6, 8, 10].includes(pitchClass) ? 1 : 0, octave: Math.floor(number / 12) - 1 };
};

// Standard/TAB linkage comes only from verified source anchors, not guessed
// instrument names. Tuning remains in the source MusicXML instead of assuming EADGBE.
function tuning(score: ScoreJson, eventId: string) {
  const anchor = score.interchange?.anchors.find(anchor => anchor.eventId === eventId);
  if (!anchor || !score.interchange) return new Map<number, number>();
  const doc = new XMLParser({ ignoreAttributes: false }).parse(score.interchange.originalMusicXml)['score-partwise'];
  const part = array<any>(doc?.part).find(part => part['@_id'] === anchor.partId);
  const measures = array<any>(part?.measure);
  const target = score.measures.find(measure => measure.id === anchor.measureId);
  const result = new Map<number, number>();
  let lines = 6, capo = 0;
  for (const measure of measures.slice(0, target?.sequence ?? measures.length)) {
    for (const attr of array<any>(measure.attributes)) for (const details of array<any>(attr['staff-details'])) {
      if (Number(details['@_number'] ?? 1) !== anchor.staff) continue;
      lines = Number(details['staff-lines'] ?? lines); capo = Number(details.capo ?? capo);
      for (const string of array<any>(details['staff-tuning'])) {
        const step = String(string['tuning-step']) as ScorePitch['step'];
        const octave = Number(string['tuning-octave']), alter = Number(string['tuning-alter'] ?? 0);
        if (step in pc && Number.isInteger(octave)) result.set(lines + 1 - Number(string['@_line']), midi({ step, octave, alter }) + capo);
      }
    }
  }
  return result;
}

export function synchronizeEditedTabViews(before: ScoreJson, after: ScoreJson, editedEventId: string): ScoreJson {
  const anchors = before.interchange?.anchors ?? [];
  const link = anchors.find(anchor => anchor.alternateEventId && (anchor.eventId === editedEventId || anchor.alternateEventId === editedEventId));
  if (!link?.alternateEventId) return after;
  const oldEvents = new Map(before.measures.flatMap(measure => measure.events.map(event => [event.id, event] as const)));
  const newEvents = new Map(after.measures.flatMap(measure => measure.events.map(event => [event.id, event] as const)));
  const oldTab = oldEvents.get(link.eventId), currentTab = newEvents.get(link.eventId), currentStandard = newEvents.get(link.alternateEventId);
  if (!oldTab || oldTab.type !== 'note' || !currentTab || !currentStandard) return after;
  if (currentTab.type !== 'note' || currentStandard.type !== 'note') {
    const source = newEvents.get(editedEventId)!;
    const targetId = editedEventId === link.eventId ? link.alternateEventId : link.eventId;
    return { ...after, measures: after.measures.map(measure => ({ ...measure, events: measure.events.map(event => event.id === targetId ? { ...source, id: event.id, voice: event.voice, staff: event.staff } : event) })) };
  }
  let tab: ScoreNoteEvent = currentTab, standard: ScoreNoteEvent = currentStandard;
  const originalEdited = oldEvents.get(editedEventId), edited = newEvents.get(editedEventId)!;
  const pitchChanged = originalEdited?.type === 'note' && edited.type === 'note' && JSON.stringify(originalEdited.pitch) !== JSON.stringify(edited.pitch);
  const positionChanged = currentTab.technical?.string !== oldTab.technical?.string || currentTab.technical?.fret !== oldTab.technical?.fret;
  if (pitchChanged || positionChanged) {
    const strings = tuning(before, link.eventId), oldString = oldTab.technical?.string, oldFret = oldTab.technical?.fret;
    if (oldString === undefined || oldFret === undefined || !strings.has(oldString)) throw new Error('The linked TAB tuning is unresolved. Set its string tuning before changing pitch or fret.');
    const offset = midi(oldTab.pitch) - strings.get(oldString)! - oldFret;
    const nextString = tab.technical?.string ?? oldString;
    if (!strings.has(nextString)) throw new Error('The selected TAB string has no tuning in the source score.');
    if (editedEventId === link.eventId && positionChanged) {
      const nextMidi = strings.get(nextString)! + (tab.technical?.fret ?? oldFret) + offset;
      tab = { ...tab, pitch: toPitch(nextMidi) }; standard = { ...standard, pitch: tab.pitch };
    } else {
      const pitch = editedEventId === link.eventId ? tab.pitch : standard.pitch;
      const nextFret = midi(pitch) - strings.get(nextString)! - offset;
      if (!Number.isInteger(nextFret) || nextFret < 0 || nextFret > 36) throw new Error('This pitch cannot be played on the selected TAB string. Choose another string before saving.');
      tab = { ...tab, pitch, technical: { ...tab.technical, string: nextString, fret: nextFret } };
      standard = { ...standard, pitch };
    }
  }
  const source = editedEventId === link.eventId ? tab : standard;
  const rhythm = { duration: source.duration, durationType: source.durationType, dots: source.dots, timeModification: source.timeModification };
  tab = { ...tab, ...rhythm }; standard = { ...standard, ...rhythm };
  return { ...after, measures: after.measures.map(measure => ({ ...measure, events: measure.events.map(event => event.id === tab.id ? tab : event.id === standard.id ? standard : event) })) };
}
