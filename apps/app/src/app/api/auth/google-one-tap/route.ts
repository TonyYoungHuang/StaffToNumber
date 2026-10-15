import { randomBytes } from "node:crypto";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { GOOGLE_KNOWN_ACCOUNT_KEY, GOOGLE_AUTO_SIGNIN_SUPPRESSION_COOKIE, getGoogleLocale } from "@score/shared";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://scoretransposer.com").origin;
  const appOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://app.scoretransposer.com").origin;
  const allowed = new Set([siteOrigin, appOrigin]);
  if (siteOrigin === "https://scoretransposer.com") allowed.add("https://www.scoretransposer.com");
  const parent = url.searchParams.get("parent") || "";
  if (!allowed.has(parent)) return new Response(null, { status: 403, headers: { ...privateHeaders, "Content-Security-Policy": "frame-ancestors 'none'" } });
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return new Response(null, { status: 503, headers: privateHeaders });
  const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.scoretransposer.com").origin;
  const locale = SUPPORTED_LOCALES.find(value => value === url.searchParams.get("locale")) || "en";
  const nonce = randomBytes(24).toString("base64");
  const config = JSON.stringify({ clientId, parent, apiOrigin, locale, ...getGoogleLocale(locale), accountKey: GOOGLE_KNOWN_ACCOUNT_KEY,
    suppressionCookie: GOOGLE_AUTO_SIGNIN_SUPPRESSION_COOKIE + (new URL(appOrigin).hostname.includes("staging") ? "_staging" : "") }).replace(/</gu, "\\u003c");
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google sign-in</title><style>html,body{margin:0;background:transparent}</style></head><body><script nonce="${nonce}">
const config=${config};let busy=false,closed=false;
const suppressed=()=>String(document.cookie||'').split(';').some(value=>value.trim().startsWith(config.suppressionCookie+'='));
const close=()=>{closed=true;if(suppressed())window.google?.accounts.id.disableAutoSelect?.();window.google?.accounts.id.cancel();window.google?.accounts.id.intermediate?.notifyParentClose();};
addEventListener('message',event=>{if(event.source===parent&&event.origin===config.parent&&event.data?.channel==='score-one-tap'&&event.data?.type==='close')close();});
const load=src=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.append(script);});
if(window.parent!==window)Promise.all([load('https://accounts.google.com/gsi/client?hl='+encodeURIComponent(config.hl)),load('https://accounts.google.com/gsi/intermediatesupport?hl='+encodeURIComponent(config.hl))]).then(()=>{
 google.accounts.id.intermediate.verifyParentOrigin(config.parent,()=>{
  if(closed)return;
  if(suppressed()){google.accounts.id.disableAutoSelect?.();return;}
  let hint;try{const account=JSON.parse(window.localStorage.getItem(config.accountKey)||'null');if(account&&typeof account.email==='string'&&typeof account.expiresAt==='number'&&account.expiresAt>Date.now()&&account.email.length<=320&&account.email.includes('@')&&!/\\s/.test(account.email))hint=account.email;}catch{}
  google.accounts.id.initialize({client_id:config.clientId,allowed_parent_origin:[config.parent],auto_select:true,...(hint?{login_hint:hint}:{}),state_cookie_domain:'scoretransposer.com',context:'signin',cancel_on_tap_outside:true,callback:async response=>{
   if(busy||closed||suppressed()||typeof response.credential!=='string'||response.credential.length>16384)return;
   busy=true;
   try{
    const result=await fetch(config.apiOrigin+'/api/auth/google',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','Accept-Language':config.locale},body:JSON.stringify({credential:response.credential})});
    if(!result.ok){close();return;}
    // Never post ID tokens, session tokens, or personal account data to the parent.
    google.accounts.id.intermediate.notifyParentDone();
   }catch{close();}finally{busy=false;}
  }});
  google.accounts.id.prompt();
 },close);
}).catch(()=>{});
</script></body></html>`;
  return new Response(html, { headers: {
    ...privateHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}' https://accounts.google.com; frame-src https://accounts.google.com; connect-src https://accounts.google.com ${apiOrigin}; style-src 'unsafe-inline' https://accounts.google.com; img-src https://*.googleusercontent.com https://accounts.google.com data:; base-uri 'none'; form-action 'none'; frame-ancestors ${parent}`,
  } });
}
