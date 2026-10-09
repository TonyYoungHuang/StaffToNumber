import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

// A deterministic, English-only score commercial. Not a recording of the app.
// All notation and highlight coordinates come from the same semantic score as
// the soundtrack. Do not depict audio transcription until it is available.
const work = path.resolve('.tmp/score-commercial');
const dest = path.resolve('apps/www/public/product/commercial/v2');
const manifest = JSON.parse(fs.readFileSync(path.join(work, 'score-assets/manifest.json'), 'utf8'));
const timeline = JSON.parse(fs.readFileSync(path.join(work, 'audio/timeline.json'), 'utf8'));
const assets = Object.fromEntries(Object.entries(manifest.assets).map(([id, a]) => [id, {
  svg: fs.readFileSync(a.svg, 'utf8'),
  data: JSON.parse(fs.readFileSync(a.notes, 'utf8')),
}]));
fs.mkdirSync(dest, { recursive: true });
fs.mkdirSync(path.join(work, 'frames'), { recursive: true });
const framesOnly = process.argv.includes('--frames-only');
const sceneDur = 60 / 112 * 8;
const chapters = [
  [0, sceneDur, 'Your score. In motion.'],
  [sceneDur, sceneDur * 2, 'Make every note yours.'],
  [sceneDur * 2, sceneDur * 3, 'Find your perfect key.'],
  [sceneDur * 3, sceneDur * 4, 'Hear it come alive.'],
  [sceneDur * 4, sceneDur * 6, 'One score. More voices. Piano. Violin. Flute.'],
  [sceneDur * 6, 30, 'ScoreTransposer. Bring your music to life. Start with your score.'],
];
const mark = `<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M9 35V13h32M9 24h25M9 35h25" fill="none" stroke="currentColor" stroke-width="3"/><path d="M32 11v24" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="26" cy="36" rx="7" ry="5" fill="currentColor" transform="rotate(-22 26 36)"/></svg>`;
const score = (id, cls = '') => `<div class="score ${cls}" data-score="${id}">${assets[id].svg}</div>`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>ScoreTransposer — First Light</title><style>
*{box-sizing:border-box}html,body{width:1920px;height:1080px;margin:0;overflow:hidden;background:#f1f0e8;font-family:Arial,Helvetica,sans-serif;color:#14151d}h1,h2,p{margin:0}svg{overflow:visible}.scene{position:absolute;inset:0;overflow:hidden;opacity:0;isolation:isolate}.brand{position:absolute;left:88px;top:54px;display:flex;align-items:center;gap:13px;font-size:28px;letter-spacing:-1px;font-weight:700;z-index:20}.brand svg{width:44px;height:44px}.eyebrow{font-size:19px;letter-spacing:5px;font-weight:600;text-transform:uppercase}.mini{font-size:21px;letter-spacing:1px}.score{position:absolute;transform-origin:center center}.score>svg{display:block;width:100%;height:100%}.score [data-note-index]{transition:none}.paper{background:#fffefa;box-shadow:0 45px 110px #15132921}.dark{background:#171825;color:#f7f6ee}.light-score{filter:invert(1);mix-blend-mode:screen}.layer{position:absolute;inset:0}.accent{color:#7860d5}.ital{font-family:Georgia,'Times New Roman',serif;font-weight:400;font-style:italic;letter-spacing:-7px}.wash{position:absolute;width:1000px;height:1000px;border-radius:50%;filter:blur(110px);opacity:.16;pointer-events:none}.tinyline{position:absolute;left:90px;right:90px;bottom:68px;display:flex;justify-content:space-between;font-size:18px;letter-spacing:2px}.tinyline span:last-child{letter-spacing:1px}.rule{height:1px;background:currentColor;opacity:.2;position:absolute;left:90px;right:90px;bottom:107px}.pulse{position:absolute;border-radius:50%;border:2px solid #7e63e2;pointer-events:none;opacity:0}.glint{position:absolute;width:95px;height:95px;border-radius:50%;background:#ab91ff;filter:blur(30px);opacity:0;pointer-events:none}
#intro{background:#f1f0e8}#intro .wash{background:#a9adff;right:-150px;top:0}#intro .headline{position:absolute;left:92px;top:272px;font-size:139px;line-height:1.03;letter-spacing:-8px;z-index:4}#intro .headline .ital{display:block;margin-top:9px;color:#7962cc}#intro .sub{position:absolute;left:100px;top:665px;font-size:28px;line-height:1.5;color:#666372}#intro .paper{position:absolute;left:970px;top:227px;width:1140px;height:655px;transform:rotate(-9deg);border-radius:3px}#intro .score{left:0;top:98px;width:1140px;height:442px}#intro .sheet-label{position:absolute;left:61px;bottom:50px;letter-spacing:5px;font-size:14px;color:#aaa5b4}#intro .eyebrow{position:absolute;left:100px;top:208px;color:#6e647c}#intro .orb{position:absolute;width:260px;height:260px;right:18px;bottom:-95px;background:#d0faa6;border-radius:50%;mix-blend-mode:multiply}
#edit{background:#dcd6ef}#edit .headline{position:absolute;left:94px;top:205px;font-size:110px;letter-spacing:-6px;line-height:1.02}#edit .headline .ital{color:#6d4ccc}#edit .score-stage{position:absolute;left:87px;top:452px;width:1745px;height:350px;transform-origin:center}#edit .score{inset:0;width:100%;height:100%}#edit .score svg{overflow:visible}#edit .edit-ring{position:absolute;left:0;top:0;width:80px;height:80px;border:2px solid #7352cb;border-radius:50%;opacity:0}#edit .edit-word{position:absolute;right:103px;top:258px;font-size:19px;letter-spacing:4px;text-align:right;line-height:1.9}#edit .under{position:absolute;left:98px;top:872px;display:flex;gap:52px;font-size:23px;letter-spacing:.2px;color:#60576f}
#transpose .wash{background:#9475ff;left:660px;top:160px;opacity:.2}#transpose .headline{position:absolute;left:94px;top:207px;font-size:105px;letter-spacing:-6px;line-height:1.02}#transpose .headline .ital{color:#c4b2ff;letter-spacing:-4px}#transpose .keys{position:absolute;left:1195px;top:243px;display:flex;align-items:center;gap:45px;font-size:115px;letter-spacing:-6px}#transpose .keys small{display:block;letter-spacing:5px;font-size:16px;color:#b4abc8;margin-top:12px}#transpose .arrow{font-size:69px;color:#c2f493;font-weight:300}#transpose .score-stage{position:absolute;left:85px;top:550px;width:1750px;height:350px}#transpose .score{inset:0;width:100%;height:100%}
#playback{background:#f1f0e8}#playback .headline{position:absolute;left:92px;top:184px;font-size:113px;letter-spacing:-6px;line-height:1.03;z-index:4}#playback .headline .ital{color:#7962cc}#playback .score{left:540px;top:391px;width:1460px;height:292px;transform:rotate(-5deg)}#playback .score-under{position:absolute;left:85px;top:585px;font-size:19px;letter-spacing:4px;color:#807589}#playback .wave{position:absolute;left:810px;top:760px;width:1020px;height:145px;display:flex;gap:6px;align-items:center}#playback .wave i{display:block;width:7px;border-radius:5px;background:#9d80ec}#playback .keyboard{position:absolute;left:94px;top:755px;width:620px;height:166px;display:flex;gap:3px;transform:perspective(1100px) rotateX(22deg) rotateZ(-3deg);filter:drop-shadow(0 24px 21px #29263813)}#playback .white{position:relative;flex:1;border:1px solid #d2cedc;background:#fff;border-radius:0 0 7px 7px}#playback .black{position:absolute;top:0;height:105px;width:26px;background:#272430;border-radius:0 0 5px 5px;z-index:2}.wave-rule{position:absolute;left:810px;top:832px;width:1020px;height:1px;background:#cec6dd}
#ensemble .wash{background:#7954c9;left:400px;top:0;opacity:.22}#ensemble .headline{position:absolute;left:87px;top:243px;font-size:103px;letter-spacing:-6px;line-height:1.05;z-index:4}#ensemble .headline .ital{color:#c3acf6;letter-spacing:-5px}#ensemble .ensemble-copy{position:absolute;left:94px;top:575px;line-height:2;font-size:26px;color:#b7afc8}#ensemble .ribbon{position:absolute;left:710px;width:1120px;height:211px;padding:0;transform-origin:center;border-bottom:1px solid #ffffff15}#ensemble .ribbon .score{left:0;top:56px;width:1120px;height:141px}#ensemble .instrument{position:absolute;left:41px;top:17px;display:flex;gap:16px;align-items:center;font-size:20px;letter-spacing:4px;text-transform:uppercase}#ensemble .dot{width:8px;height:8px;border-radius:50%;background:currentColor}#ensemble .piano{top:190px;color:#d5bbff}#ensemble .violin{top:422px;color:#d9f1af}#ensemble .flute{top:654px;color:#f8c894}#ensemble .score>svg{color:inherit}#ensemble .signal{height:1px;background:currentColor;position:absolute;right:28px;top:28px;width:240px;opacity:.35}
#outro{background:#dad0f0}#outro .wash{background:#faf8ec;right:90px;top:160px;opacity:.65}#outro .headline{position:absolute;left:95px;top:230px;font-size:117px;letter-spacing:-6px;line-height:1.05;z-index:3}#outro .headline .ital{color:#655094;letter-spacing:-5px}#outro .final-score{position:absolute;left:900px;top:180px;width:1220px;height:620px;transform:rotate(-12deg);opacity:.21}#outro .final-score .score{width:100%;height:100%;inset:0}#outro .cta{position:absolute;left:98px;top:738px;display:flex;gap:30px;align-items:center;font-size:28px;font-weight:600;border-bottom:2px solid #242030;padding-bottom:15px}#outro .cta span{font-size:34px;font-weight:400}#outro .formats{position:absolute;right:102px;bottom:156px;display:flex;gap:25px;font-size:18px;letter-spacing:3px}#outro .formats span{padding:10px 0}
</style><body>
<section id="intro" class="scene"><div class="wash"></div><div class="orb"></div><div class="brand">${mark}ScoreTransposer</div><div class="eyebrow">A world inside every score</div><h1 class="headline">Your score.<span class="ital">In motion.</span></h1><p class="sub">Every note has potential.</p><div class="paper">${score('original-C')}<div class="sheet-label">AN ORIGINAL COMPOSITION</div></div><div class="rule"></div><div class="tinyline"><span>CREATE · TRANSPOSE · PLAY</span><span>scoretransposer.com</span></div></section>
<section id="edit" class="scene"><div class="brand">${mark}ScoreTransposer</div><h2 class="headline">Make every note<br><span class="ital">yours.</span></h2><div class="edit-word">A LITTLE CHANGE.<br>A NEW FEELING.</div><div class="score-stage">${score('original-C-strip', 'before')}${score('edited-C-strip', 'after')}<div class="edit-ring"></div></div><div class="under"><span>Shape the melody.</span><span>Keep the feeling.</span></div><div class="rule"></div><div class="tinyline"><span>NOTE EDITING</span><span>scoretransposer.com</span></div></section>
<section id="transpose" class="scene dark"><div class="wash"></div><div class="brand">${mark}ScoreTransposer</div><h2 class="headline">Find your<br><span class="ital">perfect key.</span></h2><div class="keys"><div>C<small>MAJOR</small></div><div class="arrow">→</div><div class="target-key">D<small>MAJOR</small></div></div><div class="score-stage">${score('edited-C-strip', 'before light-score')}${score('edited-D-strip', 'after light-score')}</div><div class="rule"></div><div class="tinyline"><span>SEAMLESS TRANSPOSITION</span><span>scoretransposer.com</span></div></section>
<section id="playback" class="scene"><div class="brand">${mark}ScoreTransposer</div><h2 class="headline">Hear it<br><span class="ital">come alive.</span></h2><p class="score-under">FROM PAGE TO SOUND</p>${score('edited-D-strip')}<div class="keyboard">${Array.from({ length: 14 }, (_, i) => `<div class="white" data-key="${i}"></div>`).join('')}${[0,1,3,4,5,7,8,10,11,12].map(i=>`<div class="black" data-black="${i}" style="left:${(i+1)*620/14-13}px"></div>`).join('')}</div><div class="wave-rule"></div><div class="wave">${Array.from({ length: 80 }, () => '<i></i>').join('')}</div><div class="rule"></div><div class="tinyline"><span>SCORE TO AUDIO</span><span>scoretransposer.com</span></div></section>
<section id="ensemble" class="scene dark"><div class="wash"></div><div class="brand">${mark}ScoreTransposer</div><h2 class="headline">One score.<br><span class="ital">More voices.</span></h2><p class="ensemble-copy">Piano.<br>Violin.<br>Flute.<br><span style="color:#eeebf5">Find your sound.</span></p>${['piano','violin','flute'].map(p=>`<div class="ribbon ${p}"><div class="instrument"><i class="dot"></i>${p}</div><div class="signal"></div>${score('ensemble-D-'+p, 'light-score')}</div>`).join('')}<div class="rule"></div><div class="tinyline"><span>MULTIPLE PARTS. MORE POSSIBILITIES.</span><span>scoretransposer.com</span></div></section>
<section id="outro" class="scene"><div class="wash"></div><div class="brand">${mark}ScoreTransposer</div><div class="final-score">${score('edited-D')}</div><h2 class="headline">Bring your music<br><span class="ital">to life.</span></h2><div class="cta">Start with your score <span>↗</span></div><div class="formats"><span>MusicXML</span><span>MIDI</span><span>Audio</span></div><div class="rule"></div><div class="tinyline"><span>YOUR MUSIC. YOUR POSSIBILITIES.</span><span>scoretransposer.com</span></div></section>
<script>
const assets=${JSON.stringify(Object.fromEntries(Object.entries(assets).map(([k,v])=>[k,v.data])))};
const events=${JSON.stringify(timeline.events)};
const D=${sceneDur};
const sceneIds=['intro','edit','transpose','playback','ensemble','outro'];
const starts=[0,D,2*D,3*D,4*D,6*D];
const $=s=>document.querySelector(s);
const all=s=>[...document.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return 1-Math.pow(1-v,3)};
const nodes=all('.score');
for(const node of nodes){
 const svg=node.querySelector('svg');
 svg.style.width='100%';svg.style.height='100%';
 if(node.dataset.score.startsWith('ensemble-D-')){
  svg.setAttribute('viewBox','55 138 1500 175');
  node.querySelectorAll('.commercial-label').forEach(el=>el.remove());
 }
 node.querySelectorAll('g[data-note-index]').forEach(n=>{
  n.dataset.baseTransform=n.getAttribute('transform')||'';
  n.querySelectorAll('*').forEach(c=>{c.dataset.baseFill=c.getAttribute('fill')||'';c.dataset.baseStroke=c.getAttribute('stroke')||'';});
 });
}
function colorNote(n,color){
 n.setAttribute('fill',color);n.setAttribute('stroke',color);
 n.querySelectorAll('*').forEach(c=>{
  if(c.dataset.baseFill!=='none')c.setAttribute('fill',color);
  if(c.dataset.baseStroke!=='none')c.setAttribute('stroke',color);
 });
}
function resetNotes(){
 for(const node of nodes)for(const n of node.querySelectorAll('g[data-note-index]')){
  n.setAttribute('transform',n.dataset.baseTransform);colorNote(n,'#171a23');
 }
}
function moveNotes(node,fromId,toId,amount,onlyEdited){
 const from=assets[fromId],to=assets[toId];
 for(const n of node.querySelectorAll('g[data-note-index]')){
  const index=Number(n.dataset.noteIndex),a=from.notes.find(x=>x.noteIndex===index),b=to.notes.find(x=>x.noteIndex===index);
  if(!a||!b||onlyEdited&&!b.edited)continue;
  n.setAttribute('transform','translate('+((b.cx-a.cx)*amount/2)+' '+((b.cy-a.cy)*amount/2)+')');
  if(onlyEdited)colorNote(n,'#7b50ca');
 }
}
function highlight(t,scene){
 const active=events.filter(e=>e.scoreHighlight&&t>=e.startSeconds&&t<e.endSeconds+.045);
 for(const node of all('#'+scene+' .score')){
  let variant=node.dataset.score.replace(/-strip$/,'');
  if(variant.startsWith('ensemble-D-'))variant='ensemble-D';
  for(const e of active){
   if(e.sourceVariant!==variant)continue;
   const n=node.querySelector('[data-note-index="'+e.sourceNoteIndex+'"]');
   if(n)colorNote(n,node.classList.contains('light-score')?'#8954dd':'#8452d2');
  }
 }
 return active;
}
window.renderAt=t=>{
 resetNotes();
 const idx=starts.findLastIndex(s=>t>=s),id=sceneIds[Math.max(idx,0)],local=t-starts[Math.max(idx,0)];
 all('.scene').forEach(s=>{s.style.opacity='0';s.style.zIndex='0';s.style.transform='none'});
 const current=$('#'+id);current.style.opacity='1';current.style.zIndex='2';
 // Brief, beat-aligned dissolve; all motion is evaluated from absolute time.
 if(idx>0&&local<.28){const prior=$('#'+sceneIds[idx-1]);prior.style.opacity='1';prior.style.zIndex='1';current.style.opacity=String(ease(local/.28));}
 const enter=ease(local/.7);
 const headline=current.querySelector('.headline');
 headline.style.transform='translateY('+((1-enter)*35)+'px)';
 headline.style.opacity=String(clamp(.35+enter));
 const paper=$('#intro .paper');
 paper.style.transform='translate('+((1-ease(t/1.1))*210-(t*4))+'px,'+(-t*3)+'px) rotate('+(-9+t*.3)+'deg) scale('+(1+t*.006)+')';
 if(id==='edit'){
  const before=$('#edit .before'),after=$('#edit .after');
  const morph=ease((local-.1)/.82);
  before.style.opacity=local<.93?'1':'0';after.style.opacity=local<.93?'0':'1';
  moveNotes(before,'original-C-strip','edited-C-strip',morph,true);
  const pulse=.4+.6*Math.pow(Math.sin(local*2.5),2);
  for(const n of after.querySelectorAll('[data-note-index]'))if(assets['edited-C-strip'].notes.find(a=>a.noteIndex===+n.dataset.noteIndex)?.edited)colorNote(n,'#7b50ca');
  const note=assets['edited-C-strip'].notes.find(n=>n.noteIndex===2);
  const ring=$('#edit .edit-ring'),k=1745/1600;
  ring.style.left=(note.cx*k-40)+'px';ring.style.top=(note.cy*k-40)+'px';ring.style.opacity=String(clamp(1-local/3)*.8);ring.style.transform='scale('+(1+local*.27)+')';
  $('#edit .score-stage').style.transform='translateY('+(-local*3)+'px) scale('+(1+local*.006)+')';
 }
 if(id==='transpose'){
  const before=$('#transpose .before'),after=$('#transpose .after');
  // VexFlow beams live outside note groups. Dissolve complete, valid notation
  // layers so stems, beams and key signatures stay connected in every frame.
  const morph=ease((local-.06)/.72);
  before.style.opacity=String(1-morph);after.style.opacity=String(morph);
  before.style.transform='translateY('+(-morph*12)+'px)';
  after.style.transform='translateY('+((1-morph)*12)+'px)';
  $('#transpose .target-key').style.color=local<.85?'#847892':'#d3f8ab';
  $('#transpose .target-key').style.transform='translateY('+((1-morph)*22)+'px)';
  $('#transpose .score-stage').style.transform='translateY('+(-local*3)+'px) scale('+(1+local*.009)+')';
 }
 const active=highlight(t,id);
 if(id==='playback'){
  const power=active.length?1:.45;
  all('#playback .wave i').forEach((b,i)=>{const shape=Math.pow(Math.sin(i/79*Math.PI),.7);const v=(.28+.72*Math.abs(Math.sin(i*.24-t*4.1)*Math.cos(i*.13+t*3.8)));b.style.height=(6+125*shape*v*power)+'px';b.style.opacity=String(.3+shape*.7)});
  const whiteMidi=[60,62,64,65,67,69,71,72,74,76,77,79,81,83];
  const blackMidi=[61,63,66,68,70,73,75,78,80,82];
  all('#playback .white').forEach((k,i)=>k.style.background=active.some(e=>e.midi===whiteMidi[i])?'#c6b4f5':'#fff');
  all('#playback .black').forEach((k,i)=>k.style.background=active.some(e=>e.midi===blackMidi[i])?'#8c68d2':'#272430');
  $('#playback .score').style.transform='translateX('+(-local*7)+'px) rotate('+(-5+local*.5)+'deg)';
 }
 if(id==='ensemble'){
  all('#ensemble .ribbon').forEach((r,i)=>{const e=ease((local-i*.22)/.8);r.style.opacity=String(e);r.style.transform='translateX('+((1-e)*280-local*2)+'px) rotate('+([-1.8,1.1,-1][i]+Math.sin(local*.7+i)*.2)+'deg)';r.querySelector('.signal').style.width=(140+60*Math.sin(t*2+i))+'px'});
 }
 if(id==='outro'){
  $('#outro .final-score').style.transform='translateX('+(-local*12)+'px) rotate('+(-12+local*.5)+'deg)';
  $('#outro .cta').style.opacity=String(ease((local-.65)/.6));
  $('#outro .cta').style.transform='translateY('+((1-ease((local-.65)/.6))*20)+'px)';
 }
 return {t,id,active:active.map(e=>e.sourceNoteIndex)};
};
window.renderAt(0);
</script></body></html>`;
const htmlPath = path.join(work, 'commercial.html');
fs.writeFileSync(htmlPath, html);

function exec(exe, args, label) {
  const r = spawnSync(exe, args, { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw new Error(`${label}: ${r.stderr?.slice(-2500)}`);
  return r.stdout;
}
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.evaluate(() => document.fonts.ready);
  const sampleTimes = [1.6, 3.6, 4.7, 6.5, 9, 10.5, 14.5, 18.3, 21.3, 25.1, 27.8, 29.8];
  for (const t of sampleTimes) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(work, 'frames', `${String(t).replace('.', '-')}.png`) });
  }
  console.log('Rendered 12 review frames.');
  if (!framesOnly) {
    const video = path.join(dest, 'scoretransposer-30s.mp4');
    const log = fs.openSync(path.join(work, 'encode.log'), 'w');
    const encoder = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', '30', '-vcodec', 'png', '-i', 'pipe:0', '-i', path.join(work, 'audio/first-light-30s.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-threads', '4', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-t', '30', video], { windowsHide: true, stdio: ['pipe', 'ignore', log] });
    const finished = new Promise((resolve, reject) => { encoder.once('error', reject); encoder.once('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}; see encode.log`))); });
    encoder.stdin.on('error', () => {});
    for (let frame = 0; frame < 900; frame++) {
      await page.evaluate(t => window.renderAt(t), frame / 30);
      const png = await page.screenshot({ type: 'png', animations: 'disabled' });
      if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain');
      if (frame % 150 === 0) console.log(`Encoded ${frame}/900 frames`);
    }
    encoder.stdin.end();
    await finished;
    fs.closeSync(log);
    const stamp = t => {const ms = Math.round(t * 1000);return `00:${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`};
    fs.writeFileSync(path.join(dest, 'captions-en.vtt'), `WEBVTT\n\n${chapters.map(([start,end,text])=>`${stamp(start)} --> ${stamp(end)}\n${text}`).join('\n\n')}\n`);
    const poster = path.join(dest, 'poster.webp');
    for (const quality of [62, 54, 45, 36, 28]) {
      exec('ffmpeg', ['-y', '-i', path.join(work, 'frames/1-6.png'), '-vf', 'scale=960:540', '-frames:v', '1', '-c:v', 'libwebp', '-quality', String(quality), poster], 'poster');
      if (fs.statSync(poster).size <= 18000) break;
    }
    const probe = JSON.parse(exec('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video], 'probe'));
    const audit = { renderedAt: new Date().toISOString(), language: 'en', sharedAcrossAllLocales: true, kind: 'advertising motion design with semantic music notation', duration: 30, tempo: 112, chapters, soundtrack: 'Original advertising arrangement, not an application playback recording', audioToScoreDepicted: false, probe, files: Object.fromEntries(['scoretransposer-30s.mp4', 'poster.webp', 'captions-en.vtt'].map(name => { const b = fs.readFileSync(path.join(dest, name)); return [name, { bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') }]; })) };
    fs.writeFileSync(path.join(work, 'media-audit.json'), JSON.stringify(audit, null, 2));
    console.log(JSON.stringify({ duration: probe.format.duration, files: audit.files }, null, 2));
  }
} finally { await browser.close(); }
