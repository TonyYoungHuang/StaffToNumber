// Re-encode the existing brand artwork without changing its design.
// Run manually after updating src/app/icon.svg; commit the generated files.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const app = new URL("../src/app/", import.meta.url);
const svg = await readFile(new URL("icon.svg", app));
const png = (size) => sharp(svg, { density: 288 }).resize(size, size).png().toBuffer();

for (const [filename, size] of [["icon1.png", 96], ["icon2.png", 192]]) {
  await writeFile(new URL(filename, app), await png(size));
}

const sizes = [16, 32, 48, 64];
const images = await Promise.all(sizes.map(png));
const directory = Buffer.alloc(6 + 16 * images.length);
directory.writeUInt16LE(1, 2); // ICO, not CUR.
directory.writeUInt16LE(images.length, 4);
let offset = directory.length;
for (let index = 0; index < images.length; index++) {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(images[index].length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
await writeFile(new URL("favicon.ico", app), Buffer.concat([directory, ...images]));
console.log("Generated 96/192px PNG icons and 16/32/48/64px ICO from icon.svg.");
