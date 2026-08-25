import { deflateSync } from "node:zlib";

export type FeatureExampleFile = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
};

const sourceMusicXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>ScoreTransposer Example</work-title></work>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`;

const transposedMusicXml = sourceMusicXml
  .replace("<work-title>ScoreTransposer Example</work-title>", "<work-title>Transposed to D major</work-title>")
  .replace("<fifths>0</fifths>", "<fifths>2</fifths>")
  .replace(/<step>(C|D|E|G)<\/step><octave>4/g, (_match, step: "C" | "D" | "E" | "G") => ({
    C: "<step>D</step><octave>4",
    D: "<step>E</step><octave>4",
    E: "<step>F</step><alter>1</alter><octave>4",
    G: "<step>A</step><octave>4",
  })[step]);

const correctedMusicXml = sourceMusicXml
  .replace("<work-title>ScoreTransposer Example</work-title>", "<work-title>Corrected score revision</work-title>")
  .replace("<step>E</step><octave>4", "<step>F</step><alter>1</alter><octave>4")
  .replace("<type>quarter</type></note>\n    <note><pitch><step>G", "<type>quarter</type><notations><accent/></notations></note>\n    <note><pitch><step>G");

function textFile(value: string, contentType: string, extension: string): FeatureExampleFile {
  return { bytes: new TextEncoder().encode(value), contentType, extension };
}

function jsonFile(value: Record<string, unknown>): FeatureExampleFile {
  return textFile(`${JSON.stringify(value, null, 2)}\n`, "application/json; charset=utf-8", "json");
}

function midiFile(): FeatureExampleFile {
  return {
    bytes: Uint8Array.from([
      0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 0x60,
      0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 0x13,
      0, 0xff, 0x51, 3, 7, 0xa1, 0x20,
      0, 0x90, 0x3c, 0x64,
      0x60, 0x80, 0x3c, 0x40,
      0, 0xff, 0x2f, 0,
    ]),
    contentType: "audio/midi",
    extension: "mid",
  };
}

function wavFile(semitones = 0): FeatureExampleFile {
  const sampleRate = 16_000;
  const noteSeconds = 0.8;
  const sourceFrequencies = [261.626, 293.665, 329.628, 391.995];
  const frequencies = sourceFrequencies.map((frequency) => frequency * 2 ** (semitones / 12));
  const samplesPerNote = Math.round(sampleRate * noteSeconds);
  const samples = samplesPerNote * frequencies.length;
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);
  for (let index = 0; index < samples; index += 1) {
    const noteIndex = Math.min(frequencies.length - 1, Math.floor(index / samplesPerNote));
    const noteSample = index % samplesPerNote;
    const frequency = frequencies[noteIndex] ?? sourceFrequencies[0];
    const attack = Math.min(1, noteSample / (sampleRate * 0.025));
    const release = Math.min(1, (samplesPerNote - noteSample) / (sampleRate * 0.08));
    const envelope = Math.max(0, Math.min(attack, release));
    const phase = (2 * Math.PI * frequency * noteSample) / sampleRate;
    const sample = Math.sin(phase) * 0.72 + Math.sin(phase * 2) * 0.2 + Math.sin(phase * 3) * 0.08;
    view.setInt16(44 + index * 2, Math.round(sample * 10_000 * envelope), true);
  }
  return { bytes: new Uint8Array(buffer), contentType: "audio/wav", extension: "wav" };
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array) {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const checksumInput = new Uint8Array(typeBytes.length + data.length);
  checksumInput.set(typeBytes);
  checksumInput.set(data, typeBytes.length);
  view.setUint32(8 + data.length, crc32(checksumInput));
  return chunk;
}

function scorePngFile(): FeatureExampleFile {
  const width = 800;
  const height = 300;
  const pixels = new Uint8Array((width + 1) * height).fill(255);
  for (let y = 0; y < height; y += 1) pixels[y * (width + 1)] = 0;
  const plot = (x: number, y: number, value = 0) => {
    if (x >= 0 && x < width && y >= 0 && y < height) pixels[y * (width + 1) + x + 1] = value;
  };
  for (const staffTop of [70, 185]) {
    for (let line = 0; line < 5; line += 1) for (let x = 35; x < 765; x += 1) plot(x, staffTop + line * 12, 20);
    for (const [noteX, noteY] of [[150, staffTop + 42], [280, staffTop + 30], [410, staffTop + 24], [560, staffTop + 12]]) {
      for (let y = -6; y <= 6; y += 1) for (let x = -10; x <= 10; x += 1) if ((x * x) / 100 + (y * y) / 36 <= 1) plot(noteX + x, noteY + y);
      for (let y = noteY - 48; y <= noteY; y += 1) plot(noteX + 10, y);
    }
  }
  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, width);
  header.setUint32(4, height);
  ihdr.set([8, 0, 0, 0, 0], 8);
  const chunks = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", new Uint8Array(deflateSync(pixels))),
    pngChunk("IEND", new Uint8Array()),
  ];
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, contentType: "image/png", extension: "png" };
}

const musicXmlFile = (value = sourceMusicXml) => textFile(value, "application/vnd.recordare.musicxml+xml; charset=utf-8", "musicxml");

export function buildFeatureExampleFile(
  slug: string,
  side: "input" | "output",
  options: { semitones?: number } = {},
): FeatureExampleFile | null {
  const files: Record<string, { input: () => FeatureExampleFile; output: () => FeatureExampleFile }> = {
    "staff-to-jianpu": { input: () => musicXmlFile(), output: () => textFile("1=C 4/4\nP: Piano\n| 1 2 3 5 |\nLYRIC: do re mi sol\n", "text/plain; charset=utf-8", "jianpu.txt") },
    "jianpu-to-staff": { input: () => textFile("1=C 4/4\nP: Piano\n| 1 2 3 5 |\nLYRIC: do re mi sol\n", "text/plain; charset=utf-8", "jianpu.txt"), output: () => musicXmlFile() },
    "transpose-score": { input: () => musicXmlFile(), output: () => musicXmlFile(transposedMusicXml) },
    "score-editor": { input: () => musicXmlFile(), output: () => musicXmlFile(correctedMusicXml) },
    "score-to-audio": { input: () => musicXmlFile(), output: () => wavFile(options.semitones ?? 0) },
    "audio-to-score": { input: wavFile, output: midiFile },
    "musicxml-midi": { input: () => musicXmlFile(), output: midiFile },
    "pdf-score-scanner": { input: scorePngFile, output: () => musicXmlFile() },
    "pdf-to-musicxml": { input: scorePngFile, output: () => musicXmlFile() },
    teaching: {
      input: () => jsonFile({ scoreRevision: "demo-revision", instructions: "Practice measures 1-4 at 80 BPM.", dueAt: "2026-07-22T12:00:00Z" }),
      output: () => jsonFile({ submissionStatus: "submitted", practiceMinutes: 18, rubricScore: 4, feedback: "Rhythm is steady; review measure 3." }),
    },
    pricing: {
      input: () => jsonFile({ accountRegion: "CN", requestedCapability: "high_quality_audio_export" }),
      output: () => jsonFile({ plan: "Pro", status: "active", capabilities: ["score_history", "musicxml_export", "high_quality_audio_export"] }),
    },
  };
  return files[slug]?.[side]() ?? null;
}
