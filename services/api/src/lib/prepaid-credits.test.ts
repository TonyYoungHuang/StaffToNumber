import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { db, initDb } from "../db.js";
import { generateActivationCodes, signInWithActivationCode, redeemActivationCode, getUserProfile } from "../repositories/auth-repository.js";
import { createOmrImportScoreDocument, createScoreExportJob, retryScoreJob } from "../repositories/score-repository.js";
import { getPlanQuotaUsage } from "./plan-quotas.js";
import { prepaidCreditBalance } from "./prepaid-credits.js";
import { listScorePasses } from "./score-passes.js";
import { getRecognitionOptions } from "./recognition-options.js";
import { createJob } from "../repositories/job-repository.js";
import { createSession } from "../repositories/auth-repository.js";

function fixture(planCode: "credits-50" | "credits-200" | "single-score" = "credits-50") {
  initDb();
  const code = generateActivationCodes({ planCode, quantity: 1, entitlementDays: 30 }).codes[0]!;
  const login = signInWithActivationCode(code.code); assert.ok(login.ok);
  const fileId = randomUUID(), timestamp = new Date().toISOString();
  db.prepare(`INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at)
    VALUES (?,?,'test.pdf','test.pdf','/unused/test.pdf','application/pdf',100,'source_pdf',?)`).run(fileId,login.userId,timestamp);
  const create = (mode: "simple" | "complex" = "simple", pages = 1) => createOmrImportScoreDocument({userId:login.userId,title:"Original QA score",sourceFileId:fileId,sourceFileKind:"source_pdf",sourceOriginalName:"test.pdf",recognitionMode:mode,pageCount:pages,scorePass:planCode === "single-score"});
  return { code, userId:login.userId, create };
}

test("50/200 packs are once-only grants, survive month changes and repeated login, and keep editing access at zero balance", () => {
  for (const planCode of ["credits-50", "credits-200"] as const) {
    const f = fixture(planCode), expected = planCode === "credits-50" ? 50 : 200;
    const before = getUserProfile(f.userId)!;
    assert.equal(before.entitlement.endsAt, null);
    assert.equal(before.entitlement.source, "prepaid_credits");
    assert.equal(getPlanQuotaUsage(f.userId).creditMode,"prepaid");
    assert.equal(getPlanQuotaUsage(f.userId).monthly.remaining,0);
    assert.equal(getPlanQuotaUsage(f.userId).jobs.limit,expected);
    assert.equal(getPlanQuotaUsage(f.userId,new Date("2030-01-02")).jobs.remaining,expected);
    assert.ok(signInWithActivationCode(f.code.code).ok);
    const repeat = redeemActivationCode(f.userId,f.code.code);assert.ok(repeat.ok);assert.equal(repeat.alreadyRedeemed,true);
    assert.deepEqual(getUserProfile(f.userId),before);
    assert.equal(getPlanQuotaUsage(f.userId).storage.limitBytes,(expected === 50 ? 250 : 500)*1024*1024);
  }
});

test("simple import and PDF export cost two credits; editing does not create a charge; complex costs five", () => {
  const f = fixture(), first = f.create();
  assert.equal(prepaidCreditBalance(f.userId).remaining,49);
  createScoreExportJob({userId:f.userId,documentId:first.document!.id,params:{format:"pdf"}});
  assert.equal(prepaidCreditBalance(f.userId).remaining,48);
  f.create("complex");assert.equal(prepaidCreditBalance(f.userId).remaining,43);
  assert.equal(getPlanQuotaUsage(f.userId,new Date("2030-01-02")).jobs.remaining,43);
});

test("failed/cancelled reservations release credits, retry reserves again, and deleting a successful job cannot restore credits", () => {
  const f = fixture(), first = f.create("complex"), job = first.job!;
  db.prepare("UPDATE score_jobs SET status='failed' WHERE id=?").run(job.id);
  assert.equal(prepaidCreditBalance(f.userId).remaining,50);
  const retry = retryScoreJob({userId:f.userId,jobId:job.id,documentId:first.document!.id})!;
  assert.ok(retry);
  assert.equal(prepaidCreditBalance(f.userId).remaining,45);
  db.prepare("UPDATE score_jobs SET status='completed' WHERE id=?").run(retry.id);
  db.prepare("DELETE FROM omr_diagnostics WHERE job_id=?").run(job.id);
  db.prepare("DELETE FROM score_jobs WHERE id=?").run(retry.id);
  assert.equal(prepaidCreditBalance(f.userId).remaining,45);
  const second = f.create();db.prepare("UPDATE score_jobs SET status='cancelled' WHERE id=?").run(second.job!.id);
  assert.equal(prepaidCreditBalance(f.userId).remaining,45);
});

test("exhaustion blocks more jobs atomically, top-ups add to same account and cannot be redeemed by a second buyer", () => {
  const f = fixture(), initial = f.create();
  for(let i=0;i<49;i++) createScoreExportJob({userId:f.userId,documentId:initial.document!.id,params:{format:"pdf"}});
  assert.equal(prepaidCreditBalance(f.userId).remaining,0);
  assert.throws(()=>f.create(),/balance/);
  assert.equal(getUserProfile(f.userId)!.entitlement.status,"active");
  const topup=generateActivationCodes({quantity:1,entitlementDays:30,planCode:"credits-200"}).codes[0]!;
  assert.ok(redeemActivationCode(f.userId,topup.code).ok);
  assert.equal(prepaidCreditBalance(f.userId).remaining,200);
  assert.deepEqual(signInWithActivationCode(topup.code),{ok:false,reason:"login_not_enabled"});
  const other=fixture();assert.equal(redeemActivationCode(other.userId,topup.code).ok,false);
  assert.ok(signInWithActivationCode(f.code.code).ok);
});

test("single-score shop codes grant exactly one existing 10-credit/5-page pass, never a monthly plan", () => {
  const f = fixture("single-score");
  assert.equal(getUserProfile(f.userId)!.entitlement.status,"inactive");
  assert.equal(prepaidCreditBalance(f.userId).total,0);
  assert.equal(listScorePasses(db,f.userId).length,1);
  assert.throws(()=>f.create("simple",6),/up to 5 pages/);
  f.create("simple",5);assert.equal(listScorePasses(db,f.userId)[0].remaining,9);
  assert.throws(()=>f.create(),/Buy a One Score Pass/);
  assert.ok(redeemActivationCode(f.userId,f.code.code).ok);
  assert.equal(listScorePasses(db,f.userId).length,1);
});

test("grant failure rolls back account, code claim and wallet together", () => {
  initDb();const code=generateActivationCodes({quantity:1,entitlementDays:30,planCode:"credits-50"}).codes[0]!;
  const count=()=>Number((db.prepare("SELECT COUNT(*) AS n FROM users").get() as {n:number}).n), before=count();
  db.exec("CREATE TRIGGER qa_prepaid_failure BEFORE INSERT ON prepaid_credit_grants BEGIN SELECT RAISE(ABORT,'qa grant failure'); END;");
  try {assert.throws(()=>signInWithActivationCode(code.code),/qa grant failure/);} finally {db.exec("DROP TRIGGER qa_prepaid_failure;");}
  assert.equal(count(),before);assert.ok(signInWithActivationCode(code.code).ok);
});

test("legacy monthly credits are used first; exhausting them falls back to prepaid credits without changing the old dates", () => {
  const f=fixture();const membership=generateActivationCodes({quantity:1,entitlementDays:30,planCode:"starter-monthly"}).codes[0]!;
  const grant=redeemActivationCode(f.userId,membership.code);assert.ok(grant.ok);
  assert.equal(getUserProfile(f.userId)!.entitlement.source, "activation_code");
  assert.equal(getUserProfile(f.userId)!.entitlement.endsAt, grant.entitlement.ends_at);
  const first=f.create();assert.equal(prepaidCreditBalance(f.userId).remaining,50);
  for(let i=0;i<49;i++)createScoreExportJob({userId:f.userId,documentId:first.document!.id,params:{format:"pdf"}});
  assert.equal(getPlanQuotaUsage(f.userId).monthly.remaining,0);
  assert.equal(getRecognitionOptions(f.userId).options[1].canSubmit,true);
  f.create("complex");assert.equal(prepaidCreditBalance(f.userId).remaining,45);
  const repeat=redeemActivationCode(f.userId,membership.code);assert.ok(repeat.ok);assert.equal(repeat.entitlement.ends_at,grant.entitlement.ends_at);
});

test("an exhausted pack can use a newly purchased single-score code on the same account", () => {
  const f=fixture(),first=f.create();
  for(let i=0;i<49;i++)createScoreExportJob({userId:f.userId,documentId:first.document!.id,params:{format:"pdf"}});
  const pass=generateActivationCodes({quantity:1,entitlementDays:30,planCode:"single-score"}).codes[0]!;
  assert.ok(redeemActivationCode(f.userId,pass.code).ok);
  assert.equal(getRecognitionOptions(f.userId).options[0].creditSource,"score_pass");
  const file=(db.prepare("SELECT id FROM files WHERE user_id=?").get(f.userId) as {id:string}).id;
  const imported=createOmrImportScoreDocument({userId:f.userId,title:"one score",sourceFileId:file,sourceFileKind:"source_pdf",sourceOriginalName:"test.pdf",pageCount:1,scorePass:true});
  createScoreExportJob({userId:f.userId,documentId:imported.document!.id,params:{format:"pdf"}});
  assert.equal(listScorePasses(db,f.userId)[0].remaining,8);
  assert.equal(prepaidCreditBalance(f.userId).remaining,0);
});

test("legacy conversion jobs share the prepaid wallet and release a failed reservation", () => {
  const f=fixture(), file=(db.prepare("SELECT id FROM files WHERE user_id=?").get(f.userId) as {id:string}).id;
  const job=createJob({userId:f.userId,inputFileId:file,direction:"staff_pdf_to_numbered"});assert.ok(job);
  assert.equal(prepaidCreditBalance(f.userId).remaining,49);
  db.prepare("UPDATE jobs SET status='failed' WHERE id=?").run(job.id);
  assert.equal(prepaidCreditBalance(f.userId).remaining,50);
});

test("prepaid export access keeps free Jianpu/JSON downloads and requires metered rendering for PDF/audio", {timeout:20_000}, async () => {
  const [{default:Fastify},{authPlugin}]=await Promise.all([import("fastify"),import("../plugins/auth.js")]);
  const f=fixture(),token=randomUUID();createSession(f.userId,token,1);
  const app=Fastify();await app.register(authPlugin);
  for(const format of ["jianpu","score-json","pdf","wav"])app.post(`/api/scores/:id/export/${format}`,{preHandler:app.requireScoreEditingAccess},async()=>({ok:true}));
  try{
    for(const format of ["jianpu","score-json","pdf","wav"]){
      const response=await app.inject({method:"POST",url:`/api/scores/qa/export/${format}`,headers:{authorization:`Bearer ${token}`}});
      assert.equal(response.statusCode,format==="jianpu"||format==="score-json"?200:409);
    }
    assert.equal(prepaidCreditBalance(f.userId).remaining,50);
  }finally{await app.close();}
});


test("spent credits cannot be refunded by later status updates, and released credits cannot be spent by a late worker", () => {
  const f = fixture();
  const successful = f.create();
  db.prepare("UPDATE score_jobs SET status='completed' WHERE id=?").run(successful.job!.id);
  db.prepare("UPDATE score_jobs SET status='failed' WHERE id=?").run(successful.job!.id);
  assert.equal(prepaidCreditBalance(f.userId).remaining, 49);
  const cancelled = f.create();
  db.prepare("UPDATE score_jobs SET status='cancelled' WHERE id=?").run(cancelled.job!.id);
  assert.equal(prepaidCreditBalance(f.userId).remaining, 49);
  db.prepare("UPDATE score_jobs SET status='completed' WHERE id=?").run(cancelled.job!.id);
  assert.equal(prepaidCreditBalance(f.userId).remaining, 49);
  const legacy = createJob({userId:f.userId,inputFileId:successful.job!.input_file_id!,direction:"staff_pdf_to_numbered"})!;
  db.prepare("UPDATE jobs SET status='completed' WHERE id=?").run(legacy.id);
  db.prepare("UPDATE jobs SET status='cancelled' WHERE id=?").run(legacy.id);
  assert.equal(prepaidCreditBalance(f.userId).remaining, 48);
});

test("50 and 200 credits cover exactly 25 and 100 simple-import/PDF workflows", () => {
  for (const planCode of ["credits-50", "credits-200"] as const) {
    const f = fixture(planCode), workflows = planCode === "credits-50" ? 25 : 100;
    for (let i=0; i<workflows; i++) {
      const imported = f.create();
      createScoreExportJob({userId:f.userId,documentId:imported.document!.id,params:{format:"pdf"}});
    }
    assert.equal(prepaidCreditBalance(f.userId).remaining, 0);
    assert.throws(() => f.create(), /balance/);
    assert.equal(getUserProfile(f.userId)!.entitlement.status, "active");
  }
});

test("legacy expiry stays visible while active; an expired legacy plan falls back to permanent prepaid editing", () => {
  const f=fixture();
  const membership=generateActivationCodes({quantity:1,entitlementDays:30,planCode:"starter-annual"}).codes[0]!;
  const grant=redeemActivationCode(f.userId,membership.code); assert.ok(grant.ok);
  assert.equal(getUserProfile(f.userId)!.entitlement.source,"activation_code");
  assert.equal(getUserProfile(f.userId)!.entitlement.endsAt,grant.entitlement.ends_at);
  db.prepare("UPDATE user_entitlements SET ends_at='2020-01-01T00:00:00.000Z' WHERE activation_code_id=?").run(membership.id);
  assert.equal(getUserProfile(f.userId)!.entitlement.source,"prepaid_credits");
  assert.equal(getUserProfile(f.userId)!.entitlement.endsAt,null);
  assert.equal(getPlanQuotaUsage(f.userId).creditMode,"prepaid");
});

test("adding a prepaid pack preserves the legacy member's synchronous export access", async () => {
  const [{default:Fastify},{authPlugin}]=await Promise.all([import("fastify"),import("../plugins/auth.js")]);
  const f=fixture(), token=randomUUID(); createSession(f.userId,token,1);
  const membership=generateActivationCodes({quantity:1,entitlementDays:30,planCode:"starter-monthly"}).codes[0]!;
  assert.ok(redeemActivationCode(f.userId,membership.code).ok);
  const app=Fastify(); await app.register(authPlugin);
  app.post("/api/scores/:id/export/pdf",{preHandler:app.requireScoreEditingAccess},async()=>({ok:true}));
  try {
    const response=await app.inject({method:"POST",url:"/api/scores/qa/export/pdf",headers:{authorization:`Bearer ${token}`}});
    assert.equal(response.statusCode,200);
    assert.equal(prepaidCreditBalance(f.userId).remaining,50);
  } finally { await app.close(); }
});

test("an exhausted pack can still save a correction, transpose through the real API, and play back without a new charge", async () => {
  const [{default:Fastify},{authPlugin},{scoreRoutes},{parseJianpuToScoreJson},repository]=await Promise.all([
    import("fastify"),import("../plugins/auth.js"),import("../routes/scores.js"),import("./jianpu-score-parser.js"),import("../repositories/score-repository.js"),
  ]);
  const f=fixture(), first=f.create();
  for(let i=0;i<49;i++)createScoreExportJob({userId:f.userId,documentId:first.document!.id,params:{format:"pdf"}});
  assert.equal(prepaidCreditBalance(f.userId).remaining,0);
  const score=parseJianpuToScoreJson({text:"1=C\n4/4\n| 1 2 3 4 |",importedAt:new Date().toISOString(),sourceOriginalName:"qa.jianpu.txt"});
  const document=repository.createScoreDocumentFromDerivedScoreJson({userId:f.userId,title:score.title,scoreJson:score,createdFrom:"system"})!;
  const changed=structuredClone(score), note=changed.measures[0].events[0];
  assert.equal(note.type,"note"); if(note.type==="note")note.pitch.step="D";
  assert.ok(repository.createScoreRevisionFromScoreJson({documentId:document.id,scoreJson:changed,createdFrom:"manual_edit"}));
  const token=randomUUID();createSession(f.userId,token,1);
  const app=Fastify();await app.register(authPlugin);await app.register(scoreRoutes,{prefix:"/api"});
  const headers={authorization:`Bearer ${token}`};
  try {
    const transposed=await app.inject({method:"POST",url:`/api/scores/${document.id}/transpose`,headers,payload:{semitones:2,useMusic21:false}});
    assert.equal(transposed.statusCode,201,transposed.body);
    for(const route of ["jianpu","playback"]){
      const response=await app.inject({method:"GET",url:`/api/scores/${document.id}/${route}`,headers});
      assert.equal(response.statusCode,200,response.body);
    }
    assert.equal(prepaidCreditBalance(f.userId).used,50);
    assert.equal(prepaidCreditBalance(f.userId).remaining,0);
    assert.equal(getPlanQuotaUsage(f.userId).storage.limitBytes,250*1024*1024);
  } finally { await app.close(); }
});