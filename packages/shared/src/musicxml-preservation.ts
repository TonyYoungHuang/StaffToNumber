import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import type { ScoreEvent, ScoreJson, ScoreMeasure } from './index.js';

// Preserve the ordered interchange tree. The editor model deliberately does not
// represent every MusicXML extension; regenerating that tree would discard them.
type Node = { [name: string]: Node[] | string | number | Record<string, string> };
const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, trimValues: false, parseTagValue: false, processEntities: false });
const builder = new XMLBuilder({ preserveOrder: true, ignoreAttributes: false, format: false, suppressEmptyNode: true, processEntities: false });
const name = (node: Node) => Object.keys(node).find(key => key !== ':@') ?? '';
const children = (node: Node): Node[] => Array.isArray(node[name(node)]) ? node[name(node)] as Node[] : [];
const find = (nodes: Node[], key: string) => nodes.find(node => name(node) === key);
const all = (nodes: Node[], key: string) => nodes.filter(node => name(node) === key);
const attributes = (node: Node) => (node[':@'] ?? {}) as Record<string, string>;
const value = (node: Node | undefined): string => node ? children(node).map(child => child['#text'] ?? '').join('') : '';
const clone = <T>(input: T): T => structuredClone(input);
const fingerprint = (input: unknown) => JSON.stringify(input);
const eventValue = (event: ScoreEvent) => { const { recognition: _recognition, ...content } = event; return content; };
const measureValue = (measure: ScoreMeasure) => { const { events, ...content } = measure; return { ...content, eventIds: events.map(event => event.id) }; };

export class MusicXmlPreservationError extends Error {
  constructor(message: string) { super(message); this.name = 'MusicXmlPreservationError'; }
}

function tree(xml: string): { nodes: Node[]; root: Node } {
  if (typeof xml !== 'string' || xml.length > 25_000_000 || /<!ENTITY\b/i.test(xml)) {
    throw new MusicXmlPreservationError('Unsupported or oversized MusicXML preservation source.');
  }
  if (XMLValidator.validate(xml) !== true) throw new MusicXmlPreservationError('The original MusicXML is malformed.');
  const nodes = parser.parse(xml) as Node[];
  const root = find(nodes, 'score-partwise');
  if (!root) throw new MusicXmlPreservationError('Only score-partwise MusicXML can be preserved.');
  return { nodes, root };
}

const NOTE_ORDER = ['grace', 'cue', 'chord', 'pitch', 'unpitched', 'rest', 'duration', 'tie', 'instrument', 'footnote', 'level', 'voice', 'type', 'dot', 'accidental', 'time-modification', 'stem', 'notehead', 'notehead-text', 'staff', 'beam', 'notations', 'lyric', 'play', 'listen'];
const ATTR_ORDER = ['footnote', 'level', 'divisions', 'key', 'time', 'staves', 'part-symbol', 'instruments', 'clef', 'staff-details', 'transpose', 'directive', 'measure-style'];
const ROOT_ORDER = ['work', 'movement-number', 'movement-title', 'identification', 'defaults', 'credit', 'part-list', 'part'];
function replace(nodes: Node[], key: string, replacements: Node[], order?: string[]) {
  const first = nodes.findIndex(node => name(node) === key);
  const kept = nodes.filter(node => name(node) !== key);
  let at = first < 0 ? kept.length : first;
  if (order) {
    const rank = order.indexOf(key);
    const next = kept.findIndex(node => order.indexOf(name(node)) > rank);
    at = next < 0 ? kept.length : next;
  }
  kept.splice(at, 0, ...clone(replacements));
  nodes.splice(0, nodes.length, ...kept);
}

export function attachMusicXmlPreservation(score: ScoreJson, xml: string): ScoreJson {
  const { root } = tree(xml);
  const anchors: NonNullable<ScoreJson['interchange']>['anchors'] = [];
  const fingerprints: Record<string, string> = {};
  for (const part of all(children(root), 'part')) {
    const partId = attributes(part)['@_id'];
    const measures = score.measures.filter(measure => measure.partId === partId);
    all(children(part), 'measure').forEach((xmlMeasure, index) => {
      const measure = measures[index];
      if (!measure) return;
      const available = new Map(measure.events.map(event => [event.id, event]));
      all(children(xmlMeasure), 'note').forEach((note, noteIndex) => {
        const id = attributes(note)['@_id'];
        const event = available.get(id) ?? available.get(`${measure.id}-e${noteIndex + 1}`);
        if (!event) return;
        available.delete(event.id);
        anchors.push({ eventId: event.id, partId, measureId: measure.id, noteIndex, notationId: event.id, staff: event.staff ?? 1 });
      });
      fingerprints[`@measure:${measure.id}`] = fingerprint(measureValue(measure));
    });
  }
  // A TAB staff is an alternate view only when the source proves that it has
  // the same onset, duration and written pitch as exactly one standard note.
  const anchorMap = new Map(anchors.map(anchor => [`${anchor.measureId}:${anchor.noteIndex}`, anchor]));
  for (const part of all(children(root), 'part')) {
    const partId = attributes(part)['@_id'];
    const measures = score.measures.filter(measure => measure.partId === partId);
    const tabStaves = new Set<number>();
    all(children(part), 'measure').forEach((xmlMeasure, measureIndex) => {
      const measure = measures[measureIndex];
      if (!measure) return;
      for (const attr of all(children(xmlMeasure), 'attributes')) for (const clef of all(children(attr), 'clef')) {
        const staff = Number(attributes(clef)['@_number'] ?? 1);
        if (value(find(children(clef), 'sign')) === 'TAB') tabStaves.add(staff); else tabStaves.delete(staff);
      }
      let cursor = 0, last = 0, index = 0;
      const positions = new Map<string, Array<{ anchor: typeof anchors[number]; isTab: boolean }>>();
      for (const node of children(xmlMeasure)) {
        const key = name(node), duration = Number(value(find(children(node), 'duration'))) || 0;
        if (key === 'backup') cursor -= duration;
        else if (key === 'forward') cursor += duration;
        else if (key === 'note') {
          const anchor = anchorMap.get(`${measure.id}:${index++}`);
          const chord = Boolean(find(children(node), 'chord')), grace = Boolean(find(children(node), 'grace'));
          const onset = chord ? last : cursor;
          if (!chord) { last = cursor; if (!grace) cursor += duration; }
          const event = anchor && measure.events.find(event => event.id === anchor.eventId);
          if (!anchor || event?.type !== 'note' || event.unpitched || grace) continue;
          const identity = fingerprint([onset, duration, event.pitch]);
          const group = positions.get(identity) ?? [];
          group.push({ anchor, isTab: tabStaves.has(anchor.staff) }); positions.set(identity, group);
        }
      }
      for (const group of positions.values()) {
        const standard = group.filter(item => !item.isTab), tab = group.filter(item => item.isTab);
        if (standard.length === 1 && tab.length === 1) tab[0].anchor.alternateEventId = standard[0].anchor.eventId;
      }
    });
  }
  for (const measure of score.measures) for (const event of measure.events) fingerprints[event.id] = fingerprint(eventValue(event));
  for (const part of score.parts) fingerprints[`@part:${part.id}`] = fingerprint(part);
  fingerprints['@score'] = fingerprint({ title: score.title, workTitle: score.metadata.workTitle, movementTitle: score.metadata.movementTitle, composer: score.metadata.composer, staffGroups: score.staffGroups });
  return { ...score, interchange: { version: 1, originalMusicXml: xml, originalEventFingerprints: fingerprints, anchors } };
}

function baseline(score: ScoreJson, key: string): Record<string, unknown> {
  const raw = score.interchange?.originalEventFingerprints[key];
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { throw new MusicXmlPreservationError('The MusicXML preservation baseline is invalid.'); }
}

function changed(before: Record<string, unknown>, current: unknown, key: string) {
  return fingerprint(before[key]) !== fingerprint((current as Record<string, unknown>)[key]);
}

function patchNote(original: Node, generated: Node, before: Record<string, unknown>, event: ScoreEvent): Node {
  const result = clone(original);
  result[':@'] = { ...attributes(result), '@_id': event.id };
  if (changed(before, event, 'printObject')) {
    if (event.printObject === undefined) delete attributes(result)['@_print-object'];
    else attributes(result)['@_print-object'] = event.printObject ? 'yes' : 'no';
  }
  const target = children(result), source = children(generated);
  const fields: Record<string, string[]> = {
    type: ['pitch', 'unpitched', 'rest', 'instrument'], pitch: ['pitch'], unpitched: ['unpitched', 'pitch', 'instrument'],
    measureRest: ['rest'], duration: ['duration'], durationType: ['type'], dots: ['dot'],
    voice: ['voice'], staff: ['staff'], chord: ['chord'], accidental: ['accidental'],
    notehead: ['notehead'], grace: ['grace', 'duration'], timeModification: ['time-modification'], beams: ['beam'],
    lyrics: ['lyric'],
  };
  for (const [field, tags] of Object.entries(fields)) if (changed(before, event, field)) {
    for (const key of tags) replace(target, key, all(source, key), NOTE_ORDER);
  }
  if (changed(before, event, 'ties')) replace(target, 'tie', all(source, 'tie'), NOTE_ORDER);
  const notationFields: Record<string, string> = { ties: 'tied', slurs: 'slur', articulations: 'articulations', fermatas: 'fermata', tuplets: 'tuplet', ornaments: 'ornaments' };
  const notationChanges = Object.entries(notationFields).filter(([field]) => changed(before, event, field));
  const technicalChanged = changed(before, event, 'technical'), fingeringChanged = changed(before, event, 'fingerings');
  if (notationChanges.length || technicalChanged || fingeringChanged) {
    let notation = find(target, 'notations');
    if (!notation) { notation = { notations: [] }; replace(target, 'notations', [notation], NOTE_ORDER); notation = find(target, 'notations')!; }
    const generatedNotations = all(source, 'notations').flatMap(children);
    // Multiple notation containers are legal. Remove only the fields actually edited.
    for (const [, tag] of notationChanges) {
      for (const container of all(target, 'notations')) replace(children(container), tag, []);
      children(notation).push(...clone(all(generatedNotations, tag)));
    }
    if (technicalChanged || fingeringChanged) {
      const oldTechnical = (before.technical ?? {}) as Record<string, unknown>;
      const technicalTags = [...(technicalChanged ? Object.entries({ string: 'string', fret: 'fret', bend: 'bend', hammerOn: 'hammer-on', pullOff: 'pull-off', slide: 'slide' }).filter(([field]) => changed(oldTechnical, (event.type === 'note' ? event.technical : undefined) ?? {}, field)).map(([, tag]) => tag) : []), ...(fingeringChanged ? ['fingering'] : [])];
      let technical = find(children(notation), 'technical');
      if (!technical) { technical = { technical: [] }; children(notation).push(technical); }
      const generatedTechnical = all(generatedNotations, 'technical').flatMap(children);
      for (const tag of technicalTags) {
        const oldNodes = all(target, 'notations').flatMap(container => all(children(container), 'technical').flatMap(t => all(children(t), tag)));
        const replacements = clone(all(generatedTechnical, tag));
        replacements.forEach((node, index) => {
          const old = oldNodes[index];
          if (!old) return;
          node[':@'] = { ...attributes(old), ...attributes(node) };
          if (tag === 'bend') {
            const kept = clone(old); replace(children(kept), 'bend-alter', all(children(node), 'bend-alter')); replacements[index] = kept;
          } else if (['hammer-on', 'pull-off', 'slide'].includes(tag) && children(node).length === 0) node[tag] = clone(children(old));
        });
        for (const container of all(target, 'notations')) for (const t of all(children(container), 'technical')) replace(children(t), tag, []);
        children(technical).push(...replacements);
      }
    }
  }
  return result;
}

function directionKind(node: Node): string {
  const type = find(children(node), 'direction-type');
  if (find(children(node), 'sound') && attributes(find(children(node), 'sound')!)['@_tempo']) return 'tempos';
  if (!type) return '';
  const keys: Record<string, string> = { metronome: 'tempos', dynamics: 'dynamics', wedge: 'wedges', rehearsal: 'rehearsalMarks', coda: 'navigationMarks', segno: 'navigationMarks', words: 'navigationMarks' };
  const words = find(children(type), 'words');
  if (words && !/(\b(d\.?\s*c\.?|d\.?\s*s\.?|fine|coda|segno)\b)/i.test(value(words))) return '';
  return keys[name(children(type)[0] ?? {})] ?? '';
}

function patchMeasureMetadata(original: Node, generated: Node, before: Record<string, unknown>, measure: ScoreMeasure) {
  const target = children(original), source = children(generated);
  if (changed(before, measure, 'number')) attributes(original)['@_number'] = measure.number;
  if (changed(before, measure, 'implicit')) attributes(original)['@_implicit'] = measure.implicit ? 'yes' : 'no';
  if (changed(before, measure, 'attributes')) {
    let attr = find(target, 'attributes');
    const generatedAttr = find(source, 'attributes');
    if (!attr) { replace(target, 'attributes', generatedAttr ? [generatedAttr] : []); }
    else {
      const old = (before.attributes ?? {}) as Record<string, unknown>, current = measure.attributes ?? {};
      for (const [field, tag] of Object.entries({ divisions: 'divisions', key: 'key', time: 'time', staves: 'staves', clef: 'clef', clefs: 'clef' })) {
        if (changed(old, current, field)) replace(children(attr), tag, generatedAttr ? all(children(generatedAttr), tag) : [], ATTR_ORDER);
      }
    }
  }
  if (changed(before, measure, 'layout')) {
    replace(target, 'print', all(source, 'print'));
    if (measure.layout?.measureWidth === undefined) delete attributes(original)['@_width'];
    else attributes(original)['@_width'] = String(measure.layout.measureWidth);
  }
  for (const [field, tag] of Object.entries({ harmonies: 'harmony', barlines: 'barline' })) if (changed(before, measure, field)) replace(target, tag, all(source, tag));
  for (const field of ['tempos', 'dynamics', 'wedges', 'navigationMarks', 'rehearsalMarks']) if (changed(before, measure, field)) {
    const at = target.findIndex(node => name(node) === 'direction' && directionKind(node) === field);
    const kept = target.filter(node => name(node) !== 'direction' || directionKind(node) !== field);
    kept.splice(at < 0 ? Math.max(0, kept.findIndex(node => name(node) === 'note')) : at, 0, ...clone(source.filter(node => name(node) === 'direction' && directionKind(node) === field)));
    target.splice(0, target.length, ...kept);
  }
}

/** Overlay changed editor fields onto the source tree; unknown source elements survive. */
export function exportPreservedMusicXml(score: ScoreJson, generatedMusicXml: string): string | null {
  if (!score.interchange) return null;
  const original = tree(score.interchange.originalMusicXml), generated = tree(generatedMusicXml);
  const currentEvents = new Map(score.measures.flatMap(measure => measure.events.map(event => [event.id, event] as const)));
  const generatedParts = new Map(all(children(generated.root), 'part').map(part => [attributes(part)['@_id'], part]));
  const originalParts = all(children(original.root), 'part');
  const sourceNotes = new Map<string, Node>();
  const partMap = new Map(originalParts.map(part => [attributes(part)['@_id'], all(children(part), 'measure')]));
  for (const anchor of score.interchange.anchors) {
    // Empty measures have no anchors: use the sequence in the persisted measure baseline.
    const sequence = Number(baseline(score, `@measure:${anchor.measureId}`).sequence);
    const measure = partMap.get(anchor.partId)?.[sequence - 1];
    const note = measure && all(children(measure), 'note')[anchor.noteIndex];
    if (note) sourceNotes.set(anchor.eventId, note);
  }
  const resultParts: Node[] = [];
  for (const part of score.parts) {
    const sourcePart = originalParts.find(node => attributes(node)['@_id'] === part.id);
    const fallbackPart = generatedParts.get(part.id);
    if (!fallbackPart) throw new MusicXmlPreservationError(`Missing generated part ${part.id}.`);
    if (!sourcePart) { resultParts.push(clone(fallbackPart)); continue; }
    const outputPart = clone(sourcePart), measures: Node[] = [];
    const partMeasures = score.measures.filter(measure => measure.partId === part.id);
    partMeasures.forEach((measure, index) => {
      const old = baseline(score, `@measure:${measure.id}`);
      const sourceMeasure = all(children(sourcePart), 'measure')[Number(old.sequence) - 1];
      const fallbackMeasure = all(children(fallbackPart), 'measure')[index];
      if (!sourceMeasure) { measures.push(clone(fallbackMeasure)); return; }
      const result = clone(sourceMeasure);
      const anchors = score.interchange!.anchors.filter(anchor => anchor.measureId === measure.id);
      const byIndex = new Map(anchors.map(anchor => [anchor.noteIndex, anchor]));
      const fallbackNotes = new Map(all(children(fallbackMeasure), 'note').map(note => [attributes(note)['@_id'], note]));
      const beforeIds = old.eventIds as string[] | undefined;
      const timingFields = ['duration', 'voice', 'staff', 'chord', 'grace'];
      const rebuild = fingerprint(beforeIds) !== fingerprint(measure.events.map(event => event.id)) || measure.events.some(event => timingFields.some(field => changed(baseline(score, event.id), event, field)));
      if (!rebuild) {
        let noteIndex = 0;
        result.measure = children(result).map(node => {
          if (name(node) !== 'note') return node;
          const anchor = byIndex.get(noteIndex++), event = anchor && currentEvents.get(anchor.eventId);
          return event && fallbackNotes.get(event.id) ? patchNote(node, fallbackNotes.get(event.id)!, baseline(score, event.id), event) : node;
        });
      } else {
        if (all(children(sourceMeasure), 'forward').some(node => Number(value(find(children(node), 'duration'))) > 0)) {
          throw new MusicXmlPreservationError('This measure contains explicit source timing gaps. Edit its pitch or text, or resolve the timing gaps before changing rhythm or structure.');
        }
        if (all(children(sourceMeasure), 'note').length !== anchors.length) {
          throw new MusicXmlPreservationError('This measure contains unresolved source notes. Resolve them before changing its rhythm or structure.');
        }
        // Retain non-timing elements at the nearest original event, including text,
        // directions and extension nodes, while rebuilding backup/forward timing.
        const prefix: Node[] = [], trailing: Node[] = [], anchored = new Map<string, Node[]>();
        let pending: Node[] = [], noteIndex = 0, seenNote = false;
        for (const node of children(result)) {
          if (name(node) === 'note') {
            const anchor = byIndex.get(noteIndex++);
            if (!seenNote) prefix.push(...pending); else if (anchor) anchored.set(anchor.eventId, pending);
            pending = []; seenNote = true;
          } else if (!['backup', 'forward'].includes(name(node))) pending.push(node);
        }
        if (!seenNote) {
          prefix.push(...pending.filter(node => name(node) !== 'barline'));
          trailing.push(...pending.filter(node => name(node) === 'barline'));
        } else trailing.push(...pending);
        const sequence: Node[] = [...prefix];
        for (const node of children(fallbackMeasure)) {
          const key = name(node);
          if (key === 'note') {
            const id = attributes(node)['@_id'], event = currentEvents.get(id)!;
            sequence.push(...(anchored.get(id) ?? [])); anchored.delete(id);
            sequence.push(sourceNotes.has(id) ? patchNote(sourceNotes.get(id)!, node, baseline(score, id), event) : clone(node));
          } else if (key === 'backup' || key === 'forward') sequence.push(clone(node));
        }
        // Deleted event anchors still retain their annotations.
        sequence.push(...[...anchored.values()].flat(), ...trailing);
        result.measure = sequence;
      }
      patchMeasureMetadata(result, fallbackMeasure, old, measure);
      if (index === 0 && changed(baseline(score, `@part:${part.id}`), part, 'transposeSemitones')) {
        const attr = find(children(result), 'attributes'), fallbackAttr = find(children(fallbackMeasure), 'attributes');
        if (attr) replace(children(attr), 'transpose', fallbackAttr ? all(children(fallbackAttr), 'transpose') : [], ATTR_ORDER);
      }
      measures.push(result);
    });
    replace(children(outputPart), 'measure', measures);
    resultParts.push(outputPart);
  }
  replace(children(original.root), 'part', resultParts);
  const list = find(children(original.root), 'part-list'), fallbackList = find(children(generated.root), 'part-list');
  if (list && fallbackList) {
    const definitions = score.parts.map(part => {
      const source = all(children(list), 'score-part').find(node => attributes(node)['@_id'] === part.id);
      const fallback = all(children(fallbackList), 'score-part').find(node => attributes(node)['@_id'] === part.id)!;
      if (!source) return clone(fallback);
      const result = clone(source), old = baseline(score, `@part:${part.id}`);
      for (const instrument of all(children(fallback), 'score-instrument')) {
        if (!all(children(result), 'score-instrument').some(node => attributes(node)['@_id'] === attributes(instrument)['@_id'])) {
          const at = children(result).findIndex(node => name(node) === 'midi-instrument' || name(node) === 'midi-device');
          children(result).splice(at < 0 ? children(result).length : at, 0, clone(instrument));
        }
      }
      for (const instrument of all(children(fallback), 'midi-instrument')) {
        if (!all(children(result), 'midi-instrument').some(node => attributes(node)['@_id'] === attributes(instrument)['@_id'])) children(result).push(clone(instrument));
      }
      for (const [field, tag] of Object.entries({ name: 'part-name', abbreviation: 'part-abbreviation' })) if (changed(old, part, field)) replace(children(result), tag, all(children(fallback), tag));
      if (changed(old, part, 'midiProgram') || changed(old, part, 'midiChannel')) replace(children(result), 'midi-instrument', all(children(fallback), 'midi-instrument'));
      return result;
    });
    const definitionsById = new Map(definitions.map(node => [attributes(node)['@_id'], node]));
    const originalIds = all(children(list), 'score-part').map(node => attributes(node)['@_id']);
    const groupingChanged = changed(baseline(score, '@score'), score, 'staffGroups');
    if (fingerprint(originalIds) === fingerprint(score.parts.map(part => part.id)) && !groupingChanged) {
      // Part-group start/stop markers are interleaved with score-part nodes.
      // Replacing all definitions as one block would change bracket membership.
      list['part-list'] = children(list).map(node => name(node) === 'score-part' ? definitionsById.get(attributes(node)['@_id'])! : node);
    } else {
      list['part-list'] = children(fallbackList).map(node => name(node) === 'score-part' ? definitionsById.get(attributes(node)['@_id'])! : clone(node));
    }
  }
  const oldScore = baseline(score, '@score');
  const currentScore = { title: score.title, workTitle: score.metadata.workTitle, movementTitle: score.metadata.movementTitle, composer: score.metadata.composer };
  if (changed(oldScore, currentScore, 'title') || changed(oldScore, currentScore, 'workTitle')) {
    let work = find(children(original.root), 'work');
    if (!work) { work = { work: [] }; children(original.root).unshift(work); }
    const fallbackWork = find(children(generated.root), 'work');
    replace(children(work), 'work-title', fallbackWork ? all(children(fallbackWork), 'work-title') : []);
  }
  if (changed(oldScore, currentScore, 'movementTitle')) replace(children(original.root), 'movement-title', all(children(generated.root), 'movement-title'));
  if (changed(oldScore, currentScore, 'composer')) {
    let identification = find(children(original.root), 'identification');
    if (!identification) { replace(children(original.root), 'identification', [{ identification: [] }], ROOT_ORDER); identification = find(children(original.root), 'identification')!; }
    const remaining = children(identification).filter(node => name(node) !== 'creator' || attributes(node)['@_type'] !== 'composer');
    const generatedIdentification = find(children(generated.root), 'identification');
    if (generatedIdentification) remaining.unshift(...clone(all(children(generatedIdentification), 'creator').filter(node => attributes(node)['@_type'] === 'composer')));
    identification.identification = remaining;
  }
  // A requested page layout is present only in the generated XML. Merge it into
  // defaults rather than dropping original fonts and appearance settings.
  const defaults = find(children(generated.root), 'defaults');
  if (defaults) {
    let target = find(children(original.root), 'defaults');
    if (!target) { replace(children(original.root), 'defaults', [defaults], ROOT_ORDER); }
    else for (const key of ['scaling', 'page-layout']) replace(children(target), key, all(children(defaults), key));
  }
  return builder.build(original.nodes) as string;
}
