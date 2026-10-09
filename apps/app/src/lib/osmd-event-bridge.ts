import type { ScoreJson } from '@score/shared';
import type { Note, VoiceGenerator } from 'opensheetmusicdisplay';

const identities = new WeakMap<Note, string>();
const installed = new WeakSet<object>();

// OSMD exports its reader. Attach the MusicXML identity to the actual Note as
// it is read, before layout reorders voices, staves, systems and chord heads.
export function installOsmdEventBridge(generator: typeof VoiceGenerator) {
  if (installed.has(generator.prototype)) return;
  const read = generator.prototype.read;
  generator.prototype.read = function (...args: Parameters<VoiceGenerator['read']>) {
    const note = read.apply(this, args);
    const id = args[0].attribute('id')?.value;
    if (note && id) identities.set(note, id);
    return note;
  };
  installed.add(generator.prototype);
}

export function osmdEventIdentity(note: Note) { return identities.get(note); }

export function annotateMusicXmlEvents(xml: string, score: ScoreJson | null) {
  if (!score) return xml;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('The score preview contains invalid MusicXML.');
  const events = new Set(score.measures.flatMap(measure => measure.events.map(event => event.id)));
  const anchors = score.interchange?.anchors ?? [];
  for (const part of Array.from(doc.documentElement.children).filter(node => node.localName === 'part')) {
    const partId = part.getAttribute('id');
    const measures = score.measures.filter(measure => measure.partId === partId).sort((a, b) => a.sequence - b.sequence);
    Array.from(part.children).filter(node => node.localName === 'measure').forEach((xmlMeasure, index) => {
      const measure = measures[index];
      if (!measure) return;
      const noteNodes = Array.from(xmlMeasure.children).filter(node => node.localName === 'note');
      const measureAnchors = anchors.filter(anchor => anchor.measureId === measure.id);
      noteNodes.forEach((node, noteIndex) => {
        const id = node.getAttribute('id');
        if (id && events.has(id)) return;
        const anchor = measureAnchors.find(candidate => candidate.noteIndex === noteIndex);
        // Only source-import anchors establish identity; never assign by SVG order.
        if (anchor && events.has(anchor.eventId)) node.setAttribute('id', anchor.notationId);
        else node.removeAttribute('id');
      });
    });
  }
  return new XMLSerializer().serializeToString(doc);
}
