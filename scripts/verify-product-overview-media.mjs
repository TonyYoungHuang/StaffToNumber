import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as overviewModule from '../apps/www/src/lib/product-overview.ts';

const { getProductOverviewCopy, PRODUCT_OVERVIEW_DURATION }=overviewModule.default??overviewModule;
const locales=['en','zh-CN','zh-TW','ja','ko','fr','es','de','ru'];
const output={durationSeconds:PRODUCT_OVERVIEW_DURATION,locales:[]};
const capturePath=process.argv.find(x=>x.startsWith('--capture-report='))?.slice(17);
const capture=capturePath?JSON.parse(fs.readFileSync(capturePath,'utf8')):null;
if(capture){assert.equal(capture.ok,true);assert.equal(capture.mockedProductResponses,false);}
const timestamp=value=>`${String(Math.floor(value/3600)).padStart(2,'0')}:${String(Math.floor(value/60)%60).padStart(2,'0')}:${String(value%60).padStart(2,'0')}.000`;
for(const locale of locales){
 const directory=path.resolve('apps/www/public/product/overview/v1',locale.toLowerCase());
 const copy=getProductOverviewCopy(locale);
 assert.equal(copy.chapters.length,8);
 assert.equal(copy.scenes[0].start,0);
 assert.equal(copy.scenes.at(-1).start+copy.scenes.at(-1).duration,PRODUCT_OVERVIEW_DURATION);
 for(let i=1;i<copy.scenes.length;i++)assert.equal(copy.scenes[i].start,copy.scenes[i-1].start+copy.scenes[i-1].duration);
 const files=['overview.mp4','poster.webp','captions.vtt'].map(name=>{
  const data=fs.readFileSync(path.join(directory,name));
  assert.ok(data.length>0,`${locale}/${name} is empty`);
  assert.ok(data.length<=(name.endsWith('.mp4')?5*1024*1024:name.endsWith('.webp')?18*1024:10*1024),`${locale}/${name} exceeds media budget`);
  return {name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
 });
 const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(directory,'overview.mp4')],{windowsHide:true,encoding:'utf8'});
 assert.equal(probe.status,0,probe.stderr);
 const media=JSON.parse(probe.stdout),video=media.streams.find(s=>s.codec_type==='video'),audio=media.streams.find(s=>s.codec_type==='audio');
 assert.equal(video?.codec_name,'h264');assert.equal(video.pix_fmt,'yuv420p');
 assert.equal(video.width,1600);assert.equal(video.height,900);
 assert.equal(audio?.codec_name,'aac');
 assert.ok(Math.abs(Number(media.format.duration)-PRODUCT_OVERVIEW_DURATION)<.1,locale+' duration');
 const bytes=fs.readFileSync(path.join(directory,'overview.mp4'));
 assert.ok(bytes.indexOf(Buffer.from('moov'))<bytes.indexOf(Buffer.from('mdat')),locale+' fast-start metadata');
 const vtt=fs.readFileSync(path.join(directory,'captions.vtt'),'utf8');
 assert.ok(vtt.startsWith('WEBVTT\n'));
 for(const scene of copy.scenes){
  assert.ok(vtt.includes(`${timestamp(scene.start)} --> ${timestamp(scene.start+scene.duration)}`),locale+' caption timing');
  assert.ok(vtt.includes(scene.detail),locale+' caption copy');
 }
 let operations;
 if(capture){
  const recorded=capture.locales[locale];assert.ok(recorded,locale+' capture evidence');
  assert.equal(recorded.pitchDelta,2);assert.equal(recorded.tempoBpm,80);assert.equal(recorded.tempoAsserted,true);
  assert.deepEqual(recorded.actualDirectExports,['midi','musicxml','wav']);
  operations={pitchShiftSemitones:2,tempoBpm:80,directExports:recorded.actualDirectExports};
 }
 output.locales.push({locale,files,video:{codec:video.codec_name,width:video.width,height:video.height},audio:{codec:audio.codec_name,sampleRate:Number(audio.sample_rate)},...(operations?{verifiedOperations:operations}:{})});
}
const report=process.argv.find(x=>x.startsWith('--report='))?.slice(9);
if(report){fs.mkdirSync(path.dirname(path.resolve(report)),{recursive:true});fs.writeFileSync(report,JSON.stringify(output,null,2)+'\n');}
console.log(`Verified ${locales.length} localized videos: 80 seconds, H.264/AAC, fast start, timed captions and media budgets.`);
