import { isSupportedLocale, type SupportedLocale } from "@score/i18n";

export const SCORE_TASKS = ["scan", "transpose", "jianpu", "jianpu-input", "edit", "play", "export"] as const;
export type ScoreTask = (typeof SCORE_TASKS)[number];
export const SCORE_TASK_MODES = ["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian"] as const;
export type ScoreTaskTarget = { semitones?: number; targetTonic?: string; targetMode?: (typeof SCORE_TASK_MODES)[number] };
export type ScoreTaskIntent = ScoreTaskTarget & { task: ScoreTask; source?: string; locale?: SupportedLocale };

const sourceTasks: Record<string, ScoreTask> = {
  "home": "scan", "sheet-music-scanner": "scan", "pdf-to-musicxml": "scan",
  "transpose-score": "transpose", "staff-to-jianpu": "jianpu", "jianpu-to-staff": "jianpu-input",
  "score-editor": "edit", "score-to-audio": "play", "musicxml-midi": "export",
};
const taskAnchors: Record<ScoreTask, string> = {
  scan: "visual-editor", transpose: "transpose-score", jianpu: "jianpu-preview",
  "jianpu-input": "visual-editor", edit: "visual-editor", play: "playback-practice", export: "export-center",
};

export function scoreTaskForSource(source: string): ScoreTask | null {
  return Object.hasOwn(sourceTasks, source) ? sourceTasks[source] : null;
}

/** Only UI intent is carried here. It never starts processing or authorizes a charge. */
export function readScoreTaskIntent(params: URLSearchParams): ScoreTaskIntent | null {
  const task = params.get("task");
  if (!SCORE_TASKS.includes(task as ScoreTask)) return null;
  const result: ScoreTaskIntent = { task: task as ScoreTask };
  const source = params.get("source");
  if (source && scoreTaskForSource(source) === task) result.source = source;
  const locale = params.get("locale");
  if (isSupportedLocale(locale)) result.locale = locale;
  const rawSemitones = params.get("semitones");
  if (rawSemitones && /^-?\d{1,2}$/u.test(rawSemitones)) {
    const semitones = Number(rawSemitones);
    if (semitones >= -24 && semitones <= 24) result.semitones = semitones;
  }
  const tonic = params.get("targetTonic");
  if (tonic && /^[A-G](?:#|b)?$/u.test(tonic)) result.targetTonic = tonic;
  const mode = params.get("targetMode");
  if (SCORE_TASK_MODES.includes(mode as (typeof SCORE_TASK_MODES)[number])) result.targetMode = mode as (typeof SCORE_TASK_MODES)[number];
  return result;
}

export function scoreTaskQuery(intent: ScoreTaskIntent): string {
  const params = new URLSearchParams({ task: intent.task });
  if (intent.source) params.set("source", intent.source);
  if (intent.locale) params.set("locale", intent.locale);
  if (intent.semitones !== undefined) params.set("semitones", String(intent.semitones));
  if (intent.targetTonic) params.set("targetTonic", intent.targetTonic);
  if (intent.targetMode) params.set("targetMode", intent.targetMode);
  return params.toString();
}

export function scoreTaskEntryPath(intent: ScoreTaskIntent): string {
  return `/scores?${scoreTaskQuery(intent)}#free-scan`;
}

export function scoreTaskDocumentPath(scoreId: string, intent: ScoreTaskIntent | null, ensemble = false): string {
  const path = `/scores/${encodeURIComponent(scoreId)}${ensemble ? "/ensemble" : ""}`;
  return intent ? `${path}?${scoreTaskQuery(intent)}#${taskAnchors[intent.task]}` : path;
}
