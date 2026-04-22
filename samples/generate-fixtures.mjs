import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "services", "api", "storage", "16008ff2-6494-4d78-9182-cbaae09b38a4");

const copies = [
  {
    source: "9109cf43-9591-4c53-9e4f-840796a24ed6-verify-5d-clean.pdf",
    target: path.join(repoRoot, "samples", "clean", "verify-5d-clean.pdf"),
  },
  {
    source: "c05136a4-8e48-4160-b408-a0a98c3eb3e0-verify-5d-structure.pdf",
    target: path.join(repoRoot, "samples", "clean", "verify-5d-structure.pdf"),
  },
  {
    source: "1e672275-ce3a-47be-b31f-2086d916c868-staff-upgrade.pdf",
    target: path.join(repoRoot, "samples", "clean", "staff-upgrade.pdf"),
  },
  {
    source: "7f44deec-56e9-4d53-ad79-c05db52602b0-verify-5c-symbols-v3.pdf",
    target: path.join(repoRoot, "samples", "clean", "verify-5c-symbols-v3.pdf"),
  },
  {
    source: "e4f9e9c8-333d-4c61-9536-64b6f80d4a95-verify-5c-symbols.pdf",
    target: path.join(repoRoot, "samples", "draft", "verify-5c-symbols.pdf"),
  },
  {
    source: "716b5716-95a3-4667-9ec3-beedc736e0b7-verify-5c-symbols-v2.pdf",
    target: path.join(repoRoot, "samples", "draft", "verify-5c-symbols-v2.pdf"),
  },
  {
    source: "8115d61e-ca2f-4964-bfeb-10533bdd4c0c-verify-5d-splitting.pdf",
    target: path.join(repoRoot, "samples", "draft", "verify-5d-splitting.pdf"),
  },
  {
    source: "f7b53cf3-ce6a-45ca-be44-b156b7db1841-verify-5d-splitting-v2.pdf",
    target: path.join(repoRoot, "samples", "draft", "verify-5d-splitting-v2.pdf"),
  },
  {
    source: "c904af6f-6aaa-4e29-a481-1fba89a00c1c-sample.pdf",
    target: path.join(repoRoot, "samples", "fail", "sample-tiny.pdf"),
  },
  {
    source: "1c321aa8-5132-46a0-b0fd-566c36628bd5-job-sample.pdf",
    target: path.join(repoRoot, "samples", "fail", "job-sample-tiny.pdf"),
  },
];

const composites = [
  {
    mode: "multipage",
    target: path.join(repoRoot, "samples", "clean", "multi-page-clean.pdf"),
    sources: [
      path.join(repoRoot, "samples", "clean", "verify-5d-clean.pdf"),
      path.join(repoRoot, "samples", "clean", "verify-5d-valley-clean.pdf"),
    ],
  },
  {
    mode: "multipage",
    target: path.join(repoRoot, "samples", "draft", "multi-page-context.pdf"),
    sources: [
      path.join(repoRoot, "samples", "draft", "verify-5d-splitting-v2.pdf"),
      path.join(repoRoot, "samples", "draft", "verify-5c-symbols.pdf"),
    ],
  },
  {
    mode: "multistaff",
    target: path.join(repoRoot, "samples", "clean", "multi-staff-clean.pdf"),
    sources: [
      path.join(repoRoot, "samples", "clean", "verify-5d-clean.pdf"),
      path.join(repoRoot, "samples", "clean", "verify-5d-valley-clean.pdf"),
    ],
  },
  {
    mode: "multistaff",
    target: path.join(repoRoot, "samples", "draft", "multi-staff-context.pdf"),
    sources: [
      path.join(repoRoot, "samples", "draft", "verify-5d-splitting-v2.pdf"),
      path.join(repoRoot, "samples", "draft", "verify-5c-symbols-v2.pdf"),
    ],
  },
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function buildMultiPagePdf(target, sources) {
  const out = await PDFDocument.create();
  for (const source of sources) {
    const sourceDoc = await PDFDocument.load(fs.readFileSync(source));
    const [copiedPage] = await out.copyPages(sourceDoc, [0]);
    out.addPage(copiedPage);
  }
  ensureDir(target);
  fs.writeFileSync(target, await out.save());
}

async function buildMultiStaffPdf(target, sources) {
  const out = await PDFDocument.create();
  const page = out.addPage([595, 842]);
  const embeddedPages = [];

  for (const source of sources) {
    const [sourcePage] = await out.embedPdf(fs.readFileSync(source), [0]);
    embeddedPages.push(sourcePage);
  }

  const topMargin = 48;
  const gap = 28;
  const availableHeight = 842 - topMargin * 2 - gap * (embeddedPages.length - 1);
  const slotHeight = availableHeight / embeddedPages.length;

  embeddedPages.forEach((embeddedPage, index) => {
    const scale = Math.min((595 - 64) / embeddedPage.width, slotHeight / embeddedPage.height);
    const drawWidth = embeddedPage.width * scale;
    const drawHeight = embeddedPage.height * scale;
    const x = (595 - drawWidth) / 2;
    const y = 842 - topMargin - (slotHeight + gap) * index - drawHeight;
    page.drawPage(embeddedPage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  });

  ensureDir(target);
  fs.writeFileSync(target, await out.save());
}

async function buildBarlineRestFixture(target) {
  const out = await PDFDocument.create();
  const page = out.addPage([595, 842]);
  const left = 90;
  const right = 520;
  const top = 560;
  const spacing = 22;
  const lines = Array.from({ length: 5 }, (_, index) => top - index * spacing);

  for (const y of lines) {
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 1.6,
    });
  }

  const barlines = [245, 395];
  for (const x of barlines) {
    page.drawLine({
      start: { x, y: lines[0] + 8 },
      end: { x, y: lines[4] - 8 },
      thickness: 2.1,
    });
  }

  const notes = [
    { x: 135, y: lines[2] - 2, stem: "up" },
    { x: 195, y: lines[1] + 2, stem: "up" },
    { x: 300, y: lines[3] + 1, stem: "down" },
    { x: 350, y: lines[1], stem: "up" },
    { x: 455, y: lines[2], stem: "down" },
  ];

  for (const note of notes) {
    page.drawEllipse({
      x: note.x,
      y: note.y,
      xScale: 9,
      yScale: 7,
      color: rgb(0, 0, 0),
    });
    if (note.stem === "up") {
      page.drawLine({
        start: { x: note.x + 8, y: note.y + 1 },
        end: { x: note.x + 8, y: note.y + 58 },
        thickness: 2,
      });
    } else {
      page.drawLine({
        start: { x: note.x - 8, y: note.y - 1 },
        end: { x: note.x - 8, y: note.y - 58 },
        thickness: 2,
      });
    }
  }

  page.drawRectangle({
    x: 280,
    y: lines[1] - 6,
    width: 18,
    height: 8,
    color: rgb(0, 0, 0),
  });
  page.drawRectangle({
    x: 430,
    y: lines[2] - 2,
    width: 16,
    height: 8,
    color: rgb(0, 0, 0),
  });

  ensureDir(target);
  fs.writeFileSync(target, await out.save());
}

for (const entry of copies) {
  const source = path.join(sourceRoot, entry.source);
  ensureDir(entry.target);
  fs.copyFileSync(source, entry.target);
}

for (const composite of composites) {
  if (composite.mode === "multipage") {
    await buildMultiPagePdf(composite.target, composite.sources);
  } else {
    await buildMultiStaffPdf(composite.target, composite.sources);
  }
}

await buildBarlineRestFixture(path.join(repoRoot, "samples", "clean", "barline-rest-context.pdf"));

console.log("Sample fixtures generated.");
