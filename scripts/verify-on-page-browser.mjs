import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] || "http://localhost:3100";
const outputDir = path.resolve(process.argv[3] || "artifacts/on-page-seo");
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.SEO_BROWSER_CHANNEL || "chrome" });
const results = [];
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const routes = ["/", "/sheet-music-scanner", "/score-editor", "/musicxml-midi", "/pdf-to-musicxml", "/transpose-score", "/staff-to-jianpu"];
    for (const pathname of [...routes, ...routes.map(route => route === "/" ? "/es" : `/es${route}`)]) {
      const response = await page.goto(new URL(pathname, baseUrl).href, { waitUntil: "networkidle", timeout: 60000 });
      assert.equal(response.status(), 200, `${name} ${pathname}`);
      await page.evaluate(() => document.fonts.ready);
      const measurement = await page.evaluate(() => ({
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        headings: Array.from(document.querySelectorAll("h1"), element => element.textContent),
      }));
      assert.equal(measurement.headings.length, 1, `${name} ${pathname}: one visible H1`);
      assert.ok(measurement.scrollWidth <= measurement.width + 1, `${name} ${pathname}: horizontal overflow`);
      if (["/", "/es", "/sheet-music-scanner", "/es/sheet-music-scanner", "/score-editor", "/es/score-editor"].includes(pathname)) {
        const slug = pathname === "/" ? "home" : pathname === "/es" ? "es-home" : pathname.slice(1).replaceAll("/", "-");
        await page.screenshot({ path: path.join(outputDir, `${name}-${slug}.png`), fullPage: true });
        if (pathname === "/") await page.screenshot({ path: path.join(outputDir, `${name}-home-first-screen.png`) });
      }
      if (pathname.endsWith("/sheet-music-scanner")) {
        const question = page.getByText(pathname.startsWith("/es/") ? "¿El escáner de partituras es gratis?" : "Is the sheet music scanner free?", { exact: true });
        await question.click();
        assert.equal(await question.evaluate(element => element.closest("details").open), true, "FAQ must expand");
      }
      results.push({ viewport: name, pathname, ...measurement });
    }
    assert.deepEqual(errors, [], `${name}: browser runtime errors`);
    await context.close();
  }
  await fs.writeFile(path.join(outputDir, "browser-checks.json"), JSON.stringify(results, null, 2));
  console.log(`Passed ${results.length} page/viewport checks, FAQ interaction and screenshots: ${outputDir}`);
} finally {
  await browser.close();
}
