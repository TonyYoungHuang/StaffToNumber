import type { ScoreEvent, ScoreMeasure } from "@score/shared";

export type VexFlowEventGroup = {
  events: ScoreEvent[];
  durationConflict: boolean;
};

export type VexFlowStaffTimelineUnit =
  | { kind: "event"; group: VexFlowEventGroup }
  | { kind: "placeholder"; group: VexFlowEventGroup };

export type VexFlowChordDurationConflict = {
  measureId: string;
  eventIds: string[];
};

/** Groups MusicXML-style chord followers into one VexFlow tickable. */
export function groupVoiceEventsForVexFlow(events: ScoreEvent[]): VexFlowEventGroup[] {
  const groups: VexFlowEventGroup[] = [];

  for (const event of events) {
    const previous = groups.at(-1);
    if (event.type === "note" && event.chord && previous && previous.events.every((item) => item.type === "note")) {
      const anchor = previous.events[0];
      if (anchor?.type === "note" && Boolean(anchor.grace) === Boolean(event.grace)) {
        previous.durationConflict ||= !sameRhythmicValue(anchor, event);
        previous.events.push(event);
        continue;
      }
    }

    groups.push({ events: [event], durationConflict: false });
  }

  return groups;
}

/** Keeps one voice on a shared timeline while rendering its events on separate staves. */
export function buildVexFlowStaffTimeline(events: ScoreEvent[], staffNumber: number): VexFlowStaffTimelineUnit[] {
  const timeline: VexFlowStaffTimelineUnit[] = [];
  for (const group of groupVoiceEventsForVexFlow(events)) {
    const anchor = group.events[0];
    if (!anchor) continue;
    if ((anchor.staff ?? 1) === staffNumber) timeline.push({ kind: "event", group });
    else if (!(anchor.type === "note" && anchor.grace)) timeline.push({ kind: "placeholder", group });
  }
  return timeline;
}

/** Finds imported or legacy chords whose noteheads disagree on their rhythmic value. */
export function findVexFlowChordDurationConflicts(measures: ScoreMeasure[]): VexFlowChordDurationConflict[] {
  const conflicts: VexFlowChordDurationConflict[] = [];
  for (const measure of measures) {
    const voices = new Map<string, ScoreEvent[]>();
    for (const event of measure.events) {
      const voiceId = event.voice ?? "1";
      voices.set(voiceId, [...(voices.get(voiceId) ?? []), event]);
    }
    for (const events of voices.values()) {
      for (const group of groupVoiceEventsForVexFlow(events)) {
        if (group.durationConflict) conflicts.push({ measureId: measure.id, eventIds: group.events.map((event) => event.id) });
      }
    }
  }
  return conflicts;
}

function sameRhythmicValue(left: ScoreEvent, right: ScoreEvent) {
  return (
    left.duration === right.duration &&
    left.durationType === right.durationType &&
    left.dots === right.dots &&
    JSON.stringify(left.timeModification ?? null) === JSON.stringify(right.timeModification ?? null)
  );
}
