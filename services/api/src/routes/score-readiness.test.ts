import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { SCORE_RANGE_PROFILES } from "@score/shared";
import { db, initDb } from "../db.js";
import { createToken } from "../lib/auth.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";
import { authPlugin } from "../plugins/auth.js";
import { createSession } from "../repositories/auth-repository.js";
import { createCandidateScoreRevisionFromScoreJson } from "../repositories/score-repository.js";
import { scoreRoutes } from "./scores.js";

test("processing and candidate scores give actionable errors; confirmation unlocks transpose, suggestions, Jianpu and playback", async () => {
  initDb();
  const userId = crypto.randomUUID(), documentId = crypto.randomUUID(), jobId = crypto.randomUUID();
  const now = new Date().toISOString(), token = createToken();
  db.prepare("INSERT INTO users (id,email,password_hash,password_salt,created_at,updated_at,account_status) VALUES (?,?,'hash','salt',?,?,'active')").run(userId, `${userId}@readiness.test`, now, now);
  createSession(userId, token, 1);
  db.prepare("INSERT INTO score_documents (id,user_id,title,status,created_at,updated_at) VALUES (?,?,'Recognition state test','candidate',?,?)").run(documentId,userId,now,now);
  db.prepare("INSERT INTO score_jobs (id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES (?,?,?,'omr_import','processing',?, ?, ?)").run(jobId,userId,documentId,JSON.stringify({freeTrial:true}),now,now);
  const app = Fastify({logger:false});
  await app.register(authPlugin);await app.register(scoreRoutes,{prefix:"/api"});await app.ready();
  const headers = {authorization:`Bearer ${token}`};
  const post = (route:string,payload:Record<string,unknown>) => app.inject({method:"POST",url:`/api/scores/${documentId}/${route}`,headers,payload});
  try {
    for (const [route,payload] of [["transpose",{semitones:2}], ["transpose/suggestions",{rangeProfile:{id:SCORE_RANGE_PROFILES[0].id}}]] as const) {
      const result=await post(route,payload);assert.equal(result.statusCode,409,result.body);assert.equal(result.json().code,"SCORE_PROCESSING");
    }
    const missing=await app.inject({method:"POST",url:"/api/scores/missing/transpose",headers,payload:{semitones:2}});assert.equal(missing.statusCode,403);
    db.prepare("UPDATE score_jobs SET status='failed' WHERE id=?").run(jobId);
    const failed=await post("transpose",{semitones:2});assert.equal(failed.statusCode,409);assert.equal(failed.json().code,"SCORE_NOT_READY");
    const scoreJson=parseJianpuToScoreJson({text:"1=C\n4/4\n| 1 2 3 4 |",importedAt:now,sourceOriginalName:"readiness.jianpu.txt"});
    createCandidateScoreRevisionFromScoreJson({documentId,scoreJson,createdFrom:"omr_import"});
    db.prepare("UPDATE score_jobs SET status='completed' WHERE id=?").run(jobId);
    const review=await post("transpose",{semitones:2});assert.equal(review.statusCode,409,review.body);assert.equal(review.json().code,"SCORE_REVIEW_REQUIRED");
    const accepted=await post("candidate/accept",{});assert.equal(accepted.statusCode,200,accepted.body);
    const suggestions=await post("transpose/suggestions",{rangeProfile:{id:SCORE_RANGE_PROFILES[0].id},minSemitones:-12,maxSemitones:12,limit:6});assert.equal(suggestions.statusCode,200,suggestions.body);assert.ok(suggestions.json().suggestions.length>0);
    const moved=await post("transpose",{semitones:2,useMusic21:false});assert.equal(moved.statusCode,201,moved.body);
    const events=moved.json().score.currentRevision.scoreJson.measures.flatMap((m:{events:unknown[]})=>m.events);
    assert.equal(events[0].pitch.step,"D");
    for(const route of ["jianpu","playback"]){const response=await app.inject({method:"GET",url:`/api/scores/${documentId}/${route}`,headers});assert.equal(response.statusCode,200,response.body);}
  } finally {await app.close();}
});
