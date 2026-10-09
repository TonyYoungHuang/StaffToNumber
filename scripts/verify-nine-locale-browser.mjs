import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://localhost:3119';
const out = process.argv[3] || 'artifacts/nine-locale-seo/browser';
const source = JSON.parse(await fs.readFile(process.argv[4] || 'artifacts/nine-locale-seo/local/pages.json', 'utf8'));
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true,channel:'chrome'});
const results = [], errors = [];
try {
  for (const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
    const context = await browser.newContext({viewport});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const item of source.pages.filter(p=>!p.frozen && (!process.argv.includes('--smoke') || ['/', '/musicxml-midi', '/staff-to-jianpu', '/jianpu-to-staff'].includes(p.route)))) {
      const response = await page.goto(new URL(item.pathname,base).href,{waitUntil:'networkidle',timeout:60000});
      await page.evaluate(()=>document.fonts.ready);
      const measurement = await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:[...document.querySelectorAll('h1')].map(el=>el.textContent.replace(/\s+/g,' ').trim()),intro:document.querySelector('h1 + p')?.textContent}));
      assert.equal(response.status(),200,`${name} ${item.pathname}`);
      assert.deepEqual(measurement.h1,item.h1,`${name} ${item.pathname} heading`);
      assert.ok(measurement.scrollWidth<=measurement.width+1,`${name} ${item.pathname}: horizontal overflow ${measurement.scrollWidth}`);
      assert.ok(measurement.intro?.trim(),`${name} ${item.pathname}: visible opening paragraph`);
      const question = page.locator('main details summary').first();
      await question.click();
      assert.equal(await question.evaluate(el=>el.closest('details').open),true,`${name} ${item.pathname}: FAQ interaction`);
      if (item.route==='/') {
        await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:path.join(out,`${name}-${item.locale}-home.png`)});
      } else if (item.route==='/staff-to-jianpu' || item.route==='/jianpu-to-staff' || (item.route==='/score-editor' && ['fr','de','ru'].includes(item.locale))) {
        await page.screenshot({path:path.join(out,`${name}-${item.locale}-${item.route.slice(1)}.png`),fullPage:true});
      }
      results.push({viewport:name,pathname:item.pathname,...measurement});
    }
    await context.close();
    console.log(`${name}: ${results.filter(r=>r.viewport===name).length} pages verified`);
  }
  assert.deepEqual(errors,[],'browser runtime errors');
  await fs.writeFile(path.join(out,'browser-checks.json'),JSON.stringify({base,checkedAt:new Date().toISOString(),results,errors},null,2));
  console.log(`Passed ${results.length} page and viewport checks.`);
} finally {await browser.close();}
