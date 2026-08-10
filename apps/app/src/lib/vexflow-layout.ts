import type { ScoreJson, ScoreMeasure } from "@score/shared";
import { buildVexFlowMeasureAnnotations } from "./vexflow-measure-annotations";
import { buildVexFlowModifierPlacements } from "./vexflow-modifier-layout";

export const VEXFLOW_LAYOUT = {
  canvasMargin: 16,
  pageGap: 28,
  pageAspectRatio: 1.414,
  minimumPageHeight: 640,
  pageMargin: 20,
  labelWidth: 104,
  minimumMeasureWidth: 240,
  staffSpacing: 92,
  staffHeight: 120,
  partGap: 28,
  systemGap: 42,
  topMargin: 28,
  bottomMargin: 28,
} as const;

export type VexFlowStaffLayout = {
  staffNumber: number;
  y: number;
};

export type VexFlowMeasureLayout = {
  measure: ScoreMeasure;
  measureIndex: number;
  x: number;
  width: number;
};

export type VexFlowPartLayout = {
  partId: string;
  partName: string;
  abbreviation?: string;
  y: number;
  height: number;
  topReserve: number;
  bottomReserve: number;
  staffSpacing: number;
  staves: VexFlowStaffLayout[];
  measures: VexFlowMeasureLayout[];
};

export type VexFlowSystemLayout = {
  index: number;
  y: number;
  height: number;
  startMeasureIndex: number;
  endMeasureIndex: number;
  pageBreakBefore: boolean;
  automaticPageBreakBefore: boolean;
  pageIndex: number;
  parts: VexFlowPartLayout[];
};

export type VexFlowPageLayout = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  contentTop: number;
  contentBottom: number;
  systemIndexes: number[];
};

export type VexFlowScoreLayout = {
  width: number;
  height: number;
  contentX: number;
  measureWidth: number;
  measuresPerSystem: number;
  pageWidth: number;
  pageHeight: number;
  pages: VexFlowPageLayout[];
  systems: VexFlowSystemLayout[];
};

export function buildVexFlowScoreLayout(score: ScoreJson, viewportWidth: number): VexFlowScoreLayout {
  const parts = score.parts.map((part) => ({
    part,
    measures: score.measures.filter((measure) => measure.partId === part.id).sort((a, b) => a.sequence - b.sequence),
  }));
  const maxMeasureCount = Math.max(1, ...parts.map(({ measures }) => measures.length));
  const requestedWidth = Number.isFinite(viewportWidth) && viewportWidth > 0 ? Math.floor(viewportWidth) : 980;
  const minimumPageWidth = VEXFLOW_LAYOUT.pageMargin * 2 + VEXFLOW_LAYOUT.labelWidth + VEXFLOW_LAYOUT.minimumMeasureWidth;
  const pageWidth = Math.max(minimumPageWidth, requestedWidth - VEXFLOW_LAYOUT.canvasMargin * 2);
  const pageX = VEXFLOW_LAYOUT.canvasMargin;
  const contentX = pageX + VEXFLOW_LAYOUT.pageMargin + VEXFLOW_LAYOUT.labelWidth;
  const availableWidth = pageWidth - VEXFLOW_LAYOUT.pageMargin * 2 - VEXFLOW_LAYOUT.labelWidth;
  const measuresPerSystem = Math.max(1, Math.min(maxMeasureCount, Math.floor(availableWidth / VEXFLOW_LAYOUT.minimumMeasureWidth)));
  const measureWidth = Math.max(VEXFLOW_LAYOUT.minimumMeasureWidth, Math.floor(availableWidth / measuresPerSystem));
  const width = pageWidth + VEXFLOW_LAYOUT.canvasMargin * 2;
  const breaks = collectSystemBreaks(parts.map(({ measures }) => measures), maxMeasureCount);
  const ranges = buildSystemRanges(maxMeasureCount, measuresPerSystem, breaks);
  const systemSpecs = ranges.map((range) => {
    const partSpecs = parts.map(({ part, measures }) => {
      const staffCount = effectiveStaffCount(part.staffCount, measures);
      const metrics = calculatePartVerticalMetrics(measures.slice(range.start, range.end), staffCount);
      return { part, measures, staffCount, ...metrics };
    });
    const height = Math.max(
      VEXFLOW_LAYOUT.staffHeight,
      partSpecs.reduce((sum, part) => sum + part.height, 0) + VEXFLOW_LAYOUT.partGap * Math.max(0, partSpecs.length - 1),
    );
    return { range, partSpecs, height };
  });
  const maximumSystemHeight = Math.max(VEXFLOW_LAYOUT.staffHeight, ...systemSpecs.map((system) => system.height));
  const pageHeight = Math.max(
    VEXFLOW_LAYOUT.minimumPageHeight,
    Math.round(pageWidth * VEXFLOW_LAYOUT.pageAspectRatio),
    VEXFLOW_LAYOUT.topMargin + maximumSystemHeight + VEXFLOW_LAYOUT.bottomMargin,
  );
  const systems: VexFlowSystemLayout[] = [];
  const pages: VexFlowPageLayout[] = [];
  let pageIndex = 0;
  let pageY = VEXFLOW_LAYOUT.canvasMargin;
  let cursorY = pageY + VEXFLOW_LAYOUT.topMargin;
  pages.push(createPageLayout(pageIndex, pageX, pageY, pageWidth, pageHeight));

  for (const [systemIndex, systemSpec] of systemSpecs.entries()) {
    const { range, partSpecs, height: systemHeight } = systemSpec;
    const pageBreakBefore = breaks.get(range.start) === "page";
    const automaticPageBreakBefore =
      systemIndex > 0 &&
      !pageBreakBefore &&
      cursorY + VEXFLOW_LAYOUT.systemGap + systemHeight > pageY + pageHeight - VEXFLOW_LAYOUT.bottomMargin;
    if (systemIndex > 0 && (pageBreakBefore || automaticPageBreakBefore)) {
      pageIndex += 1;
      pageY += pageHeight + VEXFLOW_LAYOUT.pageGap;
      cursorY = pageY + VEXFLOW_LAYOUT.topMargin;
      pages.push(createPageLayout(pageIndex, pageX, pageY, pageWidth, pageHeight));
    } else if (systemIndex > 0) {
      cursorY += VEXFLOW_LAYOUT.systemGap;
    }
    const systemY = cursorY;
    const partLayouts: VexFlowPartLayout[] = [];

    for (const { part, measures, staffCount, height, topReserve, bottomReserve, staffSpacing } of partSpecs) {
      const partY = cursorY;
      const staves = Array.from({ length: staffCount }, (_, index) => ({
        staffNumber: index + 1,
        y: partY + topReserve + index * staffSpacing,
      }));
      const measureLayouts = measures.slice(range.start, range.end).map((measure, localIndex) => ({
        measure,
        measureIndex: range.start + localIndex,
        x: contentX + localIndex * measureWidth,
        width: measureWidth,
      }));
      partLayouts.push({
        partId: part.id,
        partName: part.name,
        abbreviation: part.abbreviation,
        y: partY,
        height,
        topReserve,
        bottomReserve,
        staffSpacing,
        staves,
        measures: measureLayouts,
      });
      cursorY += height + VEXFLOW_LAYOUT.partGap;
    }

    const height = systemHeight;
    pages[pageIndex]?.systemIndexes.push(systemIndex);
    systems.push({
      index: systemIndex,
      y: systemY,
      height,
      startMeasureIndex: range.start,
      endMeasureIndex: range.end,
      pageBreakBefore,
      automaticPageBreakBefore,
      pageIndex,
      parts: partLayouts,
    });
    cursorY = systemY + height;
  }

  return {
    width,
    height: (pages.at(-1)?.y ?? 0) + pageHeight + VEXFLOW_LAYOUT.canvasMargin,
    contentX,
    measureWidth,
    measuresPerSystem,
    pageWidth,
    pageHeight,
    pages,
    systems,
  };
}

function calculatePartVerticalMetrics(measures: ScoreMeasure[], staffCount: number) {
  const maximumAboveLine = Array.from({ length: staffCount }, () => -1);
  const maximumBelowLine = Array.from({ length: staffCount }, () => -1);

  for (const measure of measures) {
    const measureAboveLine = Array.from({ length: staffCount }, () => -1);
    const measureBelowLine = Array.from({ length: staffCount }, () => -1);
    const eventById = new Map(measure.events.map((event) => [event.id, event]));
    for (const placement of buildVexFlowModifierPlacements(measure.events)) {
      const event = eventById.get(placement.eventId);
      const staffIndex = Math.min(staffCount - 1, Math.max(0, (event?.staff ?? 1) - 1));
      const target = placement.position === "above" ? measureAboveLine : measureBelowLine;
      target[staffIndex] = Math.max(target[staffIndex] ?? -1, placement.textLine);
    }
    const annotations = buildVexFlowMeasureAnnotations(measure);
    const topAnnotationLine = Math.max(-1, ...annotations.filter((item) => item.position === "above").map((item) => item.line));
    const bottomAnnotationLine = Math.max(-1, ...annotations.filter((item) => item.position === "below").map((item) => item.line));
    if (topAnnotationLine >= 0) {
      measureAboveLine[0] = (measureAboveLine[0] ?? -1) + 1 + topAnnotationLine;
    }
    if (bottomAnnotationLine >= 0) {
      const lastStaff = staffCount - 1;
      measureBelowLine[lastStaff] = (measureBelowLine[lastStaff] ?? -1) + 1 + bottomAnnotationLine;
    }
    for (let index = 0; index < staffCount; index += 1) {
      maximumAboveLine[index] = Math.max(maximumAboveLine[index] ?? -1, measureAboveLine[index] ?? -1);
      maximumBelowLine[index] = Math.max(maximumBelowLine[index] ?? -1, measureBelowLine[index] ?? -1);
    }
  }

  let staffSpacing: number = VEXFLOW_LAYOUT.staffSpacing;
  for (let index = 0; index < staffCount - 1; index += 1) {
    const belowLines = Math.max(0, (maximumBelowLine[index] ?? -1) + 1);
    const aboveLines = Math.max(0, (maximumAboveLine[index + 1] ?? -1) + 1);
    staffSpacing = Math.max(staffSpacing, VEXFLOW_LAYOUT.staffSpacing + Math.max(0, belowLines + aboveLines - 2) * 10);
  }

  const topLine = maximumAboveLine[0] ?? -1;
  const bottomLine = maximumBelowLine[staffCount - 1] ?? -1;
  const topReserve = Math.max(0, topLine * 10 - 6);
  const bottomReserve = Math.max(0, bottomLine * 10 - 20);
  return {
    topReserve,
    bottomReserve,
    staffSpacing,
    height: topReserve + VEXFLOW_LAYOUT.staffHeight + (staffCount - 1) * staffSpacing + bottomReserve,
  };
}

function createPageLayout(index: number, x: number, y: number, width: number, height: number): VexFlowPageLayout {
  return {
    index,
    x,
    y,
    width,
    height,
    contentTop: y + VEXFLOW_LAYOUT.topMargin,
    contentBottom: y + height - VEXFLOW_LAYOUT.bottomMargin,
    systemIndexes: [],
  };
}

function effectiveStaffCount(partStaffCount: number | undefined, measures: ScoreMeasure[]) {
  return Math.max(
    1,
    partStaffCount ?? 1,
    ...measures.map((measure) => measure.attributes?.staves ?? 1),
    ...measures.flatMap((measure) => measure.events.map((event) => event.staff ?? 1)),
  );
}

function collectSystemBreaks(partMeasures: ScoreMeasure[][], maxMeasureCount: number) {
  const breaks = new Map<number, "system" | "page">();
  for (let index = 1; index < maxMeasureCount; index += 1) {
    const layouts = partMeasures.map((measures) => measures[index]?.layout).filter(Boolean);
    if (layouts.some((layout) => layout?.newPage)) {
      breaks.set(index, "page");
    } else if (layouts.some((layout) => layout?.newSystem)) {
      breaks.set(index, "system");
    }
  }
  return breaks;
}

function buildSystemRanges(maxMeasureCount: number, measuresPerSystem: number, breaks: Map<number, "system" | "page">) {
  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;
  while (start < maxMeasureCount) {
    let end = Math.min(maxMeasureCount, start + measuresPerSystem);
    for (let index = start + 1; index < end; index += 1) {
      if (breaks.has(index)) {
        end = index;
        break;
      }
    }
    ranges.push({ start, end });
    start = end;
  }
  return ranges;
}
