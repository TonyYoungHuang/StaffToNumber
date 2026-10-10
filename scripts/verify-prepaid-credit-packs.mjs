import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, expect } from "@playwright/test";

const origin = process.env.PREPAID_TEST_ORIGIN || "http://127.0.0.1:43111";
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/, "Use a local built frontend with fixture APIs");
const output = process.env.PREPAID_TEST_OUTPUT || ".tmp/prepaid-browser";
fs.mkdirSync(output, { recursive: true });
const report = { fixtureOnly: true, realPayments: false, checks: [] };
const browser = await chromium.launch({ channel: "msedge", headless: true });
const pass = message => { report.checks.push(message); console.log("PASS", message); };
try {
  for (const initial of [50, 200]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    let signedIn = false, total = initial, used = 0, toppedUp = false;
    const errors = [], requests = [];
    const user = () => ({ id: `fixture-prepaid-${initial}`, email: "prepaid@example.invalid", codeLoginEnabled: true,
      entitlement: { status: "active", endsAt: null, source: "prepaid_credits" }, freeTrial: { available: false }, scorePasses: [],
      prepaidCredits: { total, used, remaining: total - used } });
    const usage = () => ({ tier: total >= 200 ? "converter-pro" : "starter", creditMode: "prepaid",
      periodStart: "2026-10-01T00:00:00.000Z", periodEnd: "2026-11-01T00:00:00.000Z",
      jobs: { limit: total, used, remaining: total - used }, prepaid: { total, used, remaining: total - used },
      storage: { usedBytes: 0, limitBytes: (total >= 200 ? 500 : 250) * 1024 * 1024, remainingBytes: (total >= 200 ? 500 : 250) * 1024 * 1024 } });
    await context.addCookies([{ name: "score_locale", value: "zh-CN", url: origin }]);
    await context.route(/^https:\/\//, route => route.abort());
    await context.route("**/api/**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path === "/api/locale") return route.continue();
      const headers = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true",
        "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type,authorization,idempotency-key,x-score-session" };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      let status = 200, data;
      if (path === "/api/auth/me" || path === "/api/session") {
        status = signedIn ? 200 : 401; data = signedIn ? { user: user(), token: "fixture-prepaid-token" } : { error: "Unauthorized" };
      } else if (path === "/api/auth/activation-code") {
        requests.push(request.postDataJSON().code); signedIn = true; data = { user: user(), token: "fixture-prepaid-token", isNewUser: requests.length === 1 };
      } else if (path === "/api/auth/logout") { signedIn = false; data = { ok: true }; }
      else if (path === "/api/payments/billing/usage") data = { usage: usage() };
      else if (path === "/api/payments/billing") data = { subscriptions: [], invoices: [], seatAssignments: [], purchases: [] };
      else if (path === "/api/activation/redeem") {
        assert.equal(request.headers().authorization, "Bearer fixture-prepaid-token");
        assert.equal(request.postDataJSON().code, "fixture-topup-200");
        const alreadyRedeemed = toppedUp; if (!toppedUp) total += 200; toppedUp = true;
        data = { ok: true, entitlement: null, alreadyRedeemed };
      } else { status = 404; data = { error: "Unconfigured fixture: " + path }; }
      await route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(data) });
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(90000);
    page.on("pageerror", error => errors.push(error.message));
    const login = async () => {
      await page.locator('input[name="activationCode"]').fill(`fixture-original-${initial}`);
      await page.getByRole("button", { name: "用激活码登录", exact: true }).click();
      await expect(page.getByText(`激活码账户 ${user().id.slice(-8).toUpperCase()}`, { exact: false })).toBeVisible();
    };
    await page.goto(origin + "/activate?shop=1"); await login();
    await expect(page.getByText(`剩余 ${initial} / ${initial} 积分`, { exact: false })).toBeVisible();
    await expect(page.getByText(`存储上限 ${initial === 50 ? 250 : 500} MiB`, { exact: false })).toBeVisible();
    assert.equal(await page.getByText("到期时间", { exact: false }).count(), 0);
    pass(`credits-${initial}: code login shows permanent balance and correct storage`);
    used = initial; await page.reload();
    await expect(page.getByText(`剩余 0 / ${initial} 积分`, { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "打开我的乐谱 / 继续操作", exact: true })).toBeVisible();
    pass(`credits-${initial}: exhausted balance preserves existing-score access`);
    await page.getByRole("button", { name: "退出 / 换一个激活码登录", exact: true }).click(); await login();
    await expect(page.getByText(`剩余 0 / ${initial} 积分`, { exact: false })).toBeVisible();
    assert.deepEqual(requests, [`fixture-original-${initial}`, `fixture-original-${initial}`]);
    pass(`credits-${initial}: repeat login retains balance and original account`);
    await page.locator("summary").filter({ hasText: "补充积分" }).click();
    const form = page.locator("details form"); await form.locator('input[name="activationCode"]').fill("fixture-topup-200");
    await form.locator('button[type="submit"]').click();
    await expect(page.getByText(`剩余 200 / ${initial + 200} 积分`, { exact: false })).toBeVisible();
    await page.locator("summary").filter({ hasText: "补充积分" }).click();
    await form.locator('input[name="activationCode"]').fill("fixture-topup-200");
    await form.locator('button[type="submit"]').click();
    await expect(page.getByText("这个码已经兑换过，权益没有重复增加", { exact: true })).toBeVisible();
    await expect(page.getByText(`剩余 200 / ${initial + 200} 积分`, { exact: false })).toBeVisible();
    pass(`credits-${initial}: 200-credit top-up stays on current account; repeat redemption is idempotent`);
    await context.addCookies([{ name: "score_locale", value: "en", url: origin }]); await page.goto(origin + "/billing");
    await expect(page.getByRole("heading", { name: "Prepaid credits", exact: true })).toBeVisible();
    await expect(page.getByText("No monthly reset or expiry.", { exact: false })).toBeVisible();
    await expect(page.getByText("Editing, transposing and playback do not.", { exact: false })).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []); await page.screenshot({ path: `${output}/credits-${initial}-billing.png` });
    pass(`credits-${initial}: English mobile billing shows prepaid rules without runtime errors`);
    await context.close();
  }
} finally {
  fs.writeFileSync(output + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}