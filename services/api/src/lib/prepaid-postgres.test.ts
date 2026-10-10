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

const connectionString = process.env.POSTGRES_TEST_URL?.trim();
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
type ChildResult = { ok: boolean; value?: any; code?: string; error?: string };

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