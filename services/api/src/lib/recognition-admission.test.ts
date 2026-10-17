import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {db,initDb} from "../db.js";
import {createUser} from "../repositories/auth-repository.js";
import {processBillingWebhookEvent} from "../repositories/billing-repository.js";
import {createOmrImportScoreDocument} from "../repositories/score-repository.js";
import type {RecognitionMemoryAssessment} from "@score/shared";
import { estimateRecognitionMemory } from "./recognition-memory-estimate.js";
const assessment:RecognitionMemoryAssessment={version:1,capacityVersion:"cx33-test",lane:"big",estimatedMemoryMb:2048,
  reasonCodes:["RASTER_ENHANCEMENT"],waitEstimateSeconds:[60,600],sourcePageCount:10,maxPagePixels:12e6,enabled:true};
function fixture(paid=false){
  initDb();const user=createUser(`${randomUUID()}@admission.test`,"hash","salt")!;
  if(paid)processBillingWebhookEvent(db,{provider:"stripe",eventId:`evt-${randomUUID()}`,eventType:"customer.subscription.created",rawPayload:"test",
    customer:{providerCustomerId:`cus-${user.id}`,userId:user.id},subscription:{providerSubscriptionId:`sub-${user.id}`,providerCustomerId:`cus-${user.id}`,userId:user.id,status:"active",planRef:"starter",seatQuantity:1,currentPeriodEnd:new Date(Date.now()+86400000).toISOString()}});
  const sourceFileId=randomUUID();db.prepare("INSERT INTO files(id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES(?,?,'score.pdf','score.pdf','/unused','application/pdf',100,'source_pdf',?)").run(sourceFileId,user.id,new Date().toISOString());
  return {user,input:{userId:user.id,title:"Score",sourceFileId,sourceFileKind:"source_pdf" as const,sourceOriginalName:"score.pdf",pageCount:10,memoryAssessment:assessment}};
}
test("free big upload cannot reserve credits; qualified paid upload uses the same quote and big lane",()=>{
  const previous=process.env.RECOGNITION_LANES_ENABLED;process.env.RECOGNITION_LANES_ENABLED="true";
  try {
    const free=fixture();assert.throws(()=>createOmrImportScoreDocument(free.input),/Choose Starter/);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM score_jobs WHERE user_id = ?").get(free.user.id) as {n:number}).n,0);
    const paid=fixture(true);const result=createOmrImportScoreDocument(paid.input);const params=JSON.parse(result.job!.params_json!);
    assert.equal(params.recognitionLane,"big");assert.equal(params.creditCost,1);assert.equal(params.fallbackUsed,false);
    const ceiling=fixture(true);assert.throws(()=>createOmrImportScoreDocument({...ceiling.input,memoryAssessment:{...assessment,lane:"unsupported"}}),/No credits/);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM score_jobs WHERE user_id = ?").get(ceiling.user.id) as {n:number}).n,0);
  } finally {if(previous===undefined)delete process.env.RECOGNITION_LANES_ENABLED;else process.env.RECOGNITION_LANES_ENABLED=previous;}
});

test("a phone photograph and its rectified version retain the ordinary free recognition allowance", () => {
  const previous = process.env.RECOGNITION_LANES_ENABLED; process.env.RECOGNITION_LANES_ENABLED = "true";
  try {
    for (const maxPagePixels of [3840 * 2160, 2168 * 2561]) {
      const free = fixture();
      const memoryAssessment = estimateRecognitionMemory({ sizeBytes: 2_166_908, pageCount: 1, maxPagePixels });
      const result = createOmrImportScoreDocument({ ...free.input, pageCount: 1, memoryAssessment });
      const params = JSON.parse(result.job!.params_json!);
      assert.equal(params.recognitionLane, "normal");
      assert.equal(params.creditSource, "free_trial");
      assert.equal(params.creditCost, 1);
    }
  } finally { if (previous === undefined) delete process.env.RECOGNITION_LANES_ENABLED; else process.env.RECOGNITION_LANES_ENABLED = previous; }
});
