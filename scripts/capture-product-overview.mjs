import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium,request,expect as baseExpect} from '@playwright/test';

// Isolated, real local product recording. No production API, billing, or email.
const root=process.cwd(),out=path.join(root,'.tmp/product-overview-capture');
const api='http://127.0.0.1:44602',app='http://127.0.0.1:44601';
const locales=(process.env.OVERVIEW_LOCALES||'en,zh-CN').split(',');
const repair=process.env.OVERVIEW_REPAIR==='true';
const reuseServices=process.env.OVERVIEW_REUSE_SERVICES==='true',keepServices=process.env.OVERVIEW_KEEP_SERVICES==='true';
const reuseAccount=process.env.OVERVIEW_REUSE_ACCOUNT==='true';
const assignmentCopy={
 en:['Melody practice · 80 BPM','Loop measures 1–4. Start slowly and gradually raise the tempo.'],
 'zh-CN':['旋律慢练 · 80 BPM','循环练习第1至4小节，先慢速再逐步加速。'],
 'zh-TW':['旋律慢練 · 80 BPM','循環練習第1至4小節，先慢速再逐步加速。'],
 ja:['メロディー練習 · 80 BPM','第1〜4小節を繰り返し、ゆっくり始めて少しずつテンポを上げましょう。'],
 ko:['선율 연습 · 80 BPM','1~4마디를 반복하고 천천히 시작하여 템포를 점차 높이세요.'],
 fr:['Pratique mélodique · 80 BPM','Répétez les mesures 1 à 4. Commencez lentement, puis augmentez progressivement le tempo.'],
 es:['Práctica de melodía · 80 BPM','Repite los compases 1–4. Empieza despacio y aumenta el tempo poco a poco.'],
 de:['Melodie üben · 80 BPM','Takte 1–4 wiederholen. Langsam beginnen und das Tempo schrittweise erhöhen.'],
 ru:['Практика мелодии · 80 BPM','Повторяйте такты 1–4. Начните медленно и постепенно повышайте темп.'],
};
const expect=baseExpect.configure({timeout:60000});
fs.mkdirSync(out,{recursive:true});
const children=[];
const env={...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:'44602',RUNTIME_DATABASE_PRIMARY:'sqlite',POSTGRES_URL:'',DB_FILE:path.join(out,'capture.sqlite'),STORAGE_DIR:path.join(out,'storage'),STORAGE_BACKEND:'local',PUBLIC_SITE_URL:app,PUBLIC_APP_URL:app,PUBLIC_API_URL:api,ALLOWED_ORIGINS:app,ADMIN_API_KEY:'local-overview-capture-only-key-20261001',RATE_LIMIT_ENABLED:'false',LIFECYCLE_CLEANUP_ENABLED:'false',JOB_BROKER_BACKEND:'database',RESEND_API_KEY:'',EMAIL_FROM_ADDRESS:'',GOOGLE_CLIENT_ID:'',STRIPE_SECRET_KEY:'',PADDLE_API_KEY:'',WORKER_POLL_INTERVAL_MS:'400',WORKER_PROCESSING_DELAY_MS:'50'};
function start(label,args,cwd,extra={}){const log=fs.openSync(path.join(out,label+'.log'),'a');const child=spawn(process.execPath,args,{cwd,env:{...env,...extra},windowsHide:true,stdio:['ignore',log,log]});children.push(child);return child;}
async function ready(url){for(let i=0;i<500;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(r.status<500)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw new Error('Local service unavailable: '+url);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
if(!reuseServices)start('api',['services/api/dist/index.js'],root);
const appRequire=createRequire(path.join(root,'apps/app/package.json'));
if(!reuseServices)start('app',[appRequire.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','44601'],path.join(root,'apps/app'),{NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_API_BASE_URL:api,NEXT_PUBLIC_APP_URL:app,NEXT_PUBLIC_SITE_URL:app,NEXT_PUBLIC_TEACHING_AVAILABLE:'true',NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE:'false',NEXT_PUBLIC_ANALYTICS_ENABLED:'false',NEXT_PUBLIC_GOOGLE_CLIENT_ID:'',NEXT_PUBLIC_COLLABORATION_URL:'ws://127.0.0.1:44603'});
let browser,http,activePage;
const report={localApi:api,source:'samples/seo-product-demo.musicxml',mockedProductResponses:false,locales:{},...(fs.existsSync(path.join(out,'capture-report.json'))?JSON.parse(fs.readFileSync(path.join(out,'capture-report.json'),'utf8')):{})};delete report.error;
function save(){fs.writeFileSync(path.join(out,'capture-report.json'),JSON.stringify(report,null,2));}
report.ok=false;report.captureStatus='running';report.requestedLocales=locales;report.startedAt=new Date().toISOString();save();
try{
 await Promise.all([ready(api+'/health'),ready(app+'/login')]);
 if(!reuseServices)start('worker',['services/worker/dist/index.js'],root);
 if(keepServices)fs.writeFileSync(path.join(out,'local-service-pids.json'),JSON.stringify(children.map(c=>c.pid)));
 http=await request.newContext();
 let session;
 if(repair||reuseServices||reuseAccount)session=JSON.parse(fs.readFileSync(path.join(out,'private-session.json'),'utf8'));
 else{const reg=await http.post(api+'/api/auth/register',{data:{email:`overview-${Date.now()}@example.test`,password:randomUUID()+'Aa!'}});assert.equal(reg.status(),201,await reg.text());session=await reg.json();}
 const headers={Authorization:'Bearer '+session.token};
 fs.writeFileSync(path.join(out,'private-session.json'),JSON.stringify(session),{mode:0o600});
 if(!repair&&!reuseServices&&!reuseAccount){const codes=await http.post(api+'/api/admin/activation-codes/generate',{headers:{'x-admin-api-key':env.ADMIN_API_KEY},data:{quantity:1,entitlementDays:2,prefix:'DEMO',note:'Isolated video capture account'}});assert.equal(codes.status(),201,await codes.text());
 const redeem=await http.post(api+'/api/activation/redeem',{headers,data:{code:(await codes.json()).codes[0].code}});assert.equal(redeem.status(),200,await redeem.text());}
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
 for(const locale of locales){
  const dir=path.join(out,locale.toLowerCase());fs.mkdirSync(dir,{recursive:true});
  const labelSource=fs.readFileSync(path.join(root,`apps/app/src/lib/playback-practice-messages/locales/${locale}.ts`),'utf8');
  const label=key=>{const match=labelSource.match(new RegExp('\\b'+key+':\\s*"([^"]+)"'));assert.ok(match,'Missing playback label '+locale+'/'+key);return match[1];};
  let scoreId;
  if(repair)scoreId=report.locales[locale].scoreId;
  else{const imported=await http.post(api+'/api/scores/import/musicxml',{headers,multipart:{file:{name:'Product-Workflow-Etude.musicxml',mimeType:'application/xml',buffer:fs.readFileSync(path.join(root,'samples/seo-product-demo.musicxml'))}}});assert.equal(imported.status(),201,await imported.text());scoreId=(await imported.json()).score.id;}
  const current=async()=>{const r=await http.get(`${api}/api/scores/${scoreId}`,{headers});assert.equal(r.status(),200);return (await r.json()).score;};
  const original=await http.get(`${api}/api/scores/${scoreId}/playback`,{headers});assert.equal(original.status(),200);const originalPlayback=(await original.json()).playback;
  if(!repair)fs.writeFileSync(path.join(dir,'original-playback.json'),JSON.stringify(originalPlayback,null,2));
  const ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir,size:{width:1440,height:900}},colorScheme:'light'});
  await ctx.routeWebSocket('ws://127.0.0.1:44603/**',socket=>socket.close());
  await ctx.route('**/*',async route=>{const url=new URL(route.request().url());if(url.protocol==='data:'||url.protocol==='blob:'||url.hostname==='127.0.0.1'||url.hostname==='localhost')return route.continue();return route.abort();});
  await ctx.addCookies([{name:'score_session',value:session.token,url:app,httpOnly:true},{name:'score_locale',value:locale,url:app}]);
  await ctx.addInitScript(token=>localStorage.setItem('score-auth-token',token),session.token);
  const recordingStarted=Date.now(),page=await ctx.newPage();activePage=page;page.setDefaultTimeout(35000);
  page.on('pageerror',error=>fs.appendFileSync(path.join(dir,'browser-errors.txt'),error.message+'\n'));
  page.on('requestfailed',req=>fs.appendFileSync(path.join(dir,'requests-failed.txt'),req.url()+' '+req.failure()?.errorText+'\n'));
  const video=page.video(),scenes=[];
  const scene=async(name,fn)=>{if(repair&&!['overview','play','practice'].includes(name))return;const start=(Date.now()-recordingStarted)/1000;await fn();await sleep(3000);await page.screenshot({path:path.join(dir,name+'.png')});scenes.push({name,start,end:(Date.now()-recordingStarted)/1000});};
  const openWorkspace=async()=>{for(let attempt=0;attempt<4;attempt++){await expect.poll(async()=>{const r=await ctx.request.get(app+'/api/session',{headers:{'x-score-session':'bootstrap'}});return r.status();},{timeout:45000}).toBe(200);await page.goto(`${app}/scores/${scoreId}`);try{await expect(page.locator('#score-workspace-tools')).toBeVisible({timeout:20000});return;}catch(error){if(attempt===3)throw error;await sleep(500);}}};
  await openWorkspace();await expect(page.locator('[data-score-draft-editor]')).toBeVisible({timeout:120000});
  await page.addStyleTag({content:'nextjs-portal{display:none!important} .site-shell-header,#score-workspace-tools{position:relative!important;top:auto!important}'});
  const nav=page.locator('#score-workspace-tools'),editor=page.locator('[data-score-draft-editor]');
  const tab=async(index)=>{await nav.locator(':scope > button').nth(index).click();await sleep(650);};
  const frame=async()=>{await page.evaluate(()=>{const p=document.querySelector('.workspace-panel:not([hidden])');p?.scrollIntoView({block:'start'});const isEdit=p?.getAttribute('data-workspace-view')==='edit';if(isEdit)window.scrollBy(0,250);else window.scrollBy(0,-20);});};
  await scene('overview',async()=>{await frame();await sleep(1200);const paper=editor.locator('.vexflow-canvas').first();await paper.evaluate(el=>el.scrollIntoView({block:'start'}));const box=await paper.boundingBox();assert.ok(box);await page.screenshot({path:path.join(dir,'overview-score.png'),clip:{x:box.x,y:Math.max(0,box.y),width:box.width,height:Math.min(540,box.height)}});await frame();});
  await scene('edit',async()=>{await tab(0);const revision=(await current()).currentRevisionId;const notes=editor.locator('[data-vexflow-event-id]');await notes.first().click();await sleep(700);await page.keyboard.press('d');await page.keyboard.press('Enter');await expect.poll(async()=>(await current()).currentRevisionId).not.toBe(revision);await frame();});
  const before=await http.get(`${api}/api/scores/${scoreId}/playback`,{headers});const beforePlayback=(await before.json()).playback;
  await scene('transpose',async()=>{await tab(2);await page.locator('#transpose-score input[type=number]').first().fill('2');await sleep(800);const response=page.waitForResponse(r=>r.url().endsWith('/transpose')&&r.request().method()==='POST');await page.locator('#transpose-score button[type=submit]').click();assert.equal((await response).status(),201);await sleep(1300);await frame();});
  const after=await http.get(`${api}/api/scores/${scoreId}/playback`,{headers});const playback=(await after.json()).playback;if(!repair)assert.equal(playback.events[0].midi,beforePlayback.events[0].midi+2);fs.writeFileSync(path.join(dir,'transposed-playback.json'),JSON.stringify(playback,null,2));
  await scene('jianpu',async()=>{await tab(1);await expect(page.locator('#jianpu-preview')).toBeVisible();await frame();await sleep(1800);});
  await tab(3);const practicePanel=page.locator('#playback-practice');const loaded=page.waitForResponse(r=>r.url().includes('/playback')&&r.request().method()==='GET');await practicePanel.getByRole('button',{name:label('play'),exact:true}).click();assert.equal((await loaded).status(),200);await sleep(400);await practicePanel.getByRole('button',{name:label('stop'),exact:true}).click();
  await scene('play',async()=>{const tempo=practicePanel.locator('input[type=number]').first();await tempo.fill('80');await tempo.blur();await expect(tempo).toHaveValue('80');await frame();await practicePanel.getByRole('button',{name:label('play'),exact:true}).click();await sleep(4200);await expect(tempo).toHaveValue('80');await practicePanel.getByRole('button',{name:label('stop'),exact:true}).click();await frame();});
  await scene('practice',async()=>{await practicePanel.getByLabel(label('loop'),{exact:true}).check();await practicePanel.getByLabel(label('loopEnd'),{exact:true}).fill('4');await practicePanel.getByRole('button',{name:label('play'),exact:true}).click();await sleep(4200);await practicePanel.getByRole('button',{name:label('stop'),exact:true}).click();await frame();});
  // Real direct exports populate the same project's file list; queue rendering is left to the local worker.
  for(const format of ['midi','musicxml','audio/wav']){const response=await http.post(`${api}/api/scores/${scoreId}/export/${format}`,{headers,data:{tempoBpm:80}});assert.equal(response.status(),201,await response.text());const body=await response.json();const downloaded=await http.get(`${api}/api/files/${body.file.id}/download`,{headers});assert.equal(downloaded.status(),200);fs.writeFileSync(path.join(dir,format==='audio/wav'?'score.wav':'score.'+format),await downloaded.body());}
  await openWorkspace();await page.addStyleTag({content:'nextjs-portal{display:none!important} .site-shell-header,#score-workspace-tools{position:relative!important;top:auto!important}'});
  await scene('export',async()=>{await tab(4);await frame();await sleep(1500);});
  await scene('teaching',async()=>{await nav.locator('select').selectOption('teaching');await frame();const panel=page.locator('#teaching-workflow');await panel.locator('form input[type=text]').first().fill(assignmentCopy[locale][0]);await panel.locator('form textarea').first().fill(assignmentCopy[locale][1]);const r=page.waitForResponse(r=>r.url().endsWith('/assignments')&&r.request().method()==='POST');await panel.locator('form button[type=submit]').first().click();assert.equal((await r).status(),201);await sleep(800);await frame();});
  if(!repair){await page.goto(app+'/scores/new/musicxml');await expect(page.locator('#score-file-input')).toBeAttached();await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await scene('import',async()=>{await page.locator('#score-file-input').setInputFiles({name:'Product-Workflow-Etude.musicxml',mimeType:'application/xml',buffer:fs.readFileSync(path.join(root,'samples/seo-product-demo.musicxml'))});await sleep(900);});}
  await page.close();await ctx.close();const full=path.join(dir,repair?'workflow-tempo-repair.webm':'workflow.webm');await video.saveAs(full);
  report.locales[locale]={...report.locales[locale],scoreId,...(repair?{repairVideo:full,repairScenes:scenes}:{fullVideo:full,scenes}),pitchDelta:2,tempoBpm:80,tempoAsserted:true,originalNotes:originalPlayback.events.length,actualDirectExports:['midi','musicxml','wav']};save();
  for(const s of scenes){const result=spawnSync('ffmpeg',['-y','-v','error','-ss',String(s.start),'-i',full,'-t',String(s.end-s.start),'-an','-c:v','libvpx-vp9','-threads','2','-crf','32','-b:v','0',path.join(dir,s.name+'.webm')],{windowsHide:true});if(result.status!==0)throw new Error('Scene trim failed: '+s.name);}
  const mappingPath=path.join(out,'render-input.json'),mapping=fs.existsSync(mappingPath)?JSON.parse(fs.readFileSync(mappingPath,'utf8')):{locales:{}};
  const entry={sourceLocale:locale,audio:path.join(dir,'score.wav'),audioTempoBpm:80,overview:{image:path.join(dir,'overview-score.png')}};
  for(const name of ['import','edit','transpose','jianpu','playback','export','practice','teaching']){const stem=name==='playback'?'play':name;entry[name]={poster:path.join(dir,stem+'.png'),video:path.join(dir,stem+'.webm')};}
  if(repair)for(const name of ['import','edit','transpose','jianpu','export','teaching']){if(mapping.locales[locale]?.[name])entry[name]=mapping.locales[locale][name];}
  mapping.locales[locale]=entry;mapping.audio=path.join(out,'en/score.wav');fs.writeFileSync(mappingPath,JSON.stringify(mapping,null,2));
  console.log(`CAPTURE_READY ${locale} ${dir}`);
 }
 report.ok=true;report.captureStatus='complete';report.completedAt=new Date().toISOString();save();
}catch(error){report.ok=false;report.captureStatus='failed';report.error=String(error);if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await activePage.locator('body').innerText().catch(()=>''));}save();throw error;}
finally{await browser?.close();await http?.dispose();for(const child of children){if(keepServices)child.unref();else child.kill();}}
