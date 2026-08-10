import { expect, test } from "@playwright/test";

const appUrl = "http://127.0.0.1:43101";
const adminKey = "e2e-admin-key-with-at-least-32-characters";

test("claimant submission, private tracking, admin review, and public update stay connected", async ({ page }) => {
  await page.route(/^http:\/\/(?:localhost|127\.0\.0\.1):4000\//u, async (route) => {
    const requestUrl = new URL(route.request().url());
    await route.continue({ url: `http://127.0.0.1:43102${requestUrl.pathname}${requestUrl.search}` });
  });

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await page.goto("/copyright-complaint");
  await expect(page.getByRole("heading", { name: "Copyright complaint and case status" })).toBeVisible();
  await page.getByLabel("Claimant name").fill("E2E Rights Owner");
  await page.getByLabel("Contact email").fill(`rights-${unique}@example.test`);
  await page.getByLabel("Original work and rights description").fill("An original engraved piano score first published by the E2E rights owner for release verification.");
  await page.getByLabel("Allegedly infringing ScoreTransposer URLs").fill(`${appUrl}/scores/shared/${unique}`);
  await page.getByLabel("Supporting evidence links (optional)").fill(`https://example.test/evidence/${unique}`);
  await page.getByLabel("Requested platform action").fill("Temporarily disable the public share while the rights claim is reviewed.");
  await page.getByLabel("Electronic signature (type legal name)").fill("E2E Rights Owner");
  await page.getByText("I have a good-faith belief").click();
  await page.getByText("I confirm the information is accurate").click();
  await page.getByRole("button", { name: "Submit complaint" }).click();

  const receipt = page.locator("#copyright-receipt");
  await expect(receipt.getByRole("heading", { name: "Complaint registered" })).toBeVisible();
  const referenceCode = (await receipt.locator("dd strong").nth(0).textContent())?.trim() ?? "";
  const accessCode = (await receipt.locator("dd strong").nth(1).textContent())?.trim() ?? "";
  expect(referenceCode).toMatch(/^COPY-/u);
  expect(accessCode.length).toBeGreaterThan(20);
  await page.locator("#track").getByRole("button", { name: "Check status" }).click();
  await expect(page.locator("#track").getByText("received", { exact: true }).first()).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(accessCode, "u"));

  await page.goto(`${appUrl}/admin/copyright`);
  await page.getByLabel("Admin API key").fill(adminKey);
  await page.getByRole("button", { name: "Refresh queue" }).click();
  await page.getByRole("button", { name: new RegExp(referenceCode, "u") }).click();
  const detail = page.locator(".score-workspace-grid > section").nth(1);
  await detail.getByLabel("Next status").selectOption("reviewing");
  await detail.getByLabel("Public claimant message").fill("The rights materials passed completeness review and are now under substantive review.");
  await detail.getByLabel("Internal note (never public)").fill("E2E internal note must not appear in claimant lookup.");
  await detail.getByRole("button", { name: "Save case update" }).click();
  await expect(detail.getByText("reviewing", { exact: true }).first()).toBeVisible();

  await page.goto("http://127.0.0.1:43100/copyright-complaint#track");
  const tracker = page.locator("#track");
  await tracker.getByLabel("Complaint reference").fill(referenceCode);
  await tracker.getByLabel("Access code").fill(accessCode);
  await tracker.getByRole("button", { name: "Check status" }).click();
  await expect(tracker.getByText("The rights materials passed completeness review and are now under substantive review.")).toBeVisible();
  await expect(tracker).not.toContainText("E2E internal note must not appear");
});
