import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

// Recompose the semantic score animation for a website background. The v2 ad
// remains unchanged; promotional typography is now accessible page content.
const root=process.cwd(),work=path.resolve('.tmp/score-background-light'),dest=path.resolve('apps/www/public/product/commercial/v4');
fs.mkdirSync(path.join(work,'frames'),{recursive:true});fs.mkdirSync(dest,{recursive:true});
const framesOnly=process.argv.includes('--frames-only');
function run(exe,args){const r=spawnSync(exe,args,{windowsHide:true,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr?.slice(-2000)||exe+' failed');return r.stdout}
run(process.execPath,['scripts/render-score-commercial.mjs','--frames-only']);
const css=`
html,body,.scene,#intro,#edit,#transpose,#playback,#ensemble,#outro{background:#ffffff!important;color:#242031!important}
.brand,.headline,.eyebrow,.sub,.sheet-label,.tinyline,.rule,.edit-word,.under,.score-under,.ensemble-copy,.cta,.formats,.orb{display:none!important}
.score,.light-score{filter:none!important;mix-blend-mode:normal}.wash{opacity:.075!important;background:#aa91e3!important}
#intro .paper{left:440px;top:72px;width:1570px;height:770px;background:transparent;box-shadow:none}
#intro .score{left:0;top:0;width:1570px;height:608px}
#edit .score-stage{left:350px;top:145px;width:1730px;height:346px}
#edit .edit-ring{border-color:#7855cc}
#transpose .score-stage{left:300px;top:180px;width:1760px;height:352px}
#transpose .keys{left:1210px;top:670px;font-size:95px;opacity:.75}
#transpose .keys small{color:#655d78}#transpose .arrow{color:#7254bd}
#transpose .target-key{color:#6545c1!important}
#playback .score{left:380px;top:95px;width:1750px;height:350px}
#playback .keyboard{left:1120px;top:680px;width:620px;opacity:.7}
#playback .wave{left:940px;top:460px;width:1020px}.wave-rule{left:940px!important;top:532px!important;opacity:.2}
#ensemble .ribbon{left:550px;width:1300px;height:228px;border-color:transparent}
#ensemble .ribbon .score{left:0;top:56px;width:1300px;height:162px}
#ensemble .piano{top:68px}#ensemble .violin{top:318px}#ensemble .flute{top:568px}
#ensemble .instrument{font-size:21px}#ensemble .signal{display:none}
#ensemble .piano{color:#69509b}#ensemble .violin{color:#537545}#ensemble .flute{color:#996839}
#outro .final-score{left:410px;top:78px;width:1580px;height:612px;opacity:.9}
`;
const motion=`
const filmRender=window.renderAt;
window.renderAt=t=>{
 const result=filmRender(t);
 const paper=document.querySelector('#intro .paper');
 paper.style.transform='translate('+(-Math.sin(Math.min(t,4.28)*.55)*24)+'px,0) rotate(-8deg)';
 if(t>28.5){
  const p=Math.min(1,(t-28.5)/1.5),smooth=p*p*(3-2*p);
  document.querySelector('#outro').style.opacity=String(1-smooth);
  const intro=document.querySelector('#intro');intro.style.zIndex='3';intro.style.opacity=String(smooth);
  paper.style.transform='rotate(-8deg)';
 }
 return result;
};window.renderAt(0);
`;
let html=fs.readFileSync('.tmp/score-commercial/commercial.html','utf8');
html=html.replace('</head>','</head>');
html=html.replace('</style>',css+'</style>').replace('</body>','<script>'+motion+'</script></body>');
const htmlPath=path.join(work,'background.html');fs.writeFileSync(htmlPath,html);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});await page.goto(pathToFileURL(htmlPath).href);await page.evaluate(()=>document.fonts.ready);
 for(const t of [0,2,6.5,10.5,14.5,21.3,27.8,29.97]){await page.evaluate(t=>window.renderAt(t),t);await page.screenshot({path:path.join(work,'frames',String(t)+'.png')});}
 console.log('Background frames ready.');
 if(!framesOnly){
  const video=path.join(dest,'score-motion-30s.mp4'),log=fs.openSync(path.join(work,'encode.log'),'w');
  const enc=spawn('ffmpeg',['-y','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-i','.tmp/score-commercial/audio/first-light-30s.wav','-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','24','-threads','4','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart','-t','30',video],{windowsHide:true,stdio:['pipe','ignore',log]});
  const done=new Promise((resolve,reject)=>{enc.on('error',reject);enc.on('close',code=>code===0?resolve():reject(Error('Encoder failed '+code)))});enc.stdin.on('error',()=>{});
  for(let f=0;f<900;f++){await page.evaluate(t=>window.renderAt(t),f/30);const png=await page.screenshot({type:'png',animations:'disabled'});if(!enc.stdin.write(png))await once(enc.stdin,'drain');if(f%150===0)console.log('Encoded '+f+'/900');}
  enc.stdin.end();await done;fs.closeSync(log);
  const poster=path.join(dest,'poster.webp');
  outer:for(const width of [960,800,640])for(const q of [48,36,26]){run('ffmpeg',['-y','-i',path.join(work,'frames/2.png'),'-vf','scale='+width+':-2','-frames:v','1','-c:v','libwebp','-quality',String(q),poster]);if(fs.statSync(poster).size<=6500)break outer;}
  const audit={renderedAt:new Date().toISOString(),language:'en',duration:30,websiteBackground:true,burnedPromotionalCopy:false,audio:'Same original FIRST LIGHT arrangement; default playback is muted',loop:'Last 1.5 seconds dissolve into the opening composition',probe:JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',video])),files:Object.fromEntries(['score-motion-30s.mp4','poster.webp'].map(n=>{const b=fs.readFileSync(path.join(dest,n));return[n,{bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}] }))};
  fs.writeFileSync(path.join(work,'media-audit.json'),JSON.stringify(audit,null,2));console.log(JSON.stringify(audit.files));
 }
}finally{await browser.close()}
