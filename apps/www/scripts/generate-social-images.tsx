import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { localizeFeaturePage } from "../src/lib/feature-page-localization";
import { getFeatureOnPageContent } from "../src/lib/feature-on-page";
import { FeatureSocialCard } from "../src/lib/feature-social-card";
import { platformFeaturePages } from "../src/lib/platform-feature-pages";

// A separate process avoids the shared Sharp SVG-loader restriction in Next 16.3.0.
// No user uploads or request parameters are rendered into these public cards.
async function main() {
const appRoot = path.resolve(__dirname, "..");
const { ImageResponse } = createRequire(path.join(appRoot, "package.json"))("next/og") as typeof import("next/og");
const outputDir = path.join(appRoot, "public/social");
const layout = await readFile(path.join(appRoot, "src/lib/feature-social-card.tsx"));
const manifestPath = path.join(outputDir, "manifest.json");
let previous: Record<string, { source: string; png: string }> = {};
try { previous = JSON.parse(await readFile(manifestPath, "utf8")); } catch { /* First generation. */ }
const manifest: typeof previous = {};
const digest = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
let generated = 0;
for (const locale of SUPPORTED_LOCALES) {
  await mkdir(path.join(outputDir, locale), { recursive: true });
  for (const original of platformFeaturePages) {
    const page = localizeFeaturePage(original, locale);
    const key = `${locale}/${page.slug}.png`;
    const source = digest(JSON.stringify([page, getFeatureOnPageContent(page.slug, locale), layout.toString()]));
    let png: Buffer | undefined;
    try { png = await readFile(path.join(outputDir, key)); } catch { /* New card. */ }
    if (!png || previous[key]?.source !== source || previous[key]?.png !== digest(png)) {
      const response = new ImageResponse(FeatureSocialCard({ page, locale }), { width: 1200, height: 630 });
      png = Buffer.from(await response.arrayBuffer());
      if (png.readUInt32BE(0) !== 0x89504e47) throw new Error(`Invalid PNG: ${key}`);
      await writeFile(path.join(outputDir, key), png);
      generated++;
    }
    manifest[key] = { source, png: digest(png) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Social cards: ${Object.keys(manifest).length} verified, ${generated} generated.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
