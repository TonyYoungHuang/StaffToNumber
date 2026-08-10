import type { ScoreJson } from "@score/shared";
import type { VexFlowPageLayout, VexFlowScoreLayout, VexFlowSystemLayout } from "./vexflow-layout";

export type VexFlowPageInvalidation = {
  page: VexFlowPageLayout;
  systems: VexFlowSystemLayout[];
  systemInvalidations: VexFlowSystemInvalidation[];
  eventIds: string[];
  contentKey: string;
  selectionKey: string;
};

export type VexFlowSystemInvalidation = {
  system: VexFlowSystemLayout;
  eventIds: string[];
  contentKey: string;
  selectionKey: string;
};

export function buildVexFlowPageInvalidations(
  score: ScoreJson,
  layout: VexFlowScoreLayout,
  selectedEventIds: string[],
): VexFlowPageInvalidation[] {
  const selected = new Set(selectedEventIds);
  return layout.pages.map((page) => {
    const systems = page.systemIndexes.map((index) => layout.systems[index]).filter((system): system is VexFlowSystemLayout => Boolean(system));
    const systemInvalidations = systems.map((system) => {
      const eventIds = system.parts.flatMap((part) =>
        part.measures.flatMap((measure) => measure.measure.events.map((event) => event.id)),
      );
      const inheritedContexts = system.parts.map((part) => {
        const firstMeasure = part.measures[0]?.measure;
        if (!firstMeasure) return { partId: part.partId, sequence: null, context: null };
        const context = score.measures
          .filter(
            (measure) =>
              measure.partId === part.partId &&
              measure.sequence <= firstMeasure.sequence &&
              (measure.attributes?.key || measure.attributes?.clef || measure.attributes?.clefs),
          )
          .sort((left, right) => right.sequence - left.sequence)
          .map((measure) => ({ sequence: measure.sequence, attributes: measure.attributes }));
        return { partId: part.partId, sequence: firstMeasure.sequence, context };
      });
      return {
        system,
        eventIds,
        contentKey: JSON.stringify({ title: score.title, system, inheritedContexts }),
        selectionKey: eventIds.filter((eventId) => selected.has(eventId)).sort().join("|"),
      };
    });
    const eventIds = systemInvalidations.flatMap((invalidation) => invalidation.eventIds);
    return {
      page,
      systems,
      systemInvalidations,
      eventIds,
      contentKey: JSON.stringify({ page, systems: systemInvalidations.map((invalidation) => invalidation.contentKey) }),
      selectionKey: eventIds.filter((eventId) => selected.has(eventId)).sort().join("|"),
    };
  });
}
