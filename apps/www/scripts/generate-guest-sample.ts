/** Offline only: derive the public demo from the existing CC0 MusicXML fixture. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { parseMusicXmlToScoreJson } from "../../../services/api/src/lib/musicxml-score-parser.ts";
import { transposeGuestSampleScore } from "./guest-sample-transpose.ts";
import { scoreJsonToMusicXml } from "../../../services/api/src/lib/score-musicxml-export.ts";
import { scoreJsonToJianpu } from "../../../services/api/src/lib/jianpu-converter.ts";
import { scoreJsonToPlayback } from "../../../services/api/src/lib/score-playback.ts";

async function main() {
const root = path.resolve(__dirname, "../../..");
const output = path.join(root, "apps/www/public/library/guest-sample");
const job = process.env.GUEST_SAMPLE_JOB_ROOT;
if (!job || !path.isAbsolute(job)) throw new Error("Set GUEST_SAMPLE_JOB_ROOT to an absolute temporary directory before generating.");
const sourcePath = path.join(root, "apps/www/public/library/product-workflow-etude.musicxml");
const generatedAt = "2026-10-13T00:00:00.000Z";
const sourceMusicXml = fs.readFileSync(sourcePath, "utf8");
const score = parseMusicXmlToScoreJson({
  musicXml: sourceMusicXml,
  title: "Product Workflow Etude",
  sourceFileId: "public-cc0-product-workflow-etude",
  sourceOriginalName: "product-workflow-etude.musicxml",
  importedAt: generatedAt,
});
// Preservation data remains in the original MusicXML; the demo stores the structured model.
delete score.interchange;
const keys = [
  { tonic: "C", semitones: 0, fifths: 0 },
  { tonic: "D", semitones: 2, fifths: 2 },
  { tonic: "F", semitones: 5, fifths: -1 },
  { tonic: "G", semitones: 7, fifths: 1 },
  { tonic: "Bb", semitones: -2, fifths: -2 },
] as const;
fs.mkdirSync(output, { recursive: true });
const profile = path.join(job, "tmp/guest-sample-render-profile");
const browser = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.CHROME_EXECUTABLE || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-first-run", "--disable-breakpad", "--disable-crash-reporter", `--crash-dumps-dir=${path.join(job, "tmp")}`, `--disk-cache-dir=${path.join(job, "tmp/guest-sample-render-cache")}`],
});
const page = await browser.newPage();
await page.setContent('<div id="score" style="width:340px"></div>');
await page.addScriptTag({ path: path.join(root, "node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js") });
const variants: Record<string, unknown> = {};
async function renderSvg(musicXml: string) {
  return page.evaluate(async (xml) => {
    const container = document.getElementById("score")!;
    container.replaceChildren();
    const engine = new (window as any).opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
      autoResize: false, backend: "svg", drawTitle: false, drawComposer: false,
      drawPartNames: false, drawLyrics: false, drawingParameters: "compacttight",
    });
    await engine.load(xml);
    engine.render();
    const pages = container.querySelectorAll("svg");
    // Keep the complete short score in the exported image instead of silently dropping a page.
    if (pages.length !== 1) throw new Error(`Expected one complete sample SVG, got ${pages.length}.`);
    const original = pages[0];
    original.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return original.outerHTML;
  }, musicXml);
}
try {
  fs.writeFileSync(path.join(output, "source.svg"), await renderSvg(sourceMusicXml));
  for (const key of keys) {
    const transformed = transposeGuestSampleScore({
      score, semitones: key.semitones, targetKey: { tonic: key.tonic, mode: "major", fifths: key.fifths }, generatedAt,
    });
    const musicXml = scoreJsonToMusicXml(transformed);
    const jianpu = scoreJsonToJianpu(transformed, generatedAt);
    const playback = scoreJsonToPlayback(transformed, generatedAt);
    const svg = await renderSvg(musicXml);
    fs.writeFileSync(path.join(output, `${key.tonic}.svg`), svg);
    variants[key.tonic] = {
      ...key,
      staffImage: `/library/guest-sample/${key.tonic}.svg`,
      harmonyLabels: transformed.measures.flatMap((measure) => (measure.harmonies ?? []).map((harmony) => harmony.text)),
      jianpu: jianpu.parts[0].measures.map((measure) => ({
        id: measure.id, number: measure.number,
        barlines: transformed.measures.find((original) => original.id === measure.id)?.barlines ?? [],
        events: measure.events.map((event) => ({
          id: event.id, type: event.type, durationType: event.durationType, dots: event.dots,
          ...(event.type === "note" ? { degree: event.degree, accidental: event.accidental, octaveShift: event.octaveShift } : {}),
        })),
      })),
      playback: {
        tempoBpm: playback.tempoBpm, totalBeats: playback.totalBeats,
        measures: playback.measureMarkers.map(({ measureId, startBeat }, index, measures) => ({
          measureId, startBeat, durationBeats: (measures[index + 1]?.startBeat ?? playback.totalBeats) - startBeat,
        })),
        events: playback.events.map(({ sourceEventId, measureId, midi, startBeat, durationBeats, soundDurationBeats, velocity }) =>
          ({ sourceEventId, measureId, midi, startBeat, durationBeats, soundDurationBeats: soundDurationBeats ?? durationBeats, velocity })),
      },
    };
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(root, "apps/www/src/lib/guest-sample-data.json"), JSON.stringify({
  source: { slug: "product-workflow-etude", license: "CC0", musicXmlUrl: "/library/product-workflow-etude.musicxml", image: "/library/guest-sample/source.svg" },
  score, variants,
}));
console.log(`Generated ${keys.length} sample variants from the existing CC0 score.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
