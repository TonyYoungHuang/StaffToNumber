export type ScoreEditorClipboard = {
  eventIds: string[];
  mode: "copy" | "cut";
};

type StoredScoreEditorClipboard = ScoreEditorClipboard & {
  version: 1;
  scoreId: string;
  createdAt: string;
};

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function scoreEditorClipboardKey(scoreId: string) {
  return `scoretransposer:score-editor-clipboard:v1:${scoreId}`;
}

export function serializeScoreEditorClipboard(scoreId: string, clipboard: ScoreEditorClipboard, createdAt = new Date().toISOString()) {
  const payload: StoredScoreEditorClipboard = {
    version: 1,
    scoreId,
    eventIds: Array.from(new Set(clipboard.eventIds.filter(Boolean))),
    mode: clipboard.mode,
    createdAt,
  };
  return JSON.stringify(payload);
}

export function parseScoreEditorClipboard(
  raw: string | null,
  options: { scoreId: string; availableEventIds: Iterable<string>; now?: number },
): ScoreEditorClipboard | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredScoreEditorClipboard>;
    if (value.version !== 1 || value.scoreId !== options.scoreId || (value.mode !== "copy" && value.mode !== "cut")) return null;
    if (!Array.isArray(value.eventIds) || value.eventIds.length === 0 || value.eventIds.some((id) => typeof id !== "string" || !id)) return null;
    const createdAt = Date.parse(value.createdAt ?? "");
    const now = options.now ?? Date.now();
    if (!Number.isFinite(createdAt) || createdAt > now + 60_000 || now - createdAt > MAX_AGE_MS) return null;
    const available = new Set(options.availableEventIds);
    const eventIds = Array.from(new Set(value.eventIds));
    if (eventIds.some((eventId) => !available.has(eventId))) return null;
    return { eventIds, mode: value.mode };
  } catch {
    return null;
  }
}
