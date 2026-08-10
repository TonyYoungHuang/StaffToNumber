import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import type { ScoreJson, ScoreRecognitionPage, ScoreRecognitionSymbol } from "@score/shared";

type XmlRecord = Record<string, unknown>;

export function applyAudiverisOmrDiagnostics(scoreJson: ScoreJson, omrPath: string): ScoreJson {
  const zip = new AdmZip(omrPath);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", parseAttributeValue: true });
  const bookEntry = zip.getEntry("book.xml");
  const book = bookEntry ? (parser.parse(zip.readAsText(bookEntry)) as XmlRecord) : {};
  const engineVersion = asRecord(book.book)?.["software-version"];
  const symbols: ScoreRecognitionSymbol[] = [];
  const pages: ScoreRecognitionPage[] = [];
  const pageImageDimensions = new Map<number, { width: number; height: number }>();
  const partOffsets = new Map<string, number>();
  const scorePartByLogicalId = new Map(scoreJson.parts.map((part, index) => [String(index + 1), part.id]));

  for (const entry of zip.getEntries()) {
    const match = /^sheet#(\d+)\/BINARY\.png$/i.exec(entry.entryName);
    if (!match) continue;
    const buffer = zip.readFile(entry);
    const dimensions = buffer ? readPngDimensions(buffer) : null;
    if (dimensions) pageImageDimensions.set(Number(match[1]), dimensions);
  }

  const sheetEntries = zip
    .getEntries()
    .filter((entry) => /^sheet#\d+\/sheet#\d+\.xml$/i.test(entry.entryName))
    .sort((left, right) => left.entryName.localeCompare(right.entryName, undefined, { numeric: true }));

  sheetEntries.forEach((entry, pageIndex) => {
    const pageNumber = Number(/^sheet#(\d+)\//i.exec(entry.entryName)?.[1] ?? pageIndex + 1);
    const parsed = parser.parse(zip.readAsText(entry)) as XmlRecord;
    const sheet = asRecord(parsed.sheet);
    const page = asRecord(sheet?.page);
    const picture = asRecord(sheet?.picture);
    const systems = asArray(page?.system).map(asRecord).filter(Boolean) as XmlRecord[];
    let pageMaxX = 0;
    let pageMaxY = 0;
    for (const system of systems) {
      const stacks = asArray(system.stack).map(asRecord).filter(Boolean) as XmlRecord[];
      const parts = asArray(system.part).map(asRecord).filter(Boolean) as XmlRecord[];
      const staffToPart = new Map<string, string>();
      for (const part of parts) {
        const logicalId = String(part.id ?? parts.indexOf(part) + 1);
        for (const staff of asArray(part.staff).map(asRecord).filter(Boolean) as XmlRecord[]) {
          staffToPart.set(String(staff.id), logicalId);
        }
      }

      const interGroups = asRecord(asRecord(system.sig)?.inters) ?? {};
      for (const [kind, rawGroup] of Object.entries(interGroups)) {
        for (const inter of asArray(rawGroup).map(asRecord).filter(Boolean) as XmlRecord[]) {
          const bounds = asRecord(inter.bounds);
          if (!bounds || inter.id === undefined || (inter.grade === undefined && inter["ctx-grade"] === undefined)) continue;
          const x = numberValue(bounds.x);
          const y = numberValue(bounds.y);
          const width = numberValue(bounds.w);
          const height = numberValue(bounds.h);
          if ([x, y, width, height].some((value) => value === null)) continue;
          const grade = numberValue(inter.grade);
          const contextualGrade = numberValue(inter["ctx-grade"]);
          const confidence = contextualGrade ?? grade;
          pageMaxX = Math.max(pageMaxX, x! + width!);
          pageMaxY = Math.max(pageMaxY, y! + height!);
          const staffId = inter.staff === undefined ? null : String(inter.staff);
          const logicalPartId = staffId ? staffToPart.get(staffId) : undefined;
          const stackIndex = stacks.findIndex((stack) => x! + width! / 2 >= numberValue(stack.left)! && x! + width! / 2 <= numberValue(stack.right)!);
          const measureId = logicalPartId && stackIndex >= 0 ? findScoreMeasureId(scoreJson, scorePartByLogicalId.get(logicalPartId), (partOffsets.get(logicalPartId) ?? 0) + stackIndex) : undefined;
          symbols.push({
            id: `audiveris-p${pageNumber}-${inter.id}`,
            engineId: String(inter.id),
            shape: String(inter.shape ?? kind).toLowerCase().replaceAll("_", "-"),
            grade,
            contextualGrade,
            confidence,
            page: pageNumber,
            bbox: { x: x!, y: y!, width: width!, height: height! },
            measureId,
            issues: confidence !== null && confidence < 0.75 ? ["Low Audiveris symbol confidence"] : confidence !== null && confidence < 0.9 ? ["Audiveris symbol should be reviewed"] : [],
          });
        }
      }

      for (const part of parts) {
        const logicalId = String(part.id ?? parts.indexOf(part) + 1);
        partOffsets.set(logicalId, (partOffsets.get(logicalId) ?? 0) + stacks.length);
      }
    }

    const pageWidth = numberValue(picture?.width) ?? numberValue(page?.width) ?? pageMaxX;
    const pageHeight = numberValue(picture?.height) ?? numberValue(page?.height) ?? pageMaxY;
    if (pageWidth > 0 && pageHeight > 0) {
      const imageDimensions = pageImageDimensions.get(pageNumber);
      pages.push({
        page: pageNumber,
        width: pageWidth,
        height: pageHeight,
        ...(imageDimensions
          ? {
              imageWidth: imageDimensions.width,
              imageHeight: imageDimensions.height,
              imageTransform: {
                crop: { x: 0, y: 0, width: pageWidth, height: pageHeight },
                rotation: 0 as const,
              },
            }
          : {}),
      });
    }
  });

  const measures = scoreJson.measures.map((measure) => {
    const candidates = symbols
      .filter((symbol) => symbol.measureId === measure.id && (symbol.shape.includes("head") || symbol.shape.includes("rest")))
      .sort((left, right) => left.bbox.x - right.bbox.x || left.bbox.y - right.bbox.y);
    let candidateIndex = 0;
    return {
      ...measure,
      events: measure.events.map((event) => {
        const expected = event.type === "note" ? "head" : "rest";
        const matchIndex = candidates.findIndex((symbol, index) => index >= candidateIndex && symbol.shape.includes(expected));
        if (matchIndex < 0) return event;
        const symbol = candidates[matchIndex];
        candidateIndex = matchIndex + 1;
        symbol.eventId = event.id;
        return {
          ...event,
          recognition: {
            confidence: symbol.confidence,
            source: "omr-engine" as const,
            page: symbol.page,
            bbox: symbol.bbox,
            issues: symbol.issues,
          },
        };
      }),
    };
  });

  return {
    ...scoreJson,
    measures,
    recognitionLayer: {
      engine: "audiveris",
      engineVersion: typeof engineVersion === "string" ? engineVersion : undefined,
      pages,
      symbols,
    },
  };
}

function findScoreMeasureId(score: ScoreJson, partId: string | undefined, sequence: number) {
  if (!partId) return undefined;
  return score.measures.filter((measure) => measure.partId === partId).sort((left, right) => left.sequence - right.sequence)[sequence]?.id;
}

function asRecord(value: unknown): XmlRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as XmlRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
}

function numberValue(value: unknown): number | null {
  const result = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(result) ? result : null;
}

function readPngDimensions(buffer: Buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature || buffer.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}
