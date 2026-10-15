import type { ScoreExportOptions } from "./index.ts";

export type CheckoutReturnSite = "app" | "www";
export type CheckoutReturnState = {
  version: 1;
  intent: "restore_view" | "continue_action";
  panel?: string;
  tab?: string;
  documentRevisionId?: string;
  transpose?: { semitones?: number; targetKey?: string; mode?: string; partId?: string; spellingPolicy?: string; targetTonic?: string; targetMode?: string; instrumentProfileId?: string; pitchMode?: string; intervalId?: string; intervalDirection?: string; rangeProfileId?: string; rangePartId?: string; partRangeProfileIds?: Record<string, string> };
  exportOptions?: ScoreExportOptions & Record<string, unknown>;
  uploadDraftId?: string;
  confirmation?: "required";
};
export type CheckoutReturnContext = {
  site: CheckoutReturnSite;
  path: string;
  state: CheckoutReturnState;
  successSite: CheckoutReturnSite;
  successPath: string;
};

const sensitiveQuery = /^(?:token|return_token|returnToken|access_token|refresh_token|id_token|password|secret|authorization|code|session_id)$/i;
const loops = /^\/(?:login|register|forgot-password|reset-password|checkout|activate|api)(?:\/|$)/i;
const publicPages = new Set(["/", "/features", "/pricing", "/faq", "/about", "/support", "/privacy", "/terms", "/copyright-complaint", "/library", "/how-to-read-sheet-music", "/numbered-notation-converter", "/operations-checklist", "/seo-audit", "/staff-to-jianpu", "/jianpu-to-staff", "/transpose-score", "/score-editor", "/score-to-audio", "/audio-to-score", "/musicxml-midi", "/sheet-music-scanner", "/pdf-to-musicxml", "/teaching"]);
const panels = new Set(["overview", "editor", "export-center", "transpose", "playback", "practice", "parts", "review", "source", "history", "tasks", "details", "score", "export", "visual-editor", "jianpu-preview", "transpose-score", "playback-practice", "score-sharing", "revision-history", "score-parts", "omr-comparison", "teaching-workflow", "score-json-model", "correction-editor", "live-collaboration", "project-comments", "score-jobs", "print-export-settings", "audio-export-settings"]);

/** Validate the untrusted URL before joining it to a configured site origin. */
export function validateCheckoutReturnPath(site: CheckoutReturnSite, value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 4096 || value !== value.trim()) return null;
  let decoded = value;
  for (let round = 0; round < 4; round++) {
    if (/[\u0000-\u0020\u007f\\]/u.test(decoded) || !decoded.startsWith("/") || decoded.startsWith("//")) return null;
    if (/%(?:2f|5c|00|0[ad]|25)/i.test(decoded.split(/[?#]/u)[0])) return null;
    try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; }
    catch { return null; }
  }
  try {
    const url = new URL(value, "https://return.invalid");
    if (url.origin !== "https://return.invalid" || loops.test(url.pathname)) return null;
    if (site === "app" && !/^\/(?:scores|dashboard|billing|jobs|classrooms|student|settings|account|upload)(?:\/|$)/u.test(url.pathname)) return null;
    if (site === "www" && !/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/?)?$/u.test(url.pathname)) return null;
    const decodedPath = decodeURIComponent(url.pathname);
    const unlocalized = decodedPath.replace(/^\/(?:en|zh-cn|zh-tw|ja|ko|fr|es|de|ru)(?=\/|$)/iu, "") || "/";
    if (loops.test(unlocalized)) return null;
    if (site === "www" && !publicPages.has(unlocalized.replace(/\/$/u, "") || "/") && !/^\/library\/[a-z0-9_-]+\/?$/u.test(unlocalized)) return null;
    for (const key of [...url.searchParams.keys()]) if (sensitiveQuery.test(key)) url.searchParams.delete(key);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

/** A small allowlisted snapshot, never editor contents or arbitrary metadata. */
export function normalizeCheckoutReturnState(value: unknown): CheckoutReturnState | null {
  if (value === undefined || value === null) return { version: 1, intent: "restore_view" };
  if (typeof value !== "object" || Array.isArray(value)) return null;
  let serialized: string;
  try { serialized = JSON.stringify(value); } catch { return null; }
  if (new TextEncoder().encode(serialized).length > 8192) return null;
  const input = value as Record<string, unknown>;
  if (input.version !== 1 || !["restore_view", "continue_action"].includes(String(input.intent))) return null;
  const known = new Set(["version", "intent", "panel", "tab", "documentRevisionId", "transpose", "exportOptions", "uploadDraftId", "confirmation"]);
  if (Object.keys(input).some(key => !known.has(key))) return null;
  const state: CheckoutReturnState = { version: 1, intent: input.intent as CheckoutReturnState["intent"] };
  for (const key of ["tab", "documentRevisionId", "uploadDraftId"] as const) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "string" || !(input[key] as string).length || (input[key] as string).length > 200 || /[\u0000-\u001f\u007f]/u.test(input[key] as string)) return null;
      state[key] = input[key] as string;
    }
  }
  if (input.panel !== undefined) {
    if (typeof input.panel !== "string" || !panels.has(input.panel)) return null;
    state.panel = input.panel;
  }
  if (input.confirmation !== undefined) {
    if (input.confirmation !== "required") return null;
    state.confirmation = "required";
  }
  if (input.transpose !== undefined) {
    if (!input.transpose || typeof input.transpose !== "object" || Array.isArray(input.transpose)) return null;
    const transpose = input.transpose as Record<string, unknown>;
    if (Object.keys(transpose).some(key => !["semitones", "targetKey", "mode", "partId", "spellingPolicy", "targetTonic", "targetMode", "instrumentProfileId", "pitchMode", "intervalId", "intervalDirection", "rangeProfileId", "rangePartId", "partRangeProfileIds"].includes(key))) return null;
    if (transpose.semitones !== undefined && (!Number.isInteger(transpose.semitones) || Math.abs(Number(transpose.semitones)) > 48)) return null;
    if (Object.entries(transpose).some(([key, item]) => key !== "semitones" && key !== "partRangeProfileIds" && (typeof item !== "string" || item.length > 100 || /[<>\u0000-\u001f]/u.test(item)))) return null;
    if (transpose.partRangeProfileIds !== undefined && (!transpose.partRangeProfileIds || typeof transpose.partRangeProfileIds !== "object" || Array.isArray(transpose.partRangeProfileIds) || Object.entries(transpose.partRangeProfileIds).some(([key, item]) => key.length > 100 || typeof item !== "string" || item.length > 100))) return null;
    state.transpose = transpose as CheckoutReturnState["transpose"];
  }
  if (input.exportOptions !== undefined) {
    if (!input.exportOptions || typeof input.exportOptions !== "object" || Array.isArray(input.exportOptions) || JSON.stringify(input.exportOptions).length > 4096) return null;
    const allowed = new Set(["format", "imageDpi", "trim", "trimMargin", "pageSize", "marginPreset", "sampleRate", "channels", "gain", "reverb", "chorus", "normalizeLoudness", "loudnessTarget", "bitrateKbps", "tempoBpm", "soloPartIds", "mutedPartIds", "partVolumes", "partPans", "countIn", "metronome", "loopEnabled", "loopStartBeat", "loopEndBeat", "audioChannels", "soundFontGain", "reverbEnabled", "chorusEnabled", "loudnessTargetLufs", "imageResolutionDpi", "trimImage", "trimImageMargin", "scoreScalePercent", "staffSpacingMm"]);
    if (Object.keys(input.exportOptions).some(key => !allowed.has(key))) return null;
    for (const [key, item] of Object.entries(input.exportOptions)) {
      if (key === "soloPartIds" || key === "mutedPartIds") {
        if (!Array.isArray(item) || item.length > 100 || item.some(id => typeof id !== "string" || id.length > 100)) return null;
      } else if (key === "partVolumes" || key === "partPans") {
        if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).length > 100 || Object.values(item).some(number => typeof number !== "number" || !Number.isFinite(number))) return null;
      } else if (!(["string", "boolean", "number"].includes(typeof item)) || typeof item === "number" && !Number.isFinite(item) || typeof item === "string" && item.length > 100) return null;
    }
    state.exportOptions = input.exportOptions as CheckoutReturnState["exportOptions"];
  }
  return state;
}

/** Stored server context always wins; local storage is only a legacy fallback. */
export function resolveCheckoutReturnContext(server: CheckoutReturnContext | null | undefined, cached: CheckoutReturnContext | null | undefined) {
  return server ?? cached ?? null;
}
