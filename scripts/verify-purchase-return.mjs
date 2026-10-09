import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const app=process.env.FLOW_APP_ORIGIN || 'http://127.0.0.1:43101',api='http://127.0.0.1:43102';
assert.ok(/^http:\/\/127\.0\.0\.1:\d+$/.test(app),'Flow tests only run against loopback frontends');
fs.mkdirSync('.tmp/flow-redesign',{recursive:true});
const report={fixtureOnly:true,realCharges:false,checks:[]};const pass=x=>{console.log('PASS '+x);report.checks.push(x)};
const browser=await chromium.launch({headless:true,channel:'msedge'});let page;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.routeWebSocket('**', socket => socket.close());
await context.addCookies([{name:'score_locale',value:'en',url:app}]);
 let signedIn=false,paid=false,orderStatus='pending',userId='flow-user',imports=0,checkout=null,accessCalls=0;
 const user=()=>({id:userId,email:'flow@example.invalid',entitlement:{status:paid?'active':'inactive'},freeTrial:{available:true}});
 await context.route(/(?:127\.0\.0\.1:43102|api\.scoretransposer\.com)\/api\//,async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':app,'access-control-allow-credentials':'true','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});return;}
  let data={},status=200;
  if(path==='/api/auth/me'){accessCalls++;status=signedIn?200:401;data=signedIn?{user:user()}:{error:'Please sign in'};}
  else if(path==='/api/auth/login'||path==='/api/auth/register'){signedIn=true;data={token:'flow-fixture-token',user:user()};}
  else if(path==='/api/payments/billing/usage')data={usage:{jobs:{remaining:25}}};
  else if(path==='/api/scores')data={scores:[]};
  else if(path==='/api/education/organizations')data={organizations:[]};
  else if(path==='/api/payments/checkout/authenticated'){checkout=req.postDataJSON();data={orderId:'flow-order',provider:'stripe',token:'public-order-token',url:app+'/mock-provider'};}
  else if(path==='/api/payments/orders/flow-order')data={order:{id:'flow-order',provider:'stripe',userId:'flow-user',status:orderStatus,billingKind:'one_time',seatQuantity:1,amountMinor:1200,currency:'usd'}};
  else if(path.startsWith('/api/scores/import/')){imports++;data={score:{id:'imported-score'}};}
  else if(path==='/api/scores/imported-score'){status=404;data={error:'Navigation fixture complete'};}
  else if(req.method()==='POST')throw Error('Unexpected POST '+path);
  await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':app,'access-control-allow-credentials':'true'},body:JSON.stringify(data)});
 });
 page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto(app+'/scores/new/musicxml#free-scan');
 await expect(page).toHaveURL(/\/login\?next=%2Fscores%2Fnew%2Fmusicxml/);
 await page.getByLabel('Email',{exact:true}).fill('flow@example.invalid');
 await page.getByLabel('Password',{exact:true}).fill('Password-for-test-123');
 const toggle=page.locator('form button[type=button]').filter({hasText:/account|sign in/i});
 await toggle.click();await expect(page.getByLabel('Email',{exact:true})).toHaveValue('flow@example.invalid');await expect(page.getByLabel('Password',{exact:true})).toHaveValue('Password-for-test-123');
 await page.locator('form button[type=submit]').click();
 await expect(page).toHaveURL(app+'/scores/new/musicxml#free-scan');
 pass('Login preserves the original import destination; register toggle preserves both inputs');
 const xml=fs.readFileSync('samples/seo-product-demo.musicxml');
 await page.locator('#score-file-input').setInputFiles({name:'review-score.musicxml',mimeType:'application/xml',buffer:xml});
 await expect(page.locator('.file-dropzone')).toContainText('MUSICXML');
 await page.getByRole('button',{name:'Upgrade to continue',exact:true}).click();
 await expect(page).toHaveURL(/\/checkout\?next=%2Fscores%2Fnew%2Fmusicxml/);
 await expect(page.getByLabel('Selected plan',{exact:true})).toBeVisible();
 await page.getByLabel('Selected plan',{exact:true}).selectOption('starter-annual');
 await page.getByRole('button',{name:'One-time purchase',exact:true}).click();
 await page.getByRole('button',{name:'Continue to secure payment in this tab',exact:true}).click();
 await expect(page).toHaveURL(app+'/mock-provider');
 assert.equal(checkout.billingKind,'one_time');assert.equal(checkout.planCode,'starter-annual');assert.equal(checkout.provider,'stripe');assert.equal(imports,0);
 pass('Compact checkout submits the selected annual one-time plan with default Stripe');
 await page.goto(app+'/checkout/cancel?order_id=flow-order');
 await page.getByRole('link',{name:'Try again',exact:true}).click();
 await expect(page).toHaveURL(/plan=starter-annual.*billing=one_time/);
 await page.getByRole('link',{name:'Continue your work',exact:true}).click();
 await expect(page).toHaveURL(app+'/scores/new/musicxml#free-scan');
 await expect(page.locator('.file-dropzone')).toContainText('review-score.musicxml');assert.equal(imports,0);
 pass('Cancel/retry keeps plan, purchase type and the selected file without creating an import');
 await page.goto(app+'/checkout/success?order_id=flow-order&token=public-order-token&provider=stripe');
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
 assert.match(page.url(),/checkout\/success/);
 orderStatus='paid';await page.getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Confirming account access…',exact:true})).toBeVisible();
 assert.match(page.url(),/checkout\/success/);assert.equal(imports,0);
 paid=true;
 await expect(page).toHaveURL(app+'/scores/new/musicxml#free-scan',{timeout:20000});
 await expect(page.locator('.file-dropzone')).toContainText('review-score.musicxml');
 assert.equal(imports,0);
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await expect(page).toHaveURL(app+'/scores/imported-score');assert.equal(imports,1);
 pass('Paid order waits for active account access, restores the file, and needs one explicit processing click');
 userId='other-user';await page.goto(app+'/checkout/success?order_id=flow-order&token=public-order-token&provider=stripe');
 await expect(page.getByText('Sign in with the account used for this purchase.',{exact:true}).first()).toBeVisible();
 assert.match(page.url(),/checkout\/success/);pass('Mismatched purchase account cannot automatically resume');
 userId='flow-user';paid=false;await page.goto(app+'/scores');
 await page.locator('#score-file-input').setInputFiles({name:'bad.exe',mimeType:'application/octet-stream',buffer:Buffer.from('test')});
 await expect(page.getByText('Choose a supported score file.',{exact:true})).toBeVisible();
 await page.locator('#score-file-input').setInputFiles({name:'score.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
 await expect(page.getByRole('button',{name:'Start processing',exact:true})).toBeEnabled();
 pass('Unsupported files are rejected; a free account can start its available PDF recognition');
 await page.screenshot({path:'.tmp/flow-redesign/local-import.png',fullPage:true});
}catch(e){report.error=String(e);if(page){await page.screenshot({path:'.tmp/flow-redesign/payment-failure.png'}).catch(()=>{});fs.writeFileSync('.tmp/flow-redesign/payment-failure.txt',await page.locator('body').innerText().catch(()=>''));}throw e;}finally{await browser.close();fs.writeFileSync('.tmp/flow-redesign/payment-verification.json',JSON.stringify(report,null,2));}
