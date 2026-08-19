import { execFileSync } from "node:child_process";
import fs from "node:fs";

const textExtensions = new Set([
  ".css", ".csv", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".sql", ".svg", ".ts", ".tsx", ".txt", ".yaml", ".yml",
]);
const mojibakePatterns = [
  /\u951f\u65a4\u62f7/u,
  /涓[€哄]/u,
  /鏁[版]/u,
  /鍔[犲]/u,
  /绠[＄]/u,
  /璇[炬]/u,
  /鐢[ㄦ]/u,
  /瀛[︾]/u,
  /锛[屾]/u,
  /銆[傦]/u,
  /鈥[滄]/u,
  /鏈[夋]/u,
];
const decoder = new TextDecoder("utf-8", { fatal: true });

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  encoding: "buffer",
})
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .filter((file) => fs.existsSync(file))
  .filter((file) => textExtensions.has(file.slice(file.lastIndexOf(".")).toLowerCase()));

const failures = [];
for (const file of files) {
  const bytes = fs.readFileSync(file);
  let text;
  try {
    text = decoder.decode(bytes);
  } catch {
    failures.push(`${file}: invalid UTF-8 byte sequence`);
    continue;
  }
  if (text.includes("\uFFFD")) failures.push(`${file}: contains Unicode replacement character`);
  const lines = text.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const match = mojibakePatterns.find((pattern) => pattern.test(lines[index]));
    if (match) failures.push(`${file}:${index + 1}: possible UTF-8/GBK mojibake (${match.source})`);
  }
}

if (failures.length > 0) {
  console.error(`Encoding audit failed with ${failures.length} issue(s):\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Encoding audit passed for ${files.length} text files.`);
}
