import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import AdmZip from "adm-zip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { PNG } from "pngjs";
import { PRODUCT_NAME } from "@score/shared";
import { workerConfig } from "./config.js";

type JobRow = {
  id: string;
  user_id: string;
  input_file_id: string;
  direction: string;
};

type FileRow = {
  id: string;
  user_id: string;
  original_name: string;
  storage_path: string;
};

type PageScreenshot = {
  buffer: Buffer;
  width: number;
  height: number;
  pageNumber: number;
};

type StaffGroup = {
  lines: number[];
  averageSpacing: number;
  noteCandidateColumns: number[];
};

type StaffMeasureContext = {
  staffIndex: number;
  barlineColumns: number[];
  measureBoundaries: number[];
  restColumns: number[];
};

type OmrDiagnostics = {
  width: number;
  height: number;
  rowThreshold: number;
  darkRowCount: number;
  lineCenters: number[];
  staffGroups: StaffGroup[];
};

type DurationValue = "eighth" | "quarter" | "half" | "whole";

type NoteFillKind = "filled" | "open" | "uncertain";

type StemAnalysis = {
  direction: "up" | "down" | "none";
  side: "left" | "right" | "none";
  length: number;
  anchorX: number | null;
  tipY: number | null;
  confidence: number;
};

type NoteheadCandidate = {
  pageNumber: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  confidence: number;
  staffIndex: number;
  roundness: number;
  coreWidth: number;
  coreHeight: number;
  coreArea: number;
};

type DetectedComponent = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  x: number;
  y: number;
  area: number;
};

type AnalyzedNotehead = NoteheadCandidate & {
  pitchStep: number;
  baseNumberedToken: string;
  measureIndex: number;
  accidentalSource: "detected" | "measureCarry" | "none";
  durationSource: "detected" | "measureContext";
  stemDirection: "up" | "down" | "none";
  stemSide: "left" | "right" | "none";
  stemLength: number;
  stemConfidence: number;
  duration: DurationValue;
  dotted: boolean;
  accidental: "#" | "b" | null;
  fillKind: NoteFillKind;
  fillRatio: number;
  hasBeamOrFlag: boolean;
  beamSignal: number;
  numberedToken: string;
};

type StaffPreviewSummary = {
  staffIndex: number;
  noteCount: number;
  restCount: number;
  barlineCount: number;
  measureCount: number;
  averageConfidence: number;
  spacingConfidence: number;
  promotionScore: number;
  eligible: boolean;
};

type PagePreviewSummary = {
  pageNumber: number;
  noteCount: number;
  restCount: number;
  averageConfidence: number;
  spacingConfidence: number;
  promotionScore: number;
  eligible: boolean;
  selectedStaffCount: number;
  diagnosticOnlyStaffCount: number;
};

type OmrPitchPreview = {
  tokens: string[];
  groupedLines: string[];
  noteheads: AnalyzedNotehead[];
  pageCount: number;
  staffGroupCount: number;
  restCount: number;
  barlineCount: number;
  measureCount: number;
  averageConfidence: number;
  durationCounts: Record<DurationValue, number>;
  dottedCount: number;
  accidentalCount: number;
  beamCount: number;
  stemmedCount: number;
  certaintyCount: number;
  spacingConfidence: number;
  promotionScore: number;
  eligible: boolean;
  selectedPageCount: number;
  diagnosticOnlyPageCount: number;
  staffSummaries: StaffPreviewSummary[];
  pageSummaries: PagePreviewSummary[];
};

const db = new DatabaseSync(workerConfig.dbFile);
db.exec("PRAGMA busy_timeout = 5000;");
fs.mkdirSync(workerConfig.storageDir, { recursive: true });
const NEWLINE = String.fromCharCode(10);

console.log(`[worker] ${PRODUCT_NAME} worker started`);
console.log(`[worker] using db ${workerConfig.dbFile}`);

function createId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function nextQueuedJob() {
  return db
    .prepare(
      `
        SELECT id, user_id, input_file_id, direction
        FROM jobs
        WHERE status = 'queued'
        ORDER BY datetime(created_at) ASC
        LIMIT 1
      `,
    )
    .get() as JobRow | undefined;
}

function markProcessing(jobId: string) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE jobs
      SET status = 'processing',
          started_at = ?,
          updated_at = ?
      WHERE id = ? AND status = 'queued'
    `,
  ).run(timestamp, timestamp, jobId);
}

function markFailed(jobId: string, message: string) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE jobs
      SET status = 'failed',
          error_message = ?,
          updated_at = ?,
          completed_at = ?
      WHERE id = ?
    `,
  ).run(message, timestamp, timestamp, jobId);
}

function markCompleted(input: {
  jobId: string;
  resultKind: "final" | "draft";
  outputFileId: string;
  draftBundleFileId?: string;
  previewText: string;
}) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE jobs
      SET status = 'completed',
          result_kind = ?,
          output_file_id = ?,
          draft_bundle_file_id = ?,
          preview_text = ?,
          error_message = NULL,
          updated_at = ?,
          completed_at = ?
      WHERE id = ?
    `,
  ).run(
    input.resultKind,
    input.outputFileId,
    input.draftBundleFileId ?? null,
    input.previewText,
    timestamp,
    timestamp,
    input.jobId,
  );
}

function findInputFile(fileId: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, original_name, storage_path
        FROM files
        WHERE id = ?
      `,
    )
    .get(fileId) as FileRow | undefined;
}

function insertStoredFile(input: {
  userId: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  fileKind: "output_pdf" | "draft_bundle";
}) {
  const id = createId();
  const createdAt = nowIso();
  const storedName = path.basename(input.storagePath);
  const sizeBytes = fs.statSync(input.storagePath).size;

  db.prepare(
    `
      INSERT INTO files (id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(id, input.userId, input.originalName, storedName, input.storagePath, input.mimeType, sizeBytes, input.fileKind, createdAt);

  return id;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function mapNoteToken(letter: string, accidental: string) {
  const baseMap: Record<string, string> = {
    c: "1",
    d: "2",
    e: "3",
    f: "4",
    g: "5",
    a: "6",
    b: "7",
  };

  const mapped = baseMap[letter.toLowerCase()];
  if (!mapped) {
    return null;
  }

  if (accidental === "#") {
    return `#${mapped}`;
  }
  if (accidental === "b") {
    return `b${mapped}`;
  }
  return mapped;
}

function groupTokens(tokens: string[], groupSize: number) {
  const groups: string[] = [];
  for (let index = 0; index < tokens.length; index += groupSize) {
    groups.push(tokens.slice(index, index + groupSize).join(" "));
  }
  return groups;
}

async function withPdfParser<T>(filePath: string, fn: (parser: PDFParse) => Promise<T>) {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  try {
    return await fn(parser);
  } finally {
    await parser.destroy();
  }
}

async function extractPdfText(filePath: string) {
  return withPdfParser(filePath, async (parser) => {
    const parsed = await parser.getText();
    return (parsed.text ?? "").replace(/\s+/g, " ").trim();
  });
}

async function renderPagePngs(filePath: string, maxPages = 3): Promise<PageScreenshot[]> {
  return withPdfParser(filePath, async (parser) => {
    const info = await parser.getInfo();
    const totalPages = Math.max(1, info.total || 1);
    const partial = Array.from({ length: Math.min(totalPages, maxPages) }, (_, index) => index + 1);
    const result = await parser.getScreenshot({
      partial,
      desiredWidth: 1400,
      imageDataUrl: false,
      imageBuffer: true,
    });

    return result.pages
      .filter((page) => page?.data?.length)
      .map((page) => ({
        buffer: Buffer.from(page.data),
        width: page.width,
        height: page.height,
        pageNumber: page.pageNumber,
      }));
  });
}

function deriveNumberedNotation(rawText: string) {
  const matches = Array.from(rawText.matchAll(/(?<![A-Za-z])([A-Ga-g])([#b]?)(\d?)(?![A-Za-z])/g));
  const tokens = matches
    .map((match) => mapNoteToken(match[1], match[2]))
    .filter((value): value is string => Boolean(value));

  return {
    tokens,
    groupedLines: groupTokens(tokens, 12),
  };
}

function groupAdjacentNumbers(values: number[], maxGap: number) {
  if (values.length === 0) {
    return [] as number[][];
  }

  const groups: number[][] = [[values[0]]];
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (current - previous <= maxGap) {
      groups[groups.length - 1].push(current);
    } else {
      groups.push([current]);
    }
  }
  return groups;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function detectStaffDiagnostics(pngBuffer: Buffer): OmrDiagnostics {
  const image = PNG.sync.read(pngBuffer);
  const { width, height, data } = image;

  const rowRatios = Array.from({ length: height }, (_, y) => {
    let darkPixels = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (width * y + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
      if (luminance < 175) {
        darkPixels += 1;
      }
    }
    return darkPixels / width;
  });

  const mean = average(rowRatios);
  const variance = rowRatios.reduce((sum, ratio) => sum + (ratio - mean) ** 2, 0) / rowRatios.length;
  const stddev = Math.sqrt(variance);
  const rowThreshold = Math.max(0.07, mean + stddev * 1.4);
  const candidateRows = rowRatios
    .map((ratio, y) => ({ ratio, y }))
    .filter((entry) => entry.ratio >= rowThreshold)
    .map((entry) => entry.y);

  const rowGroups = groupAdjacentNumbers(candidateRows, 2);
  const lineCenters = rowGroups.map((group) => Math.round(average(group)));

  const staffGroups: StaffGroup[] = [];
  for (let index = 0; index <= lineCenters.length - 5; index += 1) {
    const candidate = lineCenters.slice(index, index + 5);
    const spacings = candidate.slice(1).map((value, spacingIndex) => value - candidate[spacingIndex]);
    const avgSpacing = average(spacings);
    const spacingDeviation = Math.max(...spacings.map((spacing) => Math.abs(spacing - avgSpacing)));
    if (avgSpacing < 4 || avgSpacing > 60 || spacingDeviation > Math.max(2, avgSpacing * 0.35)) {
      continue;
    }

    const previousGroup = staffGroups[staffGroups.length - 1];
    if (previousGroup && candidate[0] - previousGroup.lines[0] < avgSpacing * 3) {
      continue;
    }

    const bandTop = Math.max(0, Math.floor(candidate[0] - avgSpacing * 3));
    const bandBottom = Math.min(height - 1, Math.ceil(candidate[4] + avgSpacing * 3));
    const columnRatios = Array.from({ length: width }, (_, x) => {
      let darkPixels = 0;
      for (let y = bandTop; y <= bandBottom; y += 1) {
        const offset = (width * y + x) * 4;
        const luminance = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
        if (luminance < 165) {
          darkPixels += 1;
        }
      }
      return darkPixels / Math.max(1, bandBottom - bandTop + 1);
    });

    const columnThreshold = Math.max(0.08, average(columnRatios) * 2.2);
    const candidateColumns = columnRatios
      .map((ratio, x) => ({ ratio, x }))
      .filter((entry) => entry.ratio >= columnThreshold)
      .map((entry) => entry.x);
    const noteCandidateColumns = groupAdjacentNumbers(candidateColumns, 3).map((group) => Math.round(average(group)));

    staffGroups.push({
      lines: candidate,
      averageSpacing: Math.round(avgSpacing * 100) / 100,
      noteCandidateColumns,
    });
  }

  return {
    width,
    height,
    rowThreshold: Math.round(rowThreshold * 1000) / 1000,
    darkRowCount: candidateRows.length,
    lineCenters,
    staffGroups,
  };
}

function buildBinaryImage(pngBuffer: Buffer) {
  const image = PNG.sync.read(pngBuffer);
  const { width, height, data } = image;
  const binary = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (width * y + x) * 4;
      const luminance = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      binary[y * width + x] = luminance < 175 ? 1 : 0;
    }
  }

  return { width, height, binary };
}

function buildStaffSuppressedBinary(pngBuffer: Buffer, diagnostics: OmrDiagnostics) {
  const { width, height, binary } = buildBinaryImage(pngBuffer);
  const working = new Uint8Array(binary);

  for (const staff of diagnostics.staffGroups) {
    for (const lineY of staff.lines) {
      for (let delta = -1; delta <= 1; delta += 1) {
        const y = lineY + delta;
        if (y < 0 || y >= height) {
          continue;
        }
        for (let x = 0; x < width; x += 1) {
          working[y * width + x] = 0;
        }
      }
    }
  }

  return { width, height, binary: working };
}

function refineNoteheadCore(
  binary: Uint8Array,
  width: number,
  height: number,
  candidate: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    x: number;
    y: number;
  },
  staff: StaffGroup,
) {
  const targetWidth = Math.max(5, Math.min(candidate.maxX - candidate.minX + 1, Math.round(staff.averageSpacing * 0.95)));
  const targetHeight = Math.max(5, Math.min(candidate.maxY - candidate.minY + 1, Math.round(staff.averageSpacing * 0.78)));
  const horizontalSlack = Math.max(6, Math.round(staff.averageSpacing * 1.05));
  const verticalSlack = Math.max(5, Math.round(staff.averageSpacing * 0.9));
  const startX = Math.max(0, Math.floor(Math.max(candidate.minX - 2, candidate.x - horizontalSlack)));
  const endX = Math.min(width - targetWidth, Math.ceil(Math.min(candidate.maxX - targetWidth + 2, candidate.x + horizontalSlack - targetWidth)));
  const startY = Math.max(0, Math.floor(Math.max(candidate.minY - 2, candidate.y - verticalSlack)));
  const endY = Math.min(height - targetHeight, Math.ceil(Math.min(candidate.maxY - targetHeight + 2, candidate.y + verticalSlack - targetHeight)));

  let best = {
    minX: candidate.minX,
    maxX: candidate.maxX,
    minY: candidate.minY,
    maxY: candidate.maxY,
    area: Math.max(1, (candidate.maxX - candidate.minX + 1) * (candidate.maxY - candidate.minY + 1)),
    roundness: 0.5,
    score: 0,
  };

  for (let top = startY; top <= endY; top += 1) {
    for (let left = startX; left <= endX; left += 1) {
      const region = measureDarkRegion(binary, width, height, left, left + targetWidth - 1, top, top + targetHeight - 1);
      if (region.darkPixels < Math.max(8, Math.round(staff.averageSpacing * 0.25))) {
        continue;
      }

      const centerX = left + (targetWidth / 2);
      const centerY = top + (targetHeight / 2);
      const distancePenalty =
        (Math.abs(centerX - candidate.x) / Math.max(1, targetWidth)) +
        (Math.abs(centerY - candidate.y) / Math.max(1, targetHeight));
      const density = region.darkPixels / Math.max(1, region.pixelWidth * region.pixelHeight);
      const roundness =
        1 -
        Math.min(
          1,
          Math.abs(region.occupiedColumnCount - region.occupiedRowCount) /
            Math.max(1, Math.max(region.occupiedColumnCount, region.occupiedRowCount)),
        );
      const compactness =
        Math.min(1, region.occupiedColumnCount / Math.max(1, targetWidth)) *
        Math.min(1, region.occupiedRowCount / Math.max(1, targetHeight));
      const score = density * 0.45 + roundness * 0.3 + compactness * 0.2 - Math.min(1, distancePenalty) * 0.15;

      if (score > best.score) {
        best = {
          minX: left,
          maxX: left + targetWidth - 1,
          minY: top,
          maxY: top + targetHeight - 1,
          area: region.darkPixels,
          roundness: Number(roundness.toFixed(3)),
          score,
        };
      }
    }
  }

  return best;
}

function collectNoteheadSeeds(
  binary: Uint8Array,
  width: number,
  height: number,
  component: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    x: number;
    y: number;
  },
  staff: StaffGroup,
) {
  const spacing = staff.averageSpacing;
  const columnProfile: number[] = [];
  for (let x = component.minX; x <= component.maxX; x += 1) {
    let darkPixels = 0;
    for (let y = component.minY; y <= component.maxY; y += 1) {
      if (binary[y * width + x]) {
        darkPixels += 1;
      }
    }
    columnProfile.push(darkPixels);
  }

  const smoothedProfile = columnProfile.map((_, index) => {
    return average(
      columnProfile.slice(Math.max(0, index - 1), Math.min(columnProfile.length, index + 2)),
    );
  });
  const maxColumnDensity = Math.max(...smoothedProfile, 0);
  const peakThreshold = Math.max(2, maxColumnDensity * 0.58);
  const peakXs = smoothedProfile
    .map((value, index) => ({ value, x: component.minX + index }))
    .filter((entry, index) => {
      if (entry.value < peakThreshold) {
        return false;
      }
      const left = index > 0 ? smoothedProfile[index - 1] : entry.value;
      const right = index < smoothedProfile.length - 1 ? smoothedProfile[index + 1] : entry.value;
      return entry.value >= left && entry.value >= right;
    })
    .map((entry) => entry.x);

  const groupedPeakXs = groupAdjacentNumbers(peakXs, 2).map((group) => Math.round(average(group)));
  const projectedColumns = staff.noteCandidateColumns.filter(
    (column) => column >= component.minX - spacing * 0.35 && column <= component.maxX + spacing * 0.35,
  );
  const seedCandidates = [...groupedPeakXs, ...projectedColumns, Math.round(component.x)].sort((left, right) => left - right);
  const minSeedGap = Math.max(5, Math.round(spacing * 0.52));

  const scoredSeeds = seedCandidates.map((seedX) => {
    const localIndex = Math.max(0, Math.min(smoothedProfile.length - 1, seedX - component.minX));
    const localScore = smoothedProfile[localIndex] / Math.max(1, maxColumnDensity);
    const projectedDistance = projectedColumns.length
      ? Math.min(...projectedColumns.map((column) => Math.abs(column - seedX)))
      : spacing;
    const projectedScore = 1 - Math.min(1, projectedDistance / Math.max(4, spacing * 0.75));

    const bandHalfWidth = Math.max(2, Math.round(spacing * 0.22));
    const rowProfile = Array.from({ length: component.maxY - component.minY + 1 }, (_, offset) => {
      const y = component.minY + offset;
      let darkPixels = 0;
      for (let x = Math.max(component.minX, seedX - bandHalfWidth); x <= Math.min(component.maxX, seedX + bandHalfWidth); x += 1) {
        if (binary[y * width + x]) {
          darkPixels += 1;
        }
      }
      return darkPixels;
    });
    const maxRowDensity = Math.max(...rowProfile, 0);
    const candidateRows = rowProfile
      .map((value, index) => ({ value, y: component.minY + index }))
      .filter((entry) => entry.value >= Math.max(1, maxRowDensity * 0.55))
      .map((entry) => entry.y);
    const rowGroups = groupAdjacentNumbers(candidateRows, 2);
    const bestRowGroup =
      rowGroups.sort(
        (left, right) =>
          Math.abs(average(left) - component.y) - Math.abs(average(right) - component.y) || right.length - left.length,
      )[0] ?? [Math.round(component.y)];

    return {
      x: seedX,
      y: Math.round(average(bestRowGroup)),
      score: Number((localScore * 0.68 + projectedScore * 0.32).toFixed(3)),
    };
  });

  const maxSeedCount =
    component.maxX - component.minX + 1 > spacing * 1.55
      ? Math.min(3, Math.max(2, Math.round((component.maxX - component.minX + 1) / Math.max(8, spacing * 0.82))))
      : 1;

  const selectedSeeds = scoredSeeds
    .sort((left, right) => right.score - left.score || left.x - right.x)
    .reduce<typeof scoredSeeds>((accumulator, seed) => {
      if (accumulator.some((candidate) => Math.abs(candidate.x - seed.x) < minSeedGap)) {
        return accumulator;
      }
      accumulator.push(seed);
      return accumulator;
    }, [])
    .slice(0, maxSeedCount)
    .sort((left, right) => left.x - right.x);

  return selectedSeeds.length ? selectedSeeds : [{ x: Math.round(component.x), y: Math.round(component.y), score: 0.4 }];
}

function tightenComponentBounds(
  binary: Uint8Array,
  width: number,
  height: number,
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  },
) {
  let minX = bounds.maxX;
  let maxX = bounds.minX;
  let minY = bounds.maxY;
  let maxY = bounds.minY;
  let area = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = Math.max(0, bounds.minY); y <= Math.min(height - 1, bounds.maxY); y += 1) {
    for (let x = Math.max(0, bounds.minX); x <= Math.min(width - 1, bounds.maxX); x += 1) {
      if (!binary[y * width + x]) {
        continue;
      }

      area += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (area === 0) {
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    x: sumX / area,
    y: sumY / area,
    area,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function subdivideComponentByValleys(
  binary: Uint8Array,
  width: number,
  height: number,
  component: DetectedComponent,
  staff: StaffGroup,
  depth = 0,
): DetectedComponent[] {
  const spacing = staff.averageSpacing;
  const componentWidth = component.maxX - component.minX + 1;
  if (depth >= 2 || componentWidth < Math.round(spacing * 1.5)) {
    return [component];
  }

  const columnProfile = Array.from({ length: componentWidth }, (_, offset) => {
    const x = component.minX + offset;
    let darkPixels = 0;
    for (let y = component.minY; y <= component.maxY; y += 1) {
      if (binary[y * width + x]) {
        darkPixels += 1;
      }
    }
    return darkPixels;
  });
  const smoothedProfile = columnProfile.map((_, index) =>
    average(columnProfile.slice(Math.max(0, index - 2), Math.min(columnProfile.length, index + 3))),
  );
  const peak = Math.max(...smoothedProfile, 0);
  const valleyThreshold = Math.max(1.1, peak * 0.28);
  const minSegmentWidth = Math.max(6, Math.round(spacing * 0.55));
  const candidateCuts = smoothedProfile
    .map((value, index) => ({ value, index }))
    .filter((entry, index) => {
      if (index < minSegmentWidth || index > smoothedProfile.length - minSegmentWidth - 1) {
        return false;
      }
      if (entry.value > valleyThreshold) {
        return false;
      }
      const left = smoothedProfile[index - 1];
      const right = smoothedProfile[index + 1];
      return entry.value <= left && entry.value <= right;
    })
    .map((entry) => entry.index);

  const groupedCuts = groupAdjacentNumbers(candidateCuts, 2).map((group) => Math.round(average(group)));
  if (groupedCuts.length === 0) {
    return [component];
  }

  const segments: DetectedComponent[] = [];
  let segmentStart = component.minX;

  for (const cut of groupedCuts) {
    const segmentEnd = component.minX + cut - 1;
    if (segmentEnd - segmentStart + 1 < minSegmentWidth) {
      continue;
    }

    const tightened = tightenComponentBounds(binary, width, height, {
      minX: segmentStart,
      maxX: segmentEnd,
      minY: component.minY,
      maxY: component.maxY,
    });
    if (tightened && tightened.width >= 4 && tightened.height >= 4) {
      segments.push(tightened);
    }
    segmentStart = component.minX + cut + 1;
  }

  if (component.maxX - segmentStart + 1 >= minSegmentWidth) {
    const tightened = tightenComponentBounds(binary, width, height, {
      minX: segmentStart,
      maxX: component.maxX,
      minY: component.minY,
      maxY: component.maxY,
    });
    if (tightened && tightened.width >= 4 && tightened.height >= 4) {
      segments.push(tightened);
    }
  }

  if (segments.length < 2) {
    return [component];
  }

  return segments.flatMap((segment) => subdivideComponentByValleys(binary, width, height, segment, staff, depth + 1));
}

function detectNoteheadsFromDiagnostics(pngBuffer: Buffer, diagnostics: OmrDiagnostics, pageNumber: number) {
  const { width, height, binary: working } = buildStaffSuppressedBinary(pngBuffer, diagnostics);

  const visited = new Uint8Array(width * height);
  const candidates: NoteheadCandidate[] = [];
  const neighborOffsets = [
    -1,
    1,
    -width,
    width,
    -width - 1,
    -width + 1,
    width - 1,
    width + 1,
  ];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!working[index] || visited[index]) {
        continue;
      }

      const queue = [index];
      visited[index] = 1;
      let head = 0;
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;

      while (head < queue.length) {
        const current = queue[head++];
        const currentX = current % width;
        const currentY = Math.floor(current / width);
        area += 1;
        sumX += currentX;
        sumY += currentY;
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);

        for (const offset of neighborOffsets) {
          const next = current + offset;
          if (next < 0 || next >= working.length || visited[next] || !working[next]) {
            continue;
          }
          const nextX = next % width;
          const nextY = Math.floor(next / width);
          if (Math.abs(nextX - currentX) > 1 || Math.abs(nextY - currentY) > 1) {
            continue;
          }
          visited[next] = 1;
          queue.push(next);
        }
      }

      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      if (componentWidth < 4 || componentHeight < 4 || componentWidth > 88 || componentHeight > 88 || area < 12) {
        continue;
      }

      const density = area / (componentWidth * componentHeight);
      if (density < 0.18) {
        continue;
      }

      const centerX = sumX / area;
      const centerY = sumY / area;

      let matchedStaffIndex = -1;
      let matchedDistance = Number.POSITIVE_INFINITY;
      diagnostics.staffGroups.forEach((staff, staffIndex) => {
        const top = staff.lines[0] - staff.averageSpacing * 4;
        const bottom = staff.lines[4] + staff.averageSpacing * 4;
        if (centerY < top || centerY > bottom) {
          return;
        }
        const middle = average(staff.lines);
        const distance = Math.abs(centerY - middle);
        if (distance < matchedDistance) {
          matchedDistance = distance;
          matchedStaffIndex = staffIndex;
        }
      });

      if (matchedStaffIndex < 0) {
        continue;
      }

      const staff = diagnostics.staffGroups[matchedStaffIndex];
      const aspectRatio = componentWidth / Math.max(1, componentHeight);
      const extremelyTallAndThin =
        aspectRatio < 0.22 &&
        componentWidth <= Math.max(4, Math.round(staff.averageSpacing * 0.26)) &&
        area <= Math.round(staff.averageSpacing * staff.averageSpacing * 0.85);
      if (aspectRatio > 3.3 || extremelyTallAndThin) {
        continue;
      }

      const subcomponents = subdivideComponentByValleys(
        working,
        width,
        height,
        {
          minX,
          maxX,
          minY,
          maxY,
          x: centerX,
          y: centerY,
          area,
        },
        staff,
      );

      for (const subcomponent of subcomponents) {
        const subcomponentWidth = subcomponent.maxX - subcomponent.minX + 1;
        const subcomponentHeight = subcomponent.maxY - subcomponent.minY + 1;
        const subcomponentDensity = subcomponent.area / Math.max(1, subcomponentWidth * subcomponentHeight);
        if (
          subcomponentWidth < 4 ||
          subcomponentHeight < 4 ||
          subcomponentWidth > 88 ||
          subcomponentHeight > 88 ||
          subcomponentDensity < 0.15
        ) {
          continue;
        }

        const componentSeeds = collectNoteheadSeeds(working, width, height, subcomponent, staff);

        for (const seed of componentSeeds) {
          const core = refineNoteheadCore(
            working,
            width,
            height,
            {
              minX: subcomponent.minX,
              maxX: subcomponent.maxX,
              minY: subcomponent.minY,
              maxY: subcomponent.maxY,
              x: seed.x,
              y: seed.y,
            },
            staff,
          );
          const coreWidth = core.maxX - core.minX + 1;
          const coreHeight = core.maxY - core.minY + 1;
          const coreAspectRatio = coreWidth / Math.max(1, coreHeight);
          if (
            coreWidth < Math.max(4, Math.floor(staff.averageSpacing * 0.22)) ||
            coreWidth > Math.ceil(staff.averageSpacing * 1.05) ||
            coreHeight < Math.max(4, Math.floor(staff.averageSpacing * 0.18)) ||
            coreHeight > Math.ceil(staff.averageSpacing * 0.88) ||
            coreAspectRatio < 0.55 ||
            coreAspectRatio > 1.75 ||
            core.roundness < 0.38
          ) {
            continue;
          }

          const coreCenterX = (core.minX + core.maxX) / 2;
          const nearestColumnDistance =
            staff.noteCandidateColumns.length > 0
              ? Math.min(...staff.noteCandidateColumns.map((column) => Math.abs(column - coreCenterX)))
              : staff.averageSpacing * 2;
          const shapeScore =
            1 - Math.min(1, Math.abs(subcomponentWidth - subcomponentHeight) / Math.max(subcomponentWidth, subcomponentHeight));
          const densityScore = Math.min(1, subcomponentDensity / 0.65);
          const columnScore = 1 - Math.min(1, nearestColumnDistance / Math.max(6, staff.averageSpacing * 1.3));
          const coreShapeScore = 1 - Math.min(1, Math.abs(coreWidth - coreHeight) / Math.max(coreWidth, coreHeight));
          const roundnessScore = core.roundness;
          const seedScore = seed.score;
          const subdivisionBonus = subcomponents.length > 1 ? 0.06 : 0;
          const confidence = Number(
            Math.min(
              1,
              shapeScore * 0.12 +
                densityScore * 0.16 +
                columnScore * 0.22 +
                coreShapeScore * 0.18 +
                roundnessScore * 0.18 +
                seedScore * 0.12 +
                subdivisionBonus,
            ).toFixed(3),
          );

          candidates.push({
            pageNumber,
            minX: core.minX,
            maxX: core.maxX,
            minY: core.minY,
            maxY: core.maxY,
            x: Math.round(coreCenterX),
            y: Math.round((core.minY + core.maxY) / 2),
            width: coreWidth,
            height: coreHeight,
            area: core.area,
            confidence,
            staffIndex: matchedStaffIndex,
            roundness: roundnessScore,
            coreWidth,
            coreHeight,
            coreArea: core.area,
          });
        }
      }
    }
  }

  candidates.sort((left, right) => left.x - right.x || left.y - right.y);
  const deduped: NoteheadCandidate[] = [];
  for (const candidate of candidates) {
    const previous = deduped[deduped.length - 1];
    if (
      previous &&
      previous.staffIndex === candidate.staffIndex &&
      Math.abs(previous.x - candidate.x) <= 6 &&
      Math.abs(previous.y - candidate.y) <= 6
    ) {
      if (candidate.confidence > previous.confidence) {
        deduped[deduped.length - 1] = candidate;
      }
      continue;
    }
    deduped.push(candidate);
  }

  return deduped;
}

function buildNumberedTokenFromTreble(stepFromBottomLine: number) {
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const baseLetterIndex = 2;
  const notePosition = baseLetterIndex + stepFromBottomLine;
  const wrappedIndex = ((notePosition % 7) + 7) % 7;
  const octaveShift = Math.floor(notePosition / 7);
  const letter = letters[wrappedIndex];
  const octave = 4 + octaveShift;
  const tokenMap: Record<string, string> = {
    C: "1",
    D: "2",
    E: "3",
    F: "4",
    G: "5",
    A: "6",
    B: "7",
  };
  const baseToken = tokenMap[letter];

  if (octave > 4) {
    return `${baseToken}${"'".repeat(octave - 4)}`;
  }
  if (octave < 4) {
    return `${baseToken}${",".repeat(4 - octave)}`;
  }
  return baseToken;
}

function measureDarkRegion(
  binary: Uint8Array,
  width: number,
  height: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
) {
  const fromX = Math.max(0, Math.floor(minX));
  const toX = Math.min(width - 1, Math.ceil(maxX));
  const fromY = Math.max(0, Math.floor(minY));
  const toY = Math.min(height - 1, Math.ceil(maxY));
  const occupiedRows = new Set<number>();
  const occupiedColumns = new Set<number>();
  let darkPixels = 0;

  for (let y = fromY; y <= toY; y += 1) {
    for (let x = fromX; x <= toX; x += 1) {
      if (!binary[y * width + x]) {
        continue;
      }

      darkPixels += 1;
      occupiedRows.add(y);
      occupiedColumns.add(x);
    }
  }

  return {
    darkPixels,
    occupiedRowCount: occupiedRows.size,
    occupiedColumnCount: occupiedColumns.size,
    pixelWidth: Math.max(1, toX - fromX + 1),
    pixelHeight: Math.max(1, toY - fromY + 1),
  };
}

function measureMaxDarkRun(
  binary: Uint8Array,
  width: number,
  height: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  axis: "horizontal" | "vertical",
) {
  const fromX = Math.max(0, Math.floor(minX));
  const toX = Math.min(width - 1, Math.ceil(maxX));
  const fromY = Math.max(0, Math.floor(minY));
  const toY = Math.min(height - 1, Math.ceil(maxY));
  let best = 0;

  if (axis === "horizontal") {
    for (let y = fromY; y <= toY; y += 1) {
      let current = 0;
      for (let x = fromX; x <= toX; x += 1) {
        if (binary[y * width + x]) {
          current += 1;
          best = Math.max(best, current);
        } else {
          current = 0;
        }
      }
    }
    return best;
  }

  for (let x = fromX; x <= toX; x += 1) {
    let current = 0;
    for (let y = fromY; y <= toY; y += 1) {
      if (binary[y * width + x]) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
  }

  return best;
}

function classifyNoteheadFill(binary: Uint8Array, width: number, height: number, candidate: NoteheadCandidate) {
  const region = measureDarkRegion(
    binary,
    width,
    height,
    candidate.minX + candidate.width * 0.2,
    candidate.maxX - candidate.width * 0.2,
    candidate.minY + candidate.height * 0.2,
    candidate.maxY - candidate.height * 0.2,
  );

  const fillRatio = Number((region.darkPixels / Math.max(1, region.pixelWidth * region.pixelHeight)).toFixed(3));
  const fillKind: NoteFillKind =
    fillRatio >= 0.43 ? "filled" : fillRatio <= 0.24 ? "open" : "uncertain";

  return {
    fillKind,
    fillRatio,
  };
}

function hasVerticalBarrier(binary: Uint8Array, width: number, height: number, candidate: NoteheadCandidate, staff: StaffGroup) {
  const spacing = staff.averageSpacing;
  const region = measureDarkRegion(
    binary,
    width,
    height,
    candidate.x - Math.max(1, candidate.width * 0.2),
    candidate.x + Math.max(1, candidate.width * 0.2),
    candidate.y - spacing * 2.8,
    candidate.y + spacing * 2.8,
  );

  return (
    region.occupiedColumnCount <= Math.max(3, Math.round(spacing * 0.18)) &&
    region.occupiedRowCount >= Math.round(spacing * 3.2) &&
    region.darkPixels >= Math.round(spacing * 5)
  );
}

function detectStem(
  binary: Uint8Array,
  width: number,
  height: number,
  candidate: NoteheadCandidate,
  staff: StaffGroup,
) {
  const spacing = staff.averageSpacing;
  const searchTop = candidate.y - spacing * 3.5;
  const searchBottom = candidate.y + spacing * 3.5;
  const leftFrom = candidate.minX - spacing * 0.8;
  const leftTo = candidate.minX + Math.max(1, candidate.width * 0.15);
  const rightFrom = candidate.maxX - Math.max(1, candidate.width * 0.15);
  const rightTo = candidate.maxX + spacing * 0.8;

  function bestRun(minX: number, maxX: number) {
    let best = {
      length: 0,
      darkCount: 0,
      x: null as number | null,
      startY: null as number | null,
      endY: null as number | null,
    };

    for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(width - 1, Math.ceil(maxX)); x += 1) {
      const darkYs: number[] = [];
      for (let y = Math.max(0, Math.floor(searchTop)); y <= Math.min(height - 1, Math.ceil(searchBottom)); y += 1) {
        if (binary[y * width + x]) {
          darkYs.push(y);
        }
      }

      for (const group of groupAdjacentNumbers(darkYs, 3)) {
        const length = group[group.length - 1] - group[0] + 1;
        if (length > best.length || (length === best.length && group.length > best.darkCount)) {
          best = {
            length,
            darkCount: group.length,
            x,
            startY: group[0],
            endY: group[group.length - 1],
          };
        }
      }
    }
    return best;
  }

  const leftRun = bestRun(leftFrom, leftTo);
  const rightRun = bestRun(rightFrom, rightTo);
  const threshold = Math.max(8, Math.round(spacing * 1.4));

  const bestSide =
    rightRun.length > leftRun.length || (rightRun.length === leftRun.length && rightRun.darkCount >= leftRun.darkCount)
      ? { side: "right" as const, run: rightRun }
      : { side: "left" as const, run: leftRun };

  if (bestSide.run.length < threshold || bestSide.run.darkCount < Math.max(5, Math.round(spacing * 0.7))) {
    return {
      direction: "none" as const,
      side: "none" as const,
      length: 0,
      anchorX: null,
      tipY: null,
      confidence: 0,
    };
  }

  const segmentStart = bestSide.run.startY ?? candidate.y;
  const segmentEnd = bestSide.run.endY ?? candidate.y;
  const aboveLength = Math.max(0, Math.min(candidate.y, segmentEnd) - segmentStart + 1);
  const belowLength = Math.max(0, segmentEnd - Math.max(candidate.y, segmentStart) + 1);
  const direction = aboveLength >= belowLength ? ("up" as const) : ("down" as const);
  const tipY = direction === "up" ? segmentStart : segmentEnd;
  const density = bestSide.run.darkCount / Math.max(1, bestSide.run.length);
  const confidence = Number(
    Math.min(1, (bestSide.run.length / Math.max(1, spacing * 3)) * 0.7 + Math.min(1, density / 0.75) * 0.3).toFixed(3),
  );

  return {
    direction,
    side: bestSide.side,
    length: bestSide.run.length,
    anchorX: bestSide.run.x,
    tipY,
    confidence,
  };
}

function detectBeamOrFlag(
  binary: Uint8Array,
  width: number,
  height: number,
  staff: StaffGroup,
  stem: StemAnalysis,
) {
  if (stem.direction === "none" || stem.side === "none" || stem.anchorX === null || stem.tipY === null) {
    return {
      present: false,
      signal: 0,
    };
  }

  const spacing = staff.averageSpacing;
  const region = measureDarkRegion(
    binary,
    width,
    height,
    stem.side === "right" ? stem.anchorX + 2 : stem.anchorX - spacing * 1.6,
    stem.side === "right" ? stem.anchorX + spacing * 1.8 : stem.anchorX - 2,
    stem.direction === "up" ? stem.tipY - spacing * 0.6 : stem.tipY - spacing * 0.9,
    stem.direction === "up" ? stem.tipY + spacing * 1.2 : stem.tipY + spacing * 0.6,
  );

  const density = region.darkPixels / Math.max(1, region.pixelWidth * region.pixelHeight);
  const present =
    region.darkPixels >= Math.max(6, Math.round(spacing * 0.45)) &&
    region.occupiedColumnCount >= Math.max(3, Math.round(spacing * 0.22)) &&
    density >= 0.06;

  return {
    present,
    signal: Number(density.toFixed(3)),
  };
}

function detectDot(
  binary: Uint8Array,
  width: number,
  height: number,
  candidate: NoteheadCandidate,
  staff: StaffGroup,
) {
  const spacing = staff.averageSpacing;
  const region = measureDarkRegion(
    binary,
    width,
    height,
    candidate.maxX + spacing * 0.15,
    candidate.maxX + spacing * 0.75,
    candidate.y - spacing * 0.35,
    candidate.y + spacing * 0.35,
  );
  const density = region.darkPixels / Math.max(1, region.pixelWidth * region.pixelHeight);
  return (
    region.darkPixels >= 2 &&
    region.darkPixels <= Math.max(16, Math.round(spacing * 0.6)) &&
    region.occupiedColumnCount <= Math.max(5, Math.round(spacing * 0.35)) &&
    region.occupiedRowCount <= Math.max(5, Math.round(spacing * 0.35)) &&
    density >= 0.08
  );
}

function detectAccidental(
  binary: Uint8Array,
  width: number,
  height: number,
  candidate: NoteheadCandidate,
  staff: StaffGroup,
) {
  const spacing = staff.averageSpacing;
  const regionMinX = candidate.minX - spacing * 1.8;
  const regionMaxX = candidate.minX - spacing * 0.2;
  const regionMinY = candidate.y - spacing * 1.6;
  const regionMaxY = candidate.y + spacing * 1.6;

  const region = measureDarkRegion(binary, width, height, regionMinX, regionMaxX, regionMinY, regionMaxY);
  if (region.darkPixels < Math.max(10, Math.round(spacing))) {
    return null;
  }

  const density = region.darkPixels / Math.max(1, region.pixelWidth * region.pixelHeight);
  if (density < 0.08 || region.occupiedRowCount < Math.max(6, Math.round(spacing * 0.65))) {
    return null;
  }

  const verticalRun = measureMaxDarkRun(binary, width, height, regionMinX, regionMaxX, regionMinY, regionMaxY, "vertical");
  const horizontalRun = measureMaxDarkRun(binary, width, height, regionMinX, regionMaxX, regionMinY, regionMaxY, "horizontal");
  const columnToRowRatio = region.occupiedColumnCount / Math.max(1, region.occupiedRowCount);

  if (
    region.occupiedColumnCount >= Math.max(5, Math.round(spacing * 0.38)) &&
    horizontalRun >= Math.max(3, Math.round(spacing * 0.3)) &&
    columnToRowRatio >= 0.28
  ) {
    return "#";
  }
  if (
    region.occupiedColumnCount <= Math.max(6, Math.round(spacing * 0.52)) &&
    verticalRun >= Math.max(7, Math.round(spacing * 0.85)) &&
    columnToRowRatio <= 0.48
  ) {
    return "b";
  }
  return null;
}

function formatNumberedPreviewToken(baseToken: string, duration: DurationValue, dotted: boolean, accidental: "#" | "b" | null) {
  const durationMap = {
    eighth: "e",
    quarter: "q",
    half: "h",
    whole: "w",
  } as const;

  return `${accidental ?? ""}${baseToken}(${durationMap[duration]}${dotted ? "." : ""})`;
}

function detectBarlinesForStaff(
  binary: Uint8Array,
  width: number,
  height: number,
  staff: StaffGroup,
  noteheads: AnalyzedNotehead[],
) {
  const spacing = staff.averageSpacing;
  const bandTop = Math.max(0, Math.floor(staff.lines[0] - spacing * 1.6));
  const bandBottom = Math.min(height - 1, Math.ceil(staff.lines[4] + spacing * 1.8));
  const candidateColumns: number[] = [];

  for (let x = 0; x < width; x += 1) {
    let darkPixels = 0;
    const darkRows: number[] = [];
    for (let y = bandTop; y <= bandBottom; y += 1) {
      if (!binary[y * width + x]) {
        continue;
      }
      darkPixels += 1;
      darkRows.push(y);
    }

    if (darkPixels < Math.max(10, Math.round(spacing * 2.6))) {
      continue;
    }

    const runs = groupAdjacentNumbers(darkRows, 1);
    const bestRun = runs.reduce((best, current) => Math.max(best, current[current.length - 1] - current[0] + 1), 0);
    if (bestRun < Math.max(18, Math.round(spacing * 4.15))) {
      continue;
    }

    candidateColumns.push(x);
  }

  return groupAdjacentNumbers(candidateColumns, 2)
    .map((group) => Math.round(average(group)))
    .filter((column) => {
      return !noteheads.some(
        (candidate) =>
          Math.abs(candidate.x - column) <= Math.max(4, Math.round(spacing * 0.38)) &&
          candidate.stemConfidence < 0.5 &&
          Math.abs(candidate.y - average(staff.lines)) <= spacing * 2.5,
      );
    });
}

function buildMeasureBoundaries(width: number, staff: StaffGroup, barlineColumns: number[]) {
  const minGap = Math.max(14, Math.round(staff.averageSpacing * 1.4));
  const sorted = [...barlineColumns].sort((left, right) => left - right);
  const filtered = sorted.filter((column, index) => index === 0 || column - sorted[index - 1] >= minGap);
  return [0, ...filtered, width - 1];
}

function detectRestColumnsForStaff(
  originalBinary: Uint8Array,
  suppressedBinary: Uint8Array,
  width: number,
  height: number,
  staff: StaffGroup,
  noteheads: AnalyzedNotehead[],
  barlineColumns: number[],
) {
  const spacing = staff.averageSpacing;
  const bandTop = Math.max(0, Math.floor(staff.lines[0] - spacing * 1.2));
  const bandBottom = Math.min(height - 1, Math.ceil(staff.lines[4] + spacing * 1.2));
  const visited = new Uint8Array(width * height);
  const restCenters: number[] = [];
  const noteSlack = Math.max(6, Math.round(spacing * 0.45));
  const barlineSlack = Math.max(6, Math.round(spacing * 0.35));
  const neighborOffsets = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];

  for (let y = bandTop; y <= bandBottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!suppressedBinary[index] || visited[index]) {
        continue;
      }

      const queue = [index];
      visited[index] = 1;
      let head = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      let sumX = 0;

      while (head < queue.length) {
        const current = queue[head++];
        const currentX = current % width;
        const currentY = Math.floor(current / width);
        area += 1;
        sumX += currentX;
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);

        for (const offset of neighborOffsets) {
          const next = current + offset;
          if (next < 0 || next >= suppressedBinary.length || visited[next] || !suppressedBinary[next]) {
            continue;
          }
          const nextX = next % width;
          const nextY = Math.floor(next / width);
          if (nextY < bandTop || nextY > bandBottom || Math.abs(nextX - currentX) > 1 || Math.abs(nextY - currentY) > 1) {
            continue;
          }
          visited[next] = 1;
          queue.push(next);
        }
      }

      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      const centerX = Math.round(sumX / Math.max(1, area));
      const centerY = Math.round((minY + maxY) / 2);
      const overlapsNote = noteheads.some(
        (candidate) =>
          Math.abs(candidate.x - centerX) <= noteSlack &&
          Math.abs(candidate.y - centerY) <= Math.max(8, Math.round(spacing * 0.9)),
      );
      if (overlapsNote) {
        continue;
      }

      if (barlineColumns.some((column) => Math.abs(column - centerX) <= barlineSlack)) {
        continue;
      }

      const nearMiddle = Math.abs(centerY - average(staff.lines)) <= spacing * 1.2;
      const compactArea = area >= Math.max(10, Math.round(spacing * 0.45)) && area <= Math.max(90, Math.round(spacing * spacing * 0.9));
      const restSized =
        componentWidth >= Math.max(4, Math.round(spacing * 0.18)) &&
        componentWidth <= Math.max(18, Math.round(spacing * 0.85)) &&
        componentHeight >= Math.max(3, Math.round(spacing * 0.16)) &&
        componentHeight <= Math.max(18, Math.round(spacing * 0.85));

      if (nearMiddle && compactArea && restSized) {
        restCenters.push(centerX);
      }
    }
  }

  const middleBandTop = Math.max(0, Math.floor(average([staff.lines[1], staff.lines[3]]) - spacing * 0.42));
  const middleBandBottom = Math.min(height - 1, Math.ceil(average([staff.lines[1], staff.lines[3]]) + spacing * 0.42));
  const projectionColumns: number[] = [];

  for (let x = 0; x < width; x += 1) {
    let darkSuppressed = 0;
    let darkOriginal = 0;
    for (let y = middleBandTop; y <= middleBandBottom; y += 1) {
      if (suppressedBinary[y * width + x]) {
        darkSuppressed += 1;
      }
      if (originalBinary[y * width + x]) {
        darkOriginal += 1;
      }
    }

    if (darkSuppressed >= 2 || (darkSuppressed >= 1 && darkOriginal >= 3)) {
      projectionColumns.push(x);
    }
  }

  const projectedCenters = groupAdjacentNumbers(projectionColumns, 2)
    .filter((group) => {
      const widthSpan = group[group.length - 1] - group[0] + 1;
      return widthSpan >= Math.max(8, Math.round(spacing * 0.3)) && widthSpan <= Math.max(28, Math.round(spacing * 1.1));
    })
    .map((group) => Math.round(average(group)))
    .filter((centerX) => {
      if (noteheads.some((candidate) => Math.abs(candidate.x - centerX) <= noteSlack)) {
        return false;
      }
      if (barlineColumns.some((column) => Math.abs(column - centerX) <= barlineSlack)) {
        return false;
      }

      const horizontalRun = measureMaxDarkRun(
        suppressedBinary,
        width,
        height,
        centerX - spacing * 0.45,
        centerX + spacing * 0.45,
        middleBandTop,
        middleBandBottom,
        "horizontal",
      );
      return horizontalRun >= Math.max(6, Math.round(spacing * 0.28));
    });

  return groupAdjacentNumbers([...restCenters, ...projectedCenters].sort((left, right) => left - right), 4).map((group) =>
    Math.round(average(group)),
  );
}

function locateMeasureIndex(x: number, measureBoundaries: number[]) {
  for (let index = 0; index < measureBoundaries.length - 1; index += 1) {
    if (x >= measureBoundaries[index] && x <= measureBoundaries[index + 1]) {
      return index;
    }
  }
  return Math.max(0, measureBoundaries.length - 2);
}

function analyzeNoteheads(diagnostics: OmrDiagnostics, pngBuffer: Buffer, noteheads: NoteheadCandidate[]): AnalyzedNotehead[] {
  const originalImage = buildBinaryImage(pngBuffer);
  const { width, height, binary } = buildStaffSuppressedBinary(pngBuffer, diagnostics);

  return noteheads.map((candidate) => {
    const staff = diagnostics.staffGroups[candidate.staffIndex];
    const bottomLine = staff.lines[4];
    const stepFromBottomLine = Math.round((bottomLine - candidate.y) / (staff.averageSpacing / 2));
    const baseToken = buildNumberedTokenFromTreble(stepFromBottomLine);
    const stem = detectStem(originalImage.binary, originalImage.width, originalImage.height, candidate, staff);
    const fill = classifyNoteheadFill(originalImage.binary, originalImage.width, originalImage.height, candidate);
    const beam = detectBeamOrFlag(binary, width, height, staff, stem);
    const dotted = detectDot(binary, width, height, candidate, staff);
    const rawAccidental = hasVerticalBarrier(binary, width, height, candidate, staff)
      ? null
      : detectAccidental(binary, width, height, candidate, staff);
    const accidental =
      rawAccidental &&
      (
        (stem.direction === "none" && fill.fillKind === "uncertain" && candidate.roundness < 0.55) ||
        (candidate.width <= Math.max(4, Math.round(staff.averageSpacing * 0.32)) && candidate.roundness < 0.6)
      )
        ? null
        : rawAccidental;
    let duration: DurationValue;

    if (stem.direction !== "none") {
      if (beam.present && stem.confidence >= 0.42 && fill.fillKind !== "open") {
        duration = "eighth";
      } else if (fill.fillKind === "open" && stem.confidence >= 0.28) {
        duration = "half";
      } else if (stem.confidence < 0.24 && fill.fillKind !== "filled" && candidate.roundness < 0.72) {
        duration = "whole";
      } else {
        duration = "quarter";
      }
    } else if (
      fill.fillKind === "filled" &&
      candidate.confidence >= 0.76 &&
      candidate.roundness >= 0.56 &&
      candidate.coreWidth >= Math.max(5, Math.round(staff.averageSpacing * 0.28))
    ) {
      duration = "quarter";
    } else if (
      fill.fillKind === "open" &&
      candidate.confidence >= 0.62 &&
      candidate.roundness >= 0.58
    ) {
      duration = "half";
    } else {
      duration = "whole";
    }

    return {
      ...candidate,
      pitchStep: stepFromBottomLine,
      baseNumberedToken: baseToken,
      measureIndex: -1,
      accidentalSource: accidental ? "detected" : "none",
      durationSource: "detected",
      stemDirection: stem.direction,
      stemSide: stem.side,
      stemLength: stem.length,
      stemConfidence: stem.confidence,
      duration,
      dotted,
      accidental,
      fillKind: fill.fillKind,
      fillRatio: fill.fillRatio,
      hasBeamOrFlag: beam.present,
      beamSignal: beam.signal,
      numberedToken: formatNumberedPreviewToken(baseToken, duration, dotted, accidental),
    };
  });
}

function estimateSpacingConfidence(noteheads: AnalyzedNotehead[]) {
  const staffGroups = new Map<string, AnalyzedNotehead[]>();
  for (const notehead of noteheads) {
    const key = `${notehead.pageNumber}:${notehead.staffIndex}`;
    const current = staffGroups.get(key) ?? [];
    current.push(notehead);
    staffGroups.set(key, current);
  }

  const staffScores = [...staffGroups.values()].map((group) => {
    const sorted = [...group].sort((left, right) => left.x - right.x || left.y - right.y);
    if (sorted.length < 4) {
      return sorted.length >= 2 ? 0.55 : 0;
    }

    const gaps = sorted
      .slice(1)
      .map((candidate, index) => candidate.x - sorted[index].x)
      .filter((gap) => gap > 0);

    if (gaps.length < 2) {
      return 0.5;
    }

    const avgGap = average(gaps);
    const normalizedDeviation = average(gaps.map((gap) => Math.abs(gap - avgGap) / Math.max(1, avgGap)));
    return Math.max(0, 1 - Math.min(1, normalizedDeviation * 1.6));
  });

  if (staffScores.length === 0) {
    return 0;
  }

  return Number(average(staffScores).toFixed(3));
}

function computePromotionScore(noteheads: AnalyzedNotehead[], averageConfidence: number, spacingConfidence: number) {
  if (noteheads.length === 0) {
    return 0;
  }

  const stemRatio = noteheads.filter((candidate) => candidate.stemDirection !== "none").length / noteheads.length;
  const certaintyRatio = noteheads.filter((candidate) => candidate.fillKind !== "uncertain").length / noteheads.length;
  const shapeQuality = average(noteheads.map((candidate) => candidate.roundness));
  const score =
    averageConfidence * 0.38 +
    Math.min(1, noteheads.length / 8) * 0.16 +
    stemRatio * 0.16 +
    certaintyRatio * 0.14 +
    spacingConfidence * 0.1 +
    shapeQuality * 0.06;

  return Number(score.toFixed(3));
}

function isLikelyFragmentNoise(candidate: AnalyzedNotehead, staff: StaffGroup) {
  const spacing = staff.averageSpacing;
  const structurallyWeak = candidate.stemDirection === "none" && candidate.fillKind === "uncertain";
  const verySmallCore = candidate.coreArea < Math.max(12, Math.round(spacing * spacing * 0.08));
  const accidentalLikeOnly = candidate.accidental !== null && candidate.stemDirection === "none" && candidate.fillKind !== "filled";
  const suspiciousDuration = candidate.duration === "whole" && candidate.confidence < 0.58 && candidate.roundness < 0.56;
  const textLikeFragment =
    candidate.width <= Math.max(4, Math.round(spacing * 0.28)) &&
    candidate.height >= Math.max(8, Math.round(spacing * 0.78)) &&
    candidate.roundness < 0.64;
  const weakTinyQuarter =
    candidate.duration === "quarter" &&
    candidate.stemDirection === "none" &&
    candidate.confidence < 0.68 &&
    candidate.coreWidth <= Math.max(5, Math.round(spacing * 0.3));

  return (
    candidate.confidence < 0.62 &&
    (
      (structurallyWeak && verySmallCore) ||
      accidentalLikeOnly ||
      suspiciousDuration ||
      textLikeFragment ||
      weakTinyQuarter
    )
  );
}

function withSequenceOverrides(
  candidate: AnalyzedNotehead,
  overrides: Partial<
    Pick<
      AnalyzedNotehead,
      "pitchStep" | "duration" | "accidental" | "dotted" | "measureIndex" | "accidentalSource" | "durationSource"
    >
  >,
) {
  const pitchStep = overrides.pitchStep ?? candidate.pitchStep;
  const duration = overrides.duration ?? candidate.duration;
  const accidental = Object.prototype.hasOwnProperty.call(overrides, "accidental")
    ? overrides.accidental ?? null
    : candidate.accidental;
  const dotted = overrides.dotted ?? candidate.dotted;
  const baseNumberedToken = buildNumberedTokenFromTreble(pitchStep);

  return {
    ...candidate,
    pitchStep,
    duration,
    accidental,
    dotted,
    measureIndex: overrides.measureIndex ?? candidate.measureIndex,
    accidentalSource: overrides.accidentalSource ?? (accidental ? candidate.accidentalSource : "none"),
    durationSource: overrides.durationSource ?? candidate.durationSource,
    baseNumberedToken,
    numberedToken: formatNumberedPreviewToken(baseNumberedToken, duration, dotted, accidental),
  };
}

function smoothPitchOutliers(noteheads: AnalyzedNotehead[]) {
  const smoothed = [...noteheads];

  for (let index = 1; index < smoothed.length - 1; index += 1) {
    const previous = smoothed[index - 1];
    const current = smoothed[index];
    const next = smoothed[index + 1];
    const neighborGap = Math.abs(previous.pitchStep - next.pitchStep);
    const currentLeap = Math.min(
      Math.abs(current.pitchStep - previous.pitchStep),
      Math.abs(current.pitchStep - next.pitchStep),
    );

    if (neighborGap <= 2 && currentLeap >= 5 && current.confidence < 0.74) {
      const targetPitch = Math.round((previous.pitchStep + next.pitchStep) / 2);
      smoothed[index] = withSequenceOverrides(current, {
        pitchStep: targetPitch,
        accidental:
          current.accidental !== null && current.stemConfidence < 0.48 && current.fillKind === "uncertain"
            ? null
            : current.accidental,
      });
    }
  }

  return smoothed;
}

function smoothDurationOutliers(noteheads: AnalyzedNotehead[]) {
  const smoothed = [...noteheads];

  for (let index = 0; index < smoothed.length; index += 1) {
    const current = smoothed[index];
    const previous = smoothed[index - 1];
    const next = smoothed[index + 1];

    if (current.duration === "eighth" && !current.hasBeamOrFlag && current.stemConfidence < 0.42) {
      smoothed[index] = withSequenceOverrides(current, { duration: "quarter" });
      continue;
    }

    if (!previous || !next) {
      continue;
    }

    const lowDurationConfidence =
      current.stemConfidence < 0.32 ||
      (current.duration === "whole" && current.fillKind !== "open") ||
      (current.duration === "half" && current.fillKind === "filled");
    if (!lowDurationConfidence || previous.duration !== next.duration || previous.duration === current.duration) {
      continue;
    }

    smoothed[index] = withSequenceOverrides(current, {
      duration: previous.duration,
      dotted: current.dotted && previous.duration !== "whole" ? current.dotted : false,
    });
  }

  return smoothed;
}

function applyMeasureContextToStaff(
  noteheads: AnalyzedNotehead[],
  staff: StaffGroup,
  context: StaffMeasureContext,
) {
  const sorted = [...noteheads].sort((left, right) => left.x - right.x || left.y - right.y);
  const adjusted = sorted.map((candidate) =>
    withSequenceOverrides(candidate, {
      measureIndex: locateMeasureIndex(candidate.x, context.measureBoundaries),
    }),
  );
  const restCountsByMeasure = new Map<number, number>();

  for (const column of context.restColumns) {
    const measureIndex = locateMeasureIndex(column, context.measureBoundaries);
    restCountsByMeasure.set(measureIndex, (restCountsByMeasure.get(measureIndex) ?? 0) + 1);
  }

  const notesByMeasure = new Map<number, AnalyzedNotehead[]>();
  for (const candidate of adjusted) {
    const current = notesByMeasure.get(candidate.measureIndex) ?? [];
    current.push(candidate);
    notesByMeasure.set(candidate.measureIndex, current);
  }

  for (const [measureIndex, group] of notesByMeasure.entries()) {
    const accidentalState = new Map<number, "#" | "b">();
    const restCount = restCountsByMeasure.get(measureIndex) ?? 0;
    const symbolCount = group.length + restCount;

    for (let index = 0; index < group.length; index += 1) {
      const candidate = group[index];
      const currentIndex = adjusted.findIndex(
        (item) => item.pageNumber === candidate.pageNumber && item.staffIndex === candidate.staffIndex && item.x === candidate.x && item.y === candidate.y,
      );
      if (currentIndex < 0) {
        continue;
      }

      if (candidate.accidental !== null && candidate.confidence >= 0.56) {
        accidentalState.set(candidate.pitchStep, candidate.accidental);
      } else {
        const carried = accidentalState.get(candidate.pitchStep);
        if (carried && candidate.confidence < 0.82 && candidate.fillKind !== "uncertain") {
          adjusted[currentIndex] = withSequenceOverrides(candidate, {
            accidental: carried,
            accidentalSource: "measureCarry",
          });
        }
      }

      const current = adjusted[currentIndex];
      let nextDuration = current.duration;
      if (symbolCount >= 4) {
        if (current.duration === "whole" && current.confidence < 0.82) {
          nextDuration = current.stemDirection !== "none" ? "quarter" : "half";
        } else if (current.duration === "half" && current.fillKind === "filled" && current.confidence < 0.84) {
          nextDuration = "quarter";
        }
      } else if (symbolCount >= 3 && current.duration === "whole" && current.fillKind !== "open" && current.confidence < 0.76) {
        nextDuration = current.stemDirection !== "none" ? "quarter" : "half";
      }

      if (nextDuration !== current.duration) {
        adjusted[currentIndex] = withSequenceOverrides(current, {
          duration: nextDuration,
          durationSource: "measureContext",
          dotted: nextDuration === "whole" ? false : current.dotted,
        });
      }
    }
  }

  return adjusted.sort((left, right) => left.x - right.x || left.y - right.y);
}

function meetsPromotionThreshold(preview: {
  tokens: string[];
  noteheads: AnalyzedNotehead[];
  averageConfidence: number;
  stemmedCount: number;
  certaintyCount: number;
  spacingConfidence: number;
  promotionScore: number;
}, minimumNotes: number) {
  return (
    preview.tokens.length >= minimumNotes &&
    preview.averageConfidence >= 0.48 &&
    preview.stemmedCount >= Math.max(1, Math.min(2, minimumNotes - 2)) &&
    preview.certaintyCount >= Math.max(2, Math.ceil(preview.noteheads.length * 0.45)) &&
    preview.spacingConfidence >= 0.05 &&
    preview.promotionScore >= (minimumNotes >= 5 ? 0.62 : 0.58)
  );
}

function buildPreviewMetrics(noteheads: AnalyzedNotehead[]) {
  const tokens = noteheads.map((candidate) => candidate.numberedToken);
  const durationCounts: Record<DurationValue, number> = {
    eighth: 0,
    quarter: 0,
    half: 0,
    whole: 0,
  };

  for (const candidate of noteheads) {
    durationCounts[candidate.duration] += 1;
  }

  const averageConfidence = noteheads.length
    ? Number((noteheads.reduce((sum, candidate) => sum + candidate.confidence, 0) / noteheads.length).toFixed(3))
    : 0;
  const spacingConfidence = estimateSpacingConfidence(noteheads);
  const promotionScore = computePromotionScore(noteheads, averageConfidence, spacingConfidence);

  return {
    tokens,
    durationCounts,
    averageConfidence,
    spacingConfidence,
    promotionScore,
    dottedCount: noteheads.filter((candidate) => candidate.dotted).length,
    accidentalCount: noteheads.filter((candidate) => candidate.accidental !== null).length,
    beamCount: noteheads.filter((candidate) => candidate.hasBeamOrFlag).length,
    stemmedCount: noteheads.filter((candidate) => candidate.stemDirection !== "none").length,
    certaintyCount: noteheads.filter((candidate) => candidate.fillKind !== "uncertain").length,
  };
}

function smoothStaffSequence(noteheads: AnalyzedNotehead[], staff: StaffGroup) {
  const sorted = [...noteheads].sort((left, right) => left.x - right.x || left.y - right.y);
  const minGap = Math.max(5, Math.round(staff.averageSpacing * 0.48));
  const kept: AnalyzedNotehead[] = [];

  function score(candidate: AnalyzedNotehead) {
    return (
      candidate.confidence * 0.45 +
      candidate.stemConfidence * 0.15 +
      (candidate.fillKind === "uncertain" ? 0 : 0.16) +
      candidate.roundness * 0.14 +
      (candidate.hasBeamOrFlag ? 0.05 : 0) +
      (candidate.accidental !== null ? 0.03 : 0) +
      (candidate.dotted ? 0.02 : 0)
    );
  }

  for (const candidate of sorted) {
    if (isLikelyFragmentNoise(candidate, staff)) {
      continue;
    }

    const previous = kept[kept.length - 1];
    if (!previous) {
      kept.push(candidate);
      continue;
    }

    const gap = candidate.x - previous.x;
    if (gap <= minGap) {
      if (score(candidate) > score(previous)) {
        kept[kept.length - 1] = candidate;
      }
      continue;
    }

    kept.push(candidate);
  }

  return smoothDurationOutliers(smoothPitchOutliers(kept));
}

function buildOmrPreviewFromDiagnostics(
  diagnostics: OmrDiagnostics,
  pngBuffer: Buffer,
  analyzedNoteheads: AnalyzedNotehead[],
  pageNumber: number,
): OmrPitchPreview {
  const originalImage = buildBinaryImage(pngBuffer);
  const suppressedImage = buildStaffSuppressedBinary(pngBuffer, diagnostics);
  const filtered = analyzedNoteheads.filter(
    (candidate) =>
      candidate.confidence >= 0.5 &&
      candidate.roundness >= 0.42 &&
      !(
        candidate.stemDirection === "none" &&
        candidate.fillKind === "uncertain" &&
        candidate.accidental !== null
      ),
  );

  const byStaff = new Map<number, AnalyzedNotehead[]>();
  for (const candidate of filtered) {
    const group = byStaff.get(candidate.staffIndex) ?? [];
    group.push(candidate);
    byStaff.set(candidate.staffIndex, group);
  }

  const staffSummaries: StaffPreviewSummary[] = [];
  const selectedNoteheads: AnalyzedNotehead[] = [];
  const fallbackNoteheads: AnalyzedNotehead[] = [];
  let totalRestCount = 0;
  let totalBarlineCount = 0;
  let totalMeasureCount = 0;

  diagnostics.staffGroups.forEach((staff, staffIndex) => {
    const group = byStaff.get(staffIndex) ?? [];
    const smoothed = smoothStaffSequence(group, staff);
    const barlineColumns = detectBarlinesForStaff(originalImage.binary, originalImage.width, originalImage.height, staff, smoothed);
    const measureBoundaries = buildMeasureBoundaries(originalImage.width, staff, barlineColumns);
    const restColumns = detectRestColumnsForStaff(
      originalImage.binary,
      suppressedImage.binary,
      originalImage.width,
      originalImage.height,
      staff,
      smoothed,
      barlineColumns,
    );
    const context: StaffMeasureContext = {
      staffIndex,
      barlineColumns,
      measureBoundaries,
      restColumns,
    };
    const contextualized = applyMeasureContextToStaff(smoothed, staff, context);
    const metrics = buildPreviewMetrics(contextualized);
    const eligible = meetsPromotionThreshold(
      {
        ...metrics,
        noteheads: contextualized,
      },
      3,
    );

    staffSummaries.push({
      staffIndex,
      noteCount: contextualized.length,
      restCount: restColumns.length,
      barlineCount: barlineColumns.length,
      measureCount: Math.max(1, measureBoundaries.length - 1),
      averageConfidence: metrics.averageConfidence,
      spacingConfidence: metrics.spacingConfidence,
      promotionScore: metrics.promotionScore,
      eligible,
    });

    totalRestCount += restColumns.length;
    totalBarlineCount += barlineColumns.length;
    totalMeasureCount += Math.max(1, measureBoundaries.length - 1);
    fallbackNoteheads.push(...contextualized);
    if (eligible) {
      selectedNoteheads.push(...contextualized);
    }
  });

  const finalNoteheads = selectedNoteheads.length > 0 ? selectedNoteheads : fallbackNoteheads;
  const sorted = [...finalNoteheads].sort((left, right) => left.staffIndex - right.staffIndex || left.x - right.x || left.y - right.y);
  const metrics = buildPreviewMetrics(sorted);
  const eligible = selectedNoteheads.length > 0 && meetsPromotionThreshold({ ...metrics, noteheads: sorted }, 5);

  return {
    tokens: metrics.tokens,
    groupedLines: groupTokens(metrics.tokens, 10),
    noteheads: sorted,
    pageCount: 1,
    staffGroupCount: diagnostics.staffGroups.length,
    restCount: totalRestCount,
    barlineCount: totalBarlineCount,
    measureCount: totalMeasureCount,
    averageConfidence: metrics.averageConfidence,
    durationCounts: metrics.durationCounts,
    dottedCount: metrics.dottedCount,
    accidentalCount: metrics.accidentalCount,
    beamCount: metrics.beamCount,
    stemmedCount: metrics.stemmedCount,
    certaintyCount: metrics.certaintyCount,
    spacingConfidence: metrics.spacingConfidence,
    promotionScore: metrics.promotionScore,
    eligible,
    selectedPageCount: eligible ? 1 : 0,
    diagnosticOnlyPageCount: eligible ? 0 : 1,
    staffSummaries,
    pageSummaries: [
      {
        pageNumber,
        noteCount: sorted.length,
        restCount: totalRestCount,
        averageConfidence: metrics.averageConfidence,
        spacingConfidence: metrics.spacingConfidence,
        promotionScore: metrics.promotionScore,
        eligible,
        selectedStaffCount: staffSummaries.filter((summary) => summary.eligible).length,
        diagnosticOnlyStaffCount: staffSummaries.filter((summary) => !summary.eligible).length,
      },
    ],
  };
}

function combinePagePreviews(pagePreviews: OmrPitchPreview[]) {
  const eligiblePages = pagePreviews.filter((preview) => preview.eligible);
  const selectedPreviews = eligiblePages.length > 0 ? eligiblePages : pagePreviews;
  const sortedNoteheads = selectedPreviews
    .flatMap((preview) => preview.noteheads)
    .sort(
      (left, right) =>
        left.pageNumber - right.pageNumber ||
        left.staffIndex - right.staffIndex ||
        left.x - right.x ||
        left.y - right.y,
    );
  const metrics = buildPreviewMetrics(sortedNoteheads);
  const eligible = eligiblePages.length > 0 && meetsPromotionThreshold({ ...metrics, noteheads: sortedNoteheads }, 5);

  return {
    tokens: metrics.tokens,
    groupedLines: groupTokens(metrics.tokens, 10),
    noteheads: sortedNoteheads,
    pageCount: pagePreviews.length,
    staffGroupCount: pagePreviews.reduce((sum, preview) => sum + preview.staffGroupCount, 0),
    restCount: selectedPreviews.reduce((sum, preview) => sum + preview.restCount, 0),
    barlineCount: selectedPreviews.reduce((sum, preview) => sum + preview.barlineCount, 0),
    measureCount: selectedPreviews.reduce((sum, preview) => sum + preview.measureCount, 0),
    averageConfidence: metrics.averageConfidence,
    durationCounts: metrics.durationCounts,
    dottedCount: metrics.dottedCount,
    accidentalCount: metrics.accidentalCount,
    beamCount: metrics.beamCount,
    stemmedCount: metrics.stemmedCount,
    certaintyCount: metrics.certaintyCount,
    spacingConfidence: metrics.spacingConfidence,
    promotionScore: metrics.promotionScore,
    eligible,
    selectedPageCount: selectedPreviews.length,
    diagnosticOnlyPageCount: pagePreviews.length - selectedPreviews.length,
    staffSummaries: pagePreviews.flatMap((preview) => preview.staffSummaries),
    pageSummaries: pagePreviews.flatMap((preview) => preview.pageSummaries),
  } satisfies OmrPitchPreview;
}

async function buildResultPdf(params: {
  title: string;
  subtitle: string;
  lines: string[];
  footer?: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(params.title, {
    x: 48,
    y: 780,
    size: 24,
    font: bold,
    color: rgb(0.07, 0.13, 0.18),
  });

  page.drawText(params.subtitle, {
    x: 48,
    y: 752,
    size: 12,
    font,
    color: rgb(0.32, 0.38, 0.45),
  });

  let currentY = 710;
  for (const line of params.lines) {
    page.drawText(line, {
      x: 48,
      y: currentY,
      size: 16,
      font,
      color: rgb(0.08, 0.12, 0.18),
      maxWidth: 500,
    });
    currentY -= 26;
    if (currentY < 80) {
      break;
    }
  }

  if (params.footer) {
    page.drawText(params.footer, {
      x: 48,
      y: 48,
      size: 10,
      font,
      color: rgb(0.42, 0.47, 0.53),
      maxWidth: 500,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

async function processStaffPdfJob(job: JobRow, inputFile: FileRow) {
  const rawText = await extractPdfText(inputFile.storage_path);
  const notation = deriveNumberedNotation(rawText);
  const jobDir = path.join(workerConfig.storageDir, job.user_id, "jobs", job.id);
  fs.mkdirSync(jobDir, { recursive: true });

  if (notation.tokens.length >= 8) {
    const previewText = notation.groupedLines.slice(0, 6).join(NEWLINE);
    const pdfBuffer = await buildResultPdf({
      title: "Numbered notation result",
      subtitle: `Generated from ${inputFile.original_name}`,
      lines: notation.groupedLines,
      footer: "Module 5A heuristic result: extracted note tokens from PDF text and rendered numbered notation.",
    });
    const outputPath = path.join(jobDir, `${sanitizeFilename(inputFile.original_name.replace(/\.pdf$/i, ""))}-numbered.pdf`);
    fs.writeFileSync(outputPath, pdfBuffer);
    const outputFileId = insertStoredFile({
      userId: job.user_id,
      originalName: path.basename(outputPath),
      storagePath: outputPath,
      mimeType: "application/pdf",
      fileKind: "output_pdf",
    });

    markCompleted({
      jobId: job.id,
      resultKind: "final",
      outputFileId,
      previewText,
    });
    console.log(`[worker] job ${job.id} completed with final output`);
    return;
  }

  const screenshots = await renderPagePngs(inputFile.storage_path);
  const pageAnalyses = screenshots.map((screenshot) => {
    const diagnostics = detectStaffDiagnostics(screenshot.buffer);
    const noteheads = detectNoteheadsFromDiagnostics(screenshot.buffer, diagnostics, screenshot.pageNumber);
    const analyzed = analyzeNoteheads(diagnostics, screenshot.buffer, noteheads);
    const preview = buildOmrPreviewFromDiagnostics(diagnostics, screenshot.buffer, analyzed, screenshot.pageNumber);

    return {
      screenshot,
      diagnostics,
      noteheads,
      analyzed,
      preview,
    };
  });
  const pagePreviews = pageAnalyses
    .map((analysis) => analysis.preview)
    .filter((preview) => preview.noteheads.length > 0 || preview.staffGroupCount > 0);
  const diagnostics = pageAnalyses[0]?.diagnostics ?? null;
  const analyzedNoteheads = pageAnalyses.flatMap((analysis) => analysis.analyzed);
  const omrPreview =
    pagePreviews.length
      ? combinePagePreviews(pagePreviews)
      : diagnostics && screenshots[0]
        ? buildOmrPreviewFromDiagnostics(diagnostics, screenshots[0].buffer, analyzedNoteheads, screenshots[0].pageNumber)
        : null;

  if (
    pageAnalyses.length > 0 &&
    omrPreview &&
    omrPreview.staffGroupCount >= 1 &&
    omrPreview.eligible
  ) {
    const previewText = [
      `OMR final | pages: ${omrPreview.pageCount} | selected pages: ${omrPreview.selectedPageCount} | staff groups: ${omrPreview.staffGroupCount} | notes: ${omrPreview.noteheads.length} | avg confidence: ${omrPreview.averageConfidence} | promotion: ${omrPreview.promotionScore}`,
      `Durations e:${omrPreview.durationCounts.eighth} q:${omrPreview.durationCounts.quarter} h:${omrPreview.durationCounts.half} w:${omrPreview.durationCounts.whole}`,
      `Symbols dots:${omrPreview.dottedCount} accidentals:${omrPreview.accidentalCount} rests:${omrPreview.restCount} bars:${omrPreview.barlineCount} | spacing:${omrPreview.spacingConfidence}`,
      ...omrPreview.groupedLines.slice(0, 4),
    ].join(NEWLINE);
    const pdfBuffer = await buildResultPdf({
      title: "Numbered notation OMR preview",
      subtitle: `Treble-clef heuristic generated from ${inputFile.original_name}`,
      lines: [
        ...omrPreview.groupedLines,
        "",
        `Processed pages: ${omrPreview.pageCount} | selected pages: ${omrPreview.selectedPageCount} | diagnostic-only pages: ${omrPreview.diagnosticOnlyPageCount}`,
        `Detected staff groups: ${omrPreview.staffGroupCount} | selected staff groups: ${omrPreview.staffSummaries.filter((summary) => summary.eligible).length}`,
        `Detected noteheads: ${omrPreview.noteheads.length}`,
        `Average confidence: ${omrPreview.averageConfidence}`,
        `Promotion score: ${omrPreview.promotionScore} | spacing confidence: ${omrPreview.spacingConfidence}`,
        `Durations -> eighth: ${omrPreview.durationCounts.eighth}, quarter: ${omrPreview.durationCounts.quarter}, half: ${omrPreview.durationCounts.half}, whole: ${omrPreview.durationCounts.whole}`,
        `Symbols -> dots: ${omrPreview.dottedCount}, accidentals: ${omrPreview.accidentalCount}, rests: ${omrPreview.restCount}, barlines: ${omrPreview.barlineCount}, flags/beams: ${omrPreview.beamCount}`,
      ],
      footer: "Module 5E prototype: page/staff confidence layering, measure-context smoothing, and stronger barline/rest-aware accidental and duration stabilization were strong enough to produce a numbered preview.",
    });
    const outputPath = path.join(jobDir, `${sanitizeFilename(inputFile.original_name.replace(/\.pdf$/i, ""))}-numbered-omr.pdf`);
    fs.writeFileSync(outputPath, pdfBuffer);
    const outputFileId = insertStoredFile({
      userId: job.user_id,
      originalName: path.basename(outputPath),
      storagePath: outputPath,
      mimeType: "application/pdf",
      fileKind: "output_pdf",
    });

    markCompleted({
      jobId: job.id,
      resultKind: "final",
      outputFileId,
      previewText,
    });
    console.log(`[worker] job ${job.id} completed with OMR final preview`);
    return;
  }

  const previewText = omrPreview
    ? `OMR draft | pages: ${omrPreview.pageCount} | selected pages: ${omrPreview.selectedPageCount} | staff groups: ${omrPreview.staffGroupCount} | noteheads: ${omrPreview.noteheads.length} | rests: ${omrPreview.restCount} | bars: ${omrPreview.barlineCount} | avg confidence: ${omrPreview.averageConfidence} | promotion: ${omrPreview.promotionScore} | durations e:${omrPreview.durationCounts.eighth} q:${omrPreview.durationCounts.quarter} h:${omrPreview.durationCounts.half} w:${omrPreview.durationCounts.whole}`
    : diagnostics
      ? `OMR draft | staff groups: ${diagnostics.staffGroups.length} | candidate lines: ${diagnostics.lineCenters.length}`
      : rawText
        ? rawText.slice(0, 600)
        : "No parseable text or screenshot diagnostics available.";

  const draftLines = [
    "This PDF could not be converted into a confident final numbered-notation result.",
    "",
    "A draft bundle has been generated for manual review.",
    "",
    `Detected note tokens from text layer: ${notation.tokens.length}`,
    `Processed screenshot pages: ${screenshots.length}`,
    diagnostics
      ? `Detected staff groups from image preprocessing: ${diagnostics.staffGroups.length}`
      : "Detected staff groups from image preprocessing: unavailable",
    omrPreview
      ? `Detected notehead candidates: ${omrPreview.noteheads.length} (avg confidence ${omrPreview.averageConfidence})`
      : "Detected notehead candidates: unavailable",
    omrPreview
      ? `Stem detections: ${omrPreview.stemmedCount}`
      : "Stem detections: unavailable",
    omrPreview
      ? `Dotted detections: ${omrPreview.noteheads.filter((notehead) => notehead.dotted).length}`
      : "Dotted detections: unavailable",
    omrPreview
      ? `Duration summary: eighth ${omrPreview.durationCounts.eighth}, quarter ${omrPreview.durationCounts.quarter}, half ${omrPreview.durationCounts.half}, whole ${omrPreview.durationCounts.whole}`
      : "Duration summary: unavailable",
    omrPreview
      ? `Accidental detections: ${omrPreview.accidentalCount} | rest detections: ${omrPreview.restCount} | barlines: ${omrPreview.barlineCount} | beam/flag detections: ${omrPreview.beamCount}`
      : "Accidental/rest detections: unavailable",
    omrPreview
      ? `Promotion score: ${omrPreview.promotionScore} | spacing confidence: ${omrPreview.spacingConfidence} | certain noteheads: ${omrPreview.certaintyCount}`
      : "Promotion score: unavailable",
    diagnostics && diagnostics.staffGroups[0]
      ? `First staff candidate columns: ${diagnostics.staffGroups[0].noteCandidateColumns.slice(0, 12).join(", ") || "none"}`
      : "First staff candidate columns: unavailable",
    pageAnalyses.length
      ? `Per-page staff groups: ${pageAnalyses.map((analysis) => `p${analysis.screenshot.pageNumber}:${analysis.diagnostics.staffGroups.length}`).join(", ")}`
      : "Per-page staff groups: unavailable",
    omrPreview && omrPreview.pageSummaries.length
      ? `Page selection: ${omrPreview.pageSummaries.map((summary) => `p${summary.pageNumber}:${summary.eligible ? "selected" : "draft-only"}`).join(", ")}`
      : "Page selection: unavailable",
    omrPreview && omrPreview.staffSummaries.length
      ? `Staff selection: ${omrPreview.staffSummaries.map((summary) => `s${summary.staffIndex}:${summary.eligible ? "selected" : "draft-only"}`).join(", ")}`
      : "Staff selection: unavailable",
    omrPreview && omrPreview.tokens.length
      ? `Heuristic numbered preview: ${omrPreview.groupedLines.slice(0, 2).join(" | ")}`
      : "Heuristic numbered preview: unavailable",
    rawText ? `Extracted text preview: ${rawText.slice(0, 220)}` : "Extracted text preview: none",
  ];
  const draftPdfBuffer = await buildResultPdf({
    title: "Numbered notation draft",
    subtitle: `Manual correction required for ${inputFile.original_name}`,
    lines: draftLines,
    footer: "Module 5E prototype: screenshot diagnostics plus page/staff confidence layering, measure-context smoothing, and stronger barline/rest-aware accidental and duration heuristics are attached for manual review.",
  });
  const draftPdfPath = path.join(jobDir, `${sanitizeFilename(inputFile.original_name.replace(/\.pdf$/i, ""))}-draft.pdf`);
  fs.writeFileSync(draftPdfPath, draftPdfBuffer);
  const outputFileId = insertStoredFile({
    userId: job.user_id,
    originalName: path.basename(draftPdfPath),
    storagePath: draftPdfPath,
    mimeType: "application/pdf",
    fileKind: "output_pdf",
  });

  const zip = new AdmZip();
  zip.addFile("draft.txt", Buffer.from(draftLines.join(NEWLINE), "utf-8"));
  zip.addFile(
    "draft.json",
    Buffer.from(
      JSON.stringify(
        {
          jobId: job.id,
          inputFile: inputFile.original_name,
          extractedTextPreview: rawText.slice(0, 1000),
          noteTokens: notation.tokens,
          omrDiagnostics: diagnostics,
          omrPages: pageAnalyses.map((analysis) => ({
            pageNumber: analysis.screenshot.pageNumber,
            diagnostics: analysis.diagnostics,
            omrPitchPreview: analysis.preview,
            analyzedNoteheads: analysis.analyzed,
          })),
          omrPitchPreview: omrPreview,
          analyzedNoteheads: analyzedNoteheads,
          recommendation: "Review the diagnostics and correct the draft numbered notation. Module 5E adds page/staff confidence layering, multi-page aggregation, fragment filtering, sequence smoothing, and stronger barline/rest-aware accidental and duration stabilization while later modules can improve delivery and editing.",
        },
        null,
        2,
      ),
      "utf-8",
    ),
  );
  for (const screenshot of screenshots) {
    zip.addFile(`page-${screenshot.pageNumber}.png`, screenshot.buffer);
  }
  const draftBundlePath = path.join(jobDir, `${sanitizeFilename(inputFile.original_name.replace(/\.pdf$/i, ""))}-draft-bundle.zip`);
  zip.writeZip(draftBundlePath);
  const draftBundleFileId = insertStoredFile({
    userId: job.user_id,
    originalName: path.basename(draftBundlePath),
    storagePath: draftBundlePath,
    mimeType: "application/zip",
    fileKind: "draft_bundle",
  });

  markCompleted({
    jobId: job.id,
    resultKind: "draft",
    outputFileId,
    draftBundleFileId,
    previewText,
  });
  console.log(`[worker] job ${job.id} completed with draft bundle`);
}

let busy = false;

async function tick() {
  if (busy) {
    return;
  }

  const job = nextQueuedJob();
  if (!job) {
    return;
  }

  busy = true;
  markProcessing(job.id);
  console.log(`[worker] processing job ${job.id} (${job.direction})`);

  try {
    await new Promise((resolve) => setTimeout(resolve, workerConfig.processingDelayMs));

    if (job.direction !== "staff_pdf_to_numbered") {
      markFailed(job.id, "Module 5 currently implements only staff PDF -> numbered notation.");
      return;
    }

    const inputFile = findInputFile(job.input_file_id);
    if (!inputFile || !fs.existsSync(inputFile.storage_path)) {
      markFailed(job.id, "Input file is missing for this job.");
      return;
    }

    await processStaffPdfJob(job, inputFile);
  } catch (error) {
    markFailed(job.id, error instanceof Error ? error.message : "Worker failed to process the job.");
  } finally {
    busy = false;
  }
}

setInterval(() => {
  void tick();
}, workerConfig.pollIntervalMs);
