import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import overviewModule from '../apps/www/src/lib/product-overview.ts';

const { getProductOverviewCopy } = overviewModule;

// Run with: node --import tsx scripts/verify-product-overview.mjs
const site = process.env.OVERVIEW_TEST_ORIGIN || 'http://127.0.0.1:44610';
assert.match(site, /^http:\/\/127\.0\.0\.1:\d+$/, 'Only run against a local frontend');
const allowPending = process.env.OVERVIEW_ALLOW_PENDING === '1';
const output = '.tmp/product-overview/browser';
fs.mkdirSync(output, { recursive: true });
const locales = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'es', 'de', 'ru'];
const starts = [4, 12, 20, 28, 36, 48, 56, 64];
const report = { origin: site, realMediaPlayback: true, startedAt: new Date().toISOString(), checks: [], pending: [], locales: {}, errors: [] };
const pass = text => { report.checks.push(text); console.log('PASS', text); };
const assetPath = (locale, name) => `/product/overview/v1/${locale.toLowerCase()}/${name}`;
const routePath = locale => locale === 'en' ? '/' : `/${locale.toLowerCase()}`;
const localAsset = (locale, name) => path.join('apps/www/public', assetPath(locale, name));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let page;

async function createContext(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  // Auth is irrelevant to playback. Keep this browser check off the live API.
  await context.route('**/api/auth/me', route => route.fulfill({
    status: 401,
    headers: { 'access-control-allow-origin': site, 'access-control-allow-credentials': 'true' },
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Unauthorized' }),
  }));
  await context.addCookies([
    { name: 'score_locale', value: 'en', url: site },
    { name: 'scoretransposer_analytics_consent', value: 'denied', url: site },
  ]);
  return context;
}

async function openHomepage(context, locale) {
  page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  page.on('pageerror', error => report.errors.push({ locale, message: error.message }));
  const videoRequests = [];
  page.on('request', request => {
    if (request.url().includes('/product/overview/') && request.url().endsWith('.mp4')) videoRequests.push(request.url());
  });
  await page.goto(site + routePath(locale), { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const region = page.locator('#product-overview');
  await expect(region.getByRole('heading', { level: 2 })).toHaveText(getProductOverviewCopy(locale).title);
  await region.scrollIntoViewIfNeeded();
  await expect(region.locator('nav button')).toHaveCount(8);
  await expect(region.locator('video')).toHaveAttribute('preload', 'none');
  // Let load/visibility-triggered fetches settle before asserting the network boundary.
  await page.waitForTimeout(1200);
  assert.deepEqual(videoRequests, [], `${locale}: the overview MP4 must not load before a user action`);
  assert.equal(await region.locator('video').evaluate(video => video.autoplay), false);
  assert.equal(await region.locator('video').evaluate(video => video.controls), true);
  assert.equal(await region.locator('video').evaluate(video => video.paused), true);
  return { page, region, video: region.locator('video'), videoRequests };
}

async function checkPlayback(locale, width) {
  if (!fs.existsSync(localAsset(locale, 'overview.mp4'))) {
    report.pending.push(`${locale}: real playback waiting for overview.mp4`);
    return;
  }
  const context = await createContext({ width, height: width === 390 ? 844 : 1000 });
  try {
    let loaded = await openHomepage(context, locale);
    assert.ok(await loaded.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}/${width}: page overflows horizontally`);
    await loaded.page.getByRole('banner', { includeHidden: true }).evaluate(element => { element.style.visibility = 'hidden'; });
    await loaded.region.screenshot({ path: `${output}/${locale.toLowerCase()}-${width}-poster.png` });
    await loaded.page.getByRole('banner', { includeHidden: true }).evaluate(element => { element.style.visibility = ''; });
    await loaded.region.getByRole('button', { name: getProductOverviewCopy(locale).playLabel, exact: true }).click();
    await expect.poll(() => loaded.video.evaluate(video => video.readyState), { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
    await expect.poll(() => loaded.video.evaluate(video => video.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.1);
    const media = await loaded.video.evaluate(video => ({
      duration: video.duration, muted: video.muted, defaultMuted: video.defaultMuted,
      volume: video.volume, paused: video.paused, trackCount: video.textTracks.length,
      captionLanguage: video.querySelector('track').srclang,
      decodedAudioBytes: video.webkitAudioDecodedByteCount,
    }));
    assert.ok(Math.abs(media.duration - 80) < 0.2, `${locale}: unexpected video duration ${media.duration}`);
    assert.equal(media.muted, false);
    assert.equal(media.defaultMuted, false);
    assert.ok(media.volume > 0);
    assert.equal(media.paused, false);
    assert.equal(media.trackCount, 1);
    assert.equal(media.captionLanguage, locale);
    if (typeof media.decodedAudioBytes === 'number') assert.ok(media.decodedAudioBytes > 0, `${locale}: browser should decode the audio track`);
    assert.ok(loaded.videoRequests.length > 0);
    await expect.poll(() => loaded.video.evaluate(video => video.querySelector('track').readyState), { timeout: 15_000 }).toBe(2);
    assert.ok(await loaded.video.evaluate(video => video.textTracks[0].cues.length > 0));
    report.locales[`${locale}-${width}`] = media;
    await loaded.video.evaluate(video => video.pause());
    pass(`${locale} ${width}px: no preload request, user-initiated 80-second unmuted playback, native controls and captions`);

    if (width === 1440) {
      for (const [index, start] of starts.entries()) {
        await loaded.region.locator('nav button').nth(index).click();
        await expect.poll(() => loaded.video.evaluate(video => video.currentTime), { timeout: 15_000 }).toBeGreaterThan(start + 0.15);
        await expect.poll(() => loaded.video.evaluate(video => video.seeking), { timeout: 15_000 }).toBe(false);
        assert.ok(await loaded.video.evaluate((video, start) => video.currentTime < start + 2, start));
        await expect(loaded.region.locator('nav button').nth(index)).toHaveAttribute('aria-current', 'true');
        await expect.poll(() => loaded.video.evaluate(video => Array.from(video.textTracks[0].activeCues || []).map(cue => cue.text)), { timeout: 5000 })
          .toEqual([getProductOverviewCopy(locale).chapters[index].detail]);
        await loaded.video.evaluate(video => video.pause());
      }
      pass(`${locale}: all eight chapter buttons seek to their exact scenes`);
    }

    await loaded.page.close();
    loaded = await openHomepage(context, locale);
    const transposeChapter = loaded.region.locator('nav button').nth(2);
    await transposeChapter.focus();
    await loaded.page.keyboard.press('Enter');
    await expect.poll(() => loaded.video.evaluate(video => video.currentTime), { timeout: 30_000 }).toBeGreaterThan(20.75);
    await expect.poll(() => loaded.video.evaluate(video => video.seeking), { timeout: 15_000 }).toBe(false);
    assert.ok(await loaded.video.evaluate(video => video.currentTime < 22));
    await expect(loaded.video).toBeFocused();
    await expect.poll(() => loaded.video.evaluate(video => Array.from(video.textTracks[0].activeCues || []).map(cue => cue.text)), { timeout: 5000 })
      .toEqual([getProductOverviewCopy(locale).chapters[2].detail]);
    await loaded.video.evaluate(video => video.pause());
    await loaded.page.getByRole('banner', { includeHidden: true }).evaluate(element => { element.style.visibility = 'hidden'; });
    await loaded.region.screenshot({ path: `${output}/${locale.toLowerCase()}-${width}-chapter.png` });
    pass(`${locale} ${width}px: first action can be keyboard chapter navigation to 20 seconds`);
    if (locale === 'en' && width === 1440) {
      await loaded.page.getByRole('banner', { includeHidden: true }).evaluate(element => { element.style.visibility = ''; });
      const changedLocaleRequests = [];
      loaded.page.on('request', request => {
        if (request.url().endsWith('/product/overview/v1/zh-cn/overview.mp4')) changedLocaleRequests.push(request.url());
      });
      await loaded.video.evaluate(video => video.play());
      await loaded.page.locator('header .locale-switcher-select:visible').first().selectOption('zh-CN');
      await expect(loaded.page).toHaveURL(site + '/zh-cn');
      const localizedRegion = loaded.page.locator('#product-overview');
      await expect(localizedRegion.getByRole('heading', { level: 2 })).toHaveText(getProductOverviewCopy('zh-CN').title);
      await expect(localizedRegion.locator('video source')).toHaveAttribute('src', assetPath('zh-CN', 'overview.mp4'));
      const reset = await localizedRegion.locator('video').evaluate(video => ({ paused: video.paused, time: video.currentTime }));
      assert.deepEqual(reset, { paused: true, time: 0 });
      await expect(localizedRegion.getByRole('button', { name: getProductOverviewCopy('zh-CN').playLabel, exact: true })).toHaveCount(1);
      assert.deepEqual(changedLocaleRequests, []);
      pass('Switching language after English playback selects the Chinese source and resets playback without preloading');
    }
  } finally {
    await context.close();
  }
}

async function checkUnavailableVideo() {
  const context = await createContext();
  try {
    await context.route(site + assetPath('en', 'overview.mp4'), route => route.fulfill({ status: 404, body: 'Not found' }));
    const loaded = await openHomepage(context, 'en');
    const copy = getProductOverviewCopy('en');
    await loaded.region.getByRole('button', { name: copy.playLabel, exact: true }).click();
    await expect(loaded.region.getByRole('link', { name: copy.videoLabel, exact: true })).toBeVisible();
    await expect(loaded.region.getByRole('button', { name: copy.playLabel, exact: true })).toHaveCount(0);
    await loaded.region.locator('nav button').nth(2).click();
    await expect(loaded.region.getByRole('link', { name: copy.videoLabel, exact: true })).toBeVisible();
    pass('A missing MP4 shows the direct video fallback and dismisses the play overlay');
  } finally {
    await context.close();
  }
}

try {
  const context = await createContext();
  try {
    for (const locale of locales) {
      const { region, video } = await openHomepage(context, locale);
      const copy = getProductOverviewCopy(locale);
      await expect(region).toContainText(copy.note);
      await expect(video.locator('source')).toHaveAttribute('src', assetPath(locale, 'overview.mp4'));
      await expect(video).toHaveAttribute('poster', assetPath(locale, 'poster.webp'));
      await expect(video.locator('track')).toHaveAttribute('src', assetPath(locale, 'captions.vtt'));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('#demos video')).toHaveCount(4);
      const seo = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        alternates: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(link => link.hreflang),
        schemas: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap(script => JSON.parse(script.textContent)),
      }));
      assert.ok(seo.title.length > 15 && seo.description.length > 20);
      assert.ok(seo.canonical && new URL(seo.canonical).pathname.replace(/\/$/, '') === routePath(locale).replace(/\/$/, ''));
      assert.ok(seo.alternates.length >= 9);
      assert.ok(seo.schemas.some(schema => schema['@type'] === 'SoftwareApplication'));
      report.locales[locale] = { title: seo.title, canonical: seo.canonical, alternates: seo.alternates.length, assets: {} };
      for (const name of ['overview.mp4', 'poster.webp', 'captions.vtt']) {
        if (!fs.existsSync(localAsset(locale, name))) {
          report.pending.push(`${locale}: ${name} has not been generated`);
          continue;
        }
        const response = await context.request.get(site + assetPath(locale, name), { headers: name === 'overview.mp4' ? { range: 'bytes=0-1023' } : {}, timeout: 30_000 });
        assert.ok(response.ok(), `${locale}/${name}: HTTP ${response.status()}`);
        const body = await response.body();
        const bytes = body.length;
        assert.ok(bytes > 0);
        if (name === 'overview.mp4') assert.equal(body.subarray(4, 8).toString('ascii'), 'ftyp');
        if (name === 'poster.webp') assert.equal(body.subarray(8, 12).toString('ascii'), 'WEBP');
        if (name === 'captions.vtt') assert.match(body.toString('utf8'), /^WEBVTT/u);
        report.locales[locale].assets[name] = { status: response.status(), contentType: response.headers()['content-type'], bytes };
      }
      pass(`${locale}: localized overview, eight chapters, original four demos, metadata/canonical/hreflang/schema and available media HTTP`);
      await page.close();
    }
  } finally {
    await context.close();
  }
  for (const locale of ['en', 'zh-CN']) {
    await checkPlayback(locale, 1440);
    await checkPlayback(locale, 390);
  }
  await checkUnavailableVideo();
  assert.deepEqual(report.errors, []);
  pass('No browser runtime errors');
  if (!allowPending) assert.deepEqual(report.pending, [], 'Media remains pending; set OVERVIEW_ALLOW_PENDING=1 only for an interim check');
} catch (error) {
  report.failure = error.stack || String(error);
  if (page && !page.isClosed()) await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  if (report.pending.length) console.log('PENDING', report.pending.join('; '));
}
