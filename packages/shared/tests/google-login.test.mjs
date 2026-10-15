import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  GOOGLE_LOCALES, getGoogleLocale, getGoogleAuthCopy, normalizeGoogleLocale, isInAppBrowser,
  getKnownGoogleAccount, rememberGoogleAccount, isGoogleAutoSignInAllowed, suppressGoogleAutoSignIn,
  clearGoogleAutoSignInSuppression, launchGoogleSignIn, prepareGoogleSignIn, consumeGoogleRedirectResult, validateAuthReturnPath, withGoogleAuthStatus,
} from '../dist/google-login.js';

function browser(options = {}) {
  const originals = Object.fromEntries(['window', 'document', 'fetch', 'setInterval', 'clearInterval'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const events = new Map(), data = new Map(), cookies = new Map(), opened = [], redirects = [], submissions = [];
  const location = new URL(options.url ?? 'https://www.scoretransposer.com/fr/pricing?billing=one_time#plans');
  location.assign = href => redirects.push(href);
  const popup = { location: { href: '' }, closed: false, close() { this.closed = true; } };
  const win = {
    location, crypto: { randomUUID }, navigator: { userAgent: options.ua ?? 'Mozilla/5.0 Chrome/140' },
    localStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) },
    history: { state: { panel: 'export' }, replaceState(state, _, href) { win.history.state = state; win.location = new URL(href, win.location); } },
    open(...args) { opened.push(args); return options.blocked ? null : popup; },
    addEventListener: (name, listener) => events.set(name, listener),
    removeEventListener: (name, listener) => { if (events.get(name) === listener) events.delete(name); },
    dispatchEvent() {},
  };
  const doc = { body: { append() {} }, createElement(tag) {
    if (tag === 'input') return {};
    const fields = [];
    return { style: {}, append: field => fields.push(field), submit() { submissions.push({ method: this.method, action: this.action, target: this.target, fields: Object.fromEntries(fields.map(field => [field.name, field.value])) }); }, remove() {} };
  } };
  Object.defineProperty(doc, 'cookie', { get: () => [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), set: value => { const [kv] = value.split(';'); const [key, val] = kv.split('='); if (/Max-Age=0(?:;|$)/u.test(value)) cookies.delete(key); else cookies.set(key, val); } });
  let tick;
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true, writable: true });
  globalThis.setInterval = callback => { tick = callback; return 1; };
  globalThis.clearInterval = () => { tick = undefined; };
  return { win, popup, opened, redirects, submissions, data, cookies, tick: () => tick?.(),
    message(data, origin = 'https://api.scoretransposer.com', source = popup) { events.get('message')?.({ data, origin, source }); },
    restore() { for (const [key, descriptor] of Object.entries(originals)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } },
  };
}

test('all nine locales share SDK, OAuth, button and HTML mapping and translated fallback', () => {
  assert.equal(Object.keys(GOOGLE_LOCALES).length, 9);
  for (const locale of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'es', 'de', 'ru']) {
    const mapping = getGoogleLocale(locale);
    assert.equal(mapping.hl, locale);
    assert.equal(mapping.htmlLang, locale);
    assert.equal(mapping.buttonLocale, locale.replace('-', '_'));
    for (const text of Object.values(getGoogleAuthCopy(locale))) assert.ok(text.length > 0);
  }
  assert.equal(normalizeGoogleLocale('__proto__'), 'en');
  assert.equal(getGoogleLocale('unknown').hl, 'en');
});

test('in-app detection covers WeChat, Instagram, Facebook, LINE and webviews', () => {
  for (const ua of ['Mozilla MicroMessenger/8', 'WeChat', 'Instagram 300', 'FBAN/FBIOS', 'FBAV/400', 'Mozilla Line/14', 'Android; wv)', 'TikTok', 'LinkedInApp']) assert.equal(isInAppBrowser(ua), true, ua);
  for (const ua of ['Mozilla/5.0 Chrome/140 Safari/537', 'Mozilla Safari/605.1', 'Mozilla Firefox/140', 'CriOS/140', 'Edg/140']) assert.equal(isInAppBrowser(ua), false, ua);
});

test('auth returns retain original-order context but reject every open redirect variant', () => {
  for (const path of ['/scores/abc?panel=review#export', '/student?class=abc#assignment', '/jobs?state=waiting', '/checkout?continue=1&passMode=top_up&plan=single-score', '/activate?code=existing#form', '/checkout/success?order_id=existing&token=existing#recovery']) assert.equal(validateAuthReturnPath('app', path), path);
  assert.equal(validateAuthReturnPath('www', '/fr/checkout/cancel?order_id=existing#pricing'), '/fr/checkout/cancel?order_id=existing#pricing');
  for (const path of ['//evil.example/path', '/\\evil.example/path', 'https://evil.example', '/%2fevil.example', '/%252fevil.example', '/%255cevil.example', '/scores?value=%0aevil', '/scores\u0000evil', '/api/auth/google/callback', '/scores/../api/auth/google/callback', '/unknown']) assert.equal(validateAuthReturnPath('app', path), null, path);
});

test('One Tap excludes all payment, activation, callbacks, locale variants and logout suppression', () => {
  const b = browser();
  try {
    for (const path of ['/checkout', '/checkout/success?orderId=abc', '/checkout/cancel', '/checkout/paddle', '/checkout-extra', '/activate', '/activate/abc', '/fr/checkout', '/billing#restore-checkout-orders', '/api/auth/google/callback', '/oauth/callback', '/scores?google_auth=error']) assert.equal(isGoogleAutoSignInAllowed(path), false, path);
    for (const path of ['/', '/pricing', '/scores#free-scan', '/scores/abc?panel=export', '/fr/features']) assert.equal(isGoogleAutoSignInAllowed(path), true, path);
    let disabled = 0;
    b.win.google = { accounts: { id: { disableAutoSelect: () => disabled++ } } };
    suppressGoogleAutoSignIn();
    assert.equal(disabled, 1);
    assert.equal(isGoogleAutoSignInAllowed('/scores'), false);
    b.win.location = new URL('https://app.scoretransposer.com/scores');
    assert.equal(isGoogleAutoSignInAllowed('/scores'), false);
    clearGoogleAutoSignInSuppression();
    assert.equal(isGoogleAutoSignInAllowed('/scores'), true);
  } finally { b.restore(); }
});

test('login hint only comes from a known successful account, never URL email or hint parameters', () => {
  const b = browser({ url: 'https://app.scoretransposer.com/login?email=evil@example.test&login_hint=evil' });
  try {
    assert.equal(getKnownGoogleAccount(), undefined);
    rememberGoogleAccount('verified@example.test');
    assert.equal(getKnownGoogleAccount(), 'verified@example.test');
    rememberGoogleAccount('bad\nemail');
    assert.equal(getKnownGoogleAccount(), 'verified@example.test');
    const [key] = b.data.keys();
    b.data.set(key, JSON.stringify({ email: 'old@example.test', expiresAt: Date.now() - 1 }));
    assert.equal(getKnownGoogleAccount(), undefined);
  } finally { b.restore(); }
});

test('active click opens popup synchronously and keeps complete path query hash', () => {
  const b = browser(); let completed = 0;
  try {
    const controller = launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'fr', onSuccess: () => completed++ });
    assert.equal(b.opened.length, 1);
    const start = new URL(b.opened[0][0]);
    assert.equal(start.searchParams.get('return_path'), '/fr/pricing?billing=one_time#plans');
    assert.equal(start.searchParams.get('origin'), 'https://www.scoretransposer.com');
    assert.equal(start.searchParams.get('locale'), 'fr');
    const message = { type: 'score-google-auth', transactionId: start.searchParams.get('transaction_id'), status: 'success' };
    b.message(message, 'https://evil.example');
    b.message(message, undefined, {});
    b.message({ ...message, transactionId: 'wrong' });
    assert.equal(completed, 0);
    b.message(message);
    b.message(message);
    assert.equal(completed, 1);
    assert.equal(b.redirects.length, 0);
    controller.cancel();
  } finally { b.restore(); }
});

test('blocked popup falls back to full page redirect after preserving draft', async () => {
  const b = browser({ blocked: true }); let saved = false;
  try {
    launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'ja', onSuccess() {}, beforeRedirect: async () => { saved = true; } });
    assert.equal(b.opened.length, 1);
    assert.equal(saved, true);
    await Promise.resolve();
    assert.equal(b.redirects.length, 1);
    const redirect = new URL(b.redirects[0]);
    assert.equal(redirect.searchParams.get('mode'), 'redirect');
    assert.equal(redirect.searchParams.get('return_path'), '/fr/pricing?billing=one_time#plans');
  } finally { b.restore(); }
});

test('reserved popup survives async session check and is reused without a second window', () => {
  const b = browser();
  try {
    const controller = launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'en', popup: b.popup, onSuccess() {} });
    assert.equal(b.opened.length, 0);
    assert.equal(new URL(b.popup.location.href).pathname, '/api/auth/google/start');
    controller.cancel();
  } finally { b.restore(); }
});

test('a browser throwing when opening a popup also falls back to a full page redirect', () => {
  const b = browser();
  try {
    b.win.open = () => { throw new DOMException('Blocked', 'SecurityError'); };
    launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'en', onSuccess() {} });
    assert.equal(b.redirects.length, 1);
    assert.equal(new URL(b.redirects[0]).searchParams.get('mode'), 'redirect');
  } finally { b.restore(); }
});

test('large B2 editor context uses synchronous popup POST and exact same-page restoration', async () => {
  const path = '/checkout?plan=converter-pro-annual&billing=one_time&continue=1&returnState=' + 'a'.repeat(9000) + '#payment';
  assert.equal(validateAuthReturnPath('app', path), path);
  for (const blocked of [false, true]) {
    const b = browser({ blocked, url: 'https://app.scoretransposer.com' + path });
    try {
      let saved = false;
      const controller = launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'de', onSuccess() {}, beforeRedirect: async () => { saved = true; } });
      assert.equal(b.opened.length, 1);
      assert.equal(b.opened[0][0], '');
      if (blocked) { assert.equal(saved, true); await Promise.resolve(); }
      assert.equal(b.submissions.length, 1);
      const post = b.submissions[0];
      assert.equal(post.method, 'POST');
      assert.equal(post.action, 'https://api.scoretransposer.com/api/auth/google/start');
      assert.equal(post.fields.return_path, path);
      assert.equal(post.fields.mode, blocked ? 'redirect' : 'popup');
      assert.equal(post.target, blocked ? '_self' : b.opened[0][1]);
      assert.equal(b.redirects.length, 0);
      controller.cancel();
    } finally { b.restore(); }
  }
});

test('cancelling while a draft is being saved prevents delayed redirect navigation', async () => {
  const b = browser({ blocked: true });
  try {
    let completeSave;
    const saved = new Promise(resolve => { completeSave = resolve; });
    const controller = launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'en', onSuccess() {}, beforeRedirect: () => saved });
    controller.cancel(); completeSave(); await Promise.resolve();
    assert.equal(b.redirects.length, 0);
    assert.equal(b.submissions.length, 0);
  } finally { b.restore(); }
});

test('a blocked large-context form reports a safe error if browser navigation also throws', () => {
  const b = browser({ blocked: true }); let error;
  try {
    const create = document.createElement;
    document.createElement = tag => { const element = create(tag); if (tag === 'form') element.submit = () => { throw new DOMException('Blocked', 'SecurityError'); }; return element; };
    launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'en', returnPath: '/checkout?continue=1&returnState=' + 'x'.repeat(9000), onSuccess() {}, onError: reason => { error = reason; } });
    assert.equal(error, 'redirect_failed');
    assert.equal(b.redirects.length, 0);
  } finally { b.restore(); }
});

test('callback failure and lost popup use redirect fallback, not an intermediate modal', () => {
  for (const failure of ['error', 'closed']) {
    const b = browser();
    try {
      const controller = launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'en', onSuccess() {} });
      const start = new URL(b.opened[0][0]);
      if (failure === 'error') b.message({ type: 'score-google-auth', transactionId: start.searchParams.get('transaction_id'), status: 'error' });
      else { b.popup.closed = true; b.tick(); }
      assert.equal(b.redirects.length, 1);
      assert.equal(new URL(b.redirects[0]).searchParams.get('mode'), 'redirect');
      controller.cancel();
    } finally { b.restore(); }
  }
});

test('missing secret prefetch goes straight to GIS fallback and makes no OAuth request', async () => {
  const b = browser(); let fallback;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ codeFlowAvailable: false }) });
    const base = 'https://api.scoretransposer.com/unavailable-test';
    assert.equal(await prepareGoogleSignIn(base), false);
    launchGoogleSignIn({ apiBaseUrl: base, locale: 'en', onSuccess() {}, onFallback: reason => { fallback = reason; } });
    assert.equal(fallback, 'unavailable');
    assert.equal(b.opened.length, 0);
    assert.equal(b.redirects.length, 0);
  } finally { b.restore(); }
});

test('unavailable and disallowed_useragent callbacks keep GIS and email fallback visible', () => {
  for (const status of ['unavailable', 'disallowed_useragent']) {
    const b = browser(); let fallback;
    try {
      launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'ko', onSuccess() {}, onFallback: reason => { fallback = reason; } });
      const start = new URL(b.opened[0][0]);
      b.message({ type: 'score-google-auth', transactionId: start.searchParams.get('transaction_id'), status });
      assert.equal(fallback, status);
      assert.equal(b.redirects.length, 0);
    } finally { b.restore(); }
  }
});

test('detected in-app browser shows hint without opening forbidden Google OAuth', () => {
  const b = browser({ ua: 'MicroMessenger/8.0' }); let fallback;
  try {
    launchGoogleSignIn({ apiBaseUrl: 'https://api.scoretransposer.com', locale: 'zh-CN', onSuccess() {}, onFallback: reason => { fallback = reason; } });
    assert.equal(fallback, 'disallowed_useragent');
    assert.equal(b.opened.length, 0);
    assert.equal(b.redirects.length, 0);
  } finally { b.restore(); }
});

test('redirect result is consumed once without losing query, hash or history UI state', () => {
  const b = browser({ url: 'https://app.scoretransposer.com/scores/abc?mode=ensemble&google_auth=success#export-center' });
  try {
    assert.equal(consumeGoogleRedirectResult(), 'success');
    assert.equal(b.win.location.href, 'https://app.scoretransposer.com/scores/abc?mode=ensemble#export-center');
    assert.deepEqual(b.win.history.state, { panel: 'export' });
    assert.equal(consumeGoogleRedirectResult(), undefined);
  } finally { b.restore(); }
});

test('status append and removal preserve raw query encoding needed by exact per-tab continuations', () => {
  const original = 'https://www.scoretransposer.com/pricing?mode=a~b&next=%2fscores&plan=starter-monthly#plans';
  const marked = withGoogleAuthStatus(original, 'success');
  assert.equal(marked, 'https://www.scoretransposer.com/pricing?mode=a~b&next=%2fscores&plan=starter-monthly&google_auth=success#plans');
  const b = browser({ url: marked });
  try {
    assert.equal(consumeGoogleRedirectResult(), 'success');
    assert.equal(b.win.location.href, original);
    assert.equal(consumeGoogleRedirectResult(), undefined);
  } finally { b.restore(); }
});
