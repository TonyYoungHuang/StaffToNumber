import type { ScoreEvent } from "@score/shared";

export type VexFlowModifierPlacement = {
  eventId: string;
  kind: "lyric" | "fingering" | "articulation" | "fermata";
  itemIndex: number;
  position: "above" | "below";
  textLine: number;
};

/** Assigns deterministic vertical lanes to event-level notation modifiers. */
export function buildVexFlowModifierPlacements(events: ScoreEvent[]): VexFlowModifierPlacement[] {
  const placements: VexFlowModifierPlacement[] = [];
  for (const event of events) {
    if (event.type !== "note") continue;
    const upperVoice = isUpperVoice(event.voice);

    for (const [itemIndex, articulation] of (event.articulations ?? []).entries()) {
      const alwaysAbove = articulation.type === "breath-mark" || articulation.type === "caesura";
      placements.push({
        eventId: event.id,
        kind: "articulation",
        itemIndex,
        position: alwaysAbove || !upperVoice ? "above" : "below",
        textLine: 0,
      });
    }
    for (const [itemIndex] of (event.fingerings ?? []).entries()) {
      placements.push({ eventId: event.id, kind: "fingering", itemIndex, position: "above", textLine: itemIndex + 1 });
    }
    for (const [itemIndex, fermata] of (event.fermatas ?? []).entries()) {
      const inverted = fermata.type === "inverted";
      placements.push({
        eventId: event.id,
        kind: "fermata",
        itemIndex,
        position: inverted ? "below" : "above",
        textLine: inverted ? 1 : (event.fingerings?.length ?? 0) + 2,
      });
    }
    for (const [itemIndex] of event.lyrics.entries()) {
      placements.push({ eventId: event.id, kind: "lyric", itemIndex, position: "below", textLine: itemIndex + 2 });
    }
  }
  return placements;
}

function isUpperVoice(voice: string | undefined) {
  const numericVoice = Number.parseInt(voice ?? "1", 10);
  return !Number.isFinite(numericVoice) || numericVoice % 2 === 1;
}
