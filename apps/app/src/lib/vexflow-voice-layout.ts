import type { ScoreEvent } from "@score/shared";
import { groupVoiceEventsForVexFlow } from "./vexflow-event-groups";

export type VexFlowVoiceLayout = {
  voiceId: string;
  stemDirection: 1 | -1;
  restLine: number;
  horizontalShift: number;
};

type VoiceOnset = {
  voiceId: string;
  onset: number;
  eventIds: string[];
  staffPositions: number[];
};

/** Provides stable engraving lanes for polyphonic voices sharing one staff. */
export function buildVexFlowVoiceLayout(voiceIds: string[]): VexFlowVoiceLayout[] {
  return [...voiceIds]
    .sort(compareVoiceIds)
    .map((voiceId, index) => {
      const upperLane = index % 2 === 0;
      const layer = Math.floor(index / 2);
      return {
        voiceId,
        stemDirection: upperLane ? 1 : -1,
        restLine: upperLane ? 4 + layer : 2 - layer,
        horizontalShift: layer === 0 ? 0 : (upperLane ? 1 : -1) * layer * 6,
      };
    });
}

/** Offsets only simultaneous noteheads that collide vertically across voices. */
export function buildVexFlowVoiceCollisionShifts(events: ScoreEvent[], staffNumber: number) {
  const voices = new Map<string, ScoreEvent[]>();
  for (const event of events) {
    const voiceId = event.voice ?? "1";
    voices.set(voiceId, [...(voices.get(voiceId) ?? []), event]);
  }
  const layoutByVoice = new Map(buildVexFlowVoiceLayout([...voices.keys()]).map((layout) => [layout.voiceId, layout]));
  const onsets: VoiceOnset[] = [];
  for (const [voiceId, voiceEvents] of voices) {
    let onset = 0;
    for (const group of groupVoiceEventsForVexFlow(voiceEvents)) {
      const anchor = group.events[0];
      if (!anchor) continue;
      if (anchor.type === "note" && !anchor.grace && (anchor.staff ?? 1) === staffNumber) {
        onsets.push({
          voiceId,
          onset,
          eventIds: group.events.map((event) => event.id),
          staffPositions: group.events.flatMap((event) => event.type === "note" ? [diatonicPosition(event)] : []),
        });
      }
      if (!(anchor.type === "note" && anchor.grace)) onset += anchor.duration;
    }
  }

  const shifts = new Map<string, number>();
  const onsetGroups = new Map<string, VoiceOnset[]>();
  for (const entry of onsets) {
    const key = entry.onset.toFixed(6);
    onsetGroups.set(key, [...(onsetGroups.get(key) ?? []), entry]);
  }
  for (const entries of onsetGroups.values()) {
    const collidingVoices = new Set<string>();
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const left = entries[leftIndex];
        const right = entries[rightIndex];
        if (left.voiceId === right.voiceId || !staffPositionsCollide(left.staffPositions, right.staffPositions)) continue;
        collidingVoices.add(left.voiceId);
        collidingVoices.add(right.voiceId);
      }
    }
    for (const entry of entries) {
      if (!collidingVoices.has(entry.voiceId)) continue;
      const layout = layoutByVoice.get(entry.voiceId);
      if (!layout) continue;
      const shift = layout.horizontalShift || (layout.stemDirection === 1 ? 4 : -4);
      for (const eventId of entry.eventIds) shifts.set(eventId, shift);
    }
  }
  return shifts;
}

function diatonicPosition(event: Extract<ScoreEvent, { type: "note" }>) {
  const steps = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 } as const;
  return event.pitch.octave * 7 + steps[event.pitch.step];
}

function staffPositionsCollide(left: number[], right: number[]) {
  return left.some((leftPosition) => right.some((rightPosition) => Math.abs(leftPosition - rightPosition) <= 1));
}

function compareVoiceIds(left: string, right: string) {
  const leftNumber = Number.parseInt(left, 10);
  const rightNumber = Number.parseInt(right, 10);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  return left.localeCompare(right);
}
