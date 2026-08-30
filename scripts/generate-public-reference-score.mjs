import { fileURLToPath } from "node:url";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(repositoryRoot, "apps", "www", "public", "examples", "scoretransposer-reference-score.pdf");

const pdf = await PDFDocument.create();
pdf.setTitle("ScoreTransposer deterministic four-note reference score");
pdf.setAuthor("ScoreTransposer");
pdf.setSubject("A public reference score for checking downloadable PDF and MusicXML formats");
pdf.setKeywords(["sheet music", "MusicXML", "OMR reference", "ScoreTransposer"]);

const page = pdf.addPage([612, 792]);
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const ink = rgb(0.08, 0.1, 0.16);
const muted = rgb(0.32, 0.36, 0.44);

page.drawText("ScoreTransposer reference score", { x: 54, y: 710, size: 22, font: bold, color: ink });
page.drawText("C major · 4/4 · C4 D4 E4 G4 · four quarter notes", { x: 54, y: 684, size: 11, font: regular, color: muted });

const staffLeft = 72;
const staffRight = 540;
const staffBottom = 420;
const staffGap = 12;
for (let line = 0; line < 5; line += 1) {
  const y = staffBottom + line * staffGap;
  page.drawLine({ start: { x: staffLeft, y }, end: { x: staffRight, y }, thickness: 0.9, color: ink });
}

page.drawText("G", { x: 82, y: 421, size: 35, font: bold, color: ink });
page.drawText("4", { x: 121, y: 451, size: 15, font: bold, color: ink });
page.drawText("4", { x: 121, y: 426, size: 15, font: bold, color: ink });

const notes = [
  { name: "C4", x: 190, y: staffBottom - staffGap },
  { name: "D4", x: 275, y: staffBottom - staffGap / 2 },
  { name: "E4", x: 360, y: staffBottom },
  { name: "G4", x: 445, y: staffBottom + staffGap },
];

for (const note of notes) {
  if (note.name === "C4") {
    page.drawLine({ start: { x: note.x - 13, y: note.y }, end: { x: note.x + 13, y: note.y }, thickness: 1, color: ink });
  }
  page.drawEllipse({ x: note.x, y: note.y, xScale: 7.5, yScale: 5.2, rotate: { type: "degrees", angle: -18 }, color: ink });
  page.drawLine({ start: { x: note.x + 7, y: note.y }, end: { x: note.x + 7, y: note.y + 42 }, thickness: 1.4, color: ink });
  page.drawText(note.name, { x: note.x - 7, y: 382, size: 9, font: regular, color: muted });
}

page.drawLine({ start: { x: 510, y: staffBottom }, end: { x: 510, y: staffBottom + staffGap * 4 }, thickness: 1.4, color: ink });
page.drawLine({ start: { x: 517, y: staffBottom }, end: { x: 517, y: staffBottom + staffGap * 4 }, thickness: 3, color: ink });

page.drawText("This file is a deterministic, self-authored format reference.", { x: 54, y: 302, size: 11, font: bold, color: ink });
page.drawText("It is not presented as the output of an OMR recognition run and does not establish an accuracy percentage.", { x: 54, y: 282, size: 9.5, font: regular, color: muted, maxWidth: 500 });
page.drawText("Compare it with the public four-note MusicXML reference to inspect file compatibility.", { x: 54, y: 264, size: 9.5, font: regular, color: muted });

const bytes = await pdf.save({ useObjectStreams: false });
await writeFile(outputPath, bytes);
console.log(`Wrote ${outputPath} (${bytes.length} bytes)`);
