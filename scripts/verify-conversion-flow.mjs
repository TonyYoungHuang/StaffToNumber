import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, expect } from "@playwright/test";

const app = process.env.CONVERSION_TEST_ORIGIN || "http://127.0.0.1:43111";
assert.match(app, /^http:\/\/127\.0\.0\.1:\d+$/, "Use only a local frontend with fixture APIs");
const output = process.env.CONVERSION_TEST_OUTPUT || ".tmp/conversion-flow";
fs.mkdirSync(output, { recursive: true });
const report = { fixtureOnly: true, realGoogleLogin: false, realPayments: false, checks: [] };
const pass = message => { report.checks.push(message); console.log("PASS", message); };
const browser = await chromium.launch({ channel: "msedge", headless: true });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let signedIn = false, freeTrial = true;
  const checkouts = [], errors = [];
  const user = () => ({ id: "conversion-fixture-user", email: "conversion@example.invalid", entitlement: { status: "inactive" }, freeTrial: { available: freeTrial }, scorePasses: [] });
  await context.addCookies([{ name: "score_locale", value: "en", url: app }]);
  await context.addInitScript(() => {
    window.fixtureEvents = [];
    window.gtag = (...event) => window.fixtureEvents.push(event);
  });
  await context.route("https://accounts.google.com/**", route => route.abort());
  await context.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const headers = { "access-control-allow-origin": app, "access-control-allow-credentials": "true", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type,authorization,idempotency-key,x-score-session" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    let status = 200, data;
    if (path === "/api/auth/me" || path === "/api/session") {
      status = signedIn ? 200 : 401;
      data = signedIn ? { user: user(), token: "fixture-token" } : { error: "Unauthorized" };
    } else if (path === "/api/auth/login" || path === "/api/auth/register") {
      signedIn = true; data = { user: user(), token: "fixture-token", isNewUser: path.endsWith("register") };
    } else if (path === "/api/payments/checkout/authenticated") {
      checkouts.push({ body: request.postDataJSON(), key: request.headers()["idempotency-key"] });
      data = { orderId: "fixture-order", url: app + "/fixture-provider" };
    } else if (path === "/api/scores") data = { scores: [] };
    else if (path === "/api/scores/recognition-options") data = {
      defaultMode: "simple", quota: { jobs: { used: 0, limit: 25, remaining: 25 } },
      freeTrial: { available: freeTrial, omrJobsRemaining: freeTrial ? 1 : 0 }, scorePasses: [],
      options: [
        { mode: "simple", creditCost: 5, canSubmit: freeTrial, reason: freeTrial ? null : "PLAN_REQUIRED", creditSource: freeTrial ? "free_trial" : null },
        { mode: "complex", creditCost: 10, canSubmit: false, reason: "PLAN_REQUIRED", creditSource: null },
      ],
    };
    else if (path === "/api/scores/import/omr/preflight") data = { preflight: {
      schemaVersion: 1, recommendation: "simple", confidence: "high", sourcePageCount: 1, pagesAnalyzed: 1, complete: true, reasonCodes: [],
      pages: [{ page: 1, staffCount: 1, systemCount: 1, maxStavesPerSystem: 1, hasTab: false, uncertain: false }],
      recognitionSupport: { supported: true, code: "READY" },
    } };
    else { status = 404; data = { error: "Unconfigured fixture endpoint: " + path }; }
    await route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(data) });
  });
  await context.route(app + "/fixture-provider", route => route.fulfill({ contentType: "text/html", body: "<h1>Payment provider fixture</h1>" }));
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(90000);
  page.on("pageerror", error => errors.push(error.message));
  const emailLogin = async () => {
    await page.locator('input[type="email"]').fill("conversion@example.invalid");
    await page.locator('input[type="password"]').fill("fixture-password");
    await page.locator('form').filter({ has: page.locator('input[type="password"]') }).locator('button[type="submit"]').click();
  };
  await page.goto(app + "/checkout", { timeout: 90000 });
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await emailLogin();
  await expect(page).toHaveURL(app + "/fixture-provider");
  assert.equal(checkouts.length, 1);
  assert.equal(checkouts[0].body.planCode, "starter-monthly");
  assert.equal(checkouts[0].body.billingKind, "subscription");
  assert.ok(checkouts[0].key);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("scoretransposer_pending_checkout")), null);
  pass("App email authentication automatically starts one Starter monthly checkout and clears pending intent");

  await page.goto(app + "/checkout");
  await expect(page.locator('#checkout-action form button[type="submit"]')).toBeVisible();
  assert.equal(checkouts.length, 1, "An already signed-in visit must not start checkout automatically");
  pass("Already signed-in checkout visits wait for an explicit payment click");

  signedIn = false;
  await page.evaluate(() => localStorage.clear());
  await page.goto(app + "/scores", { timeout: 90000 });
  const scan = page.locator("#free-scan");
  await expect(scan).toBeVisible();
  await page.locator("#score-file-input").setInputFiles({ name: "fixture-score.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fixture") });
  await scan.locator('button[type="submit"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await emailLogin();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(scan.getByText("fixture-score.pdf", { exact: true })).toBeVisible();
  await expect(scan.locator('[data-free-simple-path="true"]')).toBeVisible();
  await expect(scan.locator('button[data-recognition-confirm="true"]')).toBeEnabled();
  assert.equal(await scan.locator('input[type="radio"]').count(), 0, "Advanced modes should be collapsed initially");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: output + "/mobile-free-scan.png" });
  pass("A guest file survives email login; mobile simple recognition is ready in one tap with advanced modes collapsed");

  freeTrial = false;
  await page.goto(app + "/scores");
  await page.locator("#score-file-input").setInputFiles({ name: "fixture-next-score.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fixture next") });
  const upsell = page.locator('[data-one-score-upsell="score_import"]');
  await expect(upsell).toBeVisible();
  await expect(upsell.locator('[data-plan-type="one_score"]')).toHaveClass(/button-primary/);
  await expect(upsell.locator('[data-plan-type="one_score"]')).toContainText("2.99");
  await expect(upsell.locator('[data-plan-type="subscription"]')).toHaveClass(/button-secondary/);
  await expect(upsell.locator('[data-plan-type="activation_code"]')).toHaveCount(0);
  await upsell.locator('[data-plan-type="one_score"]').evaluate(button => { button.click(); button.click(); });
  await expect(page).toHaveURL(app + "/fixture-provider");
  assert.equal(checkouts.length, 2);
  assert.equal(checkouts[1].body.planCode, "single-score");
  assert.equal(checkouts[1].body.billingKind, "one_time");
  assert.equal(checkouts[1].body.provider, "stripe");
  pass("Exhausted free users see the $2.99 Pass as primary; a double click creates only one Stripe one-time checkout");

  for (const locale of ["zh-CN", "zh-TW"]) {
    await context.addCookies([{ name: "score_locale", value: locale, url: app }]);
    await page.goto(app + "/scores");
    await page.locator("#score-file-input").setInputFiles({ name: "fixture-cn-score.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fixture cn") });
    await expect(upsell.locator('[data-plan-type="one_score"]')).toBeVisible();
    await expect(upsell.locator('[data-plan-type="subscription"]')).toBeVisible();
    await expect(upsell.locator('[data-plan-type="activation_code"]')).toHaveAttribute("href", /\/activate\?next=/);
    const checkoutCount = checkouts.length;
    await upsell.locator('[data-plan-type="activation_code"]').click();
    await expect(page).toHaveURL(/\/activate\?next=/);
    assert.equal(checkouts.length, checkoutCount, "Activation-code navigation must not create a card checkout");
    const events = await page.evaluate(() => window.fixtureEvents);
    assert.ok(events.some(event => event[1] === "upgrade_click" && event[2]?.source === "score_import_activation_code" && event[2]?.plan_type === "activation_code"));
    pass(locale + " separates card Pass, subscription and activation; activation uses the new analytics source");
  }
  assert.deepEqual(errors, []);
  pass("No browser runtime errors");
} catch (error) {
  if (page) await page.screenshot({ path: output + "/failure.png", timeout: 5000 }).catch(() => {});
  throw error;
} finally {
  fs.writeFileSync(output + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}
