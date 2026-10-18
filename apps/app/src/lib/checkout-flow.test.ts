import assert from "node:assert/strict";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { resolveCheckoutReturnContext } from "@score/shared";
import { checkoutReturnContext, persistedCheckoutIntent, checkoutIntentSignature, lookupAndStartCheckout, completeCheckoutIntent, waitForCheckoutSave, checkoutLoginPath } from "./checkout-flow";
import { getCheckoutReturnCopy } from "./checkout-return-copy";
import { analyticsSafeUrl, analyticsSensitiveRoute } from "./analytics";
import type { apiRequest } from "./api";
function memoryStorage(): Storage { const entries = new Map<string,string>(); return { get length() { return entries.size; }, getItem: key => entries.get(key) ?? null, setItem: (key,value) => { entries.set(key,String(value)); }, removeItem: key => { entries.delete(key); }, key: index => [...entries.keys()][index] ?? null, clear: () => entries.clear() }; }
function fixture() { const previous = globalThis.localStorage; globalThis.localStorage = memoryStorage(); return () => { globalThis.localStorage = previous; }; }
const payload = { provider: "stripe", billingKind: "one_time", planCode: "single-score", targetDocumentId: "score-1", returnSite: "app", returnPath: "/scores/score-1?tab=edit#export-center" };
test("purchase intent survives component remount/reload, reordered payload and transient settings", () => {
  const cleanup = fixture(); try {
    const signature = checkoutIntentSignature(payload); const intent = persistedCheckoutIntent(signature);
    assert.equal(persistedCheckoutIntent(checkoutIntentSignature({ returnState: { version:1 }, locale: "fr", ...payload, seatQuantity:1 })), intent);
    assert.notEqual(persistedCheckoutIntent(checkoutIntentSignature({ ...payload, targetDocumentId: "score-2" })), intent);
  } finally { cleanup(); }
});
test("timeout/retry first finds the same order and never submits another checkout", async () => {
  const cleanup = fixture(); try {
    const keys: string[] = []; let created = false;
    const request = (async (path: string, init?: RequestInit) => {
      keys.push(new Headers(init?.headers).get("Idempotency-Key")!);
      if (path.includes("by-intent")) return created ? {ok:true,data:{orderId:"order-1",token:"locator",url:"https://checkout.stripe.com/existing",status:"pending"}} : {ok:false,status:404,error:"missing"};
      if (path.includes("?pending")) return {ok:true,data:{orders:[]}};
      created = true; throw new Error("network timeout after commit");
    }) as typeof apiRequest;
    await assert.rejects(lookupAndStartCheckout(payload,"auth",undefined,request));
    const recovered = await lookupAndStartCheckout(payload,"auth",undefined,request);
    assert.equal(recovered.ok && recovered.data.orderId,"order-1"); assert.equal(new Set(keys).size,1);
  } finally { cleanup(); }
});
test("paid order after login returns to verification and cannot create a new charged session", async () => {
  const cleanup = fixture(); try {
    let calls=0; const request=(async () => { calls++; return {ok:true,data:{orderId:"paid-1",token:"public",status:"paid",url:"https://checkout.stripe.com/old"}}; }) as typeof apiRequest;
    const result=await lookupAndStartCheckout(payload,"auth",undefined,request);
    assert.match(result.ok ? result.data.url : "", /^\/checkout\/success\?/u); assert.equal(calls,1);
  } finally { cleanup(); }
});
test("only a new explicit purchase after completed handoff rotates a paid intent", async () => {
  const cleanup=fixture(); try {
    const keys:string[]=[]; let created=false;
    const request=(async (path:string,init?:RequestInit)=> { const key=new Headers(init?.headers).get("Idempotency-Key")!; keys.push(key); if(path.includes("by-intent")) return keys.length===1 ? {ok:true,data:{orderId:"old",token:"old",status:"paid",url:""}} : {ok:false,status:404,error:"missing"}; if(path.includes("?pending")) return {ok:true,data:{orders:[]}}; created=true; return {ok:true,data:{orderId:"new",token:"new",url:"https://checkout.stripe.com/new"}}; }) as typeof apiRequest;
    await lookupAndStartCheckout(payload,"auth",undefined,request); completeCheckoutIntent("old");
    keys.length=0;
    const result=await lookupAndStartCheckout(payload,"auth",undefined,request,true);
    assert.equal(result.ok && result.data.orderId,"new"); assert.equal(created,true); assert.equal(new Set(keys).size,2);
  } finally{cleanup();}
});
test("lost local key with pending owned orders requires owner selection before a new POST", async()=>{
  const cleanup=fixture();try{ const paths:string[]=[];const request=(async(path:string)=>{paths.push(path);return path.includes("by-intent")?{ok:false,status:404,error:"missing"}:{ok:true,data:{orders:[{id:"pending",provider:"stripe",planCode:"single-score",billingKind:"one_time",targetDocumentId:"score-1"}]}};}) as typeof apiRequest;
    const result=await lookupAndStartCheckout(payload,"auth",undefined,request);assert.equal(result.ok,false);assert.equal(result.data?.code,"CHECKOUT_RECOVERY_REQUIRED");assert.equal(result.data?.recoveryOrders?.[0]?.id,"pending");assert.equal(paths.length,2);
  }finally{cleanup();}
});
test("implicit recovery keeps the same paid, pending and terminal intent without a new charge", async () => {
  for (const status of ["paid", "pending", "cancelled", "failed"]) {
    const cleanup = fixture(); try {
      const signature = checkoutIntentSignature(payload); const key = persistedCheckoutIntent(signature);
      const calls: Array<{ path: string; method?: string; key: string | null }> = [];
      const request = (async (path: string, init?: RequestInit) => { calls.push({ path, method: init?.method, key: new Headers(init?.headers).get("Idempotency-Key") }); return { ok: true, data: { orderId: "existing", token: "locator", status, url: "https://checkout.stripe.com/expired" } }; }) as typeof apiRequest;
      const result = await lookupAndStartCheckout(payload, "auth", undefined, request, false);
      assert.equal(persistedCheckoutIntent(signature), key); assert.equal(calls.length, 1); assert.equal(calls[0].key, key); assert.equal(calls[0].method, undefined);
      assert.equal(result.ok, true);
      if (status === "pending") assert.equal(result.ok && result.data.url, "https://checkout.stripe.com/expired");
      else assert.match(result.ok ? result.data.url : "", /^\/checkout\/success\?order_id=existing/u);
    } finally { cleanup(); }
  }
});
test("an explicit click replaces only a server-confirmed cancelled or failed checkout with one fresh stable intent", async () => {
  for (const status of ["cancelled", "failed"]) {
    const cleanup = fixture(); try {
      const signature = checkoutIntentSignature(payload); const originalKey = persistedCheckoutIntent(signature);
      const calls: Array<{ path: string; method?: string; key: string | null }> = []; let lookups = 0;
      const request = (async (path: string, init?: RequestInit) => {
        calls.push({ path, method: init?.method, key: new Headers(init?.headers).get("Idempotency-Key") });
        if (path.includes("by-intent")) return lookups++ === 0 ? { ok: true, data: { orderId: "expired", token: "old", status, url: "https://checkout.stripe.com/expired" } } : { ok: false, status: 404, error: "missing" };
        if (path.includes("?pending")) return { ok: true, data: { orders: [] } };
        return { ok: true, data: { orderId: "fresh", token: "new", url: "https://checkout.stripe.com/fresh" } };
      }) as typeof apiRequest;
      const result = await lookupAndStartCheckout(payload, "auth", undefined, request, true);
      const freshKey = persistedCheckoutIntent(signature);
      assert.equal(result.ok && result.data.orderId, "fresh"); assert.notEqual(freshKey, originalKey);
      assert.equal(calls[0].key, originalKey); assert.ok(calls[0].path.includes("by-intent"));
      assert.ok(calls.slice(1).every(call => call.key === freshKey)); assert.equal(calls.filter(call => call.method === "POST").length, 1);
    } finally { cleanup(); }
  }
});
test("server return context wins over cache and custom upload hash retains required confirmation",()=>{
  const context=checkoutReturnContext("/scores/new/scan?uploadDraft=draft-1#free-scan",{kind:"recognition",mode:"simple"},{uploadDraftId:"draft-1",confirmation:"required"});
  assert.equal(context.returnPath,"/scores/new/scan?uploadDraft=draft-1#free-scan");assert.equal(context.returnState.uploadDraftId,"draft-1");assert.equal(context.returnState.confirmation,"required");assert.equal(context.returnState.panel,undefined);
  const server={site:"app" as const,path:"/scores/server#export-center",state:context.returnState,successSite:"app" as const,successPath:"/scores/server#export-center"};
  assert.equal(resolveCheckoutReturnContext(server,{...server,path:"/scores/cache"}),server);
});
test("login retains continue/top_up, cycle, original order, target and saved state",()=>{
  const path=checkoutLoginPath("/checkout?plan=converter-pro-annual&billing=subscription&passMode=top_up&targetDocumentId=score-1&order_id=paid-1&returnState=%7B%22version%22%3A1%7D",{continue:"1"});
  const params=new URL(path,"https://app.invalid").searchParams;assert.equal(params.get("continue"),"1");assert.equal(params.get("passMode"),"top_up");assert.equal(params.get("plan"),"converter-pro-annual");assert.equal(params.get("order_id"),"paid-1");assert.equal(params.get("targetDocumentId"),"score-1");assert.equal(params.get("returnState"),'{"version":1}');
});
test("save coordinator waits for a running save and confirms server persistence",async()=>{
  let busy=true,dirty=true,saved=0;const read=()=>({busy,dirty,blocked:false,save:async()=>{saved++;dirty=false;return true;}});
  assert.equal(await waitForCheckoutSave(read,async()=>{busy=false;}),true);assert.equal(saved,1);
});
test("save coordinator blocks conflicts, offline failure, and edits arriving during save",async()=>{
  assert.equal(await waitForCheckoutSave(()=>({busy:false,dirty:true,blocked:true,save:async()=>true}),async()=>{}),false);
  assert.equal(await waitForCheckoutSave(()=>({busy:false,dirty:true,blocked:false,save:async()=>false}),async()=>{}),false);
  assert.equal(await waitForCheckoutSave(()=>({busy:false,dirty:true,blocked:false,save:async()=>true}),async()=>{}),false);
});
test("success/failure/save/restore notices cover nine languages without empty strings",()=>{for(const locale of SUPPORTED_LOCALES)for(const value of Object.values(getCheckoutReturnCopy(locale)))assert.ok(value.trim(),locale);});
test("checkout analytics cannot emit locator tokens or payment state page events",()=>{assert.equal(analyticsSensitiveRoute("/checkout/success"),true);assert.equal(analyticsSensitiveRoute("/scores/score-1"),false);const safe=analyticsSafeUrl("https://app.invalid/checkout/success?token=private&return_token=secret&session_id=session&order_id=order");assert.equal(new URL(safe).searchParams.get("order_id"),"order");assert.doesNotMatch(safe,/private|secret|session/);});
