import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const origin=process.env.BACKDROP_TEST_ORIGIN||'http://127.0.0.1:44610';
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/);
const out='.tmp/score-background-light/browser';fs.mkdirSync(out,{recursive:true});
const src='/product/commercial/v4/score-motion-30s.mp4';
const report={startedAt:new Date().toISOString(),origin,checks:[],errors:[]};
const pass=s=>{report.checks.push(s);console.log('PASS '+s)};
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=document-user-activation-required']});
async function context({width=1440,reduce=false,saveData=false,blocked=false,missing=false}={}){
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:reduce?'reduce':'no-preference'});
 await ctx.addCookies([{name:'score_locale',value:'en',url:origin},{name:'scoretransposer_analytics_consent',value:'denied',url:origin}]);
 await ctx.route('**/api/auth/me',r=>r.fulfill({status:401,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},body:'{"error":"Unauthorized"}'}));
 if(saveData)await ctx.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}}));
 if(blocked)await ctx.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'))}});
 if(missing)await ctx.route(origin+src,r=>r.fulfill({status:404,body:'missing'}));
 return ctx;
}
async function open(ctx,path='/'){
 const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const requests=[];page.on('request',r=>{if(new URL(r.url()).pathname===src)requests.push(r.url())});
 await page.goto(origin+path,{waitUntil:'domcontentloaded'});const region=page.locator('#product-overview'),video=region.locator('video');
 await expect(region.getByRole('heading',{level:2})).toHaveText('Your score. More possibilities.');
 return {page,region,video,requests};
}
async function playing(video){await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>.15),{timeout:30000}).toBe(true)}
try{
 const ctx=await context();
 for(const path of ['/','/zh-cn','/zh-tw','/ja','/ko','/fr','/es','/de','/ru']){
  const {page,region,video,requests}=await open(ctx,path);
  assert.equal(await region.locator('section').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await region.locator('h2').evaluate(e=>getComputedStyle(e).color),'rgb(36, 32, 49)');
  await page.waitForTimeout(300);assert.deepEqual(requests,[],'Background fetched before entering view');
  await region.scrollIntoViewIfNeeded();await playing(video);
  const state=await video.evaluate(v=>({src:new URL(v.src).pathname,muted:v.muted,loop:v.loop,inline:v.playsInline,controls:v.controls,duration:v.duration}));
  assert.deepEqual(state,{src,muted:true,loop:true,inline:true,controls:false,duration:30});
  assert.ok(await region.evaluate(e=>!!e.previousElementSibling?.querySelector('#home-workbench')));
  await expect(region.getByRole('link',{name:/Start with your score/})).toHaveAttribute('href','#home-workbench');
  await expect(region.getByRole('link',{name:/Explore plans/})).toHaveAttribute('href',(path==='/'?'':path)+'/pricing');
  await expect(region.locator('dl dd')).toHaveText(['2K','97','65K']);
  await expect(region.locator('dl dt')).toHaveText(['Users','Countries','Scores corrected']);
  await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('#demos video')).toHaveCount(4);
  pass(path+': one English background, visible autoplay/muted/loop/inline, correct position and CTAs');await page.close();
 }
 await ctx.close();
 for(const width of [1440,390]){
  const ctx=await context({width});const {page,region,video}=await open(ctx,'/zh-cn');await region.scrollIntoViewIfNeeded();await playing(video);
  await video.evaluate(v=>{v.currentTime=21.3});await expect.poll(()=>video.evaluate(v=>v.seeking)).toBe(false);
  await region.screenshot({path:out+'/background-'+width+'.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await region.getByRole('button',{name:'Enable sound'}).click();await expect.poll(()=>video.evaluate(v=>v.muted)).toBe(false);
  assert.ok(await video.evaluate(v=>v.webkitAudioDecodedByteCount>0));
  await region.getByRole('button',{name:'Mute sound'}).click();await expect.poll(()=>video.evaluate(v=>v.muted)).toBe(true);
  await video.evaluate(v=>{v.currentTime=29.8});await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:6000}).toBeLessThan(2);
  assert.equal(await video.evaluate(v=>v.paused),false);
  await page.locator('footer').scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
  await region.scrollIntoViewIfNeeded();await playing(video);
  await region.getByRole('button',{name:'Pause animation'}).click();await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
  await page.locator('footer').scrollIntoViewIfNeeded();await region.scrollIntoViewIfNeeded();await page.waitForTimeout(350);assert.equal(await video.evaluate(v=>v.paused),true,'User pause overridden');
  await region.getByRole('button',{name:'Play animation'}).focus();await page.keyboard.press('Enter');await playing(video);
  pass(width+'px: loop boundary, sound toggle, offscreen pause/resume, retained user pause and keyboard play');await ctx.close();
 }
 for(const prefs of [{reduce:true},{saveData:true}]){
  const ctx=await context(prefs);const {page,region,video,requests}=await open(ctx);await region.scrollIntoViewIfNeeded();await page.waitForTimeout(700);
  assert.deepEqual(requests,[]);assert.equal(await video.evaluate(v=>v.paused),true);
  await region.getByRole('button',{name:'Play animation'}).click();await playing(video);
  pass(JSON.stringify(prefs)+': poster only until explicit playback');await ctx.close();
 }
 const blocked=await context({blocked:true});const blockedPage=await open(blocked);await blockedPage.region.scrollIntoViewIfNeeded();await blockedPage.page.waitForTimeout(800);
 await expect(blockedPage.region.getByRole('button',{name:'Play animation'})).toBeVisible();await expect(blockedPage.region.getByRole('link',{name:/Start with your score/})).toBeVisible();pass('Blocked autoplay retains poster, usable CTA and play control');await blocked.close();
 const missing=await context({missing:true});const missingPage=await open(missing);await missingPage.region.scrollIntoViewIfNeeded();await expect(missingPage.region.getByRole('link',{name:/Watch the film/})).toBeVisible();pass('Missing background falls back without breaking promotional content');await missing.close();
 assert.deepEqual(report.errors,[]);report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
}finally{await browser.close()}
