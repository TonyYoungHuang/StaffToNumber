import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, request, expect } from '@playwright/test';
import fixtures from '../tests/e2e/omr-candidate-fixture.ts';
const { createOmrCandidateFixture, readOmrDocumentState, readScoreCollaborationCommands } = fixtures;
const app=process.env.FLOW_APP_ORIGIN || 'http://127.0.0.1:43101',api='http://127.0.0.1:43102';
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(app),'Flow tests only run against loopback frontends');
fs.mkdirSync('.tmp/flow-redesign',{recursive:true});
const out='.tmp/flow-redesign';const report={localApi:true,realPayments:false,checks:[]};
const pass=msg=>{console.log('PASS '+msg);report.checks.push(msg)};
const browser=await chromium.launch({headless:true,channel:'msedge'});
const requestContext=await request.newContext();let page;
const fixture=await createOmrCandidateFixture(requestContext,'flow-redesign');
const headers={Authorization:'Bearer '+fixture.token};
const accepted=await requestContext.post(`${api}/api/scores/${fixture.documentId}/candidate/accept`,{headers,data:{}});
assert.equal(accepted.status(),200);
function notes(){const s=readOmrDocumentState(fixture.documentId);return JSON.parse(s.revisions.find(r=>r.id===s.document.current_revision_id).score_json).measures.flatMap(m=>m.events);}
function pitch(id){return notes().find(n=>n.id===id).pitch.step;}
try{
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.routeWebSocket('**', socket => socket.close());
// Dev tests send the browser upload directly. The production-bundle API bridge
// replays the same XML fixture because CDP omits disk-backed multipart file bytes.
await context.route('https://api.scoretransposer.com/api/**', async route => {
  const request = route.request(); const url = request.url().replace('https://api.scoretransposer.com',api);
  let response;
  if (url.endsWith('/import/musicxml') && request.method() === 'POST') {
    const headers = {...request.headers()}; delete headers['content-type']; delete headers['content-length'];
    response = await route.fetch({url,headers,multipart:{file:{name:'seo-product-demo.musicxml',mimeType:'application/xml',buffer:fs.readFileSync('samples/seo-product-demo.musicxml')}}});
  } else response = await route.fetch({url});
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':app,'access-control-allow-credentials':'true'}});
});
await context.addCookies([{name:'score_locale',value:'en',url:app}]);
await context.addInitScript(token=>localStorage.setItem('score-auth-token',token),fixture.token);
page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${app}/scores/${fixture.documentId}`);
const editor=page.locator('[data-score-draft-editor]');await expect(editor).toBeVisible({timeout:90000});
const nav=page.locator('#score-workspace-tools');
const bbox=await editor.boundingBox();assert.ok(bbox.y<800);pass('Editor is visible on the first working screen');
for(const [name,view] of [['Jianpu','jianpu'],['Transpose','transpose'],['Play','play'],['Export','export'],['Edit','edit']]){
 await nav.getByRole('button',{name,exact:true}).click();await expect(page.locator(`[data-workspace-view="${view}"]`).first()).toBeVisible();
 const visible=await page.locator('.workspace-panel:visible').evaluateAll(es=>[...new Set(es.map(e=>e.dataset.workspaceView))]);assert.deepEqual(visible,[view]);
}
pass('Five main tabs switch in place; other panels are hidden');
await page.locator('.site-shell-header').getByRole('link',{name:'Transpose',exact:true}).click();
await expect(page.locator('[data-workspace-view="transpose"]')).toBeVisible();
assert.ok(page.url().startsWith(app+'/scores/'+fixture.documentId));
await page.locator('.site-shell-header').getByRole('link',{name:'Editor',exact:true}).click();
await expect(editor).toBeVisible();
pass('Header editor and transpose links stay on the current score and reveal the requested tool');
// A framework-cached initial hash must not override a later return destination.
await page.goto(app+'/scores/'+fixture.documentId+'#visual-editor#playback-practice');
await expect(page).toHaveURL(app+'/scores/'+fixture.documentId+'#playback-practice');
await expect(page.locator('[data-workspace-view="play"]')).toBeVisible();
await nav.getByRole('button',{name:'Edit',exact:true}).click();
pass('A cached earlier anchor is removed and the final requested tool opens');

const initial=readScoreCollaborationCommands(fixture.documentId).length;
await editor.getByLabel('Pitch',{exact:true}).selectOption('F');
await editor.getByLabel('Pitch',{exact:true}).selectOption('G');
await expect.poll(()=>pitch(fixture.firstEventId)).toBe('G');
await expect(editor.locator('.status-chip[aria-label="Editor status"]')).toHaveText('Synced');
assert.equal(readScoreCollaborationCommands(fixture.documentId).length,initial+1);
pass('Rapid edits debounce into one revision and report saved state');
await editor.getByRole('button',{name:'Undo my operation',exact:true}).click();
await expect(editor.getByLabel('Pitch',{exact:true})).toHaveValue('C');
await editor.getByRole('button',{name:'Redo my operation',exact:true}).click();
await expect(editor.getByLabel('Pitch',{exact:true})).toHaveValue('G');
pass('Undo and redo synchronize the displayed properties with the saved revision');
await editor.getByLabel('Pitch',{exact:true}).selectOption('A');
await editor.getByRole('button',{name:'Next',exact:true}).click();
await expect.poll(()=>pitch(fixture.firstEventId)).toBe('A');
await expect(editor.getByLabel('Pitch',{exact:true})).toHaveValue('D');
pass('Selecting the next note waits for the current draft to save');
await editor.getByRole('button',{name:'Previous',exact:true}).click();
await expect(editor.getByLabel('Pitch',{exact:true})).toHaveValue('A');
// Another session changes the selected note without updating this browser.
const base=readOmrDocumentState(fixture.documentId).document.current_revision_id;
const remote=await requestContext.post(`${api}/api/scores/${fixture.documentId}/collaboration/commands`,{headers,data:{operationId:crypto.randomUUID(),baseRevisionId:base,command:{type:'note.patch',patch:{eventId:fixture.firstEventId,step:'D'}}}});assert.equal(remote.status(),201);
await editor.getByLabel('Pitch',{exact:true}).selectOption('F');
await expect(editor.getByText('Concurrent edit conflict',{exact:true})).toBeVisible();
assert.equal(pitch(fixture.firstEventId),'D');
await editor.getByRole('button',{name:'Reapply my edit',exact:true}).click();
await expect.poll(()=>pitch(fixture.firstEventId)).toBe('F');
await expect(editor.locator('.status-chip[aria-label="Editor status"]')).toHaveText('Synced');
pass('A concurrent change stops autosave and requires explicit conflict resolution');
const pattern=/\/api\/scores\/[^/]+\/collaboration\/commands$/;
const offline=async route=>{if(route.request().method()==='POST')await route.abort('internetdisconnected');else await route.continue();};
await page.route(pattern,offline);
await editor.getByLabel('Pitch',{exact:true}).selectOption('E');
await expect(editor.getByText('Offline edit queue (1)',{exact:true})).toBeVisible();
assert.equal(pitch(fixture.firstEventId),'F');
await page.unroute(pattern,offline);
await editor.getByRole('button',{name:'Sync now',exact:true}).click();
await expect.poll(()=>pitch(fixture.firstEventId)).toBe('E');
await expect(editor.locator('.status-chip[aria-label="Editor status"]')).toHaveText('Synced');
pass('Offline edit is queued once and syncs without losing the draft');
await nav.getByRole('button',{name:'Export',exact:true}).click();
await page.getByLabel('File format',{exact:true}).selectOption('score-json');
const downloading=page.waitForEvent('download');await page.locator('.flow-export').getByRole('button',{name:'Export SCORE-JSON',exact:true}).click();
const download=await downloading;await download.saveAs(out+'/verified-score.json');
assert.equal(JSON.parse(fs.readFileSync(out+'/verified-score.json','utf8')).measures.flatMap(m=>m.events).find(n=>n.id===fixture.firstEventId).pitch.step,'E');
pass('Export downloads the edited structured score from the same workspace');
// Exercise existing processing endpoints through their new positions.
await nav.getByRole('button',{name:'Transpose',exact:true}).click();
await page.locator('#transpose-score').getByLabel('Semitones',{exact:true}).fill('2');
const transposing=page.waitForResponse(r=>r.url().endsWith('/transpose')&&r.request().method()==='POST');
await page.locator('#transpose-score button[type=submit]').click();
assert.equal((await transposing).status(),201);
await nav.getByRole('button',{name:'Edit',exact:true}).click();
await expect(editor.getByLabel('Pitch',{exact:true})).toHaveValue('F');
await nav.getByRole('button',{name:'Play',exact:true}).click();
const playing=page.waitForResponse(r=>r.url().includes('/playback')&&r.request().method()==='GET');
await page.locator('#playback-practice').getByRole('button',{name:'Play',exact:true}).click();
assert.equal((await playing).status(),200);
await expect(page.locator('#playback-practice').getByRole('button',{name:'Stop',exact:true})).toBeEnabled();
await page.locator('#playback-practice').getByRole('button',{name:'Stop',exact:true}).click();
pass('Transposition updates the same score and Play loads events without a generation step');
await nav.getByRole('button',{name:'Export',exact:true}).click();
for (const format of ['musicxml','midi','pdf','svg','png','wav','mp3']) {
  await page.getByLabel('File format',{exact:true}).selectOption(format);
  const queued=page.waitForResponse(r=>r.url().endsWith('/exports')&&r.request().method()==='POST');
  await page.locator('.flow-export').getByRole('button',{name:'Export '+format.toUpperCase(),exact:true}).click();
  const response=await queued;assert.equal(response.status(),202,format+' export queue');
  const body=await response.json();assert.ok(body.job.id);
}
pass('All seven rendered export formats submit jobs from the unified export control');

await nav.getByRole('button',{name:'Edit',exact:true}).click();
await expect(nav.getByRole('button',{name:'Edit',exact:true})).toHaveAttribute('aria-pressed','true');
await page.screenshot({path:out+'/local-workspace-desktop.png',animations:'disabled'});
report.height=await page.evaluate(()=>document.documentElement.scrollHeight);
await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:out+'/local-workspace-mobile.png'});pass('Mobile workspace has no page-level horizontal overflow');
await page.goto(app+'/scores/new/musicxml');
await page.locator('#score-file-input').setInputFiles('samples/seo-product-demo.musicxml');
const importing=page.waitForResponse(r=>r.url().endsWith('/import/musicxml')&&r.request().method()==='POST');
await page.getByRole('button',{name:'Start processing',exact:true}).click();
const response=await importing;assert.equal(response.status(),201);const imported=await response.json();
await expect(page).toHaveURL(app+'/scores/'+imported.score.id);await expect(page.locator('[data-score-draft-editor]')).toBeVisible();
pass('A real MusicXML import automatically opens the newly created editable score');
await page.setViewportSize({width:1440,height:1000});
for(const view of ['parts','share','history','source','teaching','advanced']) {
 await page.locator('#score-workspace-tools').getByLabel('More',{exact:true}).selectOption(view);
 await expect(page.locator(`[data-workspace-view="${view}"]`)).toBeVisible();
 if(view==='source') {
  const svg=page.locator('#omr-comparison .score-osmd-canvas svg').first();
  await expect(svg).toBeVisible();
  const bounds=await svg.boundingBox();assert.ok(bounds.width>100 && bounds.height>40,JSON.stringify(bounds));
  await expect(page.locator('#omr-comparison [role="alert"]')).toHaveCount(0);
 }
}
pass('All six advanced panels open, including a visible rendered source score');
await page.route(/\/api\/scores\/[^/?]+$/,async route=>{
 const response=await route.fetch({url:route.request().url().replace('https://api.scoretransposer.com',api)});const body=await response.json();
 if(body.score?.currentRevision){delete body.score.currentRevision.scoreJson;body.score.currentRevision.musicxmlFileId=null;body.revisions=[];}
 await route.fulfill({response,json:body});
});
await page.reload();
await expect(page.getByRole('heading',{name:'Upgrade to continue',exact:true})).toBeVisible();
assert.equal(new URL(await page.getByRole('link',{name:'Upgrade to continue',exact:true}).getAttribute('href'),app).pathname,'/checkout');
pass('A restricted existing revision displays an upgrade action instead of a processing placeholder');
assert.deepEqual(errors,[]);report.fixture={documentId:fixture.documentId,userId:fixture.userId};
}catch(e){report.error=String(e);if(page){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});fs.writeFileSync(out+'/failure.txt',await page.locator('body').innerText().catch(()=>''));}throw e;
}finally{await browser.close();await requestContext.dispose();fs.writeFileSync(out+'/editor-verification.json',JSON.stringify(report,null,2));}
