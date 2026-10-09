import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';

const site = process.env.PRICING_TEST_ORIGIN || 'http://127.0.0.1:43110';
assert.match(site, /^http:\/\/127\.0\.0\.1:\d+$/, 'Only run against a local frontend');
const output = process.env.PRICING_TEST_OUTPUT || '.tmp/pricing-flow';
fs.mkdirSync(output, { recursive: true });
const report = { fixtureOnly: true, realGoogleLogin: false, realCharges: false, checks: [] };
const pass = text => { report.checks.push(text); console.log('PASS', text); };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let signedIn = false;
  let checkoutStatus = 200;
  const requests = [];
  const errors = [];
  const user = { id: 'pricing-fixture-user', email: 'pricing-test@example.invalid' };
  await context.addCookies([{ name: 'score_locale', value: 'en', url: site }]);
  await context.route('**/api/auth/google-button?**', async route => {
    const parent = new URL(route.request().url()).searchParams.get('parent');
    await route.fulfill({ contentType: 'text/html', body: `<button id="google">Continue with Google</button><script>
      const send=data=>parent.postMessage({channel:'score-google-signin',...data},${JSON.stringify(parent)});
      send({type:'ready'});document.getElementById('google').onclick=()=>send({type:'credential',credential:'fixture-only-credential'});
    </script>` });
  });
  await context.route(/\/api\/(?:auth\/(?:me|google|login|register)|payments\/checkout\/authenticated)$/, async route => {
    const request = route.request();
    const headers = { 'access-control-allow-origin': site, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,idempotency-key' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const path = new URL(request.url()).pathname;
    let status = 200, data;
    if (path === '/api/auth/me') { status = signedIn ? 200 : 401; data = signedIn ? { user } : { error: 'Unauthorized' }; }
    else if (path.startsWith('/api/auth/')) { signedIn = true; data = { user }; }
    else {
      requests.push({ body: request.postDataJSON(), key: request.headers()['idempotency-key'] });
      status = checkoutStatus;
      if (status === 401) signedIn = false;
      data = status === 200 ? { url: site + '/fixture-provider' } : { error: status === 401 ? 'Session expired' : 'Checkout is temporarily unavailable' };
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await context.route(site + '/fixture-provider', route => route.fulfill({ contentType: 'text/html', body: '<h1>Payment provider fixture</h1>' }));
  page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site + '/pricing');
  const card = code => page.locator(`.score-plan-card[href*="plan=${code}"]`);
  await expect(page.locator('#pricing-plans .score-plan-card')).toHaveCount(5);
  await expect(page.locator('#pricing-plans .score-plan-card--selected')).toHaveAttribute('href', /plan=starter-monthly/);
  await expect(page.locator('#single-score-pass')).toBeVisible();
  assert.ok((await card('starter-monthly').boundingBox()).y < page.viewportSize().height, 'Existing cards remain in the first viewport below the new one-score offer');
  await expect(page.locator('header a[href="/pricing"]:visible').first()).toBeVisible();
  await page.screenshot({ path: output + '/01-pricing.png' });
  pass('Pricing opens five vertical cards with Starter monthly selected by default');

  await card('starter-annual').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/pricing\?plan=starter-annual&billing=subscription&provider=stripe$/);
  await page.screenshot({ path: output + '/02-sign-in.png' });
  // A forged message from the parent page must never authenticate.
  await page.evaluate(() => window.postMessage({ channel: 'score-google-signin', type: 'credential', credential: 'untrusted' }, location.origin));
  assert.equal(signedIn, false);
  await page.frameLocator('iframe[title]').getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(site + '/fixture-provider');
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body, { provider: 'stripe', locale: 'en', planCode: 'starter-annual', billingKind: 'subscription', seatQuantity: 1, returnTo: 'pricing' });
  assert.ok(requests[0].key);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('scoretransposer_pending_purchase')), null);
  await page.screenshot({ path: output + '/03-auto-checkout.png' });
  pass('Google authentication automatically starts exactly one checkout for the selected annual plan and rejects forged messages');
  await page.goBack();
  await expect(card('starter-annual')).toHaveClass(/score-plan-card--selected/);
  await expect(card('starter-annual')).not.toHaveAttribute('aria-disabled', 'true');
  pass('Browser Back restores the selected plan without starting checkout again');

  await card('starter-annual').evaluate(element => { element.click(); element.click(); });
  await expect(page).toHaveURL(site + '/fixture-provider');
  assert.equal(requests.length, 2, 'Double clicks must produce only one additional checkout');
  await page.goBack();
  pass('Double clicks start only one checkout');

  await page.getByText('Payment options · Stripe', { exact: true }).click();
  await page.getByLabel('Payment options', { exact: true }).selectOption('paddle');
  await card('converter-pro-monthly').click();
  await expect(page).toHaveURL(site + '/fixture-provider');
  assert.equal(requests.at(-1).body.provider, 'paddle');
  assert.equal(requests.at(-1).body.planCode, 'converter-pro-monthly');
  await page.goBack();
  await page.reload();
  await expect(page.getByText('Payment options · Paddle', { exact: true })).toBeVisible();
  pass('Paddle remains selectable and the provider selection survives a full reload');

  await page.getByRole('button', { name: 'One-time purchase', exact: true }).click();
  checkoutStatus = 503;
  await card('converter-pro-annual').click();
  await expect(page.getByRole('alert')).toBeVisible();
  const retryKey = requests.at(-1).key;
  assert.equal(requests.at(-1).body.billingKind, 'one_time');
  assert.equal(requests.at(-1).body.provider, 'stripe');
  checkoutStatus = 200;
  await card('converter-pro-annual').click();
  await expect(page).toHaveURL(site + '/fixture-provider');
  assert.equal(requests.at(-1).key, retryKey);
  pass('One-time purchases use Stripe; failed checkout stays on the plan and retries with the same idempotency key');

  await page.goBack();
  checkoutStatus = 401;
  await card('converter-pro-annual').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/plan=converter-pro-annual&billing=one_time/);
  await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password (8+ characters)', { exact: true }).fill('fixture-password');
  checkoutStatus = 200;
  const beforeResume = requests.length;
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page).toHaveURL(site + '/fixture-provider');
  assert.equal(requests.length, beforeResume + 1);
  assert.equal(requests.at(-1).body.planCode, 'converter-pro-annual');
  assert.equal(requests.at(-1).body.billingKind, 'one_time');
  await page.goBack();
  await expect(card('converter-pro-annual')).toHaveClass(/score-plan-card--selected/);
  pass('Email login after an expired session automatically resumes the selected one-time annual checkout exactly once');

  signedIn = false;
  await page.goto(site + '/pricing');
  await page.setViewportSize({ width: 390, height: 844 });
  await card('starter-monthly').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: output + '/04-mobile-sign-in.png' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('scoretransposer_pending_purchase')), null);
  await expect(card('starter-monthly')).toBeFocused();
  pass('Mobile dialog fits the screen; Escape closes it and restores focus to the selected plan');

  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const prefix of ['', '/zh-cn', '/zh-tw', '/ja', '/ko', '/fr', '/es', '/de', '/ru']) {
    await page.goto(site + prefix + '/pricing');
    await expect(page.locator('#pricing-plans .score-plan-card')).toHaveCount(5);
    await page.locator('#pricing-plans .score-plan-card').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    assert.equal(new URL(page.url()).pathname, prefix + '/pricing');
    await page.keyboard.press('Escape');
  }
  pass('All nine locale pricing pages render plan cards and open login without changing pages');
  assert.deepEqual(errors, []);
  pass('No browser runtime errors');
} catch (error) {
  if (page) {
    await page.screenshot({ path: output + '/failure.png', timeout: 5000 }).catch(() => {});
    fs.writeFileSync(output + '/failure.html', await page.content());
  }
  throw error;
} finally {
  fs.writeFileSync(output + '/report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
