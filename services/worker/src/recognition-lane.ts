export type RecognitionLane = "normal" | "big";
const positive=(value:string|undefined,fallback:number)=>{const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:fallback;};
export function recognitionLaneResourcePolicy(input:{lane:RecognitionLane;estimatedMemoryMb?:number;normalHeapMb:number}) {
  const cap=positive(process.env.RECOGNITION_BIG_MAX_MB,2048);
  const normalHeap=Number.isSafeInteger(input.normalHeapMb)&&input.normalHeapMb>=256?input.normalHeapMb:768;
  if(input.lane==="normal")return {heapMb:normalHeap,reservationMb:Math.max(input.estimatedMemoryMb??1024,normalHeap+256)};
  if(cap<1024)throw new Error("ENGINE_RESOURCE_UNAVAILABLE: large-score memory capacity is not configured safely.");
  const heapMb=Math.max(256,Math.min(positive(process.env.RECOGNITION_BIG_HEAP_MB,normalHeap),cap-512));
  const reservationMb=Math.max(input.estimatedMemoryMb??1024,heapMb+512);
  if(!Number.isSafeInteger(reservationMb)||reservationMb>cap)throw new Error("ENGINE_RESOURCE_UNAVAILABLE: this score exceeds the configured large-score capacity.");
  return {heapMb,reservationMb};
}

/** The persisted admission snapshot, never the broker message, selects a lane. */
export function recognitionLaneFromParams(paramsJson: string | null, enabled = process.env.RECOGNITION_LANES_ENABLED === "true"): RecognitionLane {
  if (!enabled) return "normal";
  const params: unknown = paramsJson ? JSON.parse(paramsJson) : {};
  if (!params || typeof params !== "object" || Array.isArray(params)) throw new Error("Invalid recognition admission snapshot.");
  const value = (params as { recognitionLane?: unknown }).recognitionLane;
  if (value === undefined || value === "normal") return "normal";
  if (value === "big") return "big";
  throw new Error("Unsupported recognition memory lane.");
}
