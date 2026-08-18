import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import MidiWriter from "midi-writer-js";
import { PDFDocument } from "pdf-lib";
import type {
  PlaybackDocument,
  PlaybackNoteEvent,
  ScoreExportFormat,
  ScoreExportOptions,
  ScoreExportSnapshot,
  StoredFileKind,
} from "@score/shared";

const TICKS_PER_BEAT = 128;

export type RenderedScoreExportFile = {
  path: string;
  originalName: string;
  mimeType: string;
  assetKind: StoredFileKind;
};

export type ScoreExportRendererConfig = {
  museScoreCommand: string;
  museScoreTimeoutMs: number;
  fluidSynthCommand: string;
  fluidSynthTimeoutMs: number;
  soundFontPath: string;
  ffmpegCommand: string;
  ffmpegTimeoutMs: number;
};

export type ScoreExportRenderResult = {
  files: RenderedScoreExportFile[];
  engine: Record<string, unknown>;
  metrics: Record<string, unknown>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeBaseName(value: string) {
  return value.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "score";
}

function channelForPart(index: number) {
  const channel = (index % 15) + 1;
  return channel >= 10 ? channel + 1 : channel;
}

function ticksForBeats(beats: number) {
  return Math.max(1, Math.round(beats * TICKS_PER_BEAT));
}

function startTicksForBeats(beats: number) {
  return Math.max(0, Math.round(beats * TICKS_PER_BEAT));
}

function filteredEvents(playback: PlaybackDocument, options: ScoreExportOptions) {
  const solo = new Set(options.soloPartIds ?? []);
  const muted = new Set(options.mutedPartIds ?? []);
  const startBeat = options.loopEnabled ? Math.max(0, options.loopStartBeat ?? 0) : 0;
  const endBeat = options.loopEnabled ? Math.max(startBeat + 0.25, options.loopEndBeat ?? playback.totalBeats) : Number.POSITIVE_INFINITY;
  return playback.events.filter((event) => {
    const partVisible = solo.size > 0 ? solo.has(event.partId) : !muted.has(event.partId);
    return partVisible && event.startBeat >= startBeat && event.startBeat < endBeat;
  });
}

function noteStartTick(event: PlaybackNoteEvent, sectionStartBeat: number, countInBeats: number) {
  return startTicksForBeats(event.startBeat - sectionStartBeat + countInBeats);
}

function addTempoChanges(track: InstanceType<typeof MidiWriter.Track>, playback: PlaybackDocument, options: ScoreExportOptions, sectionStartBeat: number, countInBeats: number, baseTempo: number) {
  const sourceBase = clamp(playback.tempoBpm, 20, 400);
  const ratio = baseTempo / sourceBase;
  const sectionEnd = options.loopEnabled ? Math.max(sectionStartBeat + 0.25, options.loopEndBeat ?? playback.totalBeats) : Number.POSITIVE_INFINITY;
  for (const change of playback.tempoChanges ?? []) {
    if (change.startBeat < sectionStartBeat || change.startBeat >= sectionEnd) continue;
    track.setTempo(Math.round(clamp(change.bpm * ratio, 20, 400)), startTicksForBeats(change.startBeat - sectionStartBeat + countInBeats));
  }
}

export function playbackToMidiBuffer(playback: PlaybackDocument, options: ScoreExportOptions = {}) {
  const tempo = Math.round(clamp(options.tempoBpm ?? playback.tempoBpm, 40, 240));
  const sectionStartBeat = options.loopEnabled ? Math.max(0, options.loopStartBeat ?? 0) : 0;
  const countInBeats = options.countIn ? Math.max(1, playback.downbeatEvery || 4) : 0;
  const events = filteredEvents(playback, options);
  const tracks = playback.parts
    .filter((part) => events.some((event) => event.partId === part.id))
    .map((part, index) => {
      const track = new MidiWriter.Track();
      const channel = channelForPart(index);
      track.addTrackName(part.name);
      track.addInstrumentName(part.name);
      if (index === 0) {
        track.setTempo(tempo, 0);
        addTempoChanges(track, playback, options, sectionStartBeat, countInBeats, tempo);
      }
      if (part.midiProgram !== undefined) {
        track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: clamp(Math.round(part.midiProgram) - 1, 0, 127), channel }));
      }
      const pan = clamp(options.partPans?.[part.id] ?? 0, -1, 1);
      track.controllerChange(10, Math.round((pan + 1) * 63.5), channel, 0);
      const volume = clamp(options.partVolumes?.[part.id] ?? 1, 0, 1.5);
      track.controllerChange(7, Math.round(clamp(volume / 1.5, 0, 1) * 127), channel, 0);
      for (const event of events.filter((candidate) => candidate.partId === part.id)) {
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: [event.noteName],
          duration: `T${ticksForBeats(event.soundDurationBeats ?? event.durationBeats)}`,
          startTick: noteStartTick(event, sectionStartBeat, countInBeats),
          velocity: Math.round(clamp(event.velocity, 0, 1) * 100),
          channel,
        }));
      }
      return track;
    });

  if (options.countIn || options.metronome) {
    const clickTrack = new MidiWriter.Track();
    clickTrack.addTrackName("Practice click");
    if (tracks.length === 0) clickTrack.setTempo(tempo, 0);
    const sectionEnd = options.loopEnabled ? options.loopEndBeat ?? playback.totalBeats : playback.totalBeats;
    const practiceBeats = options.metronome ? Math.ceil(Math.max(0, sectionEnd - sectionStartBeat)) : 0;
    const totalClickBeats = countInBeats + practiceBeats;
    for (let beat = 0; beat < totalClickBeats; beat += 1) {
      clickTrack.addEvent(new MidiWriter.NoteEvent({
        pitch: [beat % Math.max(1, playback.downbeatEvery) === 0 ? "A5" : "G5"],
        duration: "T12",
        startTick: startTicksForBeats(beat),
        velocity: beat % Math.max(1, playback.downbeatEvery) === 0 ? 100 : 72,
        channel: 10,
      }));
    }
    tracks.push(clickTrack);
  }

  const writer = new MidiWriter.Writer(tracks.length > 0 ? tracks : [new MidiWriter.Track()], { ticksPerBeat: TICKS_PER_BEAT });
  return { buffer: Buffer.from(writer.buildFile()), eventCount: events.length, tempoBpm: tempo };
}

export function buildFluidSynthArgs(input: { sourceMidiPath: string; targetWavPath: string; options: ScoreExportOptions }) {
  return [
    "-ni",
    "-R", input.options.reverbEnabled === false ? "0" : "1",
    "-C", input.options.chorusEnabled === false ? "0" : "1",
    "-g", String(clamp(input.options.soundFontGain ?? 0.7, 0.05, 5)),
    "-r", String(input.options.sampleRate ?? 48000),
    "-F", input.targetWavPath,
  ];
}

export function buildFfmpegAudioArgs(input: {
  sourceWavPath: string;
  targetPath: string;
  format: "wav" | "mp3";
  options: ScoreExportOptions;
}) {
  const sampleRate = input.options.sampleRate ?? 48000;
  const channels = input.options.audioChannels ?? 2;
  const args = ["-y", "-i", input.sourceWavPath, "-ar", String(sampleRate), "-ac", String(channels)];
  if (input.options.normalizeLoudness !== false) {
    const target = clamp(input.options.loudnessTargetLufs ?? -16, -24, -9);
    args.push("-af", `loudnorm=I=${target}:TP=-1.5:LRA=11`);
  }
  if (input.format === "mp3") {
    args.push("-codec:a", "libmp3lame", "-b:a", `${input.options.bitrateKbps ?? 192}k`);
  } else {
    args.push("-codec:a", "pcm_s16le");
  }
  args.push(input.targetPath);
  return args;
}

function runCommand(input: {
  command: string;
  args: string[];
  label: string;
  timeoutMs: number;
  isCancelled: () => boolean;
}) {
  if (!input.command) throw new Error(`${input.label} is not configured.`);
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(input.command, input.args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let terminationError: Error | undefined;
    let terminationFallback: NodeJS.Timeout | undefined;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearInterval(cancelPoll);
      if (terminationFallback) clearTimeout(terminationFallback);
      if (error) reject(error); else resolve({ stdout, stderr });
    };
    const terminate = (error: Error) => {
      if (settled || terminationError) return;
      terminationError = error;
      child.kill("SIGKILL");
      terminationFallback = setTimeout(() => finish(error), 2_000);
    };
    const timeout = setTimeout(() => {
      terminate(new Error(`${input.label} timed out after ${input.timeoutMs} ms.`));
    }, input.timeoutMs);
    const cancelPoll = setInterval(() => {
      if (input.isCancelled()) {
        terminate(new Error("Export job was cancelled."));
      }
    }, 250);
    child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => finish(error));
    child.on("close", (code) => {
      if (settled) return;
      if (terminationError) {
        finish(terminationError);
        return;
      }
      if (code === 0) finish();
      else finish(new Error(`${input.label} exited with code ${code}. ${(stderr || stdout).trim()}`.trim()));
    });
  });
}

async function detectToolVersion(input: { command: string; args: string[]; label: string; isCancelled: () => boolean }) {
  try {
    const result = await runCommand({ ...input, timeoutMs: 10000 });
    return (result.stdout || result.stderr).trim().split(/\r?\n/)[0] || `${input.label} version unavailable`;
  } catch {
    return `${input.label} version unavailable`;
  }
}

export function parseFfmpegAudioQuality(output: string) {
  const durationMatch = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/i);
  const meanMatch = output.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
  const peakMatch = output.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
  const durationSeconds = durationMatch
    ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
    : null;
  return {
    durationSeconds,
    meanVolumeDb: meanMatch ? Number(meanMatch[1]) : null,
    peakVolumeDb: peakMatch ? Number(peakMatch[1]) : null,
  };
}

async function inspectAudioQuality(input: { ffmpegCommand: string; targetPath: string; timeoutMs: number; isCancelled: () => boolean }) {
  const result = await runCommand({
    command: input.ffmpegCommand,
    args: ["-hide_banner", "-i", input.targetPath, "-af", "volumedetect", "-f", "null", "-"],
    label: "ffmpeg audio validation",
    timeoutMs: input.timeoutMs,
    isCancelled: input.isCancelled,
  });
  const quality = parseFfmpegAudioQuality(`${result.stdout}\n${result.stderr}`);
  if (!quality.durationSeconds || quality.durationSeconds <= 0) throw new Error("Rendered audio has no measurable duration.");
  if (quality.meanVolumeDb === null || quality.meanVolumeDb <= -70) throw new Error("Rendered audio is silent or below the delivery loudness floor.");
  if (quality.peakVolumeDb !== null && quality.peakVolumeDb > -0.1) throw new Error("Rendered audio peak is clipping.");
  return quality;
}

function descriptor(format: ScoreExportFormat) {
  const values: Record<ScoreExportFormat, { extension: string; mimeType: string; assetKind: StoredFileKind }> = {
    musicxml: { extension: "musicxml", mimeType: "application/vnd.recordare.musicxml+xml", assetKind: "score_musicxml" },
    midi: { extension: "mid", mimeType: "audio/midi", assetKind: "output_midi" },
    pdf: { extension: "pdf", mimeType: "application/pdf", assetKind: "rendered_pdf" },
    svg: { extension: "svg", mimeType: "image/svg+xml", assetKind: "rendered_svg" },
    png: { extension: "png", mimeType: "image/png", assetKind: "rendered_png" },
    wav: { extension: "wav", mimeType: "audio/wav", assetKind: "output_audio" },
    mp3: { extension: "mp3", mimeType: "audio/mpeg", assetKind: "output_audio" },
  };
  return values[format];
}

function findMuseScoreOutputs(targetPath: string) {
  if (fs.existsSync(targetPath)) return [targetPath];
  const extension = path.extname(targetPath);
  const base = path.basename(targetPath, extension);
  return fs.readdirSync(path.dirname(targetPath))
    .filter((entry) => entry.startsWith(`${base}-`) && entry.endsWith(extension))
    .sort()
    .map((entry) => path.join(path.dirname(targetPath), entry));
}

export async function inspectRenderedScoreFile(format: "pdf" | "svg" | "png", filePath: string) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    throw new Error(`MuseScore did not create a non-empty ${format.toUpperCase()} output.`);
  }
  const content = fs.readFileSync(filePath);
  if (format === "pdf") {
    if (content.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("MuseScore output does not have a valid PDF signature.");
    }
    try {
      const document = await PDFDocument.load(content, { ignoreEncryption: true, updateMetadata: false });
      const pageCount = document.getPageCount();
      if (pageCount < 1) {
        throw new Error("PDF does not contain any pages.");
      }
      return { pageCount };
    } catch (error) {
      throw new Error(`MuseScore produced an unreadable PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (format === "png") {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (content.length < pngSignature.length || !content.subarray(0, pngSignature.length).equals(pngSignature)) {
      throw new Error("MuseScore output does not have a valid PNG signature.");
    }
    return { pageCount: 1 };
  }
  const text = content.subarray(0, Math.min(content.length, 16_384)).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  if (!/(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/iu.test(text)) {
    throw new Error("MuseScore output does not contain a valid SVG root element.");
  }
  return { pageCount: 1 };
}

export async function renderScoreExport(input: {
  snapshot: ScoreExportSnapshot;
  workDir: string;
  config: ScoreExportRendererConfig;
  isCancelled: () => boolean;
  onProgress: (progress: number) => void;
}): Promise<ScoreExportRenderResult> {
  fs.mkdirSync(input.workDir, { recursive: true });
  const { snapshot } = input;
  const formatInfo = descriptor(snapshot.format);
  const baseName = `${safeBaseName(snapshot.title)}-v${snapshot.revisionNumber}`;
  const targetPath = path.join(input.workDir, `${baseName}.${formatInfo.extension}`);
  input.onProgress(10);

  if (snapshot.format === "musicxml") {
    if (!snapshot.musicXml) throw new Error("Export snapshot does not contain MusicXML.");
    fs.writeFileSync(targetPath, snapshot.musicXml, "utf8");
    input.onProgress(100);
    return { files: [{ path: targetPath, originalName: path.basename(targetPath), ...formatInfo }], engine: { name: "score-json-musicxml", version: 1 }, metrics: {} };
  }

  if (snapshot.format === "midi") {
    if (!snapshot.playback) throw new Error("Export snapshot does not contain playback events.");
    const midi = playbackToMidiBuffer(snapshot.playback, snapshot.options);
    if (midi.eventCount === 0) throw new Error("The selected part or loop range does not contain playable notes.");
    fs.writeFileSync(targetPath, midi.buffer);
    input.onProgress(100);
    return {
      files: [{ path: targetPath, originalName: path.basename(targetPath), ...formatInfo }],
      engine: { name: "midi-writer-js", version: 3 },
      metrics: { eventCount: midi.eventCount, tempoBpm: midi.tempoBpm },
    };
  }

  if (snapshot.format === "pdf" || snapshot.format === "svg" || snapshot.format === "png") {
    const renderedFormat: "pdf" | "svg" | "png" = snapshot.format;
    if (!snapshot.musicXml) throw new Error("Export snapshot does not contain MusicXML.");
    const musicXmlPath = path.join(input.workDir, `${baseName}.source.musicxml`);
    fs.writeFileSync(musicXmlPath, snapshot.musicXml, "utf8");
    const args: string[] = [];
    if (snapshot.format === "png" && snapshot.options.imageResolutionDpi) args.push("-r", String(snapshot.options.imageResolutionDpi));
    if ((snapshot.format === "png" || snapshot.format === "svg") && snapshot.options.trimImage) {
      args.push("-T", String(snapshot.options.trimImageMargin ?? 20));
    }
    args.push("-o", targetPath, musicXmlPath);
    await runCommand({ command: input.config.museScoreCommand, args, label: "MuseScore", timeoutMs: input.config.museScoreTimeoutMs, isCancelled: input.isCancelled });
    input.onProgress(90);
    const outputPaths = findMuseScoreOutputs(targetPath);
    if (outputPaths.length === 0) throw new Error(`MuseScore completed without creating ${snapshot.format.toUpperCase()} output.`);
    const inspections = await Promise.all(outputPaths.map((outputPath) => inspectRenderedScoreFile(renderedFormat, outputPath)));
    input.onProgress(100);
    const museScoreVersion = await detectToolVersion({ command: input.config.museScoreCommand, args: ["--version"], label: "MuseScore", isCancelled: input.isCancelled });
    return {
      files: outputPaths.map((outputPath, index) => ({
        path: outputPath,
        originalName: outputPaths.length > 1 ? `${baseName}-page-${String(index + 1).padStart(2, "0")}.${formatInfo.extension}` : path.basename(targetPath),
        ...formatInfo,
      })),
      engine: { name: "MuseScore", version: museScoreVersion, command: input.config.museScoreCommand },
      metrics: { pageCount: inspections.reduce((sum, inspection) => sum + inspection.pageCount, 0) },
    };
  }

  if (!snapshot.playback) throw new Error("Export snapshot does not contain playback events.");
  if (!input.config.fluidSynthCommand) throw new Error("FLUIDSYNTH_COMMAND is required for high-quality audio export.");
  if (!input.config.soundFontPath || !fs.existsSync(input.config.soundFontPath)) throw new Error("SOUNDFONT_PATH must point to an installed .sf2 or .sf3 file.");
  const midi = playbackToMidiBuffer(snapshot.playback, snapshot.options);
  if (midi.eventCount === 0) throw new Error("The selected part or loop range does not contain playable notes.");
  const midiPath = path.join(input.workDir, `${baseName}.source.mid`);
  const rawWavPath = path.join(input.workDir, `${baseName}.raw.wav`);
  fs.writeFileSync(midiPath, midi.buffer);
  input.onProgress(25);
  const fluidArgs = [
    ...buildFluidSynthArgs({ sourceMidiPath: midiPath, targetWavPath: rawWavPath, options: snapshot.options }),
    input.config.soundFontPath,
    midiPath,
  ];
  await runCommand({ command: input.config.fluidSynthCommand, args: fluidArgs, label: "FluidSynth", timeoutMs: input.config.fluidSynthTimeoutMs, isCancelled: input.isCancelled });
  if (!fs.existsSync(rawWavPath) || fs.statSync(rawWavPath).size <= 44) throw new Error("FluidSynth did not create a playable WAV file.");
  input.onProgress(70);
  if (!input.config.ffmpegCommand) throw new Error("FFMPEG_COMMAND is required for normalized high-quality audio export.");
  await runCommand({
    command: input.config.ffmpegCommand,
    args: buildFfmpegAudioArgs({ sourceWavPath: rawWavPath, targetPath, format: snapshot.format, options: snapshot.options }),
    label: "ffmpeg",
    timeoutMs: input.config.ffmpegTimeoutMs,
    isCancelled: input.isCancelled,
  });
  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).size <= 44) throw new Error(`ffmpeg did not create a playable ${snapshot.format.toUpperCase()} file.`);
  input.onProgress(92);
  const quality = await inspectAudioQuality({
    ffmpegCommand: input.config.ffmpegCommand,
    targetPath,
    timeoutMs: input.config.ffmpegTimeoutMs,
    isCancelled: input.isCancelled,
  });
  const [fluidSynthVersion, ffmpegVersion] = await Promise.all([
    detectToolVersion({ command: input.config.fluidSynthCommand, args: ["--version"], label: "FluidSynth", isCancelled: input.isCancelled }),
    detectToolVersion({ command: input.config.ffmpegCommand, args: ["-version"], label: "ffmpeg", isCancelled: input.isCancelled }),
  ]);
  input.onProgress(100);
  return {
    files: [{ path: targetPath, originalName: path.basename(targetPath), ...formatInfo }],
    engine: {
      name: "FluidSynth + ffmpeg",
      fluidSynthVersion,
      ffmpegVersion,
      fluidSynthCommand: input.config.fluidSynthCommand,
      ffmpegCommand: input.config.ffmpegCommand,
      soundFont: path.basename(input.config.soundFontPath),
    },
    metrics: { eventCount: midi.eventCount, tempoBpm: midi.tempoBpm, sampleRate: snapshot.options.sampleRate ?? 48000, ...quality },
  };
}
