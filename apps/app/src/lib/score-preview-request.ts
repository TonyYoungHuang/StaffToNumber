import { apiRequest } from "./api";

/** Viewing a score uses its preview API, independently of paid file downloads. */
export function readScoreMusicXmlPreview(input: { documentId: string; candidate: boolean; token: string | null; signal?: AbortSignal }) {
  const path = `/api/scores/${encodeURIComponent(input.documentId)}/${input.candidate ? "candidate/" : ""}musicxml-preview`;
  return apiRequest<{ musicXml: string }>(path, {
    headers: input.token ? { Authorization: `Bearer ${input.token}` } : undefined,
    signal: input.signal,
  });
}
