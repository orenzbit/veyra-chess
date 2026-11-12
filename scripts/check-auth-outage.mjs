// Session check during a Supabase Auth outage: npm run check:offline-cache (part of check:release)
// No network: a fake Supabase Auth answers each case. An outage (no answer, 429, 5xx) must not sign the
// user out; only a 4xx from Supabase Auth ends the session, and then the dead cookie is cleared.
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

Object.assign(process.env, {
  SUPABASE_URL: 'https://fake-project.supabase.test', SUPABASE_ANON_KEY: crypto.randomUUID(), SUPABASE_SECRET_KEY: crypto.randomUUID(), // test-only values made at runtime
  AUTH_SESSION_SECRET: crypto.randomBytes(32).toString('base64url'),
});
const NAME = '__Host-tabia_session';
const root = process.env.CHECK_ROOT || '..'; // CHECK_ROOT lets the same test run against another tree (before/after proof)
let answers = {}; let calls = [];
const reply = (status, body) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = String(url); const kind = u.includes('grant_type=refresh_token') ? 'refresh' : u.endsWith('/auth/v1/user') ? 'user' : u;
  calls.push(kind);
  const a = answers[kind];
  if (typeof a === 'function') return a(init);
  if (!a) throw new Error('unexpected fetch ' + u);
  if (a === 'network') throw new TypeError('fetch failed');
  return reply(...a);
};
const { handler } = await import(`${root}/netlify/functions/auth.mjs`);

// The cookie format is sealed with AUTH_SESSION_SECRET (AES-256-GCM); make one the same way auth.mjs does.
const seal = (p) => { const k = crypto.createHash('sha256').update(process.env.AUTH_SESSION_SECRET).digest(), iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', k, iv); const e = Buffer.concat([c.update(JSON.stringify(p)), c.final()]); return Buffer.concat([iv, c.getAuthTag(), e]).toString('base64url'); };
const cookie = seal({ access_token: crypto.randomUUID(), refresh_token: crypto.randomUUID(), user_id: 'u1', email: 'a@example.com', exp: Math.floor(Date.now() / 1000) + 3600 });
let ip = 0;
async function check(a) {
  answers = a; calls = [];
  const r = await handler({ httpMethod: 'GET', rawUrl: 'https://veyra.test/api/auth?action=session', queryStringParameters: { action: 'session' }, headers: { cookie: `${NAME}=${cookie}`, 'x-forwarded-for': `10.0.0.${++ip}` } });
  return { status: r.statusCode, body: JSON.parse(r.body), setCookie: r.headers['set-cookie'] || '', calls };
}
const ok = (name, fn) => fn().then(() => console.log('PASS', name), (e) => { console.log('FAIL', name, '->', e.message.split('\n')[0]); process.exitCode = 1; });
const user200 = [200, { id: 'u1', email: 'a@example.com', user_metadata: {} }];
const badJwt = [403, { code: 403, error_code: 'bad_jwt', msg: 'invalid JWT: token is expired' }];
const outage = (r, refreshTried) => {
  assert.equal(r.status, 503, 'answers 503, not a logout');
  assert.equal(r.body.error, 'AUTH_UNAVAILABLE');
  assert.equal(r.setCookie, '', 'keeps the cookie untouched');
  assert.equal(r.calls.includes('refresh'), refreshTried, refreshTried ? 'refresh was attempted' : 'does not burn a refresh token on an outage');
};

await ok('healthy: valid token signs in', async () => { const r = await check({ user: user200 }); assert.equal(r.status, 200); assert.equal(r.body.authenticated, true); assert.match(r.setCookie, /__Host-tabia_session=[^;]+; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=/); });
await ok('healthy: expired access token is refreshed', async () => {
  let n = 0; const r = await check({ user: () => reply(...(n++ ? user200 : badJwt)), refresh: [200, { access_token: crypto.randomUUID(), refresh_token: crypto.randomUUID(), user: user200[1] }] });
  assert.equal(r.body.authenticated, true); assert.deepEqual(r.calls, ['user', 'refresh', 'user']); assert.notEqual(r.setCookie, '');
});
await ok('outage: /user 503', async () => outage(await check({ user: [503, 'Service Unavailable'] }), false));
await ok('outage: /user 502 from the gateway', async () => outage(await check({ user: [502, 'Bad Gateway'] }), false));
await ok('outage: no network to Supabase Auth', async () => outage(await check({ user: 'network' }), false));
await ok('outage: /user 429 rate limit', async () => outage(await check({ user: [429, { error_code: 'over_request_rate_limit' }] }), false));
await ok('outage: token expired and refresh rate-limited (429)', async () => outage(await check({ user: badJwt, refresh: [429, { error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' }] }), true));
await ok('outage: token expired and refresh 500', async () => outage(await check({ user: badJwt, refresh: [500, { msg: 'Internal Server Error' }] }), true));
await ok('outage: token expired and the refresh answer is lost', async () => outage(await check({ user: badJwt, refresh: 'network' }), true));
await ok('ended: refresh token already used -> signed out and cookie cleared', async () => {
  const r = await check({ user: badJwt, refresh: [400, { code: 400, error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' }] });
  assert.equal(r.status, 200); assert.equal(r.body.authenticated, false); assert.match(r.setCookie, /^__Host-tabia_session=; .*Max-Age=0/);
});
await ok('ended: session gone at Supabase (signed out everywhere) -> cookie cleared', async () => {
  const r = await check({ user: [403, { error_code: 'session_not_found', msg: 'Session from session_id claim in JWT does not exist' }], refresh: [400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' }] });
  assert.equal(r.body.authenticated, false); assert.match(r.setCookie, /Max-Age=0/);
});
await ok('no cookie: signed out, nothing called', async () => {
  answers = {}; calls = [];
  const r = await handler({ httpMethod: 'GET', rawUrl: 'https://veyra.test/api/auth?action=session', queryStringParameters: { action: 'session' }, headers: { 'x-forwarded-for': '10.0.1.1' } });
  assert.equal(r.statusCode, 200); assert.equal(JSON.parse(r.body).authenticated, false); assert.deepEqual(calls, []);
});

// Client side: the app enters its offline fallback for AUTH_UNAVAILABLE instead of signing out.
const src = 'src/offline-session.ts', out = 'dist/src/offline-session.js';
if (!existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs) spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' });
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
const { isNetworkFailure } = await import('../dist/src/offline-session.js');
await ok('client: AUTH_UNAVAILABLE counts as offline, other errors do not', async () => {
  assert.equal(isNetworkFailure({ ok: false, status: 0, data: {} }), true);
  assert.equal(isNetworkFailure({ ok: false, status: 503, data: { authenticated: false, error: 'AUTH_UNAVAILABLE' } }), true);
  assert.equal(isNetworkFailure({ ok: false, status: 503, data: {} }), false);
  assert.equal(isNetworkFailure({ ok: false, status: 500, data: { error: 'AUTH_UNAVAILABLE' } }), false);
  assert.equal(isNetworkFailure({ ok: true, status: 200, data: { authenticated: false } }), false);
});
