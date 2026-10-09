import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import commercialModule from '../apps/www/src/lib/product-commercial.ts';

// Run with: node --import tsx scripts/verify-product-commercial.mjs
const { productCommercial: film } = commercialModule;
const site = process.env.COMMERCIAL_TEST_ORIGIN || 'http://127.0.0.1:44610';
assert.match(site, /^http:\/\/127\.0\.0\.1:\d+$/, 'Use only a local frontend');
const output = '.tmp/product-commercial/browser';
fs.mkdirSync(output, { recursive: true });
const locales = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'es', 'de', 'ru'];
const report = { origin: site, realMediaPlayback: true, startedAt: new Date().toISOString(), checks: [], locales: {}, errors: [] };
const pass = message => { report.checks.push(message); console.log('PASS', message); };
const routePath = locale => locale === 'en' ? '/' : `/${locale.toLowerCase()}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let page;

async function createContext(width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce' });
  await context.route('**/api/auth/me', route => route.fulfill({
    status: 401,
    headers: { 'access-control-allow-origin': site, 'access-control-allow-credentials': 'true' },
    contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }),
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
  const filmRequests = [];
  const retiredMediaRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === film.videoSrc) filmRequests.push(request.url());
    if (request.url().includes('/product/overview/v1/')) retiredMediaRequests.push(request.url());
  });
  await page.goto(site + routePath(locale), { waitUntil: 'domcontentloaded', timeout: 90_000 });
  const region = page.locator('#product-overview');
  const video = region.locator('video');
  await expect(region.getByRole('heading', { level: 2 })).toHaveText(film.title);
  await expect(region).toHaveAttribute('lang', 'en');
  await expect(region.locator('nav')).toHaveCount(0);
  await expect(region.locator('button')).toHaveCount(1);
  await expect(region.locator('p')).toHaveCount(1);
  await expect(region.locator('p')).toHaveText(film.description);
  await expect(video).toHaveAttribute('lang', 'en');
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).toHaveAttribute('poster', film.posterSrc);
  await expect(video.locator('source')).toHaveAttribute('src', film.videoSrc);
  await expect(video.locator('track')).toHaveAttribute('src', film.captionsSrc);
  await expect(video.locator('track')).toHaveAttribute('srclang', 'en');
  await region.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  assert.deepEqual(filmRequests, [], `${locale}: film requested before user action`);
  assert.deepEqual(retiredMediaRequests, [], `${locale}: retired 80-second media is still requested`);
  assert.equal(await video.evaluate(element => element.autoplay), false);
  assert.equal(await video.evaluate(element => element.controls), true);
  assert.equal(await video.evaluate(element => element.paused), true);
  assert.doesNotMatch(await region.innerText(), /80[ -]second|80\s*秒|chapter|选择演示章节/iu);
  return { page, region, video, filmRequests };
}

async function screenshotRegion(loaded, filename) {
  await loaded.page.getByRole('banner', { includeHidden: true }).evaluate(element => { element.style.visibility = 'hidden'; });
  await loaded.region.screenshot({ path: `${output}/${filename}` });
  await loaded.page.getByRole('banner', { includeHidden: true }).evaluate(element => { element.style.visibility = ''; });
}

async function checkPlayback(locale, width) {
  const context = await createContext(width);
  try {
    const loaded = await openHomepage(context, locale);
    assert.ok(await loaded.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}/${width}: horizontal overflow`);
    await screenshotRegion(loaded, `${locale.toLowerCase()}-${width}-poster.png`);
    const playButton = loaded.region.getByRole('button', { name: film.playLabel, exact: true });
    if (width === 390) {
      await playButton.focus();
      await loaded.page.keyboard.press('Enter');
    } else {
      await playButton.click();
    }
    await expect.poll(() => loaded.video.evaluate(video => video.readyState), { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
    await expect.poll(() => loaded.video.evaluate(video => video.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.2);
    const media = await loaded.video.evaluate(video => ({
      duration: video.duration, paused: video.paused, muted: video.muted, volume: video.volume,
      trackCount: video.textTracks.length, captionLanguage: video.textTracks[0]?.language,
      decodedAudioBytes: video.webkitAudioDecodedByteCount,
    }));
    assert.ok(Math.abs(media.duration - film.duration) < 0.5, `Expected a 30-second film; got ${media.duration}`);
    assert.equal(media.paused, false);
    assert.equal(media.muted, false);
    assert.ok(media.volume > 0);
    assert.equal(media.trackCount, 1);
    assert.equal(media.captionLanguage, 'en');
    if (typeof media.decodedAudioBytes === 'number') assert.ok(media.decodedAudioBytes > 0);
    await expect.poll(() => loaded.video.evaluate(video => video.querySelector('track').readyState), { timeout: 15_000 }).toBe(2);
    assert.ok(await loaded.video.evaluate(video => video.textTracks[0].cues.length > 0));
    await expect(loaded.video).toBeFocused();
    assert.ok(loaded.filmRequests.length > 0);
    await loaded.video.evaluate(video => { video.currentTime = 8.01; });
    await expect.poll(() => loaded.video.evaluate(video => video.currentTime), { timeout: 15_000 }).toBeGreaterThan(8.2);
    await expect.poll(() => loaded.video.evaluate(video => video.seeking), { timeout: 15_000 }).toBe(false);
    await loaded.video.evaluate(video => video.pause());
    await screenshotRegion(loaded, `${locale.toLowerCase()}-${width}-playing.png`);
    report.locales[`${locale}-${width}`] = media;
    pass(`${locale} ${width}px: 30-second unmuted playback, decoded audio, English captions, keyboard/native controls and no horizontal overflow`);

    if (locale === 'en' && width === 1440) {
      await loaded.video.evaluate(video => { video.currentTime = video.duration - 0.5; return video.play(); });
      await expect.poll(() => loaded.video.evaluate(video => video.ended), { timeout: 10_000 }).toBe(true);
      pass('The film reaches its ending through native playback');
      await loaded.page.locator('header .locale-switcher-select:visible').first().selectOption('zh-CN');
      await expect(loaded.page).toHaveURL(site + '/zh-cn');
      const localizedVideo = loaded.page.locator('#product-overview video');
      await expect(localizedVideo.locator('source')).toHaveAttribute('src', film.videoSrc);
      await expect(localizedVideo.locator('track')).toHaveAttribute('srclang', 'en');
      assert.deepEqual(await localizedVideo.evaluate(video => ({ paused: video.paused, time: video.currentTime })), { paused: true, time: 0 });
      pass('Changing the site language preserves the single English film and resets playback');
    }
  } finally {
    await context.close();
  }
}

try {
  for (const src of [film.videoSrc, film.posterSrc, film.captionsSrc]) assert.ok(fs.existsSync(path.join('apps/www/public', src)), `Missing commercial media: ${src}`);
  const context = await createContext();
  try {
    for (const locale of locales) {
      await openHomepage(context, locale);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('#demos video')).toHaveCount(4);
      const seo = await page.evaluate(() => ({
        title: document.title, description: document.querySelector('meta[name="description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        alternates: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
        schemas: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap(script => JSON.parse(script.textContent)),
      }));
      assert.ok(seo.title.length > 15 && seo.description.length > 20);
      assert.equal(new URL(seo.canonical).pathname.replace(/\/$/, ''), routePath(locale).replace(/\/$/, ''));
      assert.ok(seo.alternates >= 9);
      assert.ok(seo.schemas.some(schema => schema['@type'] === 'SoftwareApplication'));
      report.locales[locale] = { title: seo.title, canonical: seo.canonical, alternates: seo.alternates, videoSrc: film.videoSrc, captionsLanguage: 'en' };
      pass(`${locale}: same English film/copy, no old 80-second section or chapters, no preload, original demos and SEO retained`);
      await page.close();
    }
    report.assets = {};
    for (const src of [film.videoSrc, film.posterSrc, film.captionsSrc]) {
      const response = await context.request.get(site + src, { headers: src.endsWith('.mp4') ? { range: 'bytes=0-1023' } : {}, timeout: 30_000 });
      assert.ok(response.ok(), `${src}: HTTP ${response.status()}`);
      const body = await response.body();
      if (src.endsWith('.mp4')) assert.equal(body.subarray(4, 8).toString('ascii'), 'ftyp');
      if (src.endsWith('.webp')) assert.equal(body.subarray(8, 12).toString('ascii'), 'WEBP');
      if (src.endsWith('.vtt')) assert.match(body.toString('utf8'), /^WEBVTT/u);
      report.assets[src] = { status: response.status(), bytes: body.length, contentType: response.headers()['content-type'] };
    }
    pass('The shared MP4, WebP poster and English WebVTT respond with valid file signatures');
  } finally {
    await context.close();
  }
  for (const locale of ['en', 'zh-CN']) {
    await checkPlayback(locale, 1440);
    await checkPlayback(locale, 390);
  }
  const failureContext = await createContext();
  try {
    await failureContext.route(site + film.videoSrc, route => route.fulfill({ status: 404, body: 'Not found' }));
    const loaded = await openHomepage(failureContext, 'en');
    await loaded.region.getByRole('button', { name: film.playLabel, exact: true }).click();
    await expect(loaded.region.getByRole('link', { name: film.videoLabel, exact: true })).toBeVisible();
    await expect(loaded.region.getByRole('button', { name: film.playLabel, exact: true })).toHaveCount(0);
    pass('A missing MP4 displays the direct fallback without a stuck play overlay');
  } finally {
    await failureContext.close();
  }
  assert.deepEqual(report.errors, []);
  pass('No browser runtime errors');
} catch (error) {
  report.failure = error.stack || String(error);
  if (page && !page.isClosed()) await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
