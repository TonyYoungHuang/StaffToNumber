import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import * as overviewModule from '../apps/www/src/lib/product-overview.ts';
const { getProductOverviewCopy, PRODUCT_OVERVIEW_DURATION } = overviewModule.default ?? overviewModule;

// Compose verified product captures into a reproducible, chaptered product film.
// Every UI pixel comes from the application capture; no result screens are mocked.
const root=process.cwd();
const capture=path.resolve('.tmp/product-overview-capture');
const work=path.resolve('.tmp/product-overview-render');
const publicRoot=path.resolve('apps/www/public/product/overview/v1');
const selected=(process.argv.find(x=>x.startsWith('--locales='))?.slice(10)||'en,zh-CN').split(',');
const framesOnly=process.argv.includes('--frames-only');
const inputPath=process.argv.find(x=>x.startsWith('--input='))?.slice(8)||path.join(capture,'render-input.json');
const mapping=JSON.parse(fs.readFileSync(inputPath,'utf8'));
fs.mkdirSync(work,{recursive:true});
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const url=value=>pathToFileURL(path.resolve(value)).href;
const stamp=value=>`${String(Math.floor(value/3600)).padStart(2,'0')}:${String(Math.floor(value/60)%60).padStart(2,'0')}:${String(Math.floor(value%60)).padStart(2,'0')}.000`;

async function run(executable,args,logName){
 await new Promise((resolve,reject)=>{
  const stream=fs.openSync(path.join(work,logName),'w');
  const child=spawn(executable,args,{windowsHide:true,stdio:['ignore',stream,stream]});
  child.on('error',reject);
  child.on('close',code=>{fs.closeSync(stream);code===0?resolve():reject(new Error(`${executable} failed (${code}); see ${logName}`));});
 });
}

function stage(copy,scene,asset,{poster=false}={}){
 const featured=['intro','outro'].includes(scene.id)||poster;
 const future=scene.id==='audio';
 const chapter=copy.chapters.findIndex(x=>x.start===scene.start);
 const source=asset?.poster||asset?.image;
 const featureTitles=copy.chapters.map(x=>x.title);
 const staff=`<svg viewBox="0 0 600 270" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="#b3a6f5" stroke-width="2" opacity=".25">${[90,113,136,159,182].map(y=>`<path d="M0 ${y}H600"/>`).join('')}</g><g fill="#d4c8ff">${[[90,159],[180,136],[290,113],[390,90],[490,113]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="13" ry="9" transform="rotate(-24 ${x} ${y})"/><rect x="${x+10}" y="${y-65}" width="3" height="65"/>`).join('')}</g></svg>`;
 return `<!doctype html><html lang="${escape(copy.locale||'en')}"><meta charset="utf-8"><style>
 *{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden;font-family:Arial,'Microsoft YaHei','Malgun Gothic',sans-serif;background:#101020;color:#fff}
 body{background:radial-gradient(ellipse at 80% 10%,#5140a44a,transparent 60%),radial-gradient(ellipse at 10% 95%,#41337645,transparent 60%),#101020}
 .brand{position:absolute;left:72px;top:38px;font-size:25px;font-weight:700;letter-spacing:-.8px;color:#ddd5ff}.brand span{color:#a99aff;margin-right:10px}
 .counter{position:absolute;right:74px;top:41px;color:#b6aace;font-size:18px;font-variant-numeric:tabular-nums}.line{position:absolute;left:72px;right:72px;top:82px;border-top:1px solid #ffffff18}
 h1{position:absolute;left:74px;right:80px;top:102px;margin:0;font-size:45px;line-height:1.2;letter-spacing:-1px;text-wrap:balance}
 .detail{position:absolute;left:76px;right:85px;top:165px;margin:0;font-size:24px;line-height:1.45;color:#bdbbd0}
 .window{position:absolute;left:72px;top:226px;width:1456px;height:604px;background:#f8f8fc;border:1px solid #ffffff33;box-shadow:0 25px 80px #0008;overflow:hidden}
 .window img{width:100%;height:100%;object-fit:contain;display:block}
 .footer{position:absolute;left:74px;right:74px;bottom:24px;display:flex;justify-content:space-between;align-items:center;color:#9e9aad;font-size:15px;letter-spacing:1px}
 .rail{display:flex;gap:7px}.rail i{width:72px;height:3px;background:#ffffff20}.rail i.on{background:#b8a5ff}
 .feature h1{left:76px;right:auto;top:188px;width:700px;font-size:68px;line-height:1.15;letter-spacing:-2px}.feature .detail{left:80px;top:390px;width:660px;font-size:26px;line-height:1.5}
 .feature .window{left:850px;top:195px;width:700px;height:480px;transform:perspective(1200px) rotateY(-8deg) rotateZ(-2deg);background:#fff;border-radius:16px;opacity:.95}
 .feature .window img{object-fit:cover;object-position:left top}
 .pills{position:absolute;left:78px;top:600px;width:690px;display:flex;flex-wrap:wrap;gap:12px}.pills span{padding:12px 18px;border:1px solid #ffffff25;background:#ffffff07;border-radius:9px;font-size:20px;color:#d9d3ee}
 .future h1{top:210px;font-size:58px;text-align:center}.future .detail{top:315px;text-align:center;font-size:28px}.future .staff{position:absolute;left:430px;top:430px;width:740px;opacity:.65}
 </style><body class="${featured?'feature':future?'future':''}">
 <div class="brand"><span>♫</span>ScoreTransposer</div><div class="counter">${featured?'01:20':chapter>=0?`${String(chapter+1).padStart(2,'0')} / 08`:'→'}</div><div class="line"></div>
 <h1>${escape(scene.title)}</h1><p class="detail">${escape(scene.detail)}</p>
 ${future?`<div class="staff">${staff}</div>`:`<div class="window">${source?`<img src="${url(source)}">`:''}</div>`}
 ${featured?`<div class="pills">${featureTitles.slice(0,6).map(x=>`<span>${escape(x)}</span>`).join('')}</div>`:''}
 <div class="footer"><span>MUSICXML · MIDI · PDF · AUDIO</span><div class="rail">${copy.chapters.map((x,i)=>`<i class="${i<=chapter?'on':''}"></i>`).join('')}</div><span>scoretransposer.com</span></div>
 </body></html>`;
}

const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
async function fitStage(){
 await page.locator('h1').evaluate(el=>{
  const max=el.closest('.feature')?172:el.closest('.future')?90:64;
  let size=parseFloat(getComputedStyle(el).fontSize);
  while(el.scrollHeight>max&&size>30){size-=1;el.style.fontSize=size+'px';}
 });
 await page.locator('.detail').evaluate(el=>{
  const bottom=document.body.classList.contains('feature')?570:document.body.classList.contains('future')?420:222;
  let size=parseFloat(getComputedStyle(el).fontSize);
  while(el.getBoundingClientRect().bottom>bottom&&size>18){size-=1;el.style.fontSize=size+'px';}
 });
}
const evidence={version:1,duration:PRODUCT_OVERVIEW_DURATION,createdAt:new Date().toISOString(),locales:[]};
try{
 for(const locale of selected){
  const copy=getProductOverviewCopy(locale);
  const input=mapping.locales[locale];assert.ok(input,`Missing captures: ${locale}`);
  const directory=path.join(publicRoot,locale.toLowerCase());fs.mkdirSync(directory,{recursive:true});
  const local=path.join(work,locale);fs.mkdirSync(local,{recursive:true});
  const segments=[];
  for(const [index,scene] of copy.scenes.entries()){
   const asset=input[scene.id]||(['intro','outro'].includes(scene.id)?input.overview:null);
   assert.ok(asset||scene.id==='audio',`Missing ${locale}/${scene.id}`);
   const html=path.join(local,scene.id+'.html'),frame=path.join(local,scene.id+'.png');
   fs.writeFileSync(html,stage({...copy,locale},scene,asset));
   await page.goto(url(html));await page.evaluate(()=>document.fonts.ready);
   await page.locator('img').evaluateAll(images=>Promise.all(images.map(x=>x.decode())));
   // Fit translated headings within the same composition without clipping CJK
   // or longer European-language titles. Never crop a translated sentence.
   await fitStage();
   assert.ok(await page.locator('h1').evaluate(el=>el.getBoundingClientRect().bottom<document.querySelector('.detail').getBoundingClientRect().top),'Title layout: '+locale+'/'+scene.id);
   assert.ok(await page.locator('.detail').evaluate(el=>el.getBoundingClientRect().bottom<(document.body.classList.contains('feature')?570:document.body.classList.contains('future')?420:222)),'Caption layout: '+locale+'/'+scene.id);
   await page.screenshot({path:frame});
   if(framesOnly) continue;
   const destination=path.join(local,scene.id+'.mp4');
   const args=['-y','-hide_banner','-loglevel','warning','-loop','1','-framerate','25','-i',frame];
   let filters;
   if(asset?.video&&!['intro','outro'].includes(scene.id)){
    args.push('-i',path.resolve(asset.video));
    const crop=asset.crop?`crop=${asset.crop.width}:${asset.crop.height}:${asset.crop.x}:${asset.crop.y},`:'';
    const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',path.resolve(asset.video)],{encoding:'utf8',windowsHide:true});
    assert.equal(probe.status,0,'Cannot inspect capture duration');
    const duration=Number(probe.stdout.trim());assert.ok(Number.isFinite(duration)&&duration>0,'Invalid capture duration');
    // Keep the operation's confirmed result on screen even for slower captures.
    const speed=Math.min(1,(scene.duration-.3)/duration);
    filters=`[1:v]${crop}setpts=${speed.toFixed(6)}*(PTS-STARTPTS),scale=1454:602:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1454:602:(ow-iw)/2:(oh-ih)/2:color=0xf8f8fc,setsar=1,fps=25,tpad=stop_mode=clone:stop_duration=${scene.duration}[ui];[0:v][ui]overlay=73:227:shortest=1,fade=t=in:d=0.15,fade=t=out:st=${scene.duration-.15}:d=0.15,format=yuv420p[v]`;
   }else filters=`[0:v]fade=t=in:d=0.15,fade=t=out:st=${scene.duration-.15}:d=0.15,format=yuv420p[v]`;
   args.push('-filter_complex',filters,'-map','[v]','-an','-t',String(scene.duration),'-c:v','libx264','-preset','veryfast','-crf','23','-threads','2',destination);
   const signature=createHash('sha256').update(fs.readFileSync(frame)).update(JSON.stringify(args));
   if(asset?.video)signature.update(fs.readFileSync(path.resolve(asset.video)));
   const digest=signature.digest('hex'),signaturePath=destination+'.sha256';
   if(!fs.existsSync(destination)||!fs.existsSync(signaturePath)||fs.readFileSync(signaturePath,'utf8')!==digest){
    await run('ffmpeg',args,`${locale}-${scene.id}.log`);
    fs.writeFileSync(signaturePath,digest);
   }
   segments.push(destination);
   console.log(`Rendered ${locale} ${index+1}/${copy.scenes.length}: ${scene.id}`);
  }
  if(framesOnly){console.log(`Frames checked ${locale}`);continue;}
  const list=path.join(local,'concat.txt');
  fs.writeFileSync(list,segments.map(p=>`file '${p.replaceAll('\\','/').replaceAll("'","'\\''")}'`).join('\n'));
  const audioPath=path.resolve(input.audio||mapping.audio);assert.ok(fs.existsSync(audioPath),'Missing score soundtrack');
  const output=path.join(directory,'overview.mp4');
  const tempoRatio=80/(input.audioTempoBpm||96);
  await run('ffmpeg',['-y','-hide_banner','-loglevel','warning','-f','concat','-safe','0','-i',list,'-stream_loop','-1','-i',audioPath,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-af',`atempo=${tempoRatio},volume=8dB,afade=t=in:d=1,afade=t=out:st=77:d=3`,'-t',String(PRODUCT_OVERVIEW_DURATION),'-movflags','+faststart',output],`${locale}-mux.log`);
  fs.writeFileSync(path.join(directory,'captions.vtt'),'WEBVTT\n\n'+copy.scenes.map((scene,index)=>`${index+1}\n${stamp(scene.start)} --> ${stamp(scene.start+scene.duration)}\n${scene.detail}\n`).join('\n'));
  const posterHtml=path.join(local,'poster.html');
  fs.writeFileSync(posterHtml,stage({...copy,locale},copy.scenes[0],input.overview,{poster:true}));
  await page.goto(url(posterHtml));await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluateAll(images=>Promise.all(images.map(x=>x.decode())));
  await fitStage();
  const posterFrame=path.join(local,'poster.png'),poster=path.join(directory,'poster.webp');
  await page.screenshot({path:posterFrame});
  for(const quality of [58,50,42,34,26]){
   await run('ffmpeg',['-y','-hide_banner','-loglevel','warning','-i',posterFrame,'-vf','scale=960:540','-c:v','libwebp','-quality',String(quality),poster],`${locale}-poster.log`);
   if(fs.statSync(poster).size<=18*1024)break;
  }
  assert.ok(fs.statSync(poster).size<=18*1024,locale+' poster exceeds initial-load budget');
  // Remove only this renderer's obsolete first-draft poster, if present.
  const oldPoster=path.join(directory,'poster.jpg');if(fs.existsSync(oldPoster))fs.unlinkSync(oldPoster);
  const files=['overview.mp4','poster.webp','captions.vtt'].map(name=>{const data=fs.readFileSync(path.join(directory,name));return {name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
  evidence.locales.push({locale,sourceLocale:input.sourceLocale||locale,files});
  fs.writeFileSync(path.join(work,'render-report.json'),JSON.stringify(evidence,null,2));
 }
}finally{await browser.close();}
