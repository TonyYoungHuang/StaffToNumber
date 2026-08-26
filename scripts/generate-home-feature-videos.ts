import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, request as playwrightRequest, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createOmrCandidateFixture } from "../tests/e2e/omr-candidate-fixture";

const root = process.cwd();
const apiUrl = "http://127.0.0.1:43102";
const appUrl = "http://127.0.0.1:43101";
const isEnglish = process.argv.includes("--locale=en");
const scoreLocale = isEnglish ? "en" : "zh-CN";
const assetSuffix = isEnglish ? "-en" : "";
const runId = new Date().toISOString().replace(/[:.]/gu, "-");
const outputDir = path.join(root, ".tmp", "home-feature-video-raw", runId);
const children: ChildProcess[] = [];

fs.mkdirSync(outputDir, { recursive: true });

function startProcess(entry: string, args: string[], env: NodeJS.ProcessEnv, cwd = root) {
  const child = spawn(process.execPath, [entry, ...args], {
    cwd,
    env,
    stdio: "ignore",
    windowsHide: true,
  });
  children.push(child);
  return child;
}

async function waitForUrl(url: string, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function preparePage(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "score_locale", value: scoreLocale, url: appUrl }]);
  const page = await context.newPage();
  page.setDefaultTimeout(25_000);
  await page.route("**/api/**", async (route) => {
    const sourceUrl = new URL(route.request().url());
    if (sourceUrl.origin === appUrl) {
      await route.continue();
      return;
    }
    const localUrl = `${apiUrl}${sourceUrl.pathname}${sourceUrl.search}`;
    const response = await route.fetch({
      url: localUrl,
      headers: {
        ...route.request().headers(),
        authorization: `Bearer ${token}`,
      },
    });
    await route.fulfill({ response });
  });
  await page.addInitScript((authToken) => window.localStorage.setItem("score-auth-token", authToken), token);
  return page;
}

async function addRecorderLabel(page: Page, title: string, steps: string) {
  await page.evaluate(({ title: labelTitle, steps: labelSteps }) => {
    const existing = document.querySelector("[data-feature-recorder-label]");
    existing?.remove();
    const label = document.createElement("div");
    label.dataset.featureRecorderLabel = "true";
    label.innerHTML = `<strong>${labelTitle}</strong><span>${labelSteps}</span>`;
    Object.assign(label.style, {
      position: "fixed",
      top: "82px",
      right: "22px",
      zIndex: "9999",
      display: "grid",
      gap: "3px",
      maxWidth: "410px",
      padding: "12px 16px",
      border: "1px solid rgba(91, 75, 226, .22)",
      borderRadius: "14px",
      background: "rgba(255,255,255,.94)",
      boxShadow: "0 14px 38px rgba(31, 36, 74, .16)",
      color: "#171b31",
      fontFamily: "Arial, 'Microsoft YaHei', sans-serif",
      backdropFilter: "blur(10px)",
      pointerEvents: "none",
    });
    const strong = label.querySelector("strong") as HTMLElement;
    const span = label.querySelector("span") as HTMLElement;
    Object.assign(strong.style, { color: "#5143d9", fontSize: "17px", lineHeight: "1.25" });
    Object.assign(span.style, { color: "#545d76", fontSize: "13px", lineHeight: "1.45" });
    document.body.append(label);
  }, { title, steps });
}

async function focusSection(page: Page, heading: string) {
  const section = page.getByRole("heading", { name: heading, exact: true }).locator("xpath=ancestor::section[1]");
  try {
    await section.waitFor({ state: "visible" });
  } catch (error) {
    const headings = await page.locator("h1, h2, h3").allTextContents();
    process.stderr.write(`Could not find \"${heading}\". Rendered headings: ${JSON.stringify(headings)}\n`);
    await page.screenshot({ path: path.join(outputDir, "recording-error.png"), fullPage: true });
    throw error;
  }
  await section.evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.evaluate(() => window.scrollBy(0, -72));
  await page.waitForTimeout(800);
  return section;
}

async function createAcceptedScore(apiRequest: Awaited<ReturnType<typeof playwrightRequest.newContext>>, label: string) {
  const fixture = await createOmrCandidateFixture(apiRequest, label, "melody");
  const accepted = await apiRequest.post(`${apiUrl}/api/scores/${fixture.documentId}/candidate/accept`, {
    headers: { Authorization: `Bearer ${fixture.token}` },
    data: { pendingRevisionId: fixture.initialCandidateRevisionId },
  });
  if (accepted.status() !== 200) throw new Error(`Could not accept demo score: ${accepted.status()} ${await accepted.text()}`);
  return fixture;
}

async function recordFeature(
  browser: Browser,
  apiRequest: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  input: {
    fileName: string;
    fixtureLabel: string;
    heading: string;
    labelTitle: string;
    labelSteps: string;
    run: (page: Page, section: ReturnType<Page["locator"]>, firstEventId: string) => Promise<void>;
  },
) {
  const fixture = await createAcceptedScore(apiRequest, input.fixtureLabel);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outputDir, size: { width: 1280, height: 720 } },
    colorScheme: "light",
  });
  const page = await preparePage(context, fixture.token);
  const video = page.video();
  await page.goto(`${appUrl}/scores/${fixture.documentId}`, { waitUntil: "domcontentloaded" });
  const renderedLocale = await page.locator("html").getAttribute("lang");
  if (renderedLocale !== scoreLocale) throw new Error(`Expected ${scoreLocale} recording UI, received ${renderedLocale ?? "no locale"}.`);
  const consent = page.getByRole("button", { name: isEnglish ? "Accept" : "同意", exact: true });
  if (await consent.isVisible().catch(() => false)) await consent.click();
  const section = await focusSection(page, input.heading);
  await addRecorderLabel(page, input.labelTitle, input.labelSteps);
  await page.waitForTimeout(1_100);
  await input.run(page, section, fixture.firstEventId);
  await page.waitForTimeout(1_600);
  await page.close();
  await context.close();
  if (!video) throw new Error(`Playwright did not create a video for ${input.fileName}`);
  const destination = path.join(outputDir, `${input.fileName}.webm`);
  await video.saveAs(destination);
  process.stdout.write(`Recorded ${destination}\n`);
}

async function main() {
  process.stdout.write(`Recording ${scoreLocale} feature videos.\n`);
  const commonEnv = {
    ...process.env,
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: "43102",
    DB_FILE: path.join(root, ".tmp", "e2e", "app.sqlite"),
    STORAGE_DIR: path.join(root, ".tmp", "e2e", "storage"),
    PUBLIC_SITE_URL: "http://127.0.0.1:43100",
    PUBLIC_APP_URL: appUrl,
    ADMIN_API_KEY: "e2e-admin-key-with-at-least-32-characters",
    RATE_LIMIT_ENABLED: "false",
    LIFECYCLE_CLEANUP_ENABLED: "false",
  };
  startProcess(path.join(root, "services", "api", "dist", "index.js"), [], commonEnv);
  startProcess(path.join(root, "node_modules", "next", "dist", "bin", "next"), ["start", "--hostname", "127.0.0.1", "--port", "43101"], {
    ...process.env,
    NODE_ENV: "production",
  }, path.join(root, "apps", "app"));
  await Promise.all([waitForUrl(`${apiUrl}/health`), waitForUrl(`${appUrl}/login`)]);

  const apiRequest = await playwrightRequest.newContext();
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-proxy-server"] });
  try {
    await recordFeature(browser, apiRequest, {
      fileName: `demo-score-editor${assetSuffix}`,
      fixtureLabel: `home-editor-video${assetSuffix}`,
      heading: isEnglish ? "Measure-level graphical editor" : "小节级图形编辑器",
      labelTitle: isEnglish ? "Edit online" : "在线编辑",
      labelSteps: isEnglish ? "Select a note → raise pitch → save a new revision" : "选择音符 → 升高音高 → 保存为新版本",
      run: async (_page, section, firstEventId) => {
        const note = section.locator(`[data-vexflow-event-id="${firstEventId}"]`);
        await note.click();
        await new Promise((resolve) => setTimeout(resolve, 700));
        await section.getByRole("button", { name: isEnglish ? "Raise semitone" : "升高半音" }).click();
        await new Promise((resolve) => setTimeout(resolve, 700));
        await section.getByRole("button", { name: isEnglish ? "Save pitch/duration" : "保存音高/时值" }).click();
        await section.getByText(isEnglish ? "Saved a new corrected revision." : "已保存为新的修谱版本。", { exact: true }).waitFor();
      },
    });

    await recordFeature(browser, apiRequest, {
      fileName: `demo-transpose-score${assetSuffix}`,
      fixtureLabel: `home-transpose-video${assetSuffix}`,
      heading: isEnglish ? "Create transposed revision" : "创建移调版本",
      labelTitle: isEnglish ? "Transpose a score" : "整谱移调",
      labelSteps: isEnglish ? "Set +2 semitones → create a traceable revision" : "设置 +2 半音 → 创建可追踪的新版本",
      run: async (_page, section) => {
        const semitoneInput = section.locator('input[type="number"]').first();
        await semitoneInput.fill("2");
        await new Promise((resolve) => setTimeout(resolve, 850));
        const transposed = _page.waitForResponse((response) => response.url().includes("/transpose") && response.request().method() === "POST" && response.status() === 201);
        await section.getByRole("button", { name: isEnglish ? "Create transposed revision" : "创建移调版本", exact: true }).click();
        await transposed;
        await new Promise((resolve) => setTimeout(resolve, 900));
      },
    });

    await recordFeature(browser, apiRequest, {
      fileName: `demo-staff-to-jianpu${assetSuffix}`,
      fixtureLabel: `home-jianpu-video${assetSuffix}`,
      heading: isEnglish ? "Jianpu preview" : "简谱预览",
      labelTitle: isEnglish ? "Staff to Jianpu" : "五线谱转简谱",
      labelSteps: isEnglish ? "Switch solfège → regenerate Jianpu from the same score" : "切换唱名法 → 重新生成同一乐谱的简谱",
      run: async (_page, section) => {
        await section.locator("select").first().selectOption("fixed-do");
        await new Promise((resolve) => setTimeout(resolve, 850));
        await section.getByRole("button", { name: isEnglish ? "Regenerate" : "重新生成", exact: true }).click();
        await section.getByText(isEnglish ? "Generating Jianpu..." : "正在生成简谱...", { exact: true }).waitFor({ state: "hidden" });
      },
    });

    await recordFeature(browser, apiRequest, {
      fileName: `demo-score-to-audio${assetSuffix}`,
      fixtureLabel: `home-audio-video${assetSuffix}`,
      heading: isEnglish ? "Tone.js part practice player" : "Tone.js 分声部练习播放器",
      labelTitle: isEnglish ? "Score to audio" : "五线谱生成音频",
      labelSteps: isEnglish ? "Generate events → adjust tempo → play the score" : "生成播放事件 → 调整速度 → 播放并移动播放位置",
      run: async (_page, section) => {
        const playbackLoaded = _page.waitForResponse((response) => response.url().includes("/playback") && response.request().method() === "GET" && response.status() === 200);
        await section.getByRole("button", { name: isEnglish ? "Generate playback events" : "生成播放事件", exact: true }).click();
        await playbackLoaded;
        const tempo = section.locator('input[type="number"]').first();
        await tempo.fill("88");
        await new Promise((resolve) => setTimeout(resolve, 700));
        await section.getByRole("button", { name: isEnglish ? "Play" : "播放", exact: true }).click();
        await new Promise((resolve) => setTimeout(resolve, 2_400));
      },
    });
  } finally {
    await browser.close();
    await apiRequest.dispose();
  }
  process.stdout.write(`Raw feature videos: ${outputDir}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const child of children) child.kill();
  });
