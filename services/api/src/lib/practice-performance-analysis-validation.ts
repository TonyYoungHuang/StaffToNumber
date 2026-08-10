const EVENT_STATUSES = new Set(["matched", "pitch_attention", "rhythm_attention", "missing", "polyphonic_unscored"]);
const ALIGNMENT_SOURCES = new Set(["automatic", "manual"]);

function objectValue(input: unknown, label: string) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`${label} must be an object.`);
  return input as Record<string, unknown>;
}

function stringValue(input: unknown, label: string, maximumLength = 200) {
  if (typeof input !== "string" || input.length === 0 || input.length > maximumLength) throw new Error(`${label} is invalid.`);
  return input;
}

function nullableString(input: unknown, label: string, maximumLength = 200) {
  if (input === null) return null;
  return stringValue(input, label, maximumLength);
}

function numberValue(input: unknown, label: string, minimum: number, maximum: number) {
  if (typeof input !== "number" || !Number.isFinite(input) || input < minimum || input > maximum) throw new Error(`${label} is invalid.`);
  return input;
}

function nullableNumber(input: unknown, label: string, minimum: number, maximum: number) {
  if (input === null) return null;
  return numberValue(input, label, minimum, maximum);
}

export function validatePracticePerformanceAnalysis(input: unknown): Record<string, unknown> | null {
  if (input == null) return null;
  const value = objectValue(input, "Performance analysis");
  if (value.schemaVersion !== 1 || value.algorithmVersion !== "practice-autocorrelation-v1") {
    throw new Error("Performance analysis version is not supported.");
  }
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) {
    throw new Error("Performance analysis timestamp is invalid.");
  }
  nullableString(value.scoreRevisionId, "Performance analysis score revision", 100);

  const alignment = objectValue(value.alignment, "Performance analysis alignment");
  numberValue(alignment.recordingStartSeconds, "Recording start", 0, 86_400);
  numberValue(alignment.timeScale, "Time scale", 0.5, 2);
  if (typeof alignment.source !== "string" || !ALIGNMENT_SOURCES.has(alignment.source)) throw new Error("Alignment source is invalid.");

  if (value.activeRegion !== null) {
    const activeRegion = objectValue(value.activeRegion, "Active audio region");
    const start = numberValue(activeRegion.startSeconds, "Active region start", 0, 86_400);
    const end = numberValue(activeRegion.endSeconds, "Active region end", 0, 86_400);
    if (end < start) throw new Error("Active audio region is invalid.");
  }

  const completeness = objectValue(value.completeness, "Performance analysis completeness");
  const expected = numberValue(completeness.expected, "Expected event count", 0, 2_000);
  const detected = numberValue(completeness.detected, "Detected event count", 0, 2_000);
  numberValue(completeness.ratio, "Completeness ratio", 0, 1);
  if (!Number.isInteger(expected) || !Number.isInteger(detected) || detected > expected) throw new Error("Performance analysis completeness is inconsistent.");

  if (!Array.isArray(value.events) || value.events.length > 2_000 || !Array.isArray(value.measures) || value.measures.length > 500) {
    throw new Error("Performance analysis exceeds the event or measure limit.");
  }
  for (const [index, item] of value.events.entries()) {
    const event = objectValue(item, `Performance event ${index + 1}`);
    stringValue(event.eventId, "Performance event id", 100);
    stringValue(event.sourceEventId, "Performance source event id", 100);
    stringValue(event.measureId, "Performance measure id", 100);
    stringValue(event.measureNumber, "Performance measure number", 40);
    stringValue(event.noteName, "Performance note name", 30);
    numberValue(event.expectedMidi, "Expected MIDI note", 0, 127);
    numberValue(event.recordingTimeSeconds, "Recording event time", 0, 86_400);
    nullableNumber(event.detectedOnsetSeconds, "Detected onset", 0, 86_400);
    nullableNumber(event.onsetDeltaMs, "Onset delta", -86_400_000, 86_400_000);
    nullableNumber(event.detectedFrequencyHz, "Detected frequency", 1, 30_000);
    nullableNumber(event.pitchCents, "Pitch cents", -9_600, 9_600);
    nullableNumber(event.pitchConfidence, "Pitch confidence", 0, 1);
    if (typeof event.status !== "string" || !EVENT_STATUSES.has(event.status)) throw new Error("Performance event status is invalid.");
  }

  for (const [index, item] of value.measures.entries()) {
    const measure = objectValue(item, `Performance measure ${index + 1}`);
    stringValue(measure.measureId, "Performance measure id", 100);
    stringValue(measure.measureNumber, "Performance measure number", 40);
    for (const field of ["eventCount", "detectedCount", "pitchAttentionCount", "rhythmAttentionCount", "polyphonicUnscoredCount"] as const) {
      const count = numberValue(measure[field], `Performance measure ${field}`, 0, 2_000);
      if (!Number.isInteger(count)) throw new Error(`Performance measure ${field} is invalid.`);
    }
  }

  if (!Array.isArray(value.warnings) || value.warnings.length > 50 || value.warnings.some((warning) => typeof warning !== "string" || warning.length > 500)) {
    throw new Error("Performance analysis warnings are invalid.");
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > 500_000) throw new Error("Performance analysis exceeds 500 KB.");
  return JSON.parse(serialized) as Record<string, unknown>;
}
