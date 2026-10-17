import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { once } from "node:events";
import { withOmrEngineSlot, omrEngineCapacity } from "./omr-engine-gate.js";
import { EngineResourceError, engineResourceError } from "./engine-resource-error.js";

const context = new AsyncLocalStorage<{token:string;directory:string;memoryMb:number;lost?:boolean}>();
export const hasJobMemoryLease = () => Boolean(context.getStore());
export const jobMemoryLeaseLost = () => Boolean(context.getStore()?.lost);
export function jobMemoryLeaseReady(output: string, token: string): boolean {
  for (const line of output.split(/\r?\n/u)) {
    try { const value = JSON.parse(line) as { ready?: boolean; token?: string }; if (value.ready === true && value.token === token) return true; }
    catch { /* A stdout chunk may end in the middle of the ready record. */ }
  }
  return false;
}
export function getJobMemoryLeaseEnvironment(): NodeJS.ProcessEnv {
  const lease=context.getStore();
  return lease ? {MUSIC_ENGINE_JOB_TOKEN:lease.token,MUSIC_ENGINE_LOCK_DIR:lease.directory} : {};
}
export async function withJobMemoryLease<T>(input:{lane:"normal"|"big";memoryMb:number;isCancelled:()=>boolean;pythonCommand:string;scriptPath:string},operation:()=>Promise<T>):Promise<T> {
  if(process.env.RECOGNITION_LANES_ENABLED!=="true") {
    if (input.lane === "big") throw new EngineResourceError("ENGINE_RESOURCE_UNAVAILABLE");
    return operation();
  }
  if (!Number.isSafeInteger(input.memoryMb) || input.memoryMb < 1 || !["normal", "big"].includes(input.lane)) throw new EngineResourceError("ENGINE_RESOURCE_UNAVAILABLE");
  const directory=process.env.MUSIC_ENGINE_LOCK_DIR || "/data/.music-engine-slots";
  const token=randomUUID(),capacity=omrEngineCapacity();
  if(process.platform!=="linux") {
    // Local offline development has no production cross-container flock pool.
    return withOmrEngineSlot({timeoutMs:900000,slots:input.lane==="big"?capacity:1,memoryMb:input.memoryMb,
      isCancelled:input.isCancelled,cancelledError:()=>new Error("Recognition cancelled"),timeoutError:()=>new EngineResourceError("ENGINE_RESOURCE_BUSY")},
      ()=>context.run({token,directory,memoryMb:input.memoryMb},operation));
  }
  const child=spawn(input.pythonCommand,[path.resolve(input.scriptPath),directory,token,String(input.memoryMb),String(input.lane==="big"?capacity:1),String(capacity),"600000"],{stdio:["pipe","pipe","pipe"]});
  let ready=false,stderr="",stdout="";
  child.stderr.on("data",data=>{stderr=(stderr+data).slice(-2000);});
  const cancelled=setInterval(()=>{if(!ready && input.isCancelled())child.kill();},100);
  try {
    await new Promise<void>((resolve,reject)=>{
      child.stdout.on("data",data=>{
        stdout += String(data);
        if (stdout.length > 8192) { child.kill(); reject(new EngineResourceError("ENGINE_RESOURCE_UNAVAILABLE")); return; }
        if(jobMemoryLeaseReady(stdout,token)){ready=true;resolve();}
      });
      child.once("error",reject);
      child.once("exit",()=>{if(!ready)reject(engineResourceError(stderr) ?? new EngineResourceError("ENGINE_RESOURCE_UNAVAILABLE"));});
    });
    if(input.isCancelled())throw new Error("Recognition cancelled");
    // Loss of the lock holder is fatal; never run unprotected after pipe/lease failure.
    const lease={token,directory,memoryMb:input.memoryMb,lost:false};
    const onLost=()=>{lease.lost=true;};
    child.once("exit",onLost);
    try { const result=await context.run(lease,operation); if(lease.lost)throw new Error(`ENGINE_RESOURCE_UNAVAILABLE: job lease lost ${stderr}`); return result; }
    finally { child.removeListener("exit",onLost); }
  } finally {
    clearInterval(cancelled);
    if (!child.stdin.destroyed) child.stdin.end();
    if(child.pid && child.exitCode===null && child.signalCode===null)await once(child,"close");
  }
}
