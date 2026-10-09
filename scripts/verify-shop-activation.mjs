import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";

const live = process.argv.includes("--live");
const origin = live ? "https://app.scoretransposer.com" : "http://localhost:3019";
const out = path.resolve(".tmp/code-login"); fs.mkdirSync(out, { recursive: true });
const adminKey = live ? process.env.SHOP_QA_ADMIN_KEY : "shop-qa-local-key";
if (!adminKey) throw new Error("Missing QA admin credential");
let app, database;
if (!live) {
  Object.assign(process.env, { NODE_ENV: "test", RUNTIME_DATABASE_PRIMARY: "sqlite", DB_FILE: path.join(out, `local-${randomUUID()}.sqlite`), STORAGE_DIR: path.join(out, "storage"), ADMIN_API_KEY: adminKey, RESEND_API_KEY: "", EMAIL_FROM_ADDRESS: "" });
  const { default: Fastify } = await import("fastify");
  const { db, initDb } = await import("../services/api/src/db.ts"); initDb(); database = db;
  const { authPlugin } = await import("../services/api/src/plugins/auth.ts");
  const { authRoutes } = await import("../services/api/src/routes/auth.ts");
  const { activationRoutes } = await import("../services/api/src/routes/activation.ts");
  const { adminActivationRoutes } = await import("../services/api/src/routes/admin-activation.ts");
  const { getPlanQuotaUsage } = await import("../services/api/src/lib/plan-quotas.ts");
  app = Fastify(); await app.register(authPlugin);
  for (const routes of [authRoutes, activationRoutes, adminActivationRoutes]) await app.register(routes, { prefix: "/api" });
  app.get("/api/payments/billing/usage", { preHandler: app.requireAuth }, request => ({ usage: getPlanQuotaUsage(request.authUserId) }));
}
const report = { mode: live ? "production" : "local-real-api", checks: [], errors: [] };
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  context.setDefaultTimeout(15000);
  await context.route("**/api.scoretransposer.com/api/**", async route => {
    if (live) return route.continue();
    const request = route.request();
    const url = new URL(request.url());
    const result = await app.inject({ method: request.method(), url: url.pathname + url.search, headers: request.headers(), payload: request.postData() ?? undefined });
    await route.fulfill({ status: result.statusCode, contentType: "application/json", body: result.body });
  });
  // Production-origin locale redirects are mapped back to this local image for local QA only.
  if (!live) await context.route("https://app.scoretransposer.com/**", async route => {
    const url = new URL(route.request().url());
    const response = await context.request.get(origin + url.pathname + url.search, { maxRedirects: 0 });
    const headers = { ...response.headers() };
    if (headers.location) headers.location = headers.location.replace("https://app.scoretransposer.com", origin);
    if (headers["set-cookie"]) headers["set-cookie"] = headers["set-cookie"].replace(/;\s*Domain=[^;]+/ig, "").replace(/;\s*Secure/ig, "");
    await route.fulfill({ status: response.status(), headers, body: await response.body() });
  });
  await context.addCookies([{ name: "score_locale", value: "en", url: origin }]);
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  if (live) await page.goto(origin + "/cn/admin");
  else { await context.addCookies([{ name: "score_locale", value: "zh-CN", url: origin }]); await page.goto(origin + "/admin/codes"); }
  await expect(page.getByRole("heading", { name: "生成、复制和管理激活码。" })).toBeVisible();
  await page.locator('input[type="password"]').fill(adminKey);
  await page.getByLabel("店铺 SKU / 网站套餐").selectOption("converter-pro-monthly");
  await page.getByLabel("店铺名称（可选）").fill("QA验收店铺");
  await page.getByLabel("订单号（单笔发货时填写）").fill("QA-CODELOGIN-20260928");
  await page.getByLabel("前缀", { exact: true }).fill("QALOGIN");
  const responsePromise = page.waitForResponse(response => response.url().endsWith("/activation-codes/generate") && response.request().method() === "POST");
  await page.getByRole("button", { name: "生成激活码", exact: true }).click();
  const response = await responsePromise; assert.equal(response.status(), 201); const generated = (await response.json()).codes[0];
  report.generatedCodeId = generated.id;
  await expect(page.getByText(generated.code, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "复制发货文案", exact: true }).first().click();
  await expect(page.getByLabel("可直接发给买家的文案")).toHaveValue(/Converter Pro · 1 个月/);
  const downloadPromise = page.waitForEvent("download"); await page.getByRole("button", { name: "下载本批 CSV" }).click();
  const download = await downloadPromise; assert.ok(download.suggestedFilename().endsWith(".csv"));
  await page.locator('input[type="password"]').fill("");
  await page.screenshot({ path: path.join(out, `${live ? "live" : "local"}-admin.png`), fullPage: true });
  report.checks.push("后台选择网站套餐、真实生成、发货文案、CSV");

  await context.addCookies([{ name: "score_locale", value: "en", url: origin }]);
  if (live) await page.goto(origin + "/cn");
  else { await context.addCookies([{ name: "score_locale", value: "zh-CN", url: origin }]); await page.goto(origin + "/activate?shop=1"); }
  await expect(page.getByRole("heading", { name: "输入激活码，开始使用" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  assert.equal(await page.locator('script[src*="accounts.google.com"]').count(), 0);
  report.checks.push("固定中文入口、英文 Cookie 覆盖、店铺流程无需 Google");
  await page.screenshot({ path: path.join(out, `${live ? "live" : "local"}-entry.png`), fullPage: true });
  assert.equal(await page.locator('input[type="email"],input[type="password"]').count(), 0);
  report.checks.push("买家入口只有激活码，无邮箱或密码输入框");
  await page.getByLabel("激活码", { exact: true }).fill("WRONG-CODE");
  await page.getByRole("button", { name: "用激活码登录", exact: true }).click();
  await expect(page.locator('.form-status[role="alert"]')).toContainText("没有找到这个激活码");
  await page.getByLabel("激活码", { exact: true }).fill(generated.code.toLowerCase().replaceAll("-", "— "));
  await page.getByRole("button", { name: "用激活码登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "激活成功", exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/当前额度：Converter Pro/)).toContainText("200 / 200");
  await expect(page.getByRole("button", { name: "音频转五线谱（暂未开放）", exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: "五线谱转音频 / 简谱 / 移调", exact: true })).toHaveAttribute("href", "/scores/new/scan");
  report.checks.push("免注册登录、错误码中文提示、粘贴格式兼容、自动开通 Pro 与 200 积分");
  await page.screenshot({ path: path.join(out, `${live ? "live" : "local"}-activated.png`), fullPage: true });
  async function profile() {
    return await page.evaluate(async () => {
      const token = localStorage.getItem("score-auth-token");
      const response = await fetch("https://api.scoretransposer.com/api/auth/me", { credentials: "include", headers: { authorization: `Bearer ${token}` } });
      return (await response.json()).user;
    });
  }
  const first = await profile(); report.qaUserId = first.id;
  await page.getByRole("button", { name: "退出 / 换一个激活码登录", exact: true }).click();
  await expect(page.getByRole("button", { name: "用激活码登录", exact: true })).toBeVisible();
  await page.getByLabel("激活码", { exact: true }).fill(generated.code);
  await page.getByRole("button", { name: "用激活码登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "登录成功", exact: true })).toBeVisible({ timeout: 20000 });
  const second = await profile(); assert.equal(second.id, first.id); assert.equal(second.entitlement.endsAt, first.entitlement.endsAt);
  await page.reload(); await expect(page.getByText(/使用权限已开通/)).toBeVisible({ timeout: 20000 });
  // Simulate a second device: remove session cookies, token and all remembered state.
  await page.evaluate(() => localStorage.clear()); await context.clearCookies();
  if (live) await page.goto(origin + "/cn");
  else { await context.addCookies([{ name: "score_locale", value: "zh-CN", url: origin }]); await page.goto(origin + "/activate?shop=1"); }
  await page.getByLabel("激活码", { exact: true }).fill(generated.code);
  await page.getByRole("button", { name: "用激活码登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "登录成功", exact: true })).toBeVisible({ timeout: 20000 });
  const fresh = await profile(); assert.equal(fresh.id, first.id); assert.equal(fresh.entitlement.endsAt, first.entitlement.endsAt);
  report.checks.push("退出重登、刷新、全新浏览器状态均回到原账户，期限不变");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(out, `${live ? "live" : "local"}-mobile.png`), fullPage: true });
  report.checks.push("390px 手机无横向溢出");
  if (live) {
    await page.getByRole("link", { name: "五线谱转音频 / 简谱 / 移调", exact: true }).click();
    await expect(page.getByRole("heading", { name: "识别 PDF 或乐谱图片", exact: true })).toBeVisible();
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
    assert.ok(!page.url().includes("checkout"));
    report.checks.push("激活后直接进入扫描上传工具，无需再次购买");
  }
  if (live) {
    await page.evaluate(() => localStorage.setItem("score-auth-token", "expired-qa-session"));
    await page.reload();
    await expect(page.getByRole("heading", { name: "输入激活码，开始使用", exact: true })).toBeVisible({ timeout: 20000 });
    assert.ok(!page.url().includes("/login"));
    report.checks.push("会话失效返回激活码登录，保留工具返回地址");
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close(); if (app) await app.close(); if (database) database.close();
  fs.writeFileSync(path.join(out, `${live ? "live" : "local"}-verification.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
