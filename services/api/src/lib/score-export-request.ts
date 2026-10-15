import type { ScoreExportFormat, ScoreExportOptions } from "@score/shared";

const SCORE_EXPORT_FORMATS = new Set<ScoreExportFormat>(["musicxml", "midi", "pdf", "svg", "png", "wav", "mp3"]);

export function normalizeScoreExportRequest(input: unknown): { format: ScoreExportFormat; options: ScoreExportOptions } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Export request must be a JSON object.");
  }

  const body = input as Record<string, unknown>;
  const format = typeof body.format === "string" ? body.format.toLowerCase() : "";
  if (!SCORE_EXPORT_FORMATS.has(format as ScoreExportFormat)) {
    throw new Error("Export format must be musicxml, midi, pdf, svg, png, wav, or mp3.");
  }

  const rawOptions = body.options && typeof body.options === "object" && !Array.isArray(body.options)
    ? (body.options as Record<string, unknown>)
    : {};
  const options: ScoreExportOptions = {};
  const assignNumber = (key: keyof ScoreExportOptions, min: number, max: number, integer = false) => {
    const value = rawOptions[key];
    if (value === undefined) return;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${String(key)} must be a number from ${min} to ${max}.`);
    }
    (options as Record<string, unknown>)[key] = integer ? Math.round(value) : value;
  };
  const assignBoolean = (key: keyof ScoreExportOptions) => {
    if (rawOptions[key] !== undefined) (options as Record<string, unknown>)[key] = Boolean(rawOptions[key]);
  };
  const assignStringArray = (key: "soloPartIds" | "mutedPartIds") => {
    const value = rawOptions[key];
    if (value === undefined) return;
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      throw new Error(`${key} must be an array of part IDs.`);
    }
    options[key] = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  };
  const assignNumberMap = (key: "partVolumes" | "partPans", min: number, max: number) => {
    const value = rawOptions[key];
    if (value === undefined) return;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${key} must be an object.`);
    const entries = Object.entries(value).map(([partId, amount]) => {
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount < min || amount > max) {
        throw new Error(`${key}.${partId} must be from ${min} to ${max}.`);
      }
      return [partId, amount] as const;
    });
    options[key] = Object.fromEntries(entries);
  };

  assignNumber("tempoBpm", 40, 240, true);
  assignNumber("loopStartBeat", 0, 100000);
  assignNumber("loopEndBeat", 0.25, 100000);
  assignNumber("soundFontGain", 0.05, 5);
  assignNumber("loudnessTargetLufs", -24, -9);
  assignNumber("imageResolutionDpi", 72, 1200, true);
  assignNumber("trimImageMargin", 0, 2000, true);
  assignNumber("scoreScalePercent", 50, 200, true);
  assignNumber("staffSpacingMm", 4, 20);
  assignStringArray("soloPartIds");
  assignStringArray("mutedPartIds");
  assignNumberMap("partVolumes", 0, 1.5);
  assignNumberMap("partPans", -1, 1);
  for (const key of ["countIn", "metronome", "loopEnabled", "reverbEnabled", "chorusEnabled", "normalizeLoudness", "trimImage"] as const) {
    assignBoolean(key);
  }

  if (rawOptions.sampleRate !== undefined) {
    if (![44100, 48000, 96000].includes(rawOptions.sampleRate as number)) throw new Error("sampleRate must be 44100, 48000, or 96000.");
    options.sampleRate = rawOptions.sampleRate as 44100 | 48000 | 96000;
  }
  if (rawOptions.audioChannels !== undefined) {
    if (rawOptions.audioChannels !== 1 && rawOptions.audioChannels !== 2) throw new Error("audioChannels must be 1 or 2.");
    options.audioChannels = rawOptions.audioChannels;
  }
  if (rawOptions.bitrateKbps !== undefined) {
    if (![128, 192, 256, 320].includes(rawOptions.bitrateKbps as number)) throw new Error("bitrateKbps must be 128, 192, 256, or 320.");
    options.bitrateKbps = rawOptions.bitrateKbps as 128 | 192 | 256 | 320;
  }
  if (rawOptions.pageSize !== undefined) {
    if (!["default", "a4", "letter"].includes(rawOptions.pageSize as string)) throw new Error("pageSize must be default, a4, or letter.");
    options.pageSize = rawOptions.pageSize as ScoreExportOptions["pageSize"];
  }
  if (rawOptions.marginPreset !== undefined) {
    if (!["default", "narrow", "normal", "wide"].includes(rawOptions.marginPreset as string)) throw new Error("marginPreset must be default, narrow, normal, or wide.");
    options.marginPreset = rawOptions.marginPreset as ScoreExportOptions["marginPreset"];
  }
  if (options.loopEnabled && options.loopEndBeat !== undefined && options.loopEndBeat <= (options.loopStartBeat ?? 0)) {
    throw new Error("loopEndBeat must be greater than loopStartBeat.");
  }

  return { format: format as ScoreExportFormat, options };
}

