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
import {assembleRecognitionMusicXml,selectRecognitionMusicXmlPages} from "../lib/recognition-result-assembly.js";
const xml=(pitch:string)=>`<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Moon Light</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name><score-instrument id="I1"><instrument-name>Piano</instrument-name></score-instrument></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><direction-type><words>preserve this</words></direction-type></direction><note id="n1"><pitch><step>${pitch}</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><instrument id="I1"/><lyric><text>word</text></lyric></note></measure></part></score-partwise>`;

test("page removal aligns an unprinted second part by its measure numbers and retains unmodeled notation", () => {
  const first = xml("C").replace("</part></score-partwise>", `<measure number="2"><print new-page="yes"/><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note></measure><measure number="3"><print new-page="yes"/><note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`);
  const musicXml = first.replace("</part-list>", `<score-part id="P2"><part-name>Flute</part-name></score-part></part-list>`).replace("</score-partwise>", `<part id="P2"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key></attributes><note><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><lyric><text>keep lyric</text></lyric></note></measure><measure number="2"><attributes><key><fifths>2</fifths></key></attributes><note><pitch><step>A</step><octave>5</octave></pitch><duration>4</duration></note></measure><measure number="3"><direction><direction-type><words>keep marking</words></direction-type></direction><note><pitch><step>B</step><octave>5</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`);
  const selected = selectRecognitionMusicXmlPages(musicXml, [1, 3, 5], [1, 5]);
  assert.deepEqual([...selected.matchAll(/<step>([A-G])<\/step>/gu)].map(match => match[1]), ["C", "E", "G", "B"]);
  assert.match(selected, /keep lyric/u); assert.match(selected, /keep marking/u);
  const parsed = parseMusicXmlToScoreJson({ musicXml: selected, title: "Parts", sourceFileId: "test", sourceOriginalName: "parts.xml", importedAt: new Date().toISOString() });
  const flute = parsed.parts.find(part => part.name === "Flute")!;
  assert.equal(parsed.measures.filter(measure => measure.partId === flute.id)[1]!.attributes?.key?.fifths, 2);
  assert.throws(() => selectRecognitionMusicXmlPages(musicXml.replace('<measure number="3"><direction>', '<measure number="unknown"><direction>'), [1, 3, 5], [1, 5]), /reliable page boundaries/u);
});

test("old assembled results recover individual pages recursively while ambiguous or cyclic provenance is rejected", async () => {
  initDb(); const user = createUser(`${randomUUID()}@old-pages.test`, "hash", "salt")!;
  const fileId = randomUUID(), now = new Date().toISOString();
  db.prepare("INSERT INTO files(id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES(?,?,'old.xml','old.xml','/unused','text/xml',100,'source_musicxml',?)").run(fileId, user.id, now);
  const document = createScoreDocumentFromMusicXml({ userId: user.id, title: "Old pages", sourceFileId: fileId, sourceOriginalName: "old.xml", musicXml: xml("C") })!;
  const withoutBoundaries = (sources: string[]) => assembleRecognitionMusicXml(sources).replace(/<print[^>]*new-page="yes"[^>]*(?:\/>|>\s*<\/print>)/gu, "");
  const leafXmls = [xml("C"), xml("D"), xml("E")];
  const candidates = [
    ...leafXmls.map((_music, index) => ({ id: `page-${index + 1}`, title: "Old pages", musicxmlFileId: fileId, sourcePages: [index + 1], relationship: "original" as const })),
    { id: "inner", title: "Old pages", musicxmlFileId: fileId, sourcePages: [1, 2], relationship: "assembled" as const, memberIds: ["page-1", "page-2"] },
    { id: "outer", title: "Old pages", musicxmlFileId: fileId, sourcePages: [1, 2, 3], relationship: "assembled" as const, memberIds: ["inner", "page-3"] },
    { id: "ambiguous", title: "Old pages", musicxmlFileId: fileId, sourcePages: [1, 2, 3], relationship: "assembled" as const, memberIds: ["inner", "page-2", "page-3"] },
    { id: "cyclic", title: "Old pages", musicxmlFileId: fileId, sourcePages: [1, 2, 3], relationship: "assembled" as const, memberIds: ["cyclic"] },
    { id: "odd", title: "Old pages", musicxmlFileId: fileId, sourcePages: [1, 3], relationship: "assembled" as const, memberIds: ["page-1", "page-3"] },
    { id: "interleaved", title: "Old pages", musicxmlFileId: fileId, sourcePages: [1, 2, 3], relationship: "assembled" as const, memberIds: ["odd", "page-2"] },
    { id: "trimmed", title: "Old pages", musicxmlFileId: fileId, sourcePages: [2, 3], relationship: "assembled" as const, memberIds: ["outer"] },
    { id: "single-renamed", title: "Customer title", musicxmlFileId: fileId, sourcePages: [1, 2, 3], relationship: "assembled" as const, memberIds: ["outer"] },
    { id: "edited-single", title: "Customer title", musicxmlFileId: fileId, sourcePages: [1, 2, 3], relationship: "assembled" as const, memberIds: ["outer"] },
  ];
  const sourceXmls = [...leafXmls, withoutBoundaries(leafXmls.slice(0, 2)), withoutBoundaries(leafXmls), withoutBoundaries(leafXmls), withoutBoundaries(leafXmls), withoutBoundaries([leafXmls[0]!, leafXmls[2]!]), withoutBoundaries(leafXmls), withoutBoundaries(leafXmls.slice(1)), withoutBoundaries(leafXmls), withoutBoundaries(leafXmls)];
  const jobId = randomUUID();
  db.prepare("INSERT INTO score_jobs(id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES(?,?,?,'omr_import','completed',?,?,?)")
    .run(jobId, user.id, document.id, JSON.stringify({ resultManifest: { version: 1, jobId, documentId: document.id, sourcePageCount: 3, deliveredPages: [1, 2, 3], candidates } }), now, now);
  for (const [index, candidate] of candidates.entries()) {
    const scoreJson = parseMusicXmlToScoreJson({ musicXml: sourceXmls[index]!, title: "Old pages", sourceFileId: fileId, sourceOriginalName: "old.xml", importedAt: now });
    if (["single-renamed", "edited-single"].includes(candidate.id)) { scoreJson.title = "Customer title"; scoreJson.metadata.workTitle = "Customer title"; scoreJson.metadata.movementTitle = "Customer title"; }
    if (candidate.id === "edited-single") scoreJson.metadata.composer = "Manual Composer";
    db.prepare("INSERT INTO score_assets(id,document_id,file_id,asset_kind,params_json,created_at) VALUES(?,?,?,'score_musicxml',?,?)")
      .run(randomUUID(), document.id, fileId, JSON.stringify({ candidateId: candidate.id, scoreJson }), now);
  }
  const app = Fastify(); await app.register(authPlugin); registerScoreRecognitionResultRoutes(app);
  const token = randomUUID(); createSession(user.id, token, 1); const headers = { authorization: `Bearer ${token}` };
  const endpoint = `/scores/${document.id}/candidates`;
  try {
    for (const id of ["ambiguous", "cyclic", "trimmed", "edited-single"]) {
      const failed = await app.inject({ method: "POST", url: `${endpoint}/combine`, headers, payload: { candidateIds: [id], candidatePages: { [id]: [2] }, expectedEditableRevisionId: document.current_revision_id } });
      assert.equal(failed.statusCode, 409, failed.body);
      assert.equal(failed.json().code, "RESULT_PAGE_BOUNDARIES_UNAVAILABLE");
    }
    const selected = await app.inject({ method: "POST", url: `${endpoint}/combine`, headers, payload: { candidateIds: ["outer"], candidatePages: { outer: [2, 3] }, expectedEditableRevisionId: document.current_revision_id } });
    assert.equal(selected.statusCode, 200, selected.body);
    const result = selected.json();
    assert.deepEqual(result.scoreJson.measures.flatMap((measure: any) => measure.events.filter((event: any) => event.type === "note").map((event: any) => event.pitch.step)), ["D", "E"]);
    const preview = (await app.inject({ method: "GET", url: `${endpoint}/${result.candidateId}/musicxml-preview`, headers })).json().musicXml as string;
    assert.equal((preview.match(/preserve this/gu) ?? []).length, 2);
    assert.equal((preview.match(/<text>word<\/text>/gu) ?? []).length, 2);
    assert.equal(result.creditsCharged, 0);
    const originals = (await app.inject({ method: "GET", url: `${endpoint}/outer/musicxml-preview`, headers })).json().musicXml as string;
    assert.deepEqual([...originals.matchAll(/<step>([A-G])<\/step>/gu)].map(match => match[1]), ["C", "D", "E"]);
    let revision = result.revisionId;
    for (const [id, pages, expected] of [["interleaved", [2, 3], ["D", "E"]], ["single-renamed", [3], ["E"]]] as const) {
      const recovered = await app.inject({ method: "POST", url: `${endpoint}/combine`, headers, payload: { candidateIds: [id], candidatePages: { [id]: pages }, expectedEditableRevisionId: revision } });
      assert.equal(recovered.statusCode, 200, recovered.body);
      assert.deepEqual(recovered.json().scoreJson.measures.flatMap((measure: any) => measure.events.filter((event: any) => event.type === "note").map((event: any) => event.pitch.step)), expected);
      if (id === "single-renamed") { assert.equal(recovered.json().scoreJson.title, "Customer title"); assert.equal(recovered.json().scoreJson.metadata.workTitle, "Customer title"); }
      revision = recovered.json().revisionId;
    }
  } finally { await app.close(); }
});
test("removing a page from a multi-page result deletes only its musical measures and persists the retained pages without charging", async () => {
  initDb(); const user = createUser(`${randomUUID()}@page-delete.test`, "hash", "salt")!;
  const fileId = randomUUID(), now = new Date().toISOString();
  db.prepare("INSERT INTO files(id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES(?,?,'score.xml','score.xml','/unused','text/xml',100,'source_musicxml',?)").run(fileId, user.id, now);
  const musicXml = xml("C").replace("</part></score-partwise>", `<measure number="2"><print new-page="yes"/><attributes><key><fifths>2</fifths></key></attributes><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure><measure number="3"><print new-page="yes"/><note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part></score-partwise>`);
  const document = createScoreDocumentFromMusicXml({ userId: user.id, title: "Pages", sourceFileId: fileId, sourceOriginalName: "score.xml", musicXml })!;
  const candidate = { id: randomUUID(), title: "Pages", musicxmlFileId: fileId, sourcePages: [1, 3, 5], relationship: "assembled" };
  const jobId = randomUUID();
  db.prepare("INSERT INTO score_jobs(id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES(?,?,?,'omr_import','completed',?,?,?)")
    .run(jobId, user.id, document.id, JSON.stringify({ resultManifest: { version: 1, jobId, documentId: document.id, sourcePageCount: 5, deliveredPages: [1, 3, 5], candidates: [candidate] } }), now, now);
  db.prepare("INSERT INTO score_assets(id,document_id,file_id,asset_kind,params_json,created_at) VALUES(?,?,?,'score_musicxml',?,?)")
    .run(randomUUID(), document.id, fileId, JSON.stringify({ candidateId: candidate.id, scoreJson: parseMusicXmlToScoreJson({ musicXml, title: "Pages", sourceFileId: fileId, sourceOriginalName: "score.xml", importedAt: now }) }), now);
  const app = Fastify(); await app.register(authPlugin); registerScoreRecognitionResultRoutes(app);
  const token = randomUUID(); createSession(user.id, token, 1); const headers = { authorization: `Bearer ${token}` };
  const payload = { candidateIds: [candidate.id], candidatePages: { [candidate.id]: [1, 5] }, pageOrder: [1, 5], expectedEditableRevisionId: document.current_revision_id };
  try {
    const before = getPlanQuotaUsage(user.id).jobs.used;
    const removed = await app.inject({ method: "POST", url: `/scores/${document.id}/candidates/combine`, headers, payload });
    assert.equal(removed.statusCode, 200, removed.body); assert.equal(removed.json().creditsCharged, 0);
    const steps = removed.json().scoreJson.measures.flatMap((measure: any) => measure.events.filter((event: any) => event.type === "note").map((event: any) => event.pitch.step));
    assert.deepEqual(steps, ["C", "E"]);
    assert.equal(removed.json().scoreJson.measures[1].attributes.key.fifths, 2, "remaining music keeps the inherited key from the removed page");
    const results = (await app.inject({ method: "GET", url: `/scores/${document.id}/candidates`, headers })).json();
    assert.deepEqual(results.candidates.find((item: any) => item.id === removed.json().candidateId).sourcePages, [1, 5]);
    assert.equal(results.candidates.length, 2, "the original result remains recoverable");
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, before);
    const replay = await app.inject({ method: "POST", url: `/scores/${document.id}/candidates/combine`, headers, payload });
    assert.equal(replay.json().revisionId, removed.json().revisionId);
    const stale = await app.inject({ method: "POST", url: `/scores/${document.id}/candidates/combine`, headers, payload: { ...payload, candidatePages: { [candidate.id]: [5] }, pageOrder: [5] } });
    assert.equal(stale.statusCode, 409);
  } finally { await app.close(); }
});
test("direct page deletion persists the same candidate, preserves active edits and still allows merging without charging", async () => {
  initDb(); const user = createUser(`${randomUUID()}@direct-page-delete.test`, "hash", "salt")!;
  const fileId = randomUUID(), now = new Date().toISOString();
  db.prepare("INSERT INTO files(id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES(?,?,'pages.xml','pages.xml','/unused','text/xml',100,'source_musicxml',?)").run(fileId, user.id, now);
  const musicXml = assembleRecognitionMusicXml([xml("C"), xml("D"), xml("E")]);
  const document = createScoreDocumentFromMusicXml({ userId: user.id, title: "Pages", sourceFileId: fileId, sourceOriginalName: "pages.xml", musicXml })!;
  const candidates = [
    { id: "multi", title: "Pages", musicxmlFileId: fileId, sourcePages: [1, 2, 3], relationship: "original" },
    { id: "last", title: "Last page", musicxmlFileId: fileId, sourcePages: [4], relationship: "original" },
  ];
  const jobId = randomUUID();
  db.prepare("INSERT INTO score_jobs(id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES(?,?,?,'omr_import','completed',?,?,?)")
    .run(jobId, user.id, document.id, JSON.stringify({ resultManifest: { version: 1, jobId, documentId: document.id, sourcePageCount: 4, deliveredPages: [1, 2, 3, 4], selectedCandidateId: "multi", candidates } }), now, now);
  for (const candidate of candidates) {
    const scoreJson = parseMusicXmlToScoreJson({ musicXml: candidate.id === "multi" ? musicXml : xml("G"), title: candidate.title, sourceFileId: fileId, sourceOriginalName: "pages.xml", importedAt: now });
    db.prepare("INSERT INTO score_assets(id,document_id,file_id,asset_kind,params_json,created_at) VALUES(?,?,?,'score_musicxml',?,?)")
      .run(randomUUID(), document.id, fileId, JSON.stringify({ candidateId: candidate.id, scoreJson }), now);
  }
  const current = db.prepare("SELECT score_json FROM score_revisions WHERE id = ?").get(document.current_revision_id) as { score_json: string };
  const edited = JSON.parse(current.score_json); edited.metadata.composer = "Customer composer";
  db.prepare("UPDATE score_revisions SET score_json = ? WHERE id = ?").run(JSON.stringify(edited), document.current_revision_id);
  const app = Fastify(); await app.register(authPlugin); registerScoreRecognitionResultRoutes(app);
  const token = randomUUID(); createSession(user.id, token, 1); const headers = { authorization: `Bearer ${token}` };
  const endpoint = `/scores/${document.id}/candidates`;
  const list = async () => (await app.inject({ method: "GET", url: endpoint, headers })).json();
  const steps = (score: any) => score.measures.flatMap((measure: any) => measure.events.filter((event: any) => event.type === "note").map((event: any) => event.pitch.step));
  try {
    const before = getPlanQuotaUsage(user.id).jobs.used;
    const payload = { expectedEditableRevisionId: document.current_revision_id };
    assert.equal((await app.inject({ method: "DELETE", url: `${endpoint}/multi/pages/2`, payload })).statusCode, 401);
    const other = createUser(`${randomUUID()}@direct-page-delete.test`, "hash", "salt")!;
    const otherToken = randomUUID(); createSession(other.id, otherToken, 1);
    assert.equal((await app.inject({ method: "DELETE", url: `${endpoint}/multi/pages/2`, headers: { authorization: `Bearer ${otherToken}` }, payload })).statusCode, 404);
    const removed = await app.inject({ method: "DELETE", url: `${endpoint}/multi/pages/2`, headers, payload });
    assert.equal(removed.statusCode, 200, removed.body);
    assert.equal(removed.json().candidateId, "multi", "deletion replaces the candidate rather than leaving an original alternative");
    assert.equal(removed.json().creditsCharged, 0);
    assert.deepEqual(steps(removed.json().scoreJson), ["C", "E"]);
    assert.equal(removed.json().scoreJson.metadata.composer, "Customer composer");
    const refreshed = await list();
    assert.equal(refreshed.candidates.length, 2);
    assert.deepEqual(refreshed.candidates.find((candidate: any) => candidate.id === "multi").sourcePages, [1, 3]);
    assert.deepEqual(steps(refreshed.candidates.find((candidate: any) => candidate.id === "multi").scoreJson), ["C", "E"]);
    const preview = await app.inject({ method: "GET", url: `${endpoint}/multi/musicxml-preview`, headers });
    assert.deepEqual([...preview.json().musicXml.matchAll(/<step>([A-G])<\/step>/gu)].map(match => match[1]), ["C", "E"]);
    const replay = await app.inject({ method: "DELETE", url: `${endpoint}/multi/pages/2`, headers, payload });
    assert.equal(replay.json().revisionId, removed.json().revisionId); assert.equal(replay.json().replayed, true);
    assert.equal((await app.inject({ method: "DELETE", url: `${endpoint}/multi/pages/1`, headers, payload })).statusCode, 409);
    assert.equal((await app.inject({ method: "DELETE", url: `${endpoint}/multi/pages/99`, headers, payload: { expectedEditableRevisionId: removed.json().revisionId } })).statusCode, 400);
    const merged = await app.inject({ method: "POST", url: `${endpoint}/combine`, headers, payload: { candidateIds: ["multi", "last"], pageOrder: [1, 3, 4], expectedEditableRevisionId: removed.json().revisionId } });
    assert.equal(merged.statusCode, 200, merged.body); assert.deepEqual(steps(merged.json().scoreJson), ["C", "E", "G"]);
    let revisionId = merged.json().revisionId;
    const deletePage = async (id: string, page: number) => {
      const response = await app.inject({ method: "DELETE", url: `${endpoint}/${id}/pages/${page}`, headers, payload: { expectedEditableRevisionId: revisionId } });
      assert.equal(response.statusCode, 200, response.body); revisionId = response.json().revisionId; return response.json();
    };
    await deletePage("last", 4);
    assert.equal(revisionId, merged.json().revisionId, "deleting an unselected result preserves the active revision");
    assert.equal((await app.inject({ method: "GET", url: `${endpoint}/last/musicxml-preview`, headers })).statusCode, 404);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM files WHERE id = ?").get(fileId) as { n: number }).n, 1, "shared original file remains intact");
    await deletePage("multi", 1); await deletePage("multi", 3);
    assert.equal((await list()).candidates.length, 1, "the last page removes its candidate from saved results");
    await deletePage(merged.json().candidateId, 1); await deletePage(merged.json().candidateId, 3);
    const lastPage = await app.inject({ method: "DELETE", url: `${endpoint}/${merged.json().candidateId}/pages/4`, headers, payload: { expectedEditableRevisionId: revisionId } });
    assert.equal(lastPage.statusCode, 400, "a project must retain one usable recognized page");
    assert.deepEqual((await list()).candidates[0].sourcePages, [4]);
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, before);
  } finally { await app.close(); }
});
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
