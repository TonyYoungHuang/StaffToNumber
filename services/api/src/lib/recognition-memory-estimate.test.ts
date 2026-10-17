import test from "node:test";
import assert from "node:assert/strict";
import { estimateRecognitionMemory, parsePhotoCorners, revalidateRecognitionAssessment } from "./recognition-memory-estimate.js";
const config={enabled:true,normalMb:1536,bigMb:2048,capacityVersion:"test-cx33"};
test("admission distinguishes normal, exclusive big and prepayment hard ceiling",()=>{
  const small=estimateRecognitionMemory({sizeBytes:1000,pageCount:1,maxPagePixels:1e6}, {...config,normalMb:2048});
  assert.equal(small.lane,"normal");
  assert.equal(estimateRecognitionMemory({sizeBytes:1000,pageCount:1,maxPagePixels:1e6},config).lane,"big");
  const rejected=estimateRecognitionMemory({sizeBytes:1e6,pageCount:100,maxPagePixels:12e6,mode:"complex"},config);
  assert.equal(rejected.lane,"unsupported");
  assert.throws(()=>revalidateRecognitionAssessment(rejected),/No credits/);
  assert.equal(estimateRecognitionMemory({sizeBytes:1e6,pageCount:100,maxPagePixels:12e6,mode:"complex"},{...config,enabled:false}).lane,"normal");
});
test("four photo corners must be normalized, ordered and noncrossing",()=>{
  assert.equal(parsePhotoCorners('[{"x":0,"y":0},{"x":1,"y":0},{"x":1,"y":1},{"x":0,"y":1}]')?.length,4);
  assert.throws(()=>parsePhotoCorners([{x:0,y:0},{x:1,y:1},{x:1,y:0},{x:0,y:1}]),/without crossing/);
  assert.throws(()=>parsePhotoCorners([{x:0,y:0},{x:1,y:0},{x:2,y:1},{x:0,y:1}]),/four corners/);
  assert.throws(()=>parsePhotoCorners([{x:0,y:0},{x:.1,y:0},{x:.1,y:.1},{x:0,y:.1}]),/visible page/);
});

test("a fully inspected small complex score fits the conservative CX33 big lane without HOMR",()=>{
  const assessment=estimateRecognitionMemory({sizeBytes:1000,pageCount:1,maxPagePixels:100_000,mode:"complex",
    preflight:{schemaVersion:1,recommendation:"complex",confidence:"high",sourcePageCount:1,pagesAnalyzed:1,complete:true,reasonCodes:[],
      pages:[{page:1,staffCount:1,systemCount:1,maxStavesPerSystem:1,hasTab:false,uncertain:false}]}},config);
  assert.equal(assessment.lane,"big");
  assert.ok(assessment.estimatedMemoryMb<=2048);
  assert.ok(assessment.reasonCodes.includes("HEAVY_ENGINE"));
});
