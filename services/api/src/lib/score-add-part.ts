import { randomUUID } from "node:crypto";
import type { ScoreJson, ScoreMeasure, ScoreMeasureAttributes, ScorePart } from "@score/shared";

export type ScoreAddPartInput = {
  name: string;
  abbreviation?: string;
  staffCount: number;
  kind: "pitched" | "percussion" | "tablature";
  coverageStaffIds?: string[];
  baseRevisionId?: string;
};

export class ScoreAddPartError extends Error {
  constructor(message: string, readonly code: string = "INVALID_SCORE_ADD_PART", readonly statusCode = 400) {
    super(message);
    this.name = "ScoreAddPartError";
  }
}

export function validateScoreAddPartInput(value: unknown): ScoreAddPartInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ScoreAddPartError("Part settings must be an object.");
  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) throw new ScoreAddPartError("Part name must contain 1 to 100 characters.");
  if (body.abbreviation !== undefined && (typeof body.abbreviation !== "string" || body.abbreviation.trim().length > 100)) {
    throw new ScoreAddPartError("Part abbreviation must contain at most 100 characters.");
  }
  if (!Number.isInteger(body.staffCount) || Number(body.staffCount) < 1 || Number(body.staffCount) > 4) {
    throw new ScoreAddPartError("A manual part must contain 1 to 4 staffs.");
  }
  if (!["pitched", "percussion", "tablature"].includes(String(body.kind))) throw new ScoreAddPartError("Unknown manual part kind.");
  if (body.coverageStaffIds !== undefined && (!Array.isArray(body.coverageStaffIds) || body.coverageStaffIds.length > 2048 ||
    body.coverageStaffIds.some(id => typeof id !== "string" || !id || id.length > 200) || new Set(body.coverageStaffIds).size !== body.coverageStaffIds.length)) {
    throw new ScoreAddPartError("Coverage staff IDs must be distinct, nonempty strings.");
  }
  if (body.baseRevisionId !== undefined && (typeof body.baseRevisionId !== "string" || !body.baseRevisionId || body.baseRevisionId.length > 200)) {
    throw new ScoreAddPartError("The edited revision ID is invalid.");
  }
  return {
    name, abbreviation: typeof body.abbreviation === "string" ? body.abbreviation.trim() || undefined : undefined,
    staffCount: Number(body.staffCount), kind: body.kind as ScoreAddPartInput["kind"],
    coverageStaffIds: body.coverageStaffIds as string[] | undefined, baseRevisionId: body.baseRevisionId as string | undefined,
  };
}

type MeasureContext = { measure: ScoreMeasure; attributes: ScoreMeasureAttributes };

function measureContexts(score: ScoreJson): MeasureContext[] {
  const result: MeasureContext[] = [];
  for (const part of score.parts) {
    let attributes: ScoreMeasureAttributes = { divisions: 1, time: { beats: "4", beatType: "4" } };
    for (const measure of score.measures.filter(item => item.partId === part.id).sort((a, b) => a.sequence - b.sequence)) {
      attributes = { ...attributes, ...measure.attributes };
      result.push({ measure, attributes: structuredClone(attributes) });
    }
  }
  return result;
}

function measureDuration(context: MeasureContext): number {
  const divisions = context.attributes.divisions ?? 1;
  const time = context.attributes.time;
  const beats = time?.beats.split("+").reduce((sum, beat) => sum + Number(beat), 0) ?? 4;
  const metricalDuration = beats * 4 / Number(time?.beatType ?? "4") * divisions;
  const voices = new Map<string, number>();
  for (const event of context.measure.events) {
    if (event.type === "note" && (event.chord || event.grace)) continue;
    const voice = `${event.staff ?? 1}:${event.voice ?? "1"}`;
    voices.set(voice, (voices.get(voice) ?? 0) + event.duration);
  }
  const actualDuration = Math.max(0, ...voices.values());
  const duration = context.measure.implicit && actualDuration > 0 ? actualDuration : Math.max(metricalDuration, actualDuration);
  if (!Number.isFinite(divisions) || divisions <= 0 || !Number.isFinite(duration) || duration <= 0) {
    throw new ScoreAddPartError("The existing measure timing cannot be used for a manual part. Correct its meter first.", "SCORE_MANUAL_PART_TIMING_INVALID", 409);
  }
  return duration;
}

/** Start an explicitly incomplete manual notation part; never infer missing music. */
export function addManualScorePart(score: ScoreJson, input: ScoreAddPartInput): { score: ScoreJson; part: ScorePart } {
  const staffIds = input.coverageStaffIds ?? [];
  const coverage = score.recognitionLayer?.coverage;
  for (const id of staffIds) {
    const staff = coverage?.staffs.find(item => item.id === id);
    if (!staff) throw new ScoreAddPartError("A selected staff is absent from this revision's coverage.", "SCORE_COVERAGE_STAFF_NOT_FOUND", 409);
    if (staff.partId) throw new ScoreAddPartError("A selected staff already belongs to a part.", "SCORE_COVERAGE_STAFF_ALREADY_BOUND", 409);
  }
  const partId = `manual-part-${randomUUID()}`;
  const contexts = measureContexts(score);
  const sequences = [...new Set(contexts.map(item => item.measure.sequence))].sort((a, b) => a - b);
  const startedWithoutTimeline = sequences.length === 0;
  if (startedWithoutTimeline) sequences.push(1);
  const part: ScorePart = {
    id: partId, name: input.name, ...(input.abbreviation ? { abbreviation: input.abbreviation } : {}),
    staffCount: input.staffCount, measureCount: sequences.length,
    ...(input.kind === "percussion" ? { midiChannel: 10 } : {}),
    manualCompletion: { kind: input.kind, status: "needs_review", coverageStaffIds: [...staffIds] },
  };
  const measures: ScoreMeasure[] = sequences.map(sequence => {
    const context = contexts.find(item => item.measure.sequence === sequence) ?? {
      measure: { id: "", partId: "", number: String(sequence), sequence, events: [] },
      attributes: { divisions: 1, time: { beats: "4", beatType: "4" } },
    };
    const duration = measureDuration(context);
    const clefs = Array.from({ length: input.staffCount }, (_, index) => ({
      number: index + 1, sign: input.kind === "percussion" ? "percussion" : input.kind === "tablature" ? "TAB" : "G",
      ...(input.kind === "pitched" ? { line: 2 } : {}),
    }));
    return {
      id: `${partId}-measure-${randomUUID()}`, partId, sequence, number: context.measure.number,
      ...(context.measure.implicit ? { implicit: true } : {}),
      attributes: {
        divisions: context.attributes.divisions ?? 1, ...(context.attributes.time ? { time: structuredClone(context.attributes.time) } : {}),
        ...(input.kind === "pitched" && context.attributes.key ? { key: structuredClone(context.attributes.key) } : {}),
        staves: input.staffCount, clef: clefs[0], clefs,
      },
      events: Array.from({ length: input.staffCount }, (_, index) => ({
        id: `${partId}-placeholder-${randomUUID()}`, type: "rest" as const, printObject: false,
        duration, dots: 0, voice: String(index + 1), staff: index + 1, measureRest: true,
        recognition: { confidence: null, source: "structural" as const, issues: ["manual-part-incomplete", "manual-measure-placeholder"] },
      })),
    };
  });
  const result = structuredClone(score);
  result.parts.push(part);
  result.measures.push(...measures);
  result.metadata.restCount += measures.length * input.staffCount;
  result.metadata.measureCount = Math.max(result.metadata.measureCount, sequences.length);
  result.metadata.warnings.push(`Manual part "${input.name}" was added with hidden empty measure placeholders. Enter its missing music and review it against the source.`);
  if (startedWithoutTimeline) result.metadata.warnings.push("No recognized measure timeline was available. The manual part starts with one empty 4/4 measure; verify its meter and length against the source.");
  if (result.recognitionLayer?.coverage) {
    for (const staff of result.recognitionLayer.coverage.staffs) if (staffIds.includes(staff.id)) staff.partId = partId;
    delete result.recognitionLayer.coverage.manualReview;
  }
  return { score: result, part };
}
