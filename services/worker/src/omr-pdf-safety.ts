import fs from "node:fs";
import { evaluatePdfRasterBudget, type PdfRasterBudgetPolicy } from "@score/shared";
import { PDFDocument } from "pdf-lib";

export class OmrPdfSafetyError extends Error {
  constructor(
    message: string,
    readonly code: "PDF_INVALID" | "PDF_PAGE_PIXEL_LIMIT" | "PDF_TOTAL_PIXEL_LIMIT",
  ) {
    super(message);
    this.name = "OmrPdfSafetyError";
  }
}

export async function inspectOmrPdfFileIfPresent(filePath: string, policy: PdfRasterBudgetPolicy) {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const signature = Buffer.alloc(5);
    await handle.read(signature, 0, signature.length, 0);
    if (signature.toString("ascii") !== "%PDF-") return null;
  } finally {
    await handle.close();
  }

  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(await fs.promises.readFile(filePath));
  } catch {
    throw new OmrPdfSafetyError("The OMR source PDF could not be parsed safely.", "PDF_INVALID");
  }
  const pages = pdf.getPages();
  if (pages.length === 0) {
    throw new OmrPdfSafetyError("The OMR source PDF does not contain any pages.", "PDF_INVALID");
  }
  const inspection = evaluatePdfRasterBudget(
    pages.map((page) => ({ widthPoints: page.getWidth(), heightPoints: page.getHeight() })),
    policy,
  );
  if (inspection.ok) return inspection;
  if (inspection.reason === "page_pixel_limit") {
    throw new OmrPdfSafetyError(
      `PDF page ${inspection.page?.pageNumber ?? "unknown"} exceeds the ${policy.maxPagePixels}-pixel OMR safety limit at ${policy.dpi} DPI. Resize or crop the page and retry the job.`,
      "PDF_PAGE_PIXEL_LIMIT",
    );
  }
  if (inspection.reason === "total_pixel_limit") {
    throw new OmrPdfSafetyError(
      `The PDF exceeds the ${policy.maxTotalPixels}-pixel total OMR safety limit at ${policy.dpi} DPI. Split the score into smaller files and retry the job.`,
      "PDF_TOTAL_PIXEL_LIMIT",
    );
  }
  throw new OmrPdfSafetyError("The OMR source PDF contains an invalid page size.", "PDF_INVALID");
}
