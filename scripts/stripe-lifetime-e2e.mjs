// Run with node --import tsx. Explicit TEST-only, isolated local SQLite; no deployment.
import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import Stripe from "stripe";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rawBody from "fastify-raw-body";
import { chromium } from "@playwright/test";
import { assertTestKey } from "./stripe-lifetime-test-price.mjs";

const root = process.cwd();
const job = process.argv.find(a => a.startsWith("--job-dir="))?.slice(10);
if (!job || !/^E:[\\/]/i.test(path.resolve(job))) throw new Error("Explicit E: job directory required.");
const run = path.join(job, `run-${Date.now()}`);
fs.mkdirSync(run, { recursive: true });
const temp = path.join(job, "tmp"); fs.mkdirSync(temp, { recursive: true });
Object.assign(process.env, { TEMP: temp, TMP: temp, TMPDIR: temp, npm_config_cache: path.join(job, "npm-cache"), XDG_CACHE_HOME: path.join(job, "cache") });
const local = parseEnv(fs.readFileSync(path.join(root, "services/api/.env.local"), "utf8"));
const key = local.STRIPE_SECRET_KEY?.trim(); assertTestKey(key);
const priceEnv = parseEnv(fs.readFileSync(path.join(job, "test-price.env"), "utf8"));
const apiUrl = "http://127.0.0.1:4411", wwwUrl = "http://127.0.0.1:3411";
Object.assign(process.env, { STRIPE_SECRET_KEY: key, STRIPE_TEST_ONLY: "true", STRIPE_MANAGED_PAYMENTS_ENABLED: "false",
  STRIPE_LIFETIME_AUTOMATIC_TAX: "false", STRIPE_PRICE_CONVERTER_PRO_LIFETIME: priceEnv.STRIPE_PRICE_CONVERTER_PRO_LIFETIME,
  NODE_ENV: "test", RUNTIME_DATABASE_PRIMARY: "sqlite", POSTGRES_URL: "", POSTGRES_TEST_URL: "", DB_FILE: path.join(run, "e2e.sqlite"),
  STORAGE_DIR: path.join(run, "storage"), STORAGE_BACKEND: "local", JOB_BROKER_BACKEND: "database", LIFECYCLE_CLEANUP_ENABLED: "false",
  RESEND_API_KEY: "", PAYMENT_NOTIFICATION_EMAIL: "", PUBLIC_API_URL: apiUrl, PUBLIC_SITE_URL: wwwUrl,
  PUBLIC_APP_URL: "http://127.0.0.1:3412", PAYMENT_PROVIDERS: "stripe", STRIPE_WEBHOOK_SECRET: `whsec_local_${randomUUID()}` });
const stripe = new Stripe(key, { timeout: 20000, maxNetworkRetries: 1 });
const request = async operation => { assertTestKey(key); const value = await operation(stripe); if (value.livemode !== undefined) assert.equal(value.livemode, false); return value; };
const mask = value => String(value).replace(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+/g, "[SECRET]")
  .replace(/((?:return_token|token|session_id)%3D).*?(?=%26|\s|$)/gi, "$1[REDACTED]")
  .replace(/((?:return_token|token|session_id)=)[^&\s]+/g, "$1[REDACTED]")
  .replace(/https:\/\/checkout\.stripe\.com\/[^\s"']+/g, "[CHECKOUT_URL]")
  .replace(/whsec_[A-Za-z0-9_-]+/g, "[WEBHOOK_SECRET]").replace(/\b(?:cs_test_|pi_|ch_|evt_|cus_|sub_|price_|prod_|in_|re_|promo_)[A-Za-z0-9]+/g, id => `${id.slice(0, 9)}…${id.slice(-4)}`)
  .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[EMAIL]");
const results = { run, webhook: "stripe_cli", checks: [], objects: {} };
const record = (name, data = {}) => { results.checks.push({ name, ...data }); fs.writeFileSync(path.join(job, "e2e-results.json"), mask(JSON.stringify(results, null, 2))); console.log(mask(JSON.stringify({ name, ...data }))); };
const children = [];
const createdSessions = [];
let app, browser, page;
const pause = ms => new Promise(r => setTimeout(r, ms));
try {
  const tax = await request(s => s.tax.settings.retrieve());
  results.objects.lifetimePrice = priceEnv.STRIPE_PRICE_CONVERTER_PRO_LIFETIME;
  record("stripe_tax_settings", { status: tax.status });
  process.env.STRIPE_LIFETIME_AUTOMATIC_TAX = tax.status === "active" ? "true" : "false";
  const { db, initDb } = await import("../services/api/src/db.ts"); initDb();
  const { config } = await import("../services/api/src/config.ts");
  const { authPlugin } = await import("../services/api/src/plugins/auth.ts");
  const { authRoutes } = await import("../services/api/src/routes/auth.ts");
  const { paymentRoutes } = await import("../services/api/src/routes/payments.ts");
  const { paymentWebhookRoutes } = await import("../services/api/src/routes/payment-webhooks.ts");
  const { createUser, createSession, getUserProfile } = await import("../services/api/src/repositories/auth-repository.ts");
  app = Fastify({ logger: false });
  await app.register(cors, { origin: [wwwUrl, "http://127.0.0.1:3412"], credentials: true });
  await app.register(rawBody, { global: false, encoding: false }); await app.register(authPlugin);
  await app.register(authRoutes, { prefix: "/api" }); await app.register(paymentRoutes, { prefix: "/api", paymentServices: { sendTransactionalEmail: async () => ({ mode: "console" }) } });
  await app.register(paymentWebhookRoutes, { prefix: "/api" }); await app.listen({ host: "127.0.0.1", port: 4411 });

  // CLI has no live flag and receives only the asserted TEST credential. Its
  // config, temp files and sanitized output all remain under the E: job folder.
  assertTestKey(key);
  const listener = spawn("stripe", ["listen", "--skip-update", "--latest", "--config", path.join(job, "stripe-cli.toml"),
    "--events", "checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded,charge.dispute.created",
    "--forward-to", `${apiUrl}/api/webhooks/stripe`], { env: { ...process.env, STRIPE_API_KEY: key }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  children.push(listener);
  let ready = false;
  const output = chunk => {
    const value = chunk.toString(); const secret = /whsec_[A-Za-z0-9]+/.exec(value)?.[0];
    if (secret) { config.stripeWebhookSecret = secret; ready = true; }
    fs.appendFileSync(path.join(run, "stripe-listen.log"), mask(value));
  };
  listener.stdout.on("data", output); listener.stderr.on("data", output); listener.on("error", e => record("stripe_cli_error", { message: e.message }));
  for (let i = 0; i < 30 && !ready; i++) await pause(1000);
  if (!ready) { listener.kill(); results.webhook = "signed_replay_real_test_objects"; record("stripe_cli_unavailable_using_signed_replay"); }

  const frontendEnv = { ...process.env, NODE_ENV: "development", NEXT_PUBLIC_API_BASE_URL: apiUrl, NEXT_PUBLIC_SITE_URL: wwwUrl,
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3412", NEXT_PUBLIC_CHECKOUT_AVAILABLE: "true", NEXT_PUBLIC_PAYMENT_PROVIDERS: "stripe",
    NEXT_PUBLIC_LIVE_PAYMENT_PROVIDERS: "stripe", NEXT_PUBLIC_ANALYTICS_ENABLED: "true", NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-TESTONLY", NEXT_PUBLIC_CLARITY_PROJECT_ID: "", NEXT_TELEMETRY_DISABLED: "1" };
  delete frontendEnv.STRIPE_SECRET_KEY; delete frontendEnv.STRIPE_WEBHOOK_SECRET;
  const frontend = spawn(process.execPath, [path.join(root, "apps/www/node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", "3411", "-H", "127.0.0.1"], { cwd: path.join(root, "apps/www"), env: frontendEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  children.push(frontend);
  for (const stream of [frontend.stdout, frontend.stderr]) stream.on("data", chunk => fs.appendFileSync(path.join(run, "www.log"), mask(chunk.toString())));
  const appFrontend = spawn(process.execPath, [path.join(root, "apps/www/node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", "3412", "-H", "127.0.0.1"], { cwd: path.join(root, "apps/app"), env: frontendEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  children.push(appFrontend);
  for (const stream of [appFrontend.stdout, appFrontend.stderr]) stream.on("data", chunk => fs.appendFileSync(path.join(run, "app.log"), mask(chunk.toString())));
  for (let i = 0; i < 90; i++) { try { if ((await fetch(`${wwwUrl}/checkout/success`, { signal: AbortSignal.timeout(5000) })).status < 500) break; } catch {} await pause(1000); }
  for (let i = 0; i < 90; i++) { try { if ((await fetch("http://127.0.0.1:3412/checkout/success", { signal: AbortSignal.timeout(5000) })).status < 500) break; } catch {} await pause(1000); }
  browser = await chromium.launch({ headless: true, downloadsPath: path.join(run, "downloads") });
  const context = await browser.newContext();
  const purchaseEvents = [];
  await context.exposeBinding("__capturePurchase", (_source, args) => {
    if (args[0] === "event" && args[1] === "purchase") {
      const active = db.prepare("SELECT status FROM lifetime_entitlements WHERE payment_intent_id = ?").get(args[2].transaction_id)?.status === "active";
      purchaseEvents.push({ parameters: args[2], backendActive: active });
    }
  });
  // Collect analytics locally; never transmit test purchases to real GA.
  await context.route(/google-analytics\.com|googletagmanager\.com|clarity\.ms/, route => route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await context.addInitScript(() => {
    window.__testAnalytics = [];
    const capture = (...args) => { window.__testAnalytics.push(args); void window.__capturePurchase(args); };
    window.dataLayer = [];
    window.dataLayer.push = function (...entries) {
      for (const entry of entries) if (entry && typeof entry.length === 'number') capture(...Array.from(entry));
      return Array.prototype.push.apply(this, entries);
    };
    window.gtag = (...args) => window.dataLayer.push(args);
    if (location.hostname === "127.0.0.1") document.cookie = "scoretransposer_analytics_consent=granted; Path=/; SameSite=Lax";
  });
  page = await context.newPage();
  async function newAccount(label) {
    const email = `lifetime-${label}-${Date.now()}@example.invalid`;
    const user = createUser(email, "not-a-login-password", randomUUID()); const token = randomUUID(); createSession(user.id, token, 1);
    return { id: user.id, email, token };
  }
  async function api(user, endpoint, body) {
    const response = await fetch(`${apiUrl}${endpoint}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json", ...(body ? { "Idempotency-Key": randomUUID() } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const json = await response.json(); if (!response.ok) throw new Error(`Local API ${response.status}: ${JSON.stringify(json)}`); return json;
  }
  async function checkout(user) {
    const created = await api(user, "/api/payments/checkout/authenticated", { provider: "stripe", planCode: "converter-pro-lifetime", billingKind: "one_time", locale: "en", returnSite: "www", returnPath: "/pricing" });
    const order = db.prepare("SELECT * FROM payment_orders WHERE id = ?").get(created.orderId);
    const session = await request(s => s.checkout.sessions.retrieve(order.checkout_session_id));
    createdSessions.push(session.id);
    return { ...created, session, user };
  }
  async function replay(type, object) {
    const payload = JSON.stringify({ id: `evt_local_${randomUUID().replaceAll("-", "")}`, object: "event", type, livemode: false, created: Math.floor(Date.now() / 1000), data: { object } });
    const response = await fetch(`${apiUrl}/api/webhooks/stripe`, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": stripe.webhooks.generateTestHeaderString({ payload, secret: config.stripeWebhookSecret }) }, body: payload });
    assert.equal(response.status, 200, await response.text());
  }
  async function pay(purchase, label) {
    const beforeEvents = purchaseEvents.length;
    await context.addCookies([{ name: "score_session", value: purchase.user.token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
    await page.goto(purchase.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    record(`${label}_hosted_checkout_loaded`);
    const cardOption = page.getByText("Card", { exact: true }).first();
    await cardOption.waitFor({ timeout: 30000 });
    // Stripe's accordion uses a CSS cover button with a zero-size DOM box.
    // Click the visible card label's screen position, as a user would.
    const cardBox = await cardOption.boundingBox();
    if (cardBox) await page.mouse.click(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.locator('#cardNumber').waitFor({ timeout: 60000 });
    if (await page.locator('#email').count()) await page.locator('#email').fill(purchase.user.email);
    await page.locator('#cardNumber').fill('4242424242424242');
    await page.locator('#cardExpiry').fill('1230'); await page.locator('#cardCvc').fill('123');
    if (await page.locator('#billingName').count()) await page.locator('#billingName').fill('Lifetime Test');
    if (await page.locator('#billingCountry').count()) await page.locator('#billingCountry').selectOption('US');
    for (const [selector, value] of [['#billingAddressLine1','510 Townsend St'],['#billingLocality','San Francisco'],['#billingPostalCode','94103']]) {
      if (await page.locator(selector).isVisible()) await page.locator(selector).fill(value);
    }
    if (await page.locator('#billingAdministrativeArea').isVisible()) { const field = page.locator('#billingAdministrativeArea'); if (await field.evaluate(el => el.tagName === 'SELECT')) await field.selectOption('CA'); else await field.fill('CA'); }
    await page.locator('button[type="submit"]').click();
    record(`${label}_4242_submitted`);
    await page.waitForURL(url => url.hostname === "127.0.0.1" && ["3411", "3412"].includes(url.port), { timeout: 120000, waitUntil: "domcontentloaded" });
    const paid = await request(s => s.checkout.sessions.retrieve(purchase.session.id)); assert.equal(paid.payment_status, "paid");
    if (!ready) await replay("checkout.session.completed", paid);
    let status;
    for (let i = 0; i < 40; i++) { status = await api(purchase.user, `/api/payments/orders/${purchase.orderId}/owned`); if (status.verification.status === "ready") break; await pause(1000); }
    assert.equal(status.verification.status, "ready"); assert.equal(status.order.lifetime.status, "active");
    assert.equal(getUserProfile(purchase.user.id).entitlement.lifetime, true);
    record(`${label}_backend_ready`);
    await page.waitForURL(url => (url.origin === wwwUrl && url.pathname === "/pricing") || (url.port === "3412" && url.pathname === "/scores"), { timeout: 120000, waitUntil: "domcontentloaded" });
    for (let i = 0; i < 40 && purchaseEvents.length === beforeEvents; i++) await pause(500);
    const events = purchaseEvents.slice(beforeEvents);
    if (!events.length) record("analytics_diagnostic", await page.evaluate(() => ({ path: location.pathname, events: window.__testAnalytics, pending: localStorage.getItem('scoretransposer_confirmed_purchases'), consent: document.cookie.split(';').find(s => s.includes('analytics_consent')) })));
    assert.equal(events.length, 1); assert.equal(events[0].parameters.transaction_id, paid.payment_intent);
    assert.equal(events[0].backendActive, true);
    assert.equal(events[0].parameters.value, (paid.amount_subtotal - paid.total_details.amount_discount) / 100);
    await page.reload({ waitUntil: 'domcontentloaded' }); await pause(1500);
    assert.equal(purchaseEvents.length, beforeEvents + 1);
    record(`${label}_paid_ready_analytics_once`, { subtotal: paid.amount_subtotal, discount: paid.total_details.amount_discount, tax: paid.total_details.amount_tax, total: paid.amount_total, intent: paid.payment_intent });
    return paid;
  }
  const standard = await checkout(await newAccount("standard"));
  results.objects.standardSession = standard.session.id;
  assert.equal(standard.session.amount_subtotal, 9900);
  const pending = await api(standard.user, `/api/payments/orders/${standard.orderId}/owned`);
  assert.ok(["waiting_payment", "waiting_fulfillment"].includes(pending.verification.status));
  assert.equal(pending.order.status, "pending"); assert.equal(pending.order.lifetime, null);
  record("unpaid_checkout_has_no_entitlement");
  const paid = await pay(standard, "standard");
  const refund = await request(s => s.refunds.create({ payment_intent: paid.payment_intent }, { idempotencyKey: `e2e-refund-${standard.orderId}` }));
  results.objects.refund = refund.id;
  if (!ready) await replay("charge.refunded", await request(s => s.charges.retrieve(refund.charge)));
  for (let i = 0; i < 40 && db.prepare("SELECT status FROM lifetime_entitlements WHERE source_order_id = ?").get(standard.orderId)?.status !== "revoked"; i++) await pause(1000);
  assert.equal(db.prepare("SELECT status FROM lifetime_entitlements WHERE source_order_id = ?").get(standard.orderId).status, "revoked");
  await replay("checkout.session.completed", paid);
  assert.equal(db.prepare("SELECT status FROM lifetime_entitlements WHERE source_order_id = ?").get(standard.orderId).status, "revoked");
  record("full_refund_revokes_and_payment_replay_cannot_restore", { refund: refund.id });

  const annualUser = await newAccount("annual");
  const product = await request(s => s.products.create({ name: "Lifetime E2E annual fixture", metadata: { purpose: "lifetime-e2e" } }));
  const annualPrice = await request(s => s.prices.create({ product: product.id, unit_amount: 6000, currency: "usd", recurring: { interval: "year" } }));
  config.stripeConverterProAnnualPriceId = annualPrice.id;
  const customer = await request(s => s.customers.create({ email: annualUser.email, metadata: { userId: annualUser.id }, payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } }));
  const annual = await request(s => s.subscriptions.create({ customer: customer.id, items: [{ price: annualPrice.id }], metadata: { userId: annualUser.id }, payment_behavior: "error_if_incomplete" }));
  assert.equal(annual.status, "active");
  const customerLocal = randomUUID(), now = new Date().toISOString();
  db.prepare("INSERT INTO billing_customers (id,provider,provider_customer_id,user_id,created_at,updated_at) VALUES (?,'stripe',?,?,?,?)").run(customerLocal, customer.id, annualUser.id, now, now);
  db.prepare("INSERT INTO billing_subscriptions (id,provider,provider_subscription_id,customer_id,user_id,status,plan_ref,seat_quantity,current_period_start,current_period_end,created_at,updated_at) VALUES (?,'stripe',?,?,?,'active',?,1,?,?,?,?)").run(randomUUID(), annual.id, customerLocal, annualUser.id, annualPrice.id, new Date(annual.items.data[0].current_period_start * 1000).toISOString(), new Date(annual.items.data[0].current_period_end * 1000).toISOString(), now, now);
  const quote = await api(annualUser, "/api/payments/lifetime-quote"); assert.equal(quote.upgrade, true); assert.ok(quote.creditMinor > 5900 && quote.creditMinor <= 6000);
  await context.addCookies([{ name: "score_session", value: annualUser.token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${wwwUrl}/pricing`, { waitUntil: "domcontentloaded" });
  const upgradeCard = page.locator('[data-plan="converter-pro-lifetime"]');
  await upgradeCard.getByText("Annual upgrade price", { exact: true }).waitFor({ timeout: 30000 });
  assert.ok((await upgradeCard.innerText()).includes(new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(quote.amountMinor / 100)));
  assert.ok((await upgradeCard.innerText()).includes("Plus applicable tax"));
  record("annual_upgrade_price_and_tax_visible_in_pricing_ui");
  const abandoned = await checkout(annualUser);
  assert.equal((await request(s => s.subscriptions.retrieve(annual.id))).cancel_at_period_end, false);
  record("abandoned_annual_upgrade_preserves_renewal", { credit: abandoned.session.total_details.amount_discount });
  await request(s => s.checkout.sessions.expire(abandoned.session.id));
  // The actual Stripe expired status releases the previous reservation.
  const upgrade = await checkout(annualUser);
  const reserved = db.prepare("SELECT * FROM lifetime_upgrade_orders WHERE order_id = ?").get(upgrade.orderId);
  const coupon = await request(s => s.coupons.retrieve(reserved.coupon_id));
  const promotion = await request(s => s.promotionCodes.retrieve(reserved.promotion_code_id));
  Object.assign(results.objects, { annualCustomer: customer.id, annualSubscription: annual.id, annualPrice: annualPrice.id,
    annualInvoice: reserved.invoice_id, upgradeSession: upgrade.session.id, abandonedSession: abandoned.session.id,
    coupon: `${coupon.id.slice(0, 3)}…${coupon.id.slice(-4)}`, promotion: promotion.id });
  assert.equal(coupon.amount_off, reserved.credit_minor); assert.equal(coupon.duration, "once"); assert.equal(coupon.max_redemptions, 1);
  assert.equal(promotion.customer, customer.id); assert.equal(promotion.max_redemptions, 1); assert.ok(promotion.expires_at - Math.floor(Date.now()/1000) <= 3600);
  assert.equal(upgrade.session.total_details.amount_discount, reserved.credit_minor);
  record("annual_credit_coupon_customer_binding_and_expiry_verified", { paid: reserved.paid_minor, credit: reserved.credit_minor, upgradePrice: 9900 - reserved.credit_minor });
  const upgradePaid = await pay(upgrade, "annual_upgrade");
  for (let i = 0; i < 30 && !db.prepare("SELECT renewal_stopped_at FROM lifetime_upgrade_orders WHERE order_id = ?").get(upgrade.orderId)?.renewal_stopped_at; i++) await pause(1000);
  assert.equal((await request(s => s.subscriptions.retrieve(annual.id))).cancel_at_period_end, true);
  assert.ok(db.prepare("SELECT renewal_stopped_at FROM lifetime_upgrade_orders WHERE order_id = ?").get(upgrade.orderId).renewal_stopped_at);
  await replay("checkout.session.completed", upgradePaid);
  record("paid_upgrade_stops_annual_renewal_idempotently", { subscription: annual.id, session: upgrade.session.id });
  results.status = "passed"; record("e2e_complete");
} catch (error) {
  if (page) {
    fs.writeFileSync(path.join(run, "failure-page.txt"), mask(await page.locator("body").innerText().catch(() => "unavailable")));
    fs.writeFileSync(path.join(run, "failure-fields.json"), mask(JSON.stringify(await page.locator('input,button,select').evaluateAll(elements => elements.map(el => ({ tag: el.tagName, id: el.id, name: el.getAttribute('name'), type: el.getAttribute('type'), text: el.tagName === 'BUTTON' ? el.textContent : undefined }))).catch(() => []), null, 2)));
  }
  results.status = "failed"; record("e2e_failure", { message: error.message, stack: error.stack });
  throw new Error(mask(error.message));
} finally {
  for (const id of createdSessions) {
    try { const session = await request(s => s.checkout.sessions.retrieve(id)); if (session.status === "open") await request(s => s.checkout.sessions.expire(id)); } catch { /* IDs remain in the private local DB for recovery. */ }
  }
  await browser?.close(); await app?.close(); for (const child of children) child.kill();
}
