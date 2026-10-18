import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { grantActiveEntitlement } from "./activation-fixture";

const appUrl = "http://127.0.0.1:43101";
const apiUrl = "http://127.0.0.1:43102";

test.use({ viewport: { width: 390, height: 844 }, locale: "en-US" });

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

async function createLayoutScore(request: APIRequestContext) {
  const registration = await request.post(`${apiUrl}/api/auth/register`, {
    data: { email: `mobile-layout-${randomUUID()}@example.test`, password: "E2E-password-2026!" },
  });
  expect(registration.status()).toBe(201);
  const { token } = await registration.json() as { token: string };
  await grantActiveEntitlement(request, token, "LAYOUT");
  const musicXml = '<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">'
    + ["C", "D", "E"].map((step, index) => `<measure number="${index + 1}">${index ? '<print new-page="yes"/>' : '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>'}<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>`).join("")
    + '</part></score-partwise>';
  const imported = await request.post(`${apiUrl}/api/scores/import/musicxml`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { file: { name: "mobile-layout.musicxml", mimeType: "application/vnd.recordare.musicxml+xml", buffer: Buffer.from(musicXml) } },
  });
  expect(imported.status()).toBe(201);
  const { score } = await imported.json() as { score: { id: string } };
  const detail = await request.get(`${apiUrl}/api/scores/${score.id}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(detail.status()).toBe(200);
  const payload = await detail.json();
  return { documentId: score.id, token, firstEventId: payload.score.currentRevision.scoreJson.measures[0].events[0].id as string };
}

test("share management wraps full URLs within a 390px viewport", async ({ page, context, request }) => {
  const fixture = await createLayoutScore(request);
  const shared = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/share-links`, {
    headers: { Authorization: `Bearer ${fixture.token}` }, data: { permission: "view" },
  });
  expect(shared.status()).toBe(201);
  await context.addCookies([{ name: "score_locale", value: "en", domain: "127.0.0.1", path: "/" }]);
  await page.addInitScript(token => localStorage.setItem("score-auth-token", token), fixture.token);
  await page.goto(`${appUrl}/scores/${fixture.documentId}#score-sharing`);
  const link = page.locator("#score-sharing .item-title").first();
  await expect(link).toContainText("/scores/shared/");
  await expectNoHorizontalOverflow(page);
});

test("editing then transposing then playing on the same mobile page stays within 390px", async ({ page, context, request }) => {
  const fixture = await createLayoutScore(request);
  await context.addCookies([{ name: "score_locale", value: "en", domain: "127.0.0.1", path: "/" }]);
  await page.addInitScript(token => localStorage.setItem("score-auth-token", token), fixture.token);
  await page.goto(`${appUrl}/scores/${fixture.documentId}#visual-editor`);
  const editor = page.locator("[data-score-draft-editor]");
  await expect(editor).toBeVisible();
  await editor.locator(`[data-vexflow-event-id="${fixture.firstEventId}"], [data-score-event-id="${fixture.firstEventId}"]`).first().click();
  await editor.locator("select").first().selectOption("G");
  await editor.locator("select").first().blur();
  await editor.getByRole("button", { name: "Save pitch and duration", exact: true }).click();
  const undo = editor.getByRole("button", { name: /Undo my operation/ }).first();
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(editor.getByRole("button", { name: /Redo my operation/ }).first()).toBeEnabled();
  // Hash navigation keeps the same mounted workspace and its edited state.
  await page.evaluate(() => { location.hash = "transpose-score"; });
  const transpose = page.locator("#transpose-score form.transpose-panel");
  await transpose.locator('input[type="number"]').first().fill("2");
  const transposed = page.waitForResponse(response => response.url().endsWith("/transpose") && response.request().method() === "POST");
  await transpose.locator('button[type="submit"]').click();
  expect((await transposed).ok()).toBe(true);
  await expect(transpose.locator('button[type="submit"]')).toBeEnabled();
  await page.getByRole("navigation", { name: "Edit", exact: true }).getByRole("button", { name: "Play", exact: true }).click();
  const panel = page.locator('[data-workspace-view="play"]');
  await panel.getByRole("button", { name: "Play", exact: true }).first().click();
  const stop = panel.getByRole("button", { name: "Stop", exact: true }).first();
  await expect(stop).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  await stop.click();
  await expectNoHorizontalOverflow(page);
});
