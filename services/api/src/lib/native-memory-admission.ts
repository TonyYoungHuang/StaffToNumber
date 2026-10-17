import fs from "node:fs";

const MIB=1048576;
let reservedBytes=0;
/** Small parent-side launch allowance. Cross-container engine reservations are
 * still owned by the flock wrapper; this catches pressure before spawning it. */
export async function acquireNativeMemoryAdmission(input:{memoryMb:number;signal?:AbortSignal;waitMs?:number}) {
  if(process.env.RECOGNITION_LANES_ENABLED!=="true" || process.platform!=="linux")return ()=>{};
  const started=Date.now(),requested=input.memoryMb*MIB;
  while(true) {
    if(input.signal?.aborted)throw new Error("Native processing was cancelled.");
    let available=0,groupAvailable=Infinity;
    try {
      const match=/^MemAvailable:\s+(\d+)/mu.exec(fs.readFileSync("/proc/meminfo","utf8"));
      if(!match)throw new Error("Missing memory sensor");available=Number(match[1])*1024;
      for(const [root,currentName,limitName] of [["/sys/fs/cgroup","memory.current","memory.max"],["/sys/fs/cgroup/memory","memory.usage_in_bytes","memory.limit_in_bytes"]]) {
        if(!fs.existsSync(`${root}/${currentName}`))continue;
        const current=Number(fs.readFileSync(`${root}/${currentName}`,"utf8"));const raw=fs.readFileSync(`${root}/${limitName}`,"utf8").trim();
        groupAvailable=raw==="max"||Number(raw)>=2**60?Infinity:Number(raw)-current;
        break;
      }
    } catch {throw Object.assign(new Error("Safe processing resources are unavailable."),{code:"ENGINE_RESOURCE_UNAVAILABLE",statusCode:503});}
    if(Math.min(available,groupAvailable)>=reservedBytes+requested+256*MIB) {
      reservedBytes+=requested;let released=false;
      return ()=>{if(!released){released=true;reservedBytes-=requested;}};
    }
    if(Date.now()-started>=(input.waitMs??120000))throw Object.assign(new Error("Processing resources are temporarily at capacity."),{code:"ENGINE_MEMORY_PRESSURE",statusCode:503});
    await new Promise(resolve=>setTimeout(resolve,100));
  }
}
