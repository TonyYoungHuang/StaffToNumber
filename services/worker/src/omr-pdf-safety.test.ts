import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { inspectOmrPdfFileIfPresent, OmrPdfSafetyError } from "./omr-pdf-safety.js";

const policy = {
  dpi: 300,
  maxPagePixels: 12_000_000,
  maxTotalPixels: 120_000_000,
};

async function writePdf(filePath: string, pageSizes: Array<[number, number]>) {
  const pdf = await PDFDocument.create();
  for (const pageSize of pageSizes) pdf.addPage(pageSize);
  await fs.promises.writeFile(filePath, await pdf.save());
}

test("OMR PDF safety accepts an ordinary page and ignores non-PDF inputs", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-omr-pdf-"));
  const pdfPath = path.join(root, "letter.pdf");
  const imagePath = path.join(root, "score.png");
  try {
    await writePdf(pdfPath, [[612, 792]]);
    await fs.promises.writeFile(imagePath, Buffer.from("not-a-pdf"));

    const inspection = await inspectOmrPdfFileIfPresent(pdfPath, policy);
    assert.equal(inspection?.ok, true);
    assert.equal(inspection?.pageCount, 1);
    assert.equal(inspection?.totalPixels, 2_550 * 3_300);
    assert.equal(await inspectOmrPdfFileIfPresent(imagePath, policy), null);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("OMR PDF safety rejects an oversized page before Audiveris runs", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-omr-pdf-"));
  const pdfPath = path.join(root, "oversized.pdf");
  try {
    await writePdf(pdfPath, [[17 * 72, 24 * 72]]);
    await assert.rejects(
      inspectOmrPdfFileIfPresent(pdfPath, policy),
      (error: unknown) => error instanceof OmrPdfSafetyError && error.code === "PDF_PAGE_PIXEL_LIMIT",
    );
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("OMR PDF safety enforces the aggregate pixel budget", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-omr-pdf-"));
  const pdfPath = path.join(root, "multi-page.pdf");
  try {
    await writePdf(pdfPath, [[612, 792], [612, 792]]);
    await assert.rejects(
      inspectOmrPdfFileIfPresent(pdfPath, { ...policy, maxTotalPixels: 10_000_000 }),
      (error: unknown) => error instanceof OmrPdfSafetyError && error.code === "PDF_TOTAL_PIXEL_LIMIT",
    );
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
