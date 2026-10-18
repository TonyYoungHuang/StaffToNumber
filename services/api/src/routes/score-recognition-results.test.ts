import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import Fastify from "fastify";
import {db,initDb} from "../db.js";
import {createUser,createSession} from "../repositories/auth-repository.js";
import {createScoreDocumentFromMusicXml} from "../repositories/score-repository.js";
import {parseMusicXmlToScoreJson} from "../lib/musicxml-score-parser.js";
import {authPlugin} from "../plugins/auth.js";
import {registerScoreRecognitionResultRoutes} from "./score-recognition-results.js";
import {getPlanQuotaUsage} from "../lib/plan-quotas.js";
const xml=(pitch:string)=>`<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Moon Light</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name><score-instrument id="I1"><instrument-name>Piano</instrument-name></score-instrument></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><direction-type><words>preserve this</words></direction-type></direction><note id="n1"><pitch><step>${pitch}</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><instrument id="I1"/><lyric><text>word</text></lyric></note></measure></part></score-partwise>`;
test("a free project compares, reorders, combines, renames and selects saved results without credits, with conflict and ownership guards",async()=>{
  initDb();const user=createUser(`${randomUUID()}@results.test`,"hash","salt")!;
  const fileId=randomUUID(),now=new Date().toISOString();
  db.prepare("INSERT INTO files(id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES(?,?,'score.xml','score.xml','/unused','text/xml',100,'source_musicxml',?)").run(fileId,user.id,now);
  const document=createScoreDocumentFromMusicXml({userId:user.id,title:"Moon Light",sourceFileId:fileId,sourceOriginalName:"score.xml",musicXml:xml("C")})!;
  db.prepare("INSERT INTO score_jobs(id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES(?,?,?,'omr_import','completed',?, ?, ?)")
    .run(randomUUID(),user.id,document.id,JSON.stringify({freeTrial:true}),now,now);
  const job=db.prepare("SELECT id,params_json FROM score_jobs WHERE document_id = ?").get(document.id) as {id:string;params_json:string|null};
  const candidates=["C","D"].map((pitch,i)=>({id:`candidate-${i}`,title:"Moon Light",musicxmlFileId:fileId,sourcePages:[i+1],relationship:"original"}));
  for(const [i,candidate] of candidates.entries())db.prepare("INSERT INTO score_assets(id,document_id,file_id,asset_kind,params_json,created_at) VALUES(?,?,?,'score_musicxml',?,?)")
    .run(randomUUID(),document.id,fileId,JSON.stringify({candidateId:candidate.id,scoreJson:parseMusicXmlToScoreJson({musicXml:xml(i?"D":"C"),title:"Moon Light",sourceFileId:fileId,sourceOriginalName:"score.xml",importedAt:now})}),now);
  db.prepare("UPDATE score_jobs SET params_json = ? WHERE id = ?").run(JSON.stringify({...JSON.parse(job.params_json??"{}"),resultManifest:{version:1,jobId:job.id,documentId:document.id,sourcePageCount:3,deliveredPages:[1,2],candidates}}),job.id);
  const app=Fastify();await app.register(authPlugin);registerScoreRecognitionResultRoutes(app);
  const token=randomUUID();createSession(user.id,token,1);const headers={authorization:`Bearer ${token}`};const endpoint=`/scores/${document.id}/candidates`;
  try {
    assert.equal((await app.inject({method:"GET",url:endpoint,headers})).json().candidates.length,2);
    const before=getPlanQuotaUsage(user.id).jobs.used;
    assert.equal(getPlanQuotaUsage(user.id).monthly.limit,0);
    assert.equal(before,0);
    const combined=await app.inject({method:"POST",url:`${endpoint}/combine`,headers,payload:{candidateIds:["candidate-0","candidate-1"],pageOrder:[2,1],expectedEditableRevisionId:document.current_revision_id}});
    assert.equal(combined.statusCode,200,combined.body);
    assert.equal(combined.json().creditsCharged,0);
    const replay=await app.inject({method:"POST",url:`${endpoint}/combine`,headers,payload:{candidateIds:["candidate-0","candidate-1"],pageOrder:[2,1],expectedEditableRevisionId:document.current_revision_id}});
    assert.equal(replay.statusCode,200,replay.body);assert.equal(replay.json().revisionId,combined.json().revisionId);assert.equal(replay.json().replayed,true);
    const invalidOrder=await app.inject({method:"POST",url:`${endpoint}/combine`,headers,payload:{candidateIds:["candidate-0","candidate-1"],pageOrder:[2,2],expectedEditableRevisionId:combined.json().revisionId}});assert.equal(invalidOrder.statusCode,400);
    const preview=await app.inject({method:"GET",url:`${endpoint}/${combined.json().candidateId}/musicxml-preview`,headers});
    const music=preview.json().musicXml as string;assert.ok(music.indexOf("<step>D</step>")<music.indexOf("<step>C</step>"));
    assert.equal((music.match(/preserve this/g)??[]).length,2);assert.equal((music.match(/<text>word<\/text>/g)??[]).length,2);
    const conflict=await app.inject({method:"POST",url:`${endpoint}/select`,headers,payload:{candidateId:"candidate-0",expectedEditableRevisionId:document.current_revision_id}});assert.equal(conflict.statusCode,409);
    const editedScore=combined.json().scoreJson;editedScore.metadata.composer="Manual Composer";
    db.prepare("UPDATE score_revisions SET score_json = ? WHERE id = ?").run(JSON.stringify(editedScore),combined.json().revisionId);
    const rename=await app.inject({method:"PATCH",url:`${endpoint}/${combined.json().candidateId}`,headers,payload:{title:"My score",expectedEditableRevisionId:combined.json().revisionId}});assert.equal(rename.statusCode,200,rename.body);
    const renamed=(await app.inject({method:"GET",url:`${endpoint}/${rename.json().candidateId}/musicxml-preview`,headers})).json().musicXml as string;assert.match(renamed,/>My score</);
    assert.match(renamed,/Manual Composer/);
    assert.equal(getPlanQuotaUsage(user.id).jobs.used,before);
    assert.equal((await app.inject({method:"GET",url:endpoint,headers})).json().candidates.length,4);
    const other=createUser(`${randomUUID()}@results.test`,"hash","salt")!;
    const otherToken=randomUUID();createSession(other.id,otherToken,1);assert.equal((await app.inject({method:"GET",url:endpoint,headers:{authorization:`Bearer ${otherToken}`}})).statusCode,404);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM score_documents WHERE user_id = ?").get(user.id) as {n:number}).n,1);
  } finally {await app.close();}
});
