import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';
import {parseMusicXmlToScoreJson} from '../services/api/dist/lib/musicxml-score-parser.js';
import {scoreJsonToPlayback} from '../services/api/dist/lib/score-playback.js';

// Original notation artwork, rendered by the same VexFlow 5 engine as the editor.
// This is a product illustration, not a screenshot or simulated UI interaction.
const root=process.cwd();
const out=path.join(root,'.tmp/score-commercial/score-assets');
fs.mkdirSync(out,{recursive:true});
const requireApp=createRequire(path.join(root,'apps/app/package.json'));
const tempoBpm=112;
const melody=[
 [['E4',.5],['G4',.5],['A4',1],['G4',1],['E4',1]],
 [['D4',1],['E4',1],['G4',2]],
 [['A4',.5],['C5',.5],['B4',1],['A4',1],['G4',1]],
 [['E4',1],['D4',1],['C4',2]],
 [['E4',1],['G4',.5],['A4',.5],['G4',1],['E4',1]],
 [['F4',1],['A4',1],['G4',2]],
 [['E4',.5],['G4',.5],['C5',1],['B4',1],['D5',1]],
 [['C5',4]],
];
const flute=[
 [['G5',2],['E5',2]], [['F5',2],['E5',2]],
 [['E5',2],['D5',2]], [['E5',2],['C5',2]],
];
const piano=[
 [['C3',1],['E3',1],['G3',1],['E3',1]],
 [['B2',1],['D3',1],['G3',1],['D3',1]],
 [['A2',1],['C3',1],['E3',1],['C3',1]],
 [['C3',1],['G2',1],['C3',2]],
];
const editMap={2:'C5',10:'D5',18:'C5'};
const pitchClass={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midi(pitch){const m=pitch.match(/^([A-G])(#?)(\d)$/);assert.ok(m);return (Number(m[3])+1)*12+pitchClass[m[1]]+(m[2]?1:0);}
function pitchFromMidi(value){return ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][value%12]+(Math.floor(value/12)-1);}
function makePart(id,name,midiProgram,clef,measures,{edit=false,transpose=0}={}){
 let index=0;
 return {id,name,midiProgram,clef,measures:measures.map((measure,measureIndex)=>{
  assert.equal(measure.reduce((sum,n)=>sum+n[1],0),4,`${id} measure ${measureIndex+1}`);
  let beat=0;
  return measure.map(([raw,durationBeats])=>{
   const partNoteIndex=index++,edited=edit&&Object.hasOwn(editMap,partNoteIndex);
   const pitch=pitchFromMidi(midi(edited?editMap[partNoteIndex]:raw)+transpose);
   const note={partNoteIndex,partId:id,measureIndex,pitch,midi:midi(pitch),startBeat:measureIndex*4+beat,durationBeats,edited};
   beat+=durationBeats;return note;
  });
 })};
}
function variant(id,keySignature,parts){let noteIndex=0;for(const part of parts)for(const measure of part.measures)for(const note of measure)note.noteIndex=noteIndex++;return {id,title:'FIRST LIGHT',tempoBpm,timeSignature:{beats:4,beatType:4},keySignature,keyFifths:keySignature==='D'?2:0,totalBeats:parts[0].measures.length*4,parts,notes:parts.flatMap(p=>p.measures.flat())};}
const variants={
 'original-C':variant('original-C','C',[makePart('melody','Piano',1,'treble',melody)]),
 'edited-C':variant('edited-C','C',[makePart('melody','Piano',1,'treble',melody,{edit:true})]),
 'original-D':variant('original-D','D',[makePart('melody','Piano',1,'treble',melody,{transpose:2})]),
 'edited-D':variant('edited-D','D',[makePart('melody','Piano',1,'treble',melody,{edit:true,transpose:2})]),
 'ensemble-D':variant('ensemble-D','D',[
  makePart('flute','Flute',74,'treble',flute,{transpose:2}),
  makePart('violin','Violin',41,'treble',melody.slice(0,4),{edit:true,transpose:2}),
  makePart('piano','Piano',1,'bass',piano,{transpose:2}),
 ]),
};
for(const base of ['original','edited'])for(let i=0;i<variants[`${base}-C`].notes.length;i++)assert.equal(variants[`${base}-D`].notes[i].midi-variants[`${base}-C`].notes[i].midi,2);
const scoreData={title:'FIRST LIGHT',tempoBpm,originalComposition:true,noteIndexScope:'Unique within each variant; main melody indices stable across C/D/edit variants. Ensemble also supplies partNoteIndex.',variants};
fs.writeFileSync(path.join(out,'score-data.json'),JSON.stringify(scoreData,null,2));
for(const [id,data]of Object.entries(variants))fs.writeFileSync(path.join(out,id+'.notes.json'),JSON.stringify(data,null,2));
console.log('SCORE_DATA_READY '+path.join(out,'score-data.json'));

function musicXml(data){
 const noteType={.5:'eighth',1:'quarter',2:'half',4:'whole'};
 const header=`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>FIRST LIGHT</work-title></work><identification><creator type="composer">ScoreTransposer</creator></identification><part-list>${data.parts.map((p,i)=>`<score-part id="P${i+1}"><part-name>${p.name}</part-name><score-instrument id="I${i+1}"><instrument-name>${p.name}</instrument-name></score-instrument><midi-instrument id="I${i+1}"><midi-channel>${i+1}</midi-channel><midi-program>${p.midiProgram}</midi-program></midi-instrument></score-part>`).join('')}</part-list>`;
 return header+data.parts.map((p,i)=>`<part id="P${i+1}">${p.measures.map((measure,m)=>`<measure number="${m+1}">${m===0?`<attributes><divisions>2</divisions><key><fifths>${data.keyFifths}</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>${p.clef==='bass'?'F':'G'}</sign><line>${p.clef==='bass'?4:2}</line></clef></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempoBpm}</per-minute></metronome></direction-type><sound tempo="${tempoBpm}"/></direction>`:''}${measure.map(n=>`<note id="note-${n.noteIndex}"><pitch><step>${n.pitch[0]}</step>${n.pitch.includes('#')?'<alter>1</alter>':''}<octave>${n.pitch.at(-1)}</octave></pitch><duration>${n.durationBeats*2}</duration><type>${noteType[n.durationBeats]}</type></note>`).join('')}${m===p.measures.length-1?'<barline location="right"><bar-style>light-heavy</bar-style></barline>':''}</measure>`).join('')}</part>`).join('')+'</score-partwise>';
}
const semanticChecks=[];
for(const data of Object.values(variants)){
 const xml=musicXml(data);fs.writeFileSync(path.join(out,data.id+'.musicxml'),xml);
 const parsed=parseMusicXmlToScoreJson({musicXml:xml,title:data.title,sourceFileId:'commercial-original',sourceOriginalName:data.id+'.musicxml',importedAt:'2026-10-01T00:00:00.000Z'});
 const playback=scoreJsonToPlayback(parsed,'2026-10-01T00:00:00.000Z');
 assert.equal(playback.tempoBpm,tempoBpm);assert.equal(playback.totalBeats,data.totalBeats);assert.equal(playback.events.length,data.notes.length);
 for(let p=0;p<data.parts.length;p++){
  const expected=data.parts[p].measures.flat(),actual=playback.events.filter(n=>n.partId===parsed.parts[p].id);
  assert.equal(actual.length,expected.length);assert.equal(playback.parts[p].midiProgram,data.parts[p].midiProgram);
  expected.forEach((note,i)=>{assert.equal(actual[i].midi,note.midi);assert.equal(actual[i].startBeat,note.startBeat);assert.equal(actual[i].durationBeats,note.durationBeats);});
 }
 fs.writeFileSync(path.join(out,data.id+'.playback.json'),JSON.stringify(playback,null,2));
 semanticChecks.push({variant:data.id,noteCount:playback.events.length,totalBeats:playback.totalBeats,tempoBpm:playback.tempoBpm,programs:playback.parts.map(p=>p.midiProgram),productParserRoundTrip:true});
}

const browser=await chromium.launch({channel:'msedge',headless:true});
const manifest={title:'FIRST LIGHT',tempoBpm,renderer:'VexFlow 5.0.0 / Bravura',scoreData:path.join(out,'score-data.json'),assets:{}};
try{
 const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 await page.route('**/*',route=>route.abort());
 await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body><div id="score"></div></body></html>');
 await page.evaluate(()=>{
  window.__notationFonts=[];const NativeFontFace=window.FontFace;
  window.FontFace=class extends NativeFontFace{constructor(family,source,descriptors){super(family,source,descriptors);const encoded=typeof source==='string'?source:'url(data:font/woff2;base64,'+btoa(Array.from(new Uint8Array(source)).map(c=>String.fromCharCode(c)).join(''))+')';window.__notationFonts.push({family,source:encoded});}};
 });
 await page.addScriptTag({path:requireApp.resolve('vexflow/bravura')});
 await page.evaluate(async()=>{await document.fonts.ready;await document.fonts.load('16px Bravura');});
 const renderJobs=Object.values(variants).flatMap(data=>(data.parts.length===1?[false,true]:[false]).map(strip=>({data,strip,assetId:data.id+(strip?'-strip':'')})));
 for(const part of variants['ensemble-D'].parts)renderJobs.push({data:{...variants['ensemble-D'],parts:[part],notes:part.measures.flat()},strip:true,assetId:'ensemble-D-'+part.id});
 for(const {data,strip,assetId}of renderJobs){
  const height=data.parts.length>1?900:strip?320:620;
  const rendered=await page.evaluate(({data,strip,height})=>{
   const VF=window.VexFlow,scale=2,width=1600;
   const target=document.querySelector('#score');target.replaceChildren();
   const renderer=new VF.Renderer(target,VF.Renderer.Backends.SVG);renderer.resize(width,height);
   const ctx=renderer.getContext();ctx.setFillStyle('#171a23');ctx.setStrokeStyle('#171a23');
   const svg=target.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`FIRST LIGHT, ${data.keySignature} major`);
   const ns='http://www.w3.org/2000/svg';const defs=document.createElementNS(ns,'defs'),style=document.createElementNS(ns,'style');
   style.textContent=window.__notationFonts.map(font=>`@font-face{font-family:'${font.family}';src:${font.source};}`).join('\n');defs.append(style);svg.prepend(defs);
   const label=(text,x,y,size,weight='normal',anchor='start')=>{const el=document.createElementNS(ns,'text');el.classList.add('commercial-label');el.textContent=text;el.setAttribute('x',String(x));el.setAttribute('y',String(y));el.setAttribute('font-family','Arial, sans-serif');el.setAttribute('font-size',String(size));el.setAttribute('font-weight',weight);el.setAttribute('letter-spacing',text==='FIRST LIGHT'?'5':'0');el.setAttribute('fill','#171a23');el.setAttribute('text-anchor',anchor);svg.append(el);return el;};
   label('FIRST LIGHT',800,56,26,'600','middle');label(`${data.keySignature} MAJOR`,1520,58,15,'500','end');
   const notesOut=[],measuresOut=[],systems=data.parts.length>1?1:strip?1:2;
   for(let system=0;system<systems;system++)for(let column=0;column<4;column++){
    const measureIndex=system*4+column;
    const xStart=data.parts.length>1?100:42,measureWidth=data.parts.length>1?(column===0?230:428/3):179;
    const x=data.parts.length>1?(column===0?xStart:xStart+230+(column-1)*428/3):xStart+column*measureWidth;
    const staves=[],voices=[],noteLists=[];
    for(let p=0;p<data.parts.length;p++){
     const part=data.parts[p],events=part.measures[measureIndex];
     const y=data.parts.length>1?76+p*100:strip?48:62+system*128;
     const stave=new VF.Stave(x,y,measureWidth);
     if(column===0){stave.addClef(part.clef);if(data.keySignature!=='C')stave.addKeySignature(data.keySignature);if(system===0)stave.addTimeSignature('4/4');}
     if(column===3&&measureIndex===part.measures.length-1)stave.setEndBarType(VF.BarlineType.END);
     stave.setStyle({strokeStyle:'#171a23',fillStyle:'#171a23',lineWidth:1});
     staves.push(stave);
     const tickables=events.map(event=>{
      const n=new VF.StaveNote({clef:part.clef,keys:[event.pitch.slice(0,-1).toLowerCase()+'/'+event.pitch.at(-1)],duration:({.5:'8',1:'q',2:'h',4:'w'})[event.durationBeats],autoStem:true});
      n.setAttribute('id',`commercial-${data.id}-${event.noteIndex}`);n.setStyle({fillStyle:'#171a23',strokeStyle:'#171a23'});return n;
     });
     const voice=new VF.Voice({numBeats:4,beatValue:4});voice.addTickables(tickables);voices.push(voice);noteLists.push({part,events,tickables});
     if(column===0){label(part.name,data.parts.length>1?32:84,(y+(data.parts.length>1?60:25))*scale,data.parts.length>1?19:16,'500');if(p===0&&system===0)label('Moderato  -  112 BPM',data.parts.length>1?210:84,(y-3)*scale,15);}
     label(String(measureIndex+1),x*scale+4,(y+30)*scale,12,'400');
     measuresOut.push({partId:part.id,measureIndex,x:x*scale,y:(y+40)*scale,width:measureWidth*scale,height:40*scale});
    }
    const commonStart=Math.max(...staves.map(s=>s.getNoteStartX()));staves.forEach(s=>s.setNoteStartX(commonStart).setContext(ctx).draw());
    if(data.parts.length>1){new VF.StaveConnector(staves[0],staves.at(-1)).setType(column===0?VF.StaveConnector.type.BRACKET:VF.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();}
    const beams=noteLists.flatMap(({tickables})=>VF.Beam.generateBeams(tickables,{groups:[new VF.Fraction(1,4)]}));
    const formatter=new VF.Formatter();voices.forEach(v=>formatter.joinVoices([v]));formatter.formatToStave(voices,staves[0]);
    voices.forEach((voice,i)=>voice.draw(ctx,staves[i]));beams.forEach(b=>b.setContext(ctx).draw());
    for(const {events,tickables,part}of noteLists)for(let n=0;n<events.length;n++){
     const event=events[n],note=tickables[n],group=note.getSVGElement();if(!group)throw new Error('Missing SVG note '+event.noteIndex);
     group.setAttribute('data-note-index',String(event.noteIndex));group.setAttribute('data-part-id',part.id);group.setAttribute('data-part-note-index',String(event.partNoteIndex));group.setAttribute('data-midi',String(event.midi));group.setAttribute('data-pitch',event.pitch);
     const box=note.getBoundingBox();notesOut.push({...event,sourceVariant:data.id,cx:(note.getNoteHeadBeginX()+note.getNoteHeadEndX())/2*scale,cy:note.getYs()[0]*scale,bbox:{x:box.getX()*scale,y:box.getY()*scale,width:box.getW()*scale,height:box.getH()*scale},svgId:group.id});
    }
   }
   const notation=document.createElementNS(ns,'g');notation.setAttribute('class','commercial-notation');notation.setAttribute('transform',`scale(${scale})`);
   for(const child of Array.from(svg.children))if(child!==defs&&!child.classList.contains('commercial-label'))notation.append(child);svg.append(notation);
   return {svg:svg.outerHTML,notes:notesOut.sort((a,b)=>a.noteIndex-b.noteIndex),measures:measuresOut,width,height,fontCount:window.__notationFonts.length};
  },{data,strip,height});
  assert.equal(rendered.notes.length,strip?data.notes.filter(n=>n.measureIndex<4).length:data.notes.length);
  assert.ok(rendered.fontCount>=1,'Standalone fonts must be embedded');
  assert.ok(!/[\u3400-\u9FFF]/u.test(rendered.svg),'Score contains CJK text');
  for(const note of rendered.notes){const measure=rendered.measures.find(m=>m.partId===note.partId&&m.measureIndex===note.measureIndex);assert.ok(note.cx>measure.x&&note.cx<measure.x+measure.width,`${assetId} note ${note.noteIndex} crosses a barline`);assert.ok(note.cy>0&&note.cy<height);}
  const svgPath=path.join(out,assetId+'.svg'),notesPath=path.join(out,assetId+'.notes.json');
  fs.writeFileSync(svgPath,rendered.svg);
  fs.writeFileSync(notesPath,JSON.stringify({...data,width:rendered.width,height:rendered.height,notes:rendered.notes,measures:rendered.measures,strip},null,2));
  await page.locator('#score svg').screenshot({path:path.join(out,assetId+'.png'),omitBackground:false});
  manifest.assets[assetId]={svg:svgPath,notes:notesPath,preview:path.join(out,assetId+'.png'),width:rendered.width,height:rendered.height,noteCount:rendered.notes.length};
  console.log('SVG_READY '+assetId);
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({ok:true,semanticChecks,svgAssets:Object.keys(manifest.assets),notesHaveStableIndices:true,englishOnlyText:true,standaloneFontsEmbedded:true,coordinatesIn1600PixelSpace:true},null,2));
}finally{await browser.close();}
