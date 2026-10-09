import { randomBytes } from "node:crypto";
import { SUPPORTED_LOCALES } from "@score/i18n";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://scoretransposer.com").origin;
  const allowed = new Set([siteOrigin]);
  if (siteOrigin === "https://scoretransposer.com") allowed.add("https://www.scoretransposer.com");
  const parent = url.searchParams.get("parent") || "";
  if (!allowed.has(parent)) return new Response(null, { status: 403, headers: { ...privateHeaders, "Content-Security-Policy": "frame-ancestors 'none'" } });
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return new Response(null, { status: 503, headers: privateHeaders });
  const requestedLocale = url.searchParams.get("locale");
  const locale = SUPPORTED_LOCALES.find(value => value === requestedLocale) || "en";
  const nonce = randomBytes(24).toString("base64");
  const config = JSON.stringify({ clientId, parent, locale }).replace(/</gu, "\\u003c");
  // This document stays outside the editor layout and analytics. Google runs
  // on its authorized origin; the parent validates both message origin/source.
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google sign-in</title><style>html,body{margin:0;background:transparent}#button{display:flex;justify-content:center;width:100%;min-height:44px}</style></head><body><div id="button"></div><script nonce="${nonce}">
const config=${config};
const send=(type,extra={})=>window.parent.postMessage({channel:'score-google-signin',type,...extra},config.parent);
if(window.parent!==window){
 const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
 script.onerror=()=>send('error');
 script.onload=()=>{
  if(!window.google){send('error');return;}
  google.accounts.id.initialize({client_id:config.clientId,callback:response=>{
   if(typeof response.credential==='string')send('credential',{credential:response.credential});else send('error');
  }});
  const el=document.getElementById('button');let lastWidth=0;
  const measure=()=>{const direct=Math.floor(el.clientWidth);if(direct>0)return Math.min(400,direct);const parent=Math.floor(el.parentElement&&el.parentElement.clientWidth||0);if(parent>0)return Math.min(400,parent);return 320;};
  const render=()=>{const width=measure();if(width===lastWidth)return;lastWidth=width;el.replaceChildren();google.accounts.id.renderButton(el,{theme:'outline',size:'large',shape:'rectangular',text:'continue_with',width,locale:config.locale});};
  requestAnimationFrame(()=>requestAnimationFrame(render));new ResizeObserver(render).observe(el);send('ready');
 };
 document.head.append(script);
}
</script></body></html>`;
  return new Response(html, { headers: {
    ...privateHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}' https://accounts.google.com; frame-src https://accounts.google.com; connect-src https://accounts.google.com; style-src 'unsafe-inline' https://accounts.google.com; img-src https://*.googleusercontent.com https://accounts.google.com data:; base-uri 'none'; form-action 'none'; frame-ancestors ${parent}`,
  } });
}
