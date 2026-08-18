import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { PNG } from "pngjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceMusicXml = path.join(
  repositoryRoot,
  "services",
  "worker",
  "src",
  "fixtures",
  "render-real",
  "qualification.musicxml",
);
const fixtureRoot = path.join(repositoryRoot, "services", "worker", "src", "audiveris-real-fixtures");
const outputDirectory = path.join(fixtureRoot, "generated");
const manifestPath = path.join(fixtureRoot, "manifest.json");
const museScoreCommand = process.env.MUSESCORE_COMMAND?.trim() || "musescore3";

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

const basePath = path.join(outputDirectory, "base.png");
const render = spawnSync(museScoreCommand, ["-r", "300", "-o", basePath, sourceMusicXml], {
  encoding: "utf8",
  env: { ...process.env, QT_QPA_PLATFORM: process.env.QT_QPA_PLATFORM || "offscreen" },
  windowsHide: true,
});
if (render.error || render.status !== 0) {
  throw new Error(
    `MuseScore fixture rendering failed (${String(render.status)}): ${render.error?.message ?? render.stderr ?? render.stdout}`,
  );
}
if (!fs.existsSync(basePath)) {
  const renderedPage = fs.readdirSync(outputDirectory).find((entry) => /^base-\d+\.png$/u.test(entry));
  if (!renderedPage) throw new Error(`MuseScore did not create ${basePath} or a numbered PNG page.`);
  fs.renameSync(path.join(outputDirectory, renderedPage), basePath);
}

const base = flattenOnWhite(PNG.sync.read(fs.readFileSync(basePath)));
fs.writeFileSync(basePath, PNG.sync.write(base));
const rotated90Path = writePng("rotation-90.png", rotate(base, 90));
const rotated180Path = writePng("rotation-180.png", rotate(base, 180));
const rotated270Path = writePng("rotation-270.png", rotate(base, 270));
const croppedPath = writePng("crop.png", crop(base, 18, 18, 18, 18));
const lowConfidencePath = writePng("low-confidence.png", degrade(base));
const timeoutPath = writePng("timeout.png", base);
const cancellationPath = writePng("cancellation.png", base);
const corruptedPath = path.join(outputDirectory, "corrupted-input.png");
fs.writeFileSync(corruptedPath, Buffer.from("not-a-valid-png\nscoretransposer-audiveris-corruption-probe\n", "ascii"));
const multipagePath = path.join(outputDirectory, "multipage.pdf");
await writeMultipagePdf(multipagePath, basePath);

const statement = "Synthetic qualification score authored in this repository and generated deterministically for real-engine testing.";
const fixture = (id, scenario, filePath, expected, input) => ({
  id,
  scenario,
  path: path.posix.join("generated", path.basename(filePath)),
  sha256: sha256(filePath),
  rights: { classification: "repository-authored", statement },
  ...(input ? { input } : {}),
  expected,
});

const manifest = {
  schemaVersion: 1,
  fixtures: [
    fixture("synthetic-multipage", "multipage", multipagePath, { minPages: 2, minMeasures: 2, minNotes: 2 }),
    fixture("synthetic-rotation-90", "rotation-90", rotated90Path, { minMeasures: 1, minNotes: 1 }, { rotationDegrees: 90 }),
    fixture("synthetic-rotation-180", "rotation-180", rotated180Path, { minMeasures: 1, minNotes: 1 }, { rotationDegrees: 180 }),
    fixture("synthetic-rotation-270", "rotation-270", rotated270Path, { minMeasures: 1, minNotes: 1 }, { rotationDegrees: 270 }),
    fixture("synthetic-crop", "crop", croppedPath, { minMeasures: 1, minNotes: 1 }, { cropped: true }),
    fixture("synthetic-low-confidence", "low-confidence", lowConfidencePath, {
      minMeasures: 1,
      minNotes: 1,
      lowConfidenceThreshold: 1,
      minSymbolsBelowThreshold: 1,
    }),
    fixture("synthetic-corrupted", "corrupted-input", corruptedPath, {}),
    fixture("synthetic-timeout", "timeout", timeoutPath, {}),
    fixture("synthetic-cancellation", "cancellation", cancellationPath, {}),
  ],
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`Generated ${manifest.fixtures.length} checksum-pinned Audiveris fixtures at ${outputDirectory}\n`);

function writePng(name, png) {
  const target = path.join(outputDirectory, name);
  fs.writeFileSync(target, PNG.sync.write(png));
  return target;
}

function flattenOnWhite(source) {
  const target = new PNG({ width: source.width, height: source.height });
  for (let index = 0; index < source.data.length; index += 4) {
    const alpha = source.data[index + 3] / 255;
    target.data[index] = Math.round(source.data[index] * alpha + 255 * (1 - alpha));
    target.data[index + 1] = Math.round(source.data[index + 1] * alpha + 255 * (1 - alpha));
    target.data[index + 2] = Math.round(source.data[index + 2] * alpha + 255 * (1 - alpha));
    target.data[index + 3] = 255;
  }
  return target;
}

function rotate(source, degrees) {
  const swap = degrees === 90 || degrees === 270;
  const target = new PNG({ width: swap ? source.height : source.width, height: swap ? source.width : source.height });
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      let dx;
      let dy;
      if (degrees === 90) [dx, dy] = [source.height - 1 - y, x];
      else if (degrees === 180) [dx, dy] = [source.width - 1 - x, source.height - 1 - y];
      else [dx, dy] = [y, source.width - 1 - x];
      copyPixel(source, x, y, target, dx, dy);
    }
  }
  return target;
}

function crop(source, left, top, right, bottom) {
  const width = source.width - left - right;
  const height = source.height - top - bottom;
  if (width <= 0 || height <= 0) throw new Error("Crop margins remove the complete source image.");
  const target = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) copyPixel(source, x + left, y + top, target, x, y);
  }
  return target;
}

function degrade(source) {
  const target = new PNG({ width: source.width, height: source.height });
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const outputIndex = (y * source.width + x) * 4;
      let sum = 0;
      let samples = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const sx = Math.min(source.width - 1, Math.max(0, x + ox));
          const sy = Math.min(source.height - 1, Math.max(0, y + oy));
          const inputIndex = (sy * source.width + sx) * 4;
          sum += source.data[inputIndex];
          samples += 1;
        }
      }
      // A low-frequency deterministic pattern weakens strokes without making
      // the PNG incompressible like per-pixel random noise would.
      const noise = ((((x >> 5) + (y >> 5)) % 5) - 2) * 1.5;
      const value = Math.max(0, Math.min(255, Math.round((sum / samples) * 0.82 + 255 * 0.18 + noise)));
      target.data[outputIndex] = value;
      target.data[outputIndex + 1] = value;
      target.data[outputIndex + 2] = value;
      target.data[outputIndex + 3] = 255;
    }
  }
  return target;
}

function copyPixel(source, sourceX, sourceY, target, targetX, targetY) {
  const sourceIndex = (sourceY * source.width + sourceX) * 4;
  const targetIndex = (targetY * target.width + targetX) * 4;
  source.data.copy(target.data, targetIndex, sourceIndex, sourceIndex + 4);
}

async function writeMultipagePdf(targetPath, pngPath) {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(fs.readFileSync(pngPath));
  const width = image.width * 72 / 300;
  const height = image.height * 72 / 300;
  for (let pageNumber = 0; pageNumber < 2; pageNumber += 1) {
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  fs.writeFileSync(targetPath, await pdf.save({ useObjectStreams: false }));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
