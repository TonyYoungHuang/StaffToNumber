import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Pool } from "pg";
import { db, initDb } from "../db.js";
import { generateActivationCodes, signInWithActivationCode } from "../repositories/auth-repository.js";
import { createOmrImportScoreDocument } from "../repositories/score-repository.js";
import { migrateSqliteToPostgres, ensurePostgresRuntimeTriggers } from "./postgres-migration.js";
import { createRuntimeDatabase, settleRecognitionCredits } from "@score/runtime-database";
import { prepaidPostgresTriggers } from "./prepaid-schema.js";

const connectionString = process.env.POSTGRES_TEST_URL?.trim();
if (process.env.CI && !connectionString) throw new Error("POSTGRES_TEST_URL is required in CI; real integration coverage must not be skipped.");
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
type ChildResult = { ok: boolean; value?: any; code?: string; error?: string };

test("real PostgreSQL schema 28 settles fractional delivery and releases zero/failure reservations without cash refunds", { skip: !connectionString, timeout: 60_000 }, async () => {
  const schema = `partial_qa_${randomUUID().replaceAll("-", "")}`, qualified = (table: string) => `${quote(schema)}.${quote(table)}`;
  const pool = new Pool({ connectionString, max: 1 }), client = await pool.connect();
  let runtime: ReturnType<typeof createRuntimeDatabase> | undefined;
  try {
    await client.query(`CREATE SCHEMA ${quote(schema)};
      CREATE TABLE ${qualified("score_jobs")} (id TEXT PRIMARY KEY,job_type TEXT,status TEXT,params_json TEXT,error_message TEXT,updated_at TEXT,completed_at TEXT,progress_percent INTEGER);
      CREATE TABLE ${qualified("jobs")} (id TEXT PRIMARY KEY,status TEXT,error_message TEXT,updated_at TEXT,completed_at TEXT);
      CREATE TABLE ${qualified("prepaid_credit_charges")} (job_family TEXT,job_id TEXT,user_id TEXT,credit_cost INTEGER NOT NULL CHECK(credit_cost>0),status TEXT,PRIMARY KEY(job_family,job_id));`);
    const sql = readFileSync(new URL("../../../../deploy/hetzner/recognition-partial-credits-schema28.sql", import.meta.url), "utf8").replaceAll(':"runtime_schema"', quote(schema));
    await client.query(sql); await client.query(sql);
    await client.query(prepaidPostgresTriggers(schema));
    runtime = createRuntimeDatabase({ primary: "postgres", postgresUrl: connectionString!, postgresSchema: schema });
    const buffersBefore = process.memoryUsage().arrayBuffers;
    const firstResponse = runtime.prepare("SELECT 7 AS count").get() as { count: number };
    for (let index = 0; index < 50; index++) runtime.prepare("SELECT 1 AS count").get();
    assert.equal(firstResponse.count, 7, "Reusing the transport buffer never mutates previously decoded responses");
    assert.ok(process.memoryUsage().arrayBuffers - buffersBefore < 8 * 1024 * 1024, "Repeated synchronous SQL must not allocate one large response buffer per query");
    const insert = async (id: string) => {
      await client.query(`INSERT INTO ${qualified("score_jobs")} (id,job_type,status,params_json) VALUES($1,'omr_import','processing',$2)`, [id, JSON.stringify({ recognitionMode: "complex", creditCost: 5 })]);
      await client.query(`INSERT INTO ${qualified("prepaid_credit_charges")} VALUES('score',$1,'synthetic-user',5,'reserved')`, [id]);
    };
    await insert("partial");
    runtime.exec("BEGIN IMMEDIATE");
    const settlement = settleRecognitionCredits(runtime, { jobId: "partial", quotedCredits: 5, sourcePageCount: 15, deliveredPages: 8 });
    runtime.prepare("UPDATE score_jobs SET status='completed' WHERE id=?").run("partial");
    runtime.exec("COMMIT");
    assert.equal(settlement.settledCreditCost, 2.6666);
    const charged = (await client.query(`SELECT credit_cost,status FROM ${qualified("prepaid_credit_charges")} WHERE job_id='partial'`)).rows[0];
    assert.equal(Number(charged.credit_cost), 2.6666); assert.equal(charged.status, "spent");
    await client.query(`DELETE FROM ${qualified("score_jobs")} WHERE id='partial'`);
    assert.equal(Number((await client.query(`SELECT credit_cost FROM ${qualified("prepaid_credit_charges")} WHERE job_id='partial'`)).rows[0].credit_cost), 2.6666);
    await insert("none");
    runtime.exec("BEGIN IMMEDIATE");
    settleRecognitionCredits(runtime, { jobId: "none", quotedCredits: 5, sourcePageCount: 15, deliveredPages: 0 });
    runtime.prepare("UPDATE score_jobs SET status='completed' WHERE id=?").run("none");
    runtime.exec("COMMIT");
    assert.equal((await client.query(`SELECT status FROM ${qualified("prepaid_credit_charges")} WHERE job_id='none'`)).rows[0].status, "released");
    await insert("failed");
    await client.query(`UPDATE ${qualified("score_jobs")} SET status='failed' WHERE id='failed'`);
    assert.equal((await client.query(`SELECT status FROM ${qualified("prepaid_credit_charges")} WHERE job_id='failed'`)).rows[0].status, "released");
    const failureModuleUrl = new URL("../../../worker/src/job-failure.ts", import.meta.url).href;
    const { finishJobFailure, markJobFailed } = await import(failureModuleUrl);
    for (const family of ["score", "legacy"] as const) {
      const id = `diagnostic-failed-${family}`;
      if (family === "score") await insert(id);
      else {
        await client.query(`INSERT INTO ${qualified("jobs")} (id,status) VALUES($1,'processing')`, [id]);
        await client.query(`INSERT INTO ${qualified("prepaid_credit_charges")} VALUES('legacy',$1,'synthetic-user',5,'reserved')`, [id]);
      }
      finishJobFailure({ terminal: () => markJobFailed({ db: runtime, family, jobId: id, message: "engine failed", timestamp: new Date().toISOString() }),
        diagnostics: [() => { throw new Error("diagnostic storage unavailable"); }, () => { throw new Error("heartbeat unavailable"); }] });
      assert.equal((await client.query(`SELECT status FROM ${qualified(family === "score" ? "score_jobs" : "jobs")} WHERE id=$1`, [id])).rows[0].status, "failed");
      assert.equal((await client.query(`SELECT status FROM ${qualified("prepaid_credit_charges")} WHERE job_id=$1`, [id])).rows[0].status, "released");
    }
    assert.equal(Number((await client.query(`SELECT SUM(credit_cost) AS used FROM ${qualified("prepaid_credit_charges")} WHERE status<>'released'`)).rows[0].used), 2.6666);
  } finally {
    runtime?.close();
    await client.query(`DROP SCHEMA IF EXISTS ${quote(schema)} CASCADE`);
    client.release(); await pool.end();
  }
});

test("real PostgreSQL schema 25 upgrade preserves old rows; API grants, top-ups and two-process reservations are atomic", { skip: !connectionString, timeout: 240_000 }, async () => {
  initDb();
  const legacyCode = generateActivationCodes({quantity:1,entitlementDays:30,planCode:"starter-monthly"}).codes[0]!;
  const legacyLogin = signInWithActivationCode(legacyCode.code); assert.ok(legacyLogin.ok);
  const userId = legacyLogin.userId, fileId = randomUUID(), now = new Date().toISOString();
  db.prepare(`INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at)
    VALUES (?,?,'test.pdf','test.pdf','/unused/test.pdf','application/pdf',100,'source_pdf',?)`).run(fileId,userId,now);
  const oldScore = createOmrImportScoreDocument({userId,title:"Existing schema 25 score",sourceFileId:fileId,sourceFileKind:"source_pdf",sourceOriginalName:"test.pdf",pageCount:1});
  // All pre-existing table definitions, defaults, FK declarations and indexes
  // are retained. The three existing CHECKs use explicit PostgreSQL DDL,
  // as the generic SQLite importer deliberately refuses to translate CHECKs.
  // Only schema 26's two new tables/triggers are omitted.
  const source = new DatabaseSync(":memory:");
  const tables = db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'prepaid_credit_%'").all() as Array<{name:string;sql:string}>;
  for (const table of tables) {
    source.exec(table.sql.replace(/\sCHECK\s*\((?:status IN \('pending', 'active', 'refunded'\)|credit_limit > 0|max_pages > 0)\)/g, ""));
    const columns = db.prepare(`PRAGMA table_info(${quote(table.name)})`).all() as Array<{name:string}>;
    for (const row of db.prepare(`SELECT * FROM ${quote(table.name)}`).all() as Array<Record<string,string|number|null>>) {
      source.prepare(`INSERT INTO ${quote(table.name)} (${columns.map(c=>quote(c.name)).join(",")}) VALUES (${columns.map(()=>"?").join(",")})`).run(...columns.map(c=>row[c.name]));
    }
  }
  const indexes = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND tbl_name NOT LIKE 'prepaid_credit_%'").all() as Array<{sql:string}>;
  for (const index of indexes) source.exec(index.sql);
  source.exec("PRAGMA user_version = 25");
  assert.equal((source.prepare("PRAGMA user_version").get() as {user_version:number}).user_version,25);
  const schema = `prepaid_qa_${randomUUID().replaceAll("-", "")}`;
  const role = `${schema}_app`;
  const runtimeUrl = new URL(connectionString!); runtimeUrl.username=role; runtimeUrl.password='local_prepaid_qa_role_only';
  let roleCreated=false;
  const pool = new Pool({connectionString,max:1}), client = await pool.connect();
  const runtimePool = new Pool({connectionString:runtimeUrl.href,max:1});
  const qualified = (table: string) => `${quote(schema)}.${quote(table)}`;
  const run = (input: Record<string,unknown>) => new Promise<ChildResult>((resolve,reject) => {
    const code = `(async()=>{
      const input=JSON.parse(process.env.PREPAID_QA_INPUT);
      const {db,initDb}=await import('./src/db.ts');initDb();
      try {
        const auth=await import('./src/repositories/auth-repository.ts');
        const scores=await import('./src/repositories/score-repository.ts');
        let value;
        if(input.action==='login')value=auth.signInWithActivationCode(input.code);
        else if(input.action==='job')value=scores.createOmrImportScoreDocument(input.job);
        else if(input.action==='retry')value=scores.retryScoreJob(input.job);
        else if(input.action==='fill'){
          const first=scores.createOmrImportScoreDocument(input.job);
          for(let i=0;i<44;i++)scores.createScoreExportJob({userId:input.job.userId,documentId:first.document.id,params:{format:'pdf'}});
          value=first;
        }else if(input.action==='worker-fail'){
          const {claimScoreJobById}=await import('../worker/src/score-job-claim.ts');
          const {markInterruptedBrokerJobFailed}=await import('../worker/src/broker-job-recovery.ts');
          const timestamp=new Date().toISOString(),brokerJobId='local-qa-'+input.jobId;
          const claimed=claimScoreJobById(db,{timestamp,jobId:input.jobId,brokerJobId});
          const recovered=markInterruptedBrokerJobFailed({db,brokerJobId,timestamp,message:'Local QA interrupted worker',
            payload:{family:'score',jobId:input.jobId,dispatchId:brokerJobId}});
          value={claimed:claimed?.id,recovered:recovered?.jobId};
        }else if(input.action==='profile'){
          const {getPlanQuotaUsage}=await import('./src/lib/plan-quotas.ts');
          value={profile:auth.getUserProfile(input.userId),quota:getPlanQuotaUsage(input.userId)};
        }else if(input.action==='api-generate'||input.action==='api-redeem'){
          const {default:Fastify}=await import('fastify');
          const {authPlugin}=await import('./src/plugins/auth.ts');
          const {config}=await import('./src/config.ts');config.adminApiKey='local-prepaid-qa';
          const app=Fastify();await app.register(authPlugin);
          const {adminActivationRoutes}=await import('./src/routes/admin-activation.ts');await app.register(adminActivationRoutes,{prefix:'/api'});
          const {activationRoutes}=await import('./src/routes/activation.ts');await app.register(activationRoutes,{prefix:'/api'});
          let response;
          if(input.action==='api-generate')response=await app.inject({method:'POST',url:'/api/admin/activation-codes/generate',headers:{'x-admin-api-key':'local-prepaid-qa'},payload:{planCode:input.planCode,quantity:1}});
          else{const token=crypto.randomUUID();auth.createSession(input.userId,token,1);response=await app.inject({method:'POST',url:'/api/activation/redeem',headers:{authorization:'Bearer '+token},payload:{code:input.code}});}
          value={statusCode:response.statusCode,body:response.json()};await app.close();
        }else throw Error('Unknown local QA action');
        process.stdout.write(JSON.stringify({ok:true,value}));
      }catch(error){process.stdout.write(JSON.stringify({ok:false,code:error.code,error:error.message}));}
      finally{db.close();}
    })().catch(error=>{process.stderr.write(String(error));process.exitCode=1;});`;
    const child = spawn(process.execPath,["--import","tsx","-e",code],{cwd:process.cwd(),env:{...process.env,RUNTIME_DATABASE_PRIMARY:"postgres",POSTGRES_URL:runtimeUrl.href,POSTGRES_SCHEMA:schema,PREPAID_QA_INPUT:JSON.stringify(input)},timeout:90_000});
    let stdout="",stderr="";
    child.stdout.on("data",chunk=>{stdout+=chunk;}); child.stderr.on("data",chunk=>{stderr+=chunk;});
    child.on("error",reject); child.on("close",status=>{if(status!==0)reject(new Error(stderr));else try{resolve(JSON.parse(stdout));}catch{reject(new Error(stdout+stderr));}});
  });
  const success = (result: ChildResult) => { assert.ok(result.ok,JSON.stringify(result)); return result.value; };
  const snapshot = async () => {
    const rows: Record<string,unknown> = {};
    for (const table of tables) rows[table.name]=(await client.query(`SELECT * FROM ${qualified(table.name)}`)).rows.map(row=>JSON.stringify(row)).sort();
    return rows;
  };
  try {
    assert.equal((await migrateSqliteToPostgres({source,target:client,targetSchema:schema})).verified,true);
    await client.query(`ALTER TABLE ${qualified("activation_codes")} ADD CONSTRAINT activation_codes_plan_code_check CHECK (plan_code IS NULL OR plan_code IN ('starter-monthly','starter-annual','converter-pro-monthly','converter-pro-annual'))`);
    await client.query(`ALTER TABLE ${qualified("billing_one_time_purchases")} ADD CONSTRAINT billing_one_time_purchases_status_check CHECK (status IN ('pending','active','refunded')); ALTER TABLE ${qualified("score_passes")} ADD CONSTRAINT score_passes_credit_limit_check CHECK (credit_limit>0), ADD CONSTRAINT score_passes_max_pages_check CHECK (max_pages>0)`);
    await client.query(`CREATE ROLE ${quote(role)} LOGIN PASSWORD 'local_prepaid_qa_role_only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`); roleCreated=true;
    await client.query(`GRANT USAGE ON SCHEMA ${quote(schema)} TO ${quote(role)}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${quote(schema)} TO ${quote(role)}`);
    const before=await snapshot();
    const sql=readFileSync(new URL("../../../../deploy/hetzner/prepaid-credit-packs.sql",import.meta.url),"utf8").replaceAll(':"runtime_schema"',quote(schema)).replaceAll(':"runtime_role"',quote(role));
    await client.query(sql); await client.query(sql);
    const partialCreditsSql = readFileSync(new URL("../../../../deploy/hetzner/recognition-partial-credits-schema28.sql", import.meta.url), "utf8").replaceAll(':"runtime_schema"', quote(schema));
    await client.query(partialCreditsSql); await client.query(partialCreditsSql);
    assert.equal((await client.query("SELECT data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name='prepaid_credit_charges' AND column_name='credit_cost'", [schema])).rows[0].data_type, "numeric");
    assert.deepEqual(await snapshot(),before,"repeated additive upgrade must leave every legacy row unchanged");
    await ensurePostgresRuntimeTriggers({target:client,targetSchema:schema});
    const oldLogin=success(await run({action:"login",code:legacyCode.code}));
    assert.equal(oldLogin.userId,userId); assert.equal(oldLogin.isNewUser,false);
    const oldProfile=success(await run({action:"profile",userId}));
    assert.equal(oldProfile.profile.entitlement.source,"activation_code"); assert.equal(oldProfile.quota.jobs.remaining,49);
    assert.equal(oldProfile.profile.prepaidCredits.total,0);
    assert.equal(oldScore.document!.source_file_id,fileId);

    const generated=success(await run({action:"api-generate",planCode:"credits-50"}));
    assert.equal(generated.statusCode,201);
    const pack=generated.body.codes[0]; assert.equal(pack.entitlementDays,0);
    const logins=await Promise.all([run({action:"login",code:pack.code}),run({action:"login",code:pack.code})]);
    const first=success(logins[0]), second=success(logins[1]); assert.ok(first.ok&&second.ok); assert.equal(first.userId,second.userId);
    const packUser=first.userId;
    assert.equal(Number((await client.query(`SELECT COUNT(*) AS n FROM ${qualified("prepaid_credit_grants")} WHERE user_id=$1`,[packUser])).rows[0].n),1);
    await client.query(`INSERT INTO ${qualified("files")} (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES ($1,$2,'test.pdf','test.pdf','/unused/test.pdf','application/pdf',100,'source_pdf',$3)`,[randomUUID(),packUser,now]);
    const packFile=(await client.query(`SELECT id FROM ${qualified("files")} WHERE user_id=$1`,[packUser])).rows[0].id;
    const job={userId:packUser,title:"PG prepaid score",sourceFileId:packFile,sourceFileKind:"source_pdf",sourceOriginalName:"test.pdf",recognitionMode:"simple",pageCount:1};
    success(await run({action:"fill",job}));
    const balance=async()=>Number((await client.query(`SELECT COALESCE(SUM(credit_cost),0) AS used FROM ${qualified("prepaid_credit_charges")} WHERE user_id=$1 AND status<>'released'`,[packUser])).rows[0].used);
    assert.equal(await balance(),45);
    const concurrent=await Promise.all([run({action:"job",job:{...job,recognitionMode:"complex"}}),run({action:"job",job:{...job,recognitionMode:"complex"}})]);
    assert.equal(concurrent.filter(result=>result.ok).length,1,JSON.stringify(concurrent));
    assert.equal(concurrent.find(result=>!result.ok)?.code,"PLAN_JOB_QUOTA_EXCEEDED"); assert.equal(await balance(),50);
    const accepted=success(concurrent.find(result=>result.ok)!);
    const workerFailed=success(await run({action:"worker-fail",jobId:accepted.job.id}));
    assert.equal(workerFailed.claimed,accepted.job.id); assert.equal(workerFailed.recovered,accepted.job.id);
    assert.equal(await balance(),45);
    // A late completion cannot resurrect a released reservation.
    await runtimePool.query(`UPDATE ${qualified("score_jobs")} SET status='completed' WHERE id=$1`,[accepted.job.id]); assert.equal(await balance(),45);
    await runtimePool.query(`UPDATE ${qualified("score_jobs")} SET status='failed' WHERE id=$1`,[accepted.job.id]);
    const retry=success(await run({action:"retry",job:{userId:packUser,jobId:accepted.job.id,documentId:accepted.document.id}}));
    assert.ok(retry.id); assert.equal(await balance(),50);
    await runtimePool.query(`UPDATE ${qualified("score_jobs")} SET status='completed' WHERE id=$1`,[retry.id]);
    await runtimePool.query(`UPDATE ${qualified("score_jobs")} SET status='cancelled' WHERE id=$1`,[retry.id]); assert.equal(await balance(),50);
    await runtimePool.query(`DELETE FROM ${qualified("score_jobs")} WHERE user_id=$1 AND job_type='render_export'`,[packUser]); assert.equal(await balance(),50);
    const topup=success(await run({action:"api-generate",planCode:"credits-200"})).body.codes[0];
    const redeemed=success(await run({action:"api-redeem",userId:packUser,code:topup.code})); assert.equal(redeemed.statusCode,200);
    const repeated=success(await run({action:"api-redeem",userId:packUser,code:topup.code})); assert.equal(repeated.body.alreadyRedeemed,true);
    const profile=success(await run({action:"profile",userId:packUser}));
    assert.equal(profile.profile.prepaidCredits.total,250); assert.equal(profile.profile.prepaidCredits.remaining,200);
    assert.equal(profile.quota.storage.limitBytes,500*1024*1024); assert.equal(profile.profile.entitlement.endsAt,null);
    const stolen=success(await run({action:"api-redeem",userId,code:topup.code})); assert.equal(stolen.statusCode,409);
    assert.equal(success(await run({action:"login",code:topup.code})).reason,"login_not_enabled");
    assert.equal(success(await run({action:"login",code:pack.code})).userId,packUser);
  } finally {
    // This generated schema lives only in the dedicated local QA database.
    await runtimePool.end(); await client.query(`DROP SCHEMA IF EXISTS ${quote(schema)} CASCADE`); if(roleCreated)await client.query(`DROP ROLE ${quote(role)}`); client.release(); await pool.end(); source.close();
  }
});
