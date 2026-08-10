import type { ScoreEvent, ScoreJson, ScoreMeasure, ScorePart } from "@score/shared";

function countNotes(events: ScoreEvent[]) {
  return events.filter((event) => event.type === "note").length;
}

function countRests(events: ScoreEvent[]) {
  return events.filter((event) => event.type === "rest").length;
}

function uniquePartIds(partIds: string[]) {
  return Array.from(new Set(partIds.map((partId) => partId.trim()).filter(Boolean)));
}

export function extractScoreParts(input: {
  score: ScoreJson;
  partIds: string[];
  title?: string;
  generatedAt?: string;
}): ScoreJson {
  const partIds = uniquePartIds(input.partIds);
  if (partIds.length === 0) {
    throw new Error("Choose at least one part to extract.");
  }

  const knownPartIds = new Set(input.score.parts.map((part) => part.id));
  const unknownPartIds = partIds.filter((partId) => !knownPartIds.has(partId));
  if (unknownPartIds.length > 0) {
    throw new Error(`Unknown score part(s): ${unknownPartIds.join(", ")}.`);
  }

  const selectedPartIdSet = new Set(partIds);
  const selectedMeasures = input.score.measures.filter((measure) => selectedPartIdSet.has(measure.partId));
  if (selectedMeasures.length === 0) {
    throw new Error("The selected part(s) do not contain measures.");
  }

  const selectedParts: ScorePart[] = input.score.parts
    .filter((part) => selectedPartIdSet.has(part.id))
    .map((part) => ({
      ...part,
      measureCount: selectedMeasures.filter((measure) => measure.partId === part.id).length,
    }));
  const measures: ScoreMeasure[] = selectedMeasures.map((measure) => ({ ...measure }));
  const noteCount = measures.reduce((total, measure) => total + countNotes(measure.events), 0);
  const restCount = measures.reduce((total, measure) => total + countRests(measure.events), 0);
  const partNames = selectedParts.map((part) => part.name || part.id);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const title = input.title?.trim() || `${input.score.title} - ${partNames.join(", ")}`;
  const movementTitle = partNames.length === 1 ? partNames[0] : `Extracted parts: ${partNames.join(", ")}`;

  return {
    ...input.score,
    title,
    source: {
      ...input.score.source,
      fileId: undefined,
      originalName: `${input.score.title} part extract`,
    },
    metadata: {
      ...input.score.metadata,
      importedAt: generatedAt,
      workTitle: title,
      movementTitle,
      measureCount: measures.length,
      noteCount,
      restCount,
      warnings: [
        ...(Array.isArray(input.score.metadata.warnings) ? input.score.metadata.warnings : []),
        `Extracted part project for ${partNames.join(", ")} from "${input.score.title}" at ${generatedAt}.`,
      ],
    },
    parts: selectedParts,
    measures,
  };
}
