import type { ScoreBeam, ScoreEvent } from "@score/shared";

export type VexFlowBeamGroup = {
  id: string;
  voice: string;
  number: number;
  eventIds: string[];
  staffNumbers: number[];
  crossStaff: boolean;
};

type BeamTickable = {
  eventIds: string[];
  voice: string;
  staffNumber: number;
  beams: ScoreBeam[];
};

/** Resolves MusicXML beam markers across every staff in one measure. */
export function buildVexFlowBeamGroups(events: ScoreEvent[]): VexFlowBeamGroup[] {
  const tickables = buildBeamTickables(events);
  const active = new Map<string, BeamTickable[]>();
  const completed: VexFlowBeamGroup[] = [];

  for (const tickable of tickables) {
    for (const beam of tickable.beams) {
      const key = `${tickable.voice}:${beam.number}`;
      if (beam.type === "begin") {
        active.set(key, [tickable]);
        continue;
      }
      if (beam.type === "continue") {
        appendUniqueTickable(active.get(key), tickable);
        continue;
      }
      if (beam.type !== "end") continue;

      const group = active.get(key);
      appendUniqueTickable(group, tickable);
      if (group && group.length >= 2) {
        const staffNumbers = Array.from(new Set(group.map((item) => item.staffNumber))).sort((left, right) => left - right);
        completed.push({
          id: `beam-${tickable.voice}-${beam.number}-${completed.length + 1}`,
          voice: tickable.voice,
          number: beam.number,
          eventIds: group.flatMap((item) => item.eventIds),
          staffNumbers,
          crossStaff: staffNumbers.length > 1,
        });
      }
      active.delete(key);
    }
  }

  return completed;
}

function buildBeamTickables(events: ScoreEvent[]) {
  const tickables: BeamTickable[] = [];
  for (const event of events) {
    const previous = tickables.at(-1);
    const voice = event.voice ?? "1";
    const staffNumber = event.staff ?? 1;
    if (
      event.type === "note" &&
      event.chord &&
      previous &&
      previous.voice === voice &&
      previous.staffNumber === staffNumber
    ) {
      previous.eventIds.push(event.id);
      previous.beams.push(...(event.beams ?? []));
      continue;
    }
    tickables.push({ eventIds: [event.id], voice, staffNumber, beams: [...(event.beams ?? [])] });
  }
  return tickables;
}

function appendUniqueTickable(group: BeamTickable[] | undefined, tickable: BeamTickable) {
  if (group && group.at(-1) !== tickable) group.push(tickable);
}
