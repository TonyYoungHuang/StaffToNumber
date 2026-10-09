import type { PlaybackDocument } from "@score/shared";
import type * as AlphaTab from "@coderline/alphatab";

/** Adapt the server's canonical performance document to alphaTab's public MIDI
 * API. The server has already resolved TAB duplicates, ties, repeats, sounding
 * transposition and percussion; the renderer's XML MIDI is never a fallback. */
export function playbackToAlphaMidi(alphaTab: typeof AlphaTab, playback: PlaybackDocument, rendered: AlphaTab.model.Score): AlphaTab.midi.MidiFile {
  const file = new alphaTab.midi.MidiFile();
  file.division = 960;
  const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(file);
  const tracks = new Map<string, AlphaTab.model.Track>();
  for (const [index, part] of playback.parts.entries()) {
    const sameName = rendered.tracks.filter(track => track.name.trim() === part.name.trim());
    const track = rendered.tracks[index]?.name.trim() === part.name.trim() ? rendered.tracks[index] : sameName.length === 1 ? sameName[0] : null;
    if (!track) {
      // A new manual part can contain only invisible completion placeholders;
      // alphaTab omits that silent track until music has actually been entered.
      if (!playback.events.some(event => event.partId === part.id)) continue;
      throw new Error("The playback instrument has no unique rendered track.");
    }
    tracks.set(part.id, track);
    const channel = part.midiChannel != null ? part.midiChannel - 1 : track.playbackInfo.primaryChannel;
    if (channel !== 9 && part.midiProgram != null) handler.addProgramChange(track.index, 0, channel, Math.max(0, Math.min(127, part.midiProgram - 1)));
  }
  handler.addTempo(0, playback.tempoBpm);
  if (playback.timeSignature) handler.addTimeSignature(0, playback.timeSignature.beats.split("+").reduce((sum, beats) => sum + Number(beats), 0), Number(playback.timeSignature.beatType));
  for (const tempo of playback.tempoChanges ?? []) handler.addTempo(Math.round(tempo.startBeat * 960), tempo.bpm);
  for (const event of playback.events) {
    const track = tracks.get(event.partId);
    if (!track) throw new Error("The playback note has no rendered instrument.");
    const part = playback.parts.find(part => part.id === event.partId)!;
    const channel = event.unpitched ? 9 : event.midiChannel != null ? event.midiChannel - 1 : part.midiChannel != null ? part.midiChannel - 1 : track.playbackInfo.primaryChannel;
    handler.addNote(track.index, Math.round(event.startBeat * 960), Math.max(1, Math.round((event.soundDurationBeats ?? event.durationBeats) * 960)), event.midi, Math.max(0, Math.min(127, Math.round(event.velocity * 127))), channel);
  }
  for (const track of rendered.tracks) handler.finishTrack(track.index, Math.ceil(playback.totalBeats * 960));
  return file;
}
