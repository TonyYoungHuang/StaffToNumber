import type { PlaybackDocument, PlaybackNoteEvent } from "@score/shared";
import { spawn } from "node:child_process";

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_TEMPO_BPM = 96;
const MAX_AUDIO_SECONDS = 8 * 60;

export type PlaybackWavExportOptions = {
  tempoBpm?: number;
  soloPartIds?: string[];
  mutedPartIds?: string[];
  partVolumes?: Record<string, number>;
  countIn?: boolean;
  metronome?: boolean;
  loopEnabled?: boolean;
  loopStartBeat?: number;
  loopEndBeat?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function volumeForPart(partId: string, options: PlaybackWavExportOptions) {
  return clamp(options.partVolumes?.[partId] ?? 1, 0, 1.5);
}

function filterEvents(events: PlaybackNoteEvent[], options: PlaybackWavExportOptions) {
  const soloPartIds = options.soloPartIds ?? [];
  const mutedPartIds = options.mutedPartIds ?? [];
  const sectionStart = options.loopEnabled ? Math.max(0, options.loopStartBeat ?? 0) : 0;
  const sectionEnd = options.loopEnabled && options.loopEndBeat !== undefined ? Math.max(sectionStart + 0.25, options.loopEndBeat) : undefined;

  const partEvents =
    soloPartIds.length > 0
      ? events.filter((event) => soloPartIds.includes(event.partId))
      : events.filter((event) => !mutedPartIds.includes(event.partId));

  if (sectionEnd === undefined) {
    return partEvents;
  }

  return partEvents.filter((event) => event.startBeat >= sectionStart && event.startBeat < sectionEnd);
}

function writeString(buffer: Buffer, offset: number, value: string) {
  buffer.write(value, offset, value.length, "ascii");
}

function createWavBuffer(samples: Float32Array, sampleRate: number) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  writeString(buffer, 0, "RIFF");
  buffer.writeUInt32LE(36 + dataSize, 4);
  writeString(buffer, 8, "WAVE");
  writeString(buffer, 12, "fmt ");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  writeString(buffer, 36, "data");
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = clamp(samples[index], -1, 1);
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }

  return buffer;
}

function addSineNote(input: {
  samples: Float32Array;
  sampleRate: number;
  startSeconds: number;
  durationSeconds: number;
  frequency: number;
  gain: number;
}) {
  const startSample = Math.max(0, Math.floor(input.startSeconds * input.sampleRate));
  const endSample = Math.min(input.samples.length, Math.ceil((input.startSeconds + input.durationSeconds) * input.sampleRate));
  const attackSamples = Math.max(1, Math.floor(0.012 * input.sampleRate));
  const releaseSamples = Math.max(1, Math.floor(Math.min(0.08, input.durationSeconds / 3) * input.sampleRate));

  for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex += 1) {
    const localIndex = sampleIndex - startSample;
    const remaining = endSample - sampleIndex;
    const attack = Math.min(1, localIndex / attackSamples);
    const release = Math.min(1, remaining / releaseSamples);
    const envelope = Math.min(attack, release);
    const time = localIndex / input.sampleRate;
    const fundamental = Math.sin(2 * Math.PI * input.frequency * time);
    const firstOvertone = 0.35 * Math.sin(2 * Math.PI * input.frequency * 2 * time);
    input.samples[sampleIndex] += (fundamental + firstOvertone) * input.gain * envelope;
  }
}

function addClick(input: {
  samples: Float32Array;
  sampleRate: number;
  startSeconds: number;
  accented: boolean;
}) {
  addSineNote({
    samples: input.samples,
    sampleRate: input.sampleRate,
    startSeconds: input.startSeconds,
    durationSeconds: 0.07,
    frequency: input.accented ? 1400 : 960,
    gain: input.accented ? 0.26 : 0.18,
  });
}

export function playbackToWavFile(playback: PlaybackDocument, options: PlaybackWavExportOptions = {}) {
  const tempoBpm = clamp(Math.round(options.tempoBpm ?? playback.tempoBpm ?? DEFAULT_TEMPO_BPM), 40, 240);
  const secondsPerBeat = 60 / tempoBpm;
  const downbeatEvery = Math.max(1, Math.round(playback.downbeatEvery || 4));
  const countInBeats = options.countIn ? downbeatEvery : 0;
  const countInSeconds = countInBeats * secondsPerBeat;
  const sectionStartBeat = options.loopEnabled ? Math.max(0, options.loopStartBeat ?? 0) : 0;
  const sectionEndBeat = options.loopEnabled && options.loopEndBeat !== undefined ? Math.max(sectionStartBeat + 0.25, options.loopEndBeat) : undefined;
  const events = filterEvents(playback.events, options);
  const lastEventEndBeat = events.reduce((endBeat, event) => Math.max(endBeat, event.startBeat + event.durationBeats), sectionEndBeat ?? playback.totalBeats);
  const sectionBeats = Math.max((sectionEndBeat ?? lastEventEndBeat) - sectionStartBeat, 0.25);
  const durationSeconds = Math.min(MAX_AUDIO_SECONDS, countInSeconds + Math.max(sectionBeats * secondsPerBeat, secondsPerBeat));
  const sampleRate = DEFAULT_SAMPLE_RATE;
  const samples = new Float32Array(Math.ceil((durationSeconds + 0.5) * sampleRate));

  if (options.countIn || options.metronome) {
    const clickBeats = countInBeats + (options.metronome ? Math.ceil(sectionBeats) : 0);
    for (let beat = 0; beat < clickBeats; beat += 1) {
      addClick({
        samples,
        sampleRate,
        startSeconds: beat * secondsPerBeat,
        accented: beat % downbeatEvery === 0,
      });
    }
  }

  for (const event of events) {
    const startSeconds = countInSeconds + (event.startBeat - sectionStartBeat) * secondsPerBeat;
    const duration = Math.max(0.08, (event.soundDurationBeats ?? event.durationBeats) * secondsPerBeat);
    addSineNote({
      samples,
      sampleRate,
      startSeconds,
      durationSeconds: duration,
      frequency: midiToFrequency(event.midi),
      gain: clamp(event.velocity * volumeForPart(event.partId, options) * 0.16, 0.02, 0.2),
    });
  }

  return {
    wav: createWavBuffer(samples, sampleRate),
    metadata: {
      tempoBpm,
      sampleRate,
      durationSeconds: Number((samples.length / sampleRate).toFixed(3)),
      eventCount: events.length,
      partCount: new Set(events.map((event) => event.partId)).size,
      countInBeats,
      loopEnabled: options.loopEnabled === true,
      loopStartBeat: sectionStartBeat,
      loopEndBeat: sectionStartBeat + sectionBeats,
    },
  };
}

export function convertWavToMp3File(input: {
  ffmpegCommand: string;
  sourceWavPath: string;
  targetMp3Path: string;
  timeoutMs: number;
  bitrateKbps?: number;
}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    if (!input.ffmpegCommand) {
      reject(new Error("FFMPEG_COMMAND is not configured. Set FFMPEG_COMMAND to enable MP3 export."));
      return;
    }

    const bitrate = Math.min(320, Math.max(96, Math.round(input.bitrateKbps ?? 192)));
    const args = ["-y", "-i", input.sourceWavPath, "-codec:a", "libmp3lame", "-b:a", `${bitrate}k`, input.targetMp3Path];
    const child = spawn(input.ffmpegCommand, args, {
      shell: true,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`ffmpeg timed out after ${input.timeoutMs} ms.`));
    }, input.timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`ffmpeg exited with code ${code}. ${stderr || stdout}`.trim()));
    });
  });
}

export function renderMidiToWavWithFluidSynth(input: {
  fluidSynthCommand: string;
  soundFontPath: string;
  sourceMidiPath: string;
  targetWavPath: string;
  timeoutMs: number;
  sampleRate?: number;
  gain?: number;
}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    if (!input.fluidSynthCommand) {
      reject(new Error("FLUIDSYNTH_COMMAND is not configured. Set FLUIDSYNTH_COMMAND to enable SoundFont rendering."));
      return;
    }

    if (!input.soundFontPath) {
      reject(new Error("SOUNDFONT_PATH is not configured. Set SOUNDFONT_PATH to an .sf2/.sf3 file for high-quality rendering."));
      return;
    }

    const sampleRate = Math.min(192000, Math.max(22050, Math.round(input.sampleRate ?? DEFAULT_SAMPLE_RATE)));
    const gain = clamp(input.gain ?? 0.7, 0.05, 5);
    const args = [
      "-ni",
      "-g",
      String(gain),
      "-r",
      String(sampleRate),
      "-F",
      input.targetWavPath,
      input.soundFontPath,
      input.sourceMidiPath,
    ];
    const child = spawn(input.fluidSynthCommand, args, {
      shell: true,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`FluidSynth timed out after ${input.timeoutMs} ms.`));
    }, input.timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`FluidSynth exited with code ${code}. ${stderr || stdout}`.trim()));
    });
  });
}
